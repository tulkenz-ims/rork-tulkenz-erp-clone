// app/(tabs)/settings/roadmap.tsx
// TulKenz OPS Feature Roadmap — internal dev tracker
// Tap any feature to toggle completed (strikethrough). State persists via AsyncStorage.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft, CheckCircle2, Circle, Rocket, Brain, FileText,
  Mic, Camera, TrendingUp, AlertTriangle, Package,
  GitBranch, Globe, QrCode, Zap,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Roadmap Data ─────────────────────────────────────────────────────────────

interface Feature {
  id: string;
  title: string;
  description: string;
  howTo: string[];
  icon: any;
  iconColor: string;
  priority: 'high' | 'medium';
  effort: 'Large' | 'Medium' | 'Small';
}

interface Category {
  label: string;
  features: Feature[];
}

const ROADMAP: Category[] = [
  {
    label: '⭐ Priority Builds — Client Pitch',
    features: [
      {
        id: 'shift_handoff',
        title: 'Shift Handoff by Voice',
        description: 'End of shift, operator says "start handoff." Claude interviews them, then auto-generates a formatted shift report and saves it for the incoming shift.',
        howTo: [
          'New screen: app/(tabs)/production/shifthandoff.tsx',
          'AI interview flow — Claude asks structured questions via voice',
          'Auto-generates shift report from answers',
          'Saves to shift_reports table (new migration)',
          'Incoming shift can pull up last report from dashboard',
          'Wire into AI assistant: "start handoff" command',
        ],
        icon: Mic,
        iconColor: '#8B5CF6',
        priority: 'high',
        effort: 'Medium',
      },
      {
        id: 'audit_packet',
        title: 'Auto-Generated Audit Packets',
        description: 'Say "prepare SQF audit packet for the last 90 days." Claude pulls every PM, corrective action, temperature log, and training record — formats into a PDF audit-ready report.',
        howTo: [
          'New screen: app/(tabs)/compliance/auditpacket.tsx',
          'Query builder — select framework (SQF, FSMA, OSHA), date range',
          'Aggregation logic across PMs, work orders, quality records, training',
          'PDF generation using react-native-pdf or Vercel serverless',
          'Claude summarizes findings and flags any gaps',
          'Wire into AI assistant: "prepare audit packet" command',
        ],
        icon: FileText,
        iconColor: '#10B981',
        priority: 'high',
        effort: 'Large',
      },
      {
        id: 'predictive_maintenance',
        title: 'Predictive Maintenance Scoring',
        description: 'Every WO, PM, and reported issue feeds a failure probability score per equipment. Dashboard shows which machines are at risk before they fail.',
        howTo: [
          'New migration: equipment_risk_scores table',
          'Scoring engine (Vercel serverless) runs nightly',
          'Factors: days since last PM, open WOs, repeat failures, age',
          'New dashboard widget: Risk Heatmap on equipment list',
          'Alert when score exceeds threshold — creates suggested WO',
          'Wire into AI assistant: "what equipment is at risk" command',
        ],
        icon: TrendingUp,
        iconColor: '#F59E0B',
        priority: 'high',
        effort: 'Large',
      },
    ],
  },
  {
    label: '🧠 AI & Intelligence',
    features: [
      {
        id: 'visual_defect',
        title: 'Visual Defect Detection',
        description: 'Point your phone camera at a product or equipment. Claude analyzes the image and flags defects, automatically offering to create a quality hold or work order.',
        howTo: [
          'Extend AI assistant camera flow (already has image input)',
          'Add defect-specific system prompt instructions',
          'Claude returns structured response: defect_type, severity, recommended_action',
          'One-tap creates quality hold or WO from the result',
          'Log detection events to a new quality_detections table',
        ],
        icon: Camera,
        iconColor: '#EC4899',
        priority: 'high',
        effort: 'Medium',
      },
      {
        id: 'institutional_memory',
        title: 'Institutional Memory',
        description: 'When a tech fixes something unusual, Claude extracts and stores the solution. Future techs hitting the same issue get "James fixed this in August — here\'s what he found."',
        howTo: [
          'Already have ai_assistant_memory table — extend it',
          'On WO completion, Claude extracts fix details via background job',
          'New "Knowledge Base" screen in CMMS',
          'Search by equipment, symptom, or part',
          'Wire into AI assistant: "has this happened before" command',
        ],
        icon: Brain,
        iconColor: '#6366F1',
        priority: 'medium',
        effort: 'Medium',
      },
      {
        id: 'anomaly_detection',
        title: 'Anomaly Detection on Logged Data',
        description: 'Claude watches manually entered readings (temps, pressures, line speeds) for drift patterns before they become alarms.',
        howTo: [
          'New readings log screen per room/equipment',
          'Vercel cron job analyzes trends every hour',
          'Claude compares to historical baseline per reading type',
          'Push notification + task feed post when anomaly detected',
          'Wire into LineStatusWidget as a subtle indicator',
        ],
        icon: AlertTriangle,
        iconColor: '#F97316',
        priority: 'medium',
        effort: 'Large',
      },
    ],
  },
  {
    label: '📦 Operations & Supply Chain',
    features: [
      {
        id: 'smart_reorder',
        title: 'Smart Parts Reorder Prediction',
        description: 'Cross-reference parts usage from work orders with lead times and current inventory. Surfaces reorder alerts before you run out.',
        howTo: [
          'Track parts consumed per WO (extend work order completion flow)',
          'Add lead_time_days field to materials/parts table',
          'Consumption rate calculation per part (30/60/90 day rolling)',
          'New alert type: "Reorder Now" with days-remaining badge',
          'Wire into AI assistant: "what parts do I need to order" command',
          'Optional: Vendor email draft generation',
        ],
        icon: Package,
        iconColor: '#14B8A6',
        priority: 'high',
        effort: 'Medium',
      },
      {
        id: 'downtime_simulator',
        title: 'Cascading Downtime Simulator',
        description: 'Before taking a line down for PM, model the production impact. "Taking PR1 offline Friday will back up PA1 by 3 hours and push BB1 into Saturday."',
        howTo: [
          'Need production schedule data (extend production runs)',
          'Room dependency map (which rooms feed which)',
          'Simulation engine: given a downtime window, project downstream impact',
          'New screen: app/(tabs)/production/downtimesim.tsx',
          'Wire into AI assistant: "what happens if I take PR1 down Friday"',
        ],
        icon: GitBranch,
        iconColor: '#0EA5E9',
        priority: 'medium',
        effort: 'Large',
      },
    ],
  },
  {
    label: '👥 People & Access',
    features: [
      {
        id: 'multilingual_training',
        title: 'Multilingual Training Mode',
        description: 'New employee onboarding by voice in their language. Claude walks them through LOTO, emergency protocols, food safety rules — with a quiz. Completion auto-logged.',
        howTo: [
          'New screen: app/(tabs)/lms/aitraining.tsx',
          'Content modules: LOTO, Emergency, Food Safety, HACCP basics',
          'Claude reads each module aloud using current language setting',
          'Voice quiz at end — Claude grades responses',
          'Completion record saved to training_completions table',
          'Certificate generation on pass',
        ],
        icon: Globe,
        iconColor: '#8B5CF6',
        priority: 'medium',
        effort: 'Large',
      },
      {
        id: 'contractor_portal',
        title: 'AI Contractor / Vendor Assistant',
        description: 'Contractor arrives on site, scans a QR code, gets a scoped AI session that knows only their work order. Claude guides them through the job, collects sign-off, closes the WO.',
        howTo: [
          'Contractor token system — time-limited, WO-scoped auth',
          'QR code generation on work order detail screen',
          'Scoped AI session: only sees the assigned WO + safety rules for that area',
          'Guided checklist flow via Claude voice',
          'Digital sign-off captured, attached to WO',
          'Auto-closes WO on completion, notifies maintenance manager',
        ],
        icon: QrCode,
        iconColor: '#F59E0B',
        priority: 'medium',
        effort: 'Large',
      },
    ],
  },
];

const STORAGE_KEY = 'tulkenz_roadmap_completed';

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoadmapScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(val => { if (val) setCompleted(JSON.parse(val)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const totalFeatures = ROADMAP.reduce((sum, cat) => sum + cat.features.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Feature Roadmap</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {completedCount}/{totalFeatures} complete
          </Text>
        </View>
        <View style={styles.rocketIcon}>
          <Rocket size={22} color="#8B5CF6" />
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[
          styles.progressFill,
          { width: `${(completedCount / totalFeatures) * 100}%` as any, backgroundColor: '#8B5CF6' }
        ]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Tap a feature to expand the build plan. Long-press to mark it complete — completed features get a strikethrough. Build one at a time.
        </Text>

        {ROADMAP.map(category => (
          <View key={category.label} style={styles.categoryBlock}>
            <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
              {category.label}
            </Text>

            {category.features.map(feature => {
              const done = !!completed[feature.id];
              const open = !!expanded[feature.id];
              const Icon = feature.icon;

              return (
                <Pressable
                  key={feature.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: done ? '#10B98140' : colors.border },
                    done && { opacity: 0.6 },
                  ]}
                  onPress={() => toggleExpanded(feature.id)}
                  onLongPress={() => {
                    Alert.alert(
                      done ? 'Mark as Incomplete?' : 'Mark as Complete?',
                      `"${feature.title}"`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: done ? 'Mark Incomplete' : '✅ Complete', onPress: () => toggleComplete(feature.id) },
                      ]
                    );
                  }}
                >
                  {/* Card header row */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: feature.iconColor + '20' }]}>
                      <Icon size={20} color={feature.iconColor} />
                    </View>
                    <View style={styles.cardTitleBlock}>
                      <Text style={[
                        styles.cardTitle,
                        { color: colors.text },
                        done && styles.strikethrough,
                      ]}>
                        {feature.title}
                      </Text>
                      <View style={styles.badges}>
                        <View style={[styles.badge, {
                          backgroundColor: feature.priority === 'high' ? '#EF444420' : '#F59E0B20',
                        }]}>
                          <Text style={[styles.badgeText, {
                            color: feature.priority === 'high' ? '#EF4444' : '#F59E0B',
                          }]}>
                            {feature.priority === 'high' ? '🔥 High' : '⚡ Medium'}
                          </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                            {feature.effort}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {done
                      ? <CheckCircle2 size={22} color="#10B981" />
                      : <Circle size={22} color={colors.border} />
                    }
                  </View>

                  {/* Description — always visible */}
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    {feature.description}
                  </Text>

                  {/* How-to — expanded only */}
                  {open && (
                    <View style={[styles.howTo, { borderTopColor: colors.border }]}>
                      <View style={styles.howToHeader}>
                        <Zap size={13} color="#8B5CF6" />
                        <Text style={[styles.howToTitle, { color: '#8B5CF6' }]}>Build Plan</Text>
                      </View>
                      {feature.howTo.map((step, i) => (
                        <View key={i} style={styles.step}>
                          <Text style={[styles.stepNum, { color: '#8B5CF6' }]}>{i + 1}</Text>
                          <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.tapHint, { color: colors.textTertiary }]}>
                    {open ? 'Tap to collapse' : 'Tap for build plan · Long-press to mark complete'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            TulKenz OPS Roadmap · Build one at a time 🚀
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:          { padding: 4, marginRight: 8 },
  headerCenter:     { flex: 1 },
  headerTitle:      { fontSize: 18, fontWeight: '700' },
  headerSub:        { fontSize: 12, marginTop: 1 },
  rocketIcon:       { padding: 4 },
  progressBar:      { height: 3, width: '100%' },
  progressFill:     { height: 3, borderRadius: 2 },
  scroll:           { padding: 16, paddingBottom: 40 },
  intro:            { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  categoryBlock:    { marginBottom: 28 },
  categoryLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  card:             { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBox:          { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitleBlock:   { flex: 1 },
  cardTitle:        { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  strikethrough:    { textDecorationLine: 'line-through' },
  badges:           { flexDirection: 'row', gap: 6 },
  badge:            { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText:        { fontSize: 10, fontWeight: '600' },
  cardDesc:         { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  howTo:            { borderTopWidth: 1, marginTop: 10, paddingTop: 12 },
  howToHeader:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  howToTitle:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  step:             { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stepNum:          { fontSize: 12, fontWeight: '700', width: 16, marginTop: 1 },
  stepText:         { fontSize: 13, lineHeight: 19, flex: 1 },
  tapHint:          { fontSize: 10, marginTop: 6, textAlign: 'right' },
  footer:           { alignItems: 'center', marginTop: 12 },
  footerText:       { fontSize: 12 },
});
