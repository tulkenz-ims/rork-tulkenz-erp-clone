// app/(tabs)/sanitation/dashboard.tsx
// Sanitation Command Dashboard — HUD Heatmap + KPIs + Module Nav
// Full HUD theme · TulKenz OPS

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
  StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSanitationTasks } from '../../../hooks/useSanitationTasks';
import { useEMPSwabs } from '../../../hooks/useEMPSwabs';
import { useSanitationCA } from '../../../hooks/useSanitationCA';

const { width: SCREEN_W } = Dimensions.get('window');

// ─────────────────────────────────────────────
// HUD THEME
// ─────────────────────────────────────────────
const HUD = {
  bg: '#020912', bgCard: '#050f1e', bgCardAlt: '#071525',
  cyan: '#00e5ff', cyanDim: '#00e5ff22',
  green: '#00ff88', greenDim: '#00ff8822',
  amber: '#ffb800', amberDim: '#ffb80022',
  red: '#ff2d55', redDim: '#ff2d5522',
  purple: '#7b61ff', purpleDim: '#7b61ff22',
  text: '#e0f4ff', textSec: '#7aa8c8', textDim: '#3a6080',
  border: '#0d2840', borderBright: '#1a4060', grid: '#0a1f35',
};

// ─────────────────────────────────────────────
// ROOMS + ZONES
// ─────────────────────────────────────────────
const ROOMS = ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'] as const;
type Room = typeof ROOMS[number];

const ZONE_COLORS: Record<number, string> = {
  1: HUD.red, 2: HUD.amber, 3: HUD.purple, 4: HUD.cyan,
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function pct(val: number, total: number) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

function statusColor(passRate: number, hasZ1Fail: boolean) {
  if (hasZ1Fail) return HUD.red;
  if (passRate >= 90) return HUD.green;
  if (passRate >= 70) return HUD.amber;
  return HUD.red;
}

// ─────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────
function KPICard({
  label, value, sub, color, icon, onPress,
}: {
  label: string; value: string | number; sub?: string;
  color: string; icon: any; onPress?: () => void;
}) {
  const Inner = (
    <View style={[s.kpiCard, { borderTopColor: color, borderTopWidth: 2 }]}>
      <View style={[s.kpiIconBox, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.kpiVal, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{Inner}</TouchableOpacity>;
  return Inner;
}

// ─────────────────────────────────────────────
// ROOM HEATMAP CELL
// ─────────────────────────────────────────────
function RoomCell({
  room, tasksDue, tasksOverdue, atpPassRate,
  z1Fail, openCAs, onPress,
}: {
  room: Room;
  tasksDue: number; tasksOverdue: number;
  atpPassRate: number | null;
  z1Fail: boolean; openCAs: number;
  onPress: () => void;
}) {
  const hasIssue = tasksOverdue > 0 || z1Fail || openCAs > 0;
  const mainColor = z1Fail
    ? HUD.red
    : tasksOverdue > 0
    ? HUD.amber
    : openCAs > 0
    ? HUD.purple
    : tasksDue > 0
    ? HUD.cyan
    : HUD.green;

  const cellW = (SCREEN_W - 32 - 8) / 3; // 3 columns, padding 16 each side, gap 8

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.roomCell, { width: cellW, borderColor: mainColor + '55', backgroundColor: mainColor + '0d' }]}
    >
      {/* Room label */}
      <Text style={[s.roomLabel, { color: mainColor }]}>{room}</Text>

      {/* Status dot row */}
      <View style={s.roomDots}>
        {tasksOverdue > 0 && (
          <View style={[s.roomDot, { backgroundColor: HUD.red }]}>
            <Text style={s.roomDotTxt}>{tasksOverdue}</Text>
          </View>
        )}
        {tasksDue > 0 && (
          <View style={[s.roomDot, { backgroundColor: HUD.amber }]}>
            <Text style={s.roomDotTxt}>{tasksDue}</Text>
          </View>
        )}
        {openCAs > 0 && (
          <View style={[s.roomDot, { backgroundColor: HUD.purple }]}>
            <Text style={s.roomDotTxt}>{openCAs}</Text>
          </View>
        )}
        {!hasIssue && (
          <Ionicons name="checkmark-circle" size={16} color={HUD.green} />
        )}
      </View>

      {/* ATP pass rate bar */}
      {atpPassRate !== null && (
        <View style={s.atpBar}>
          <View style={[s.atpBarFill, {
            width: `${atpPassRate}%` as any,
            backgroundColor: atpPassRate >= 90 ? HUD.green : atpPassRate >= 70 ? HUD.amber : HUD.red,
          }]} />
        </View>
      )}
      {atpPassRate !== null && (
        <Text style={[s.atpPct, {
          color: atpPassRate >= 90 ? HUD.green : atpPassRate >= 70 ? HUD.amber : HUD.red,
        }]}>{atpPassRate}% ATP</Text>
      )}

      {/* Zone 1 fail badge */}
      {z1Fail && (
        <View style={s.z1Badge}>
          <Text style={s.z1BadgeTxt}>Z1 FAIL</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={12} color={mainColor + '88'} style={{ alignSelf: 'flex-end', marginTop: 4 }} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// MODULE NAV BUTTON
// ─────────────────────────────────────────────
function ModuleButton({
  label, sub, icon, color, badge, route,
}: {
  label: string; sub: string; icon: any; color: string;
  badge?: number | null; route: string;
}) {
  return (
    <TouchableOpacity
      style={[s.moduleBtn, { borderLeftColor: color, borderLeftWidth: 3 }]}
      onPress={() => router.push(route as any)}
      activeOpacity={0.75}
    >
      <View style={[s.moduleIconBox, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.moduleLabel}>{label}</Text>
        <Text style={s.moduleSub}>{sub}</Text>
      </View>
      {badge != null && badge > 0 ? (
        <View style={[s.moduleBadge, { backgroundColor: color }]}>
          <Text style={s.moduleBadgeTxt}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={HUD.textDim} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// EMP ZONE ROW
// ─────────────────────────────────────────────
function EMPZoneRow({
  zoneNumber, label, passRate, positives, due, failing,
}: {
  zoneNumber: number; label: string; passRate: number;
  positives: number; due: number; failing: boolean;
}) {
  const color = ZONE_COLORS[zoneNumber] ?? HUD.textSec;
  const barColor = passRate >= 90 ? HUD.green : passRate >= 70 ? HUD.amber : HUD.red;

  return (
    <View style={[s.empZoneRow, failing && { borderColor: HUD.red + '55' }]}>
      <View style={[s.empZoneDot, { backgroundColor: color }]}>
        <Text style={s.empZoneDotTxt}>{zoneNumber}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={[s.empZoneLabel, { color }]}>{label}</Text>
          <Text style={[s.empZonePct, { color: barColor }]}>{passRate}%</Text>
        </View>
        <View style={s.empZoneBar}>
          <View style={[s.empZoneBarFill, { width: `${passRate}%` as any, backgroundColor: barColor }]} />
        </View>
      </View>
      <View style={s.empZoneRight}>
        {positives > 0 && (
          <View style={s.empPosBadge}>
            <Text style={s.empPosBadgeTxt}>+{positives}</Text>
          </View>
        )}
        {due > 0 && (
          <View style={[s.empPosBadge, { backgroundColor: HUD.amberDim, borderColor: HUD.amber + '55' }]}>
            <Text style={[s.empPosBadgeTxt, { color: HUD.amber }]}>{due} DUE</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function SanitationDashboard() {
  const {
    tasks, stats: taskStats, loading: tasksLoading,
    fetchTasks, fetchDueTasks,
  } = useSanitationTasks();

  const {
    swabPoints, atpResults, microbialResults, dueSchedule, loading: empLoading,
    fetchSwabPoints, fetchATPResults, fetchMicrobialResults, fetchDueSchedule,
  } = useEMPSwabs();

  const {
    correctiveActions, loading: caLoading,
    fetchCorrectiveActions,
  } = useSanitationCA();

  const [refreshing, setRefreshing] = useState(false);

  const loading = tasksLoading || empLoading || caLoading;

  useEffect(() => { loadAll(); }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchTasks(), fetchDueTasks(),
      fetchSwabPoints(), fetchATPResults(), fetchMicrobialResults(), fetchDueSchedule(),
      fetchCorrectiveActions(),
    ]);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  // ── Room-level heatmap data ──
  const roomData = useMemo(() => {
    return ROOMS.map(room => {
      const roomTasks = tasks.filter(t => t.room === room);
      const overdue = roomTasks.filter(t => t.status === 'overdue').length;
      const due = roomTasks.filter(t => t.status === 'due_today').length;

      const roomATP = atpResults.filter(r => r.room === room);
      const passCount = roomATP.filter(r => r.result === 'pass').length;
      const atpPassRate = roomATP.length > 0 ? pct(passCount, roomATP.length) : null;

      const z1Pts = swabPoints.filter(p => p.room === room && p.zone_number === 1);
      const z1Fail = z1Pts.some(p => p.last_result === 'fail');

      const openCAs = correctiveActions.filter(ca =>
        ca.room === room && (ca.status === 'open' || ca.status === 'in_progress')
      ).length;

      return { room, overdue, due, atpPassRate, z1Fail, openCAs };
    });
  }, [tasks, atpResults, swabPoints, correctiveActions]);

  // ── EMP zone KPIs ──
  const zoneData = useMemo(() => {
    return [1, 2, 3, 4].map(z => {
      const pts = swabPoints.filter(p => p.zone_number === z);
      const results = atpResults.filter(r => r.zone_number === z);
      const passCount = results.filter(r => r.result === 'pass').length;
      const passRate = results.length > 0 ? pct(passCount, results.length) : 100;
      const positives = microbialResults.filter(r => r.zone_number === z && r.result === 'positive').length;
      const due = dueSchedule.filter(d => d.zone_number === z && d.status !== 'completed').length;
      const failing = pts.some(p => p.last_result === 'fail');
      const labels: Record<number, string> = {
        1: 'Food Contact', 2: 'Near Food', 3: 'Non-Food Contact', 4: 'General Facility',
      };
      return { zoneNumber: z, label: labels[z], passRate, positives, due, failing };
    });
  }, [swabPoints, atpResults, microbialResults, dueSchedule]);

  // ── Overall KPIs ──
  const kpis = useMemo(() => {
    const allATP = atpResults;
    const atpPassRate = allATP.length
      ? pct(allATP.filter(r => r.result === 'pass').length, allATP.length)
      : 100;

    const openCAs = correctiveActions.filter(ca =>
      ca.status === 'open' || ca.status === 'in_progress' || ca.status === 'pending_verification'
    ).length;
    const criticalCAs = correctiveActions.filter(ca =>
      ca.severity === 'critical' && ca.status !== 'closed'
    ).length;
    const z1Fails = swabPoints.filter(p => p.zone_number === 1 && p.last_result === 'fail').length;
    const pendingMicro = microbialResults.filter(r => r.result === 'pending').length;
    const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
    const dueTodayTasks = tasks.filter(t => t.status === 'due_today').length;
    const empDue = dueSchedule.filter(d => d.status !== 'completed').length;

    return {
      atpPassRate, openCAs, criticalCAs, z1Fails,
      pendingMicro, overdueTasks, dueTodayTasks, empDue,
    };
  }, [atpResults, correctiveActions, swabPoints, microbialResults, tasks, dueSchedule]);

  // ── Alert level ──
  const alertLevel = useMemo(() => {
    if (kpis.z1Fails > 0 || kpis.criticalCAs > 0) return 'critical';
    if (kpis.overdueTasks > 0 || kpis.openCAs > 0 || kpis.atpPassRate < 80) return 'warning';
    return 'nominal';
  }, [kpis]);

  const alertConfig = {
    critical: { color: HUD.red, label: 'CRITICAL — IMMEDIATE ACTION REQUIRED', icon: 'alert-circle' },
    warning:  { color: HUD.amber, label: 'WARNING — ITEMS REQUIRE ATTENTION',   icon: 'warning' },
    nominal:  { color: HUD.green, label: 'NOMINAL — ALL SYSTEMS OPERATING',      icon: 'checkmark-circle' },
  }[alertLevel];

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>SANITATION MODULE</Text>
          <Text style={s.headerTitle}>Command Dashboard</Text>
        </View>
        {/* Reload */}
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
          <Ionicons name="refresh" size={18} color={HUD.cyan} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={HUD.cyan} size="large" />
          <Text style={s.loadingTxt}>INITIALIZING SANITATION SYSTEMS...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}
        >

          {/* ── STATUS BANNER ── */}
          <View style={[s.alertBanner, { backgroundColor: alertConfig.color + '18', borderColor: alertConfig.color + '55' }]}>
            <Ionicons name={alertConfig.icon as any} size={20} color={alertConfig.color} />
            <View style={{ flex: 1 }}>
              <Text style={[s.alertLabel, { color: alertConfig.color }]}>{alertConfig.label}</Text>
              <Text style={s.alertSub}>
                {kpis.z1Fails > 0 ? `${kpis.z1Fails} Zone 1 point(s) failing · ` : ''}
                {kpis.criticalCAs > 0 ? `${kpis.criticalCAs} critical CA open · ` : ''}
                {kpis.overdueTasks > 0 ? `${kpis.overdueTasks} sanitation task(s) overdue · ` : ''}
                {alertLevel === 'nominal' ? 'No critical issues detected.' : ''}
              </Text>
            </View>
          </View>

          {/* ── KPI GRID ── */}
          <View>
            <SectionHeader label="KEY PERFORMANCE INDICATORS" />
            <View style={s.kpiGrid}>
              <KPICard
                label="ATP Pass Rate" value={`${kpis.atpPassRate}%`}
                sub={`${atpResults.length} results`}
                color={kpis.atpPassRate >= 90 ? HUD.green : kpis.atpPassRate >= 70 ? HUD.amber : HUD.red}
                icon="pulse"
                onPress={() => router.push('/(tabs)/sanitation/atp-log')}
              />
              <KPICard
                label="Tasks Overdue" value={kpis.overdueTasks}
                sub={`${kpis.dueTodayTasks} due today`}
                color={kpis.overdueTasks > 0 ? HUD.red : HUD.green}
                icon="alert-circle"
                onPress={() => router.push('/(tabs)/sanitation/mss')}
              />
              <KPICard
                label="Open CAs" value={kpis.openCAs}
                sub={kpis.criticalCAs > 0 ? `${kpis.criticalCAs} CRITICAL` : 'No critical'}
                color={kpis.criticalCAs > 0 ? HUD.red : kpis.openCAs > 0 ? HUD.amber : HUD.green}
                icon="bandage"
                onPress={() => router.push('/(tabs)/sanitation/corrective-actions')}
              />
              <KPICard
                label="EMP Due" value={kpis.empDue}
                sub={`${kpis.z1Fails} Zone 1 fail`}
                color={kpis.z1Fails > 0 ? HUD.red : kpis.empDue > 0 ? HUD.amber : HUD.green}
                icon="eye"
                onPress={() => router.push('/(tabs)/sanitation/emp-map')}
              />
              <KPICard
                label="Pending Micro" value={kpis.pendingMicro}
                sub="Awaiting lab results"
                color={kpis.pendingMicro > 0 ? HUD.amber : HUD.green}
                icon="flask"
                onPress={() => router.push('/(tabs)/sanitation/microbial-log')}
              />
              <KPICard
                label="Zone 1 Fails" value={kpis.z1Fails}
                sub={kpis.z1Fails > 0 ? 'Production halted' : 'All clear'}
                color={kpis.z1Fails > 0 ? HUD.red : HUD.green}
                icon="nuclear"
              />
            </View>
          </View>

          {/* ── FACILITY HEATMAP ── */}
          <View>
            <SectionHeader label="FACILITY STATUS HEATMAP" sub="Tap room to navigate" />
            <View style={s.heatmapLegend}>
              <LegendDot color={HUD.red} label="Overdue" />
              <LegendDot color={HUD.amber} label="Due today" />
              <LegendDot color={HUD.purple} label="Open CA" />
              <LegendDot color={HUD.green} label="Clear" />
            </View>
            <View style={s.heatmapGrid}>
              {roomData.map(rd => (
                <RoomCell
                  key={rd.room}
                  {...rd}
                  onPress={() => router.push('/(tabs)/sanitation/mss')}
                />
              ))}
            </View>
          </View>

          {/* ── EMP ZONE BARS ── */}
          <View>
            <SectionHeader label="EMP ZONE ATP PASS RATES" sub="Based on most recent results" />
            <View style={s.empZoneList}>
              {zoneData.map(z => <EMPZoneRow key={z.zoneNumber} {...z} />)}
            </View>
          </View>

          {/* ── MODULE NAV ── */}
          <View>
            <SectionHeader label="MODULE NAVIGATION" />
            <View style={s.moduleList}>
              <ModuleButton
                label="Master Sanitation Schedule"
                sub="Task assignments, SSOP links, completions"
                icon="calendar"
                color={HUD.cyan}
                badge={kpis.overdueTasks + kpis.dueTodayTasks}
                route="/(tabs)/sanitation/mss"
              />
              <ModuleButton
                label="ATP Swab Log"
                sub="Quick RLU entry, pass/warn/fail results"
                icon="pulse"
                color={HUD.green}
                badge={kpis.empDue}
                route="/(tabs)/sanitation/atp-log"
              />
              <ModuleButton
                label="EMP Zone Map"
                sub="Zone heatmap, swab schedule, point detail"
                icon="map"
                color={HUD.amber}
                badge={kpis.z1Fails}
                route="/(tabs)/sanitation/emp-map"
              />
              <ModuleButton
                label="Microbial Test Log"
                sub="Lab submissions, pathogen results, chain of custody"
                icon="flask"
                color={HUD.purple}
                badge={kpis.pendingMicro}
                route="/(tabs)/sanitation/microbial-log"
              />
              <ModuleButton
                label="Corrective Actions"
                sub="CAPA management, Zone 1 vector swabs"
                icon="bandage"
                color={kpis.criticalCAs > 0 ? HUD.red : HUD.amber}
                badge={kpis.openCAs}
                route="/(tabs)/sanitation/corrective-actions"
              />
              <ModuleButton
                label="SSOP Library"
                sub="Procedures, step-by-step instructions, versions"
                icon="document-text"
                color={HUD.cyan}
                route="/(tabs)/sanitation/ssop-library"
              />
            </View>
          </View>

          {/* ── RECENT ALERTS ── */}
          {(kpis.z1Fails > 0 || kpis.criticalCAs > 0 || kpis.overdueTasks > 0) && (
            <View>
              <SectionHeader label="ACTIVE ALERTS" />
              <View style={s.alertList}>
                {kpis.z1Fails > 0 && (
                  <AlertRow
                    color={HUD.red}
                    icon="nuclear"
                    title={`ZONE 1 PATHOGEN RISK — ${kpis.z1Fails} point(s) failing`}
                    sub="Production halt may be in effect. Verify corrective actions."
                    onPress={() => router.push('/(tabs)/sanitation/emp-map')}
                  />
                )}
                {kpis.criticalCAs > 0 && (
                  <AlertRow
                    color={HUD.red}
                    icon="alert-circle"
                    title={`${kpis.criticalCAs} CRITICAL CA(s) OPEN`}
                    sub="Immediate corrective action required."
                    onPress={() => router.push('/(tabs)/sanitation/corrective-actions')}
                  />
                )}
                {kpis.overdueTasks > 0 && (
                  <AlertRow
                    color={HUD.amber}
                    icon="time"
                    title={`${kpis.overdueTasks} sanitation task(s) OVERDUE`}
                    sub="Past-due sanitationschedule items require completion."
                    onPress={() => router.push('/(tabs)/sanitation/mss')}
                  />
                )}
              </View>
            </View>
          )}

          {/* ── COMPLIANCE SUMMARY ── */}
          <View>
            <SectionHeader label="SQF COMPLIANCE SNAPSHOT" />
            <View style={s.complianceGrid}>
              <ComplianceCard
                code="SQF 11.2.6"
                label="Sanitation & Cleaning"
                items={[
                  { label: 'MSS Active', ok: tasks.length > 0 },
                  { label: 'SSOPs on file', ok: true },
                  { label: 'No overdue tasks', ok: kpis.overdueTasks === 0 },
                  { label: 'Open CAs managed', ok: kpis.openCAs < 5 },
                ]}
              />
              <ComplianceCard
                code="SQF 2.4.8"
                label="Environmental Monitoring"
                items={[
                  { label: 'EMP zones defined', ok: swabPoints.length > 0 },
                  { label: 'ATP schedule active', ok: dueSchedule.length > 0 },
                  { label: 'No Zone 1 fail', ok: kpis.z1Fails === 0 },
                  { label: 'Micro results logged', ok: microbialResults.length > 0 },
                ]}
              />
            </View>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────
function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={s.sectionLine} />
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={[s.sectionLine, { flex: 1 }]} />
      </View>
      {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: HUD.textDim }}>{label}</Text>
    </View>
  );
}

function AlertRow({ color, icon, title, sub, onPress }: {
  color: string; icon: any; title: string; sub: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.alertRow, { borderLeftColor: color, backgroundColor: color + '0d' }]}
      onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={18} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[s.alertRowTitle, { color }]}>{title}</Text>
        <Text style={s.alertRowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={color + '88'} />
    </TouchableOpacity>
  );
}

function ComplianceCard({ code, label, items }: {
  code: string; label: string;
  items: { label: string; ok: boolean }[];
}) {
  const passing = items.filter(i => i.ok).length;
  const total = items.length;
  const color = passing === total ? HUD.green : passing >= total / 2 ? HUD.amber : HUD.red;

  return (
    <View style={[s.compCard, { borderTopColor: color, borderTopWidth: 2 }]}>
      <Text style={[s.compCode, { color }]}>{code}</Text>
      <Text style={s.compLabel}>{label}</Text>
      <View style={s.compItems}>
        {items.map((item, i) => (
          <View key={i} style={s.compItem}>
            <Ionicons
              name={item.ok ? 'checkmark-circle' : 'close-circle'}
              size={13}
              color={item.ok ? HUD.green : HUD.red}
            />
            <Text style={[s.compItemTxt, { color: item.ok ? HUD.textSec : HUD.red }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[s.compScore, { color }]}>{passing}/{total}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HUD.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: HUD.border, backgroundColor: HUD.bgCard },
  backBtn: { padding: 4, marginRight: 8 },
  headerSub: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD.text },
  refreshBtn: { padding: 8, backgroundColor: HUD.cyanDim, borderRadius: 8, borderWidth: 1, borderColor: HUD.cyan + '44' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 2 },

  // Status banner
  alertBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  alertLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 },
  alertSub: { fontSize: 11, color: HUD.textSec, lineHeight: 16 },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: { backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12, alignItems: 'center', gap: 4, width: (SCREEN_W - 32 - 8) / 3 - 0.5 },
  kpiIconBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  kpiVal: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  kpiLabel: { fontSize: 8, fontWeight: '700', color: HUD.textDim, letterSpacing: 1, textAlign: 'center' },
  kpiSub: { fontSize: 9, color: HUD.textDim, textAlign: 'center' },

  // Heatmap
  heatmapLegend: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomCell: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  roomLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  roomDots: { flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap' },
  roomDot: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  roomDotTxt: { fontSize: 10, fontWeight: '800', color: HUD.bg },
  atpBar: { height: 4, backgroundColor: HUD.border, borderRadius: 2, overflow: 'hidden' },
  atpBarFill: { height: 4, borderRadius: 2 },
  atpPct: { fontSize: 10, fontWeight: '700' },
  z1Badge: { backgroundColor: HUD.red, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  z1BadgeTxt: { fontSize: 8, fontWeight: '800', color: HUD.bg },

  // EMP zones
  empZoneList: { gap: 8 },
  empZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12 },
  empZoneDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empZoneDotTxt: { fontSize: 12, fontWeight: '800', color: HUD.bg },
  empZoneLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  empZonePct: { fontSize: 13, fontWeight: '800' },
  empZoneBar: { height: 5, backgroundColor: HUD.border, borderRadius: 3, overflow: 'hidden' },
  empZoneBarFill: { height: 5, borderRadius: 3 },
  empZoneRight: { gap: 4, alignItems: 'flex-end' },
  empPosBadge: { backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '55', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  empPosBadgeTxt: { fontSize: 9, fontWeight: '800', color: HUD.red },

  // Module nav
  moduleList: { gap: 8 },
  moduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 14 },
  moduleIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontSize: 13, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  moduleSub: { fontSize: 11, color: HUD.textSec },
  moduleBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  moduleBadgeTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg },

  // Alert rows
  alertList: { gap: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: HUD.border },
  alertRowTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 2 },
  alertRowSub: { fontSize: 11, color: HUD.textSec },

  // Compliance
  complianceGrid: { flexDirection: 'row', gap: 10 },
  compCard: { flex: 1, backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12 },
  compCode: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  compLabel: { fontSize: 11, color: HUD.textSec, marginBottom: 10 },
  compItems: { gap: 6 },
  compItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compItemTxt: { fontSize: 11, flex: 1 },
  compScore: { fontSize: 18, fontWeight: '800', marginTop: 10, textAlign: 'center' },

  // Section header
  sectionLabel: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2 },
  sectionSub: { fontSize: 10, color: HUD.textDim, marginTop: 2, marginLeft: 2 },
  sectionLine: { width: 20, height: 1, backgroundColor: HUD.border },
});
