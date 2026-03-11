// app/(tabs)/sanitation/emp-map.tsx
// Environmental Monitoring Program — Zone Map & Swab Schedule
// Full HUD theme · TulKenz OPS

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl, Alert,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEMPSwabs,
  EMPZone,
  EMPSwabPoint,
  EMPSwabScheduleItem,
} from '../../../hooks/useEMPSwabs';

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
  border: '#0d2840', borderBright: '#1a4060',
};

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ZONE_COLORS: Record<number, string> = {
  1: HUD.red, 2: HUD.amber, 3: HUD.purple, 4: HUD.cyan,
};
const ZONE_RISK: Record<number, string> = {
  1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW',
};
const ZONE_DESCRIPTIONS: Record<number, string> = {
  1: 'Direct food contact surfaces — equipment, conveyors, utensils.',
  2: 'Surfaces adjacent to food — splash zones, equipment exteriors.',
  3: 'Non-food contact surfaces — floors, walls, drains, non-contact equipment.',
  4: 'General facility — offices, hallways, exterior doors.',
};

const ROOMS = ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'];
const ROOM_FULL: Record<string, string> = {
  PR1: 'Processing Room 1', PR2: 'Processing Room 2',
  PA1: 'Packing Area 1', PA2: 'Packing Area 2',
  BB1: 'Bulk Blending 1', SB1: 'Staging / Break 1',
};

const ATP_PASS = 100;
const ATP_WARN = 200;

function getATPStatus(rlu: number | null): { label: string; color: string; dim: string } | null {
  if (rlu === null) return null;
  if (rlu <= ATP_PASS) return { label: 'PASS', color: HUD.green, dim: HUD.greenDim };
  if (rlu <= ATP_WARN) return { label: 'WARN', color: HUD.amber, dim: HUD.amberDim };
  return { label: 'FAIL', color: HUD.red, dim: HUD.redDim };
}

// ─────────────────────────────────────────────
// FACILITY GRID — Room × Zone heatmap
// ─────────────────────────────────────────────
function FacilityHeatmap({
  swabPoints,
  onRoomPress,
}: {
  swabPoints: EMPSwabPoint[];
  onRoomPress: (room: string) => void;
}) {
  // For each room, calculate zone coverage + pass rate
  const roomStats = useMemo(() => {
    return ROOMS.map(room => {
      const pts = swabPoints.filter(p => p.room === room);
      const total = pts.length;
      const withResults = pts.filter(p => p.last_atp_result !== null);
      const passed = withResults.filter(p => (p.last_atp_result ?? 999) <= ATP_PASS).length;
      const failed = withResults.filter(p => (p.last_atp_result ?? 0) > ATP_WARN).length;
      const warned = withResults.filter(p => {
        const r = p.last_atp_result ?? 0;
        return r > ATP_PASS && r <= ATP_WARN;
      }).length;
      const passRate = withResults.length > 0
        ? Math.round((passed / withResults.length) * 100) : null;
      const zones = [...new Set(pts.map(p => p.zone_number))].sort();
      const hasZ1 = zones.includes(1);
      const z1Fail = pts.some(p => p.zone_number === 1 && p.last_atp_result !== null && p.last_atp_result > ATP_WARN);

      return { room, total, withResults: withResults.length, passed, failed, warned, passRate, zones, hasZ1, z1Fail };
    });
  }, [swabPoints]);

  return (
    <View style={hm.container}>
      <View style={hm.titleRow}>
        <Ionicons name="grid" size={14} color={HUD.cyan} />
        <Text style={hm.title}>FACILITY ZONE MAP</Text>
        <Text style={hm.subtitle}>Tap a room for details</Text>
      </View>

      {/* Legend */}
      <View style={hm.legend}>
        {[1, 2, 3, 4].map(z => (
          <View key={z} style={hm.legendItem}>
            <View style={[hm.legendDot, { backgroundColor: ZONE_COLORS[z] }]} />
            <Text style={hm.legendTxt}>Z{z} — {ZONE_RISK[z]}</Text>
          </View>
        ))}
      </View>

      {/* Room grid */}
      <View style={hm.grid}>
        {roomStats.map(rs => {
          const borderColor = rs.z1Fail ? HUD.red : rs.failed > 0 ? HUD.amber : rs.passRate === 100 ? HUD.green : HUD.border;
          const glowColor = rs.z1Fail ? HUD.redDim : rs.failed > 0 ? HUD.amberDim : HUD.bgCardAlt;

          return (
            <TouchableOpacity
              key={rs.room}
              style={[hm.roomCard, { borderColor, backgroundColor: glowColor }]}
              onPress={() => onRoomPress(rs.room)}
              activeOpacity={0.75}
            >
              {/* Room name */}
              <Text style={hm.roomCode}>{rs.room}</Text>
              <Text style={hm.roomFull} numberOfLines={1}>{ROOM_FULL[rs.room]}</Text>

              {/* Zone dots */}
              <View style={hm.zoneDots}>
                {rs.zones.map(z => (
                  <View key={z} style={[hm.zoneDot, { backgroundColor: ZONE_COLORS[z] }]}>
                    <Text style={hm.zoneDotTxt}>{z}</Text>
                  </View>
                ))}
              </View>

              {/* Pass rate */}
              {rs.passRate !== null ? (
                <View style={[hm.passRate, {
                  backgroundColor: rs.passRate === 100 ? HUD.greenDim : rs.passRate >= 80 ? HUD.amberDim : HUD.redDim,
                }]}>
                  <Text style={[hm.passRateTxt, {
                    color: rs.passRate === 100 ? HUD.green : rs.passRate >= 80 ? HUD.amber : HUD.red,
                  }]}>
                    {rs.passRate}% PASS
                  </Text>
                </View>
              ) : (
                <View style={[hm.passRate, { backgroundColor: HUD.bgCard }]}>
                  <Text style={[hm.passRateTxt, { color: HUD.textDim }]}>NO DATA</Text>
                </View>
              )}

              {/* Fail indicator */}
              {rs.z1Fail && (
                <View style={hm.z1FailBadge}>
                  <Ionicons name="alert-circle" size={10} color={HUD.bg} />
                  <Text style={hm.z1FailTxt}>Z1 FAIL</Text>
                </View>
              )}

              {/* Point count */}
              <Text style={hm.pointCount}>{rs.total} pts</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const hm = StyleSheet.create({
  container: { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, padding: 14, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 2, flex: 1 },
  subtitle: { fontSize: 10, color: HUD.textDim },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: HUD.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 10, color: HUD.textSec, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomCard: {
    width: '30.5%', borderRadius: 10, borderWidth: 1,
    padding: 10, gap: 4, position: 'relative',
  },
  roomCode: { fontSize: 14, fontWeight: '800', color: HUD.text, letterSpacing: 1 },
  roomFull: { fontSize: 9, color: HUD.textDim, letterSpacing: 0.3 },
  zoneDots: { flexDirection: 'row', gap: 4, marginVertical: 4 },
  zoneDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  zoneDotTxt: { fontSize: 9, fontWeight: '800', color: HUD.bg },
  passRate: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  passRateTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  z1FailBadge: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: HUD.red, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  z1FailTxt: { fontSize: 8, fontWeight: '800', color: HUD.bg, letterSpacing: 0.5 },
  pointCount: { fontSize: 9, color: HUD.textDim, marginTop: 2 },
});

// ─────────────────────────────────────────────
// ZONE OVERVIEW CARD
// ─────────────────────────────────────────────
function ZoneCard({
  zone,
  swabPoints,
  onPress,
}: {
  zone: EMPZone;
  swabPoints: EMPSwabPoint[];
  onPress: () => void;
}) {
  const color = ZONE_COLORS[zone.zone_number] ?? HUD.textSec;
  const pts = swabPoints.filter(p => p.zone_number === zone.zone_number);
  const withResults = pts.filter(p => p.last_atp_result !== null);
  const passed = withResults.filter(p => (p.last_atp_result ?? 999) <= ATP_PASS).length;
  const failed = withResults.filter(p => (p.last_atp_result ?? 0) > ATP_WARN).length;
  const passRate = withResults.length > 0 ? Math.round((passed / withResults.length) * 100) : null;

  return (
    <TouchableOpacity
      style={[s.zoneCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.zoneCardTop}>
        <View style={[s.zoneNumberBox, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[s.zoneNumber, { color }]}>Z{zone.zone_number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.zoneName, { color }]}>{zone.zone_name}</Text>
            <View style={[s.riskBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
              <Text style={[s.riskTxt, { color }]}>{ZONE_RISK[zone.zone_number]}</Text>
            </View>
          </View>
          <Text style={s.zoneDesc} numberOfLines={2}>{ZONE_DESCRIPTIONS[zone.zone_number]}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={HUD.textDim} />
      </View>

      {/* Stats row */}
      <View style={s.zoneStats}>
        <View style={s.zoneStatItem}>
          <Text style={[s.zoneStatVal, { color }]}>{pts.length}</Text>
          <Text style={s.zoneStatLbl}>POINTS</Text>
        </View>
        <View style={s.zoneStatDiv} />
        <View style={s.zoneStatItem}>
          <Text style={[s.zoneStatVal, { color: HUD.green }]}>{passed}</Text>
          <Text style={s.zoneStatLbl}>PASS</Text>
        </View>
        <View style={s.zoneStatDiv} />
        <View style={s.zoneStatItem}>
          <Text style={[s.zoneStatVal, { color: HUD.red }]}>{failed}</Text>
          <Text style={s.zoneStatLbl}>FAIL</Text>
        </View>
        <View style={s.zoneStatDiv} />
        <View style={s.zoneStatItem}>
          <Text style={[s.zoneStatVal, {
            color: passRate === null ? HUD.textDim : passRate === 100 ? HUD.green : passRate >= 80 ? HUD.amber : HUD.red,
          }]}>
            {passRate !== null ? `${passRate}%` : '—'}
          </Text>
          <Text style={s.zoneStatLbl}>PASS RATE</Text>
        </View>
        <View style={s.zoneStatDiv} />
        <View style={s.zoneStatItem}>
          <Text style={[s.zoneStatVal, { color: HUD.cyan }]}>{zone.sample_size}</Text>
          <Text style={s.zoneStatLbl}>SAMPLE SZ</Text>
        </View>
      </View>

      {/* Sampling frequency */}
      <View style={s.zoneSamplingRow}>
        <Ionicons name="calendar-outline" size={12} color={HUD.textDim} />
        <Text style={s.zoneSamplingTxt}>
          {zone.sampling_frequency} · {zone.sample_size} samples per cycle
        </Text>
        {zone.zone_number === 1 && (
          <View style={[s.z1Warning, { backgroundColor: HUD.redDim, borderColor: HUD.red + '44' }]}>
            <Ionicons name="alert-circle" size={11} color={HUD.red} />
            <Text style={s.z1WarningTxt}>FAIL = PRODUCTION HALT</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// SWAB POINT DETAIL MODAL
// ─────────────────────────────────────────────
function SwabPointModal({
  point, onClose, onLogATP,
}: {
  point: EMPSwabPoint;
  onClose: () => void;
  onLogATP: () => void;
}) {
  const color = ZONE_COLORS[point.zone_number] ?? HUD.textSec;
  const lastStatus = getATPStatus(point.last_atp_result ?? null);

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.sheetLabel, { color }]}>ZONE {point.zone_number} — {ZONE_RISK[point.zone_number]}</Text>
          <Text style={s.sheetTitle}>{point.point_name}</Text>
          <Text style={s.sheetMeta}>{point.point_code} · {point.room} · {ROOM_FULL[point.room]}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Location */}
        <View style={s.infoBox}>
          <InfoRow icon="location" color={HUD.purple} label="Location" value={point.location_description} />
          <InfoRow icon="flask" color={HUD.cyan} label="ATP Freq" value={point.atp_frequency === 'none' ? 'Not ATP tested' : point.atp_frequency} />
          <InfoRow icon="beaker" color={HUD.amber} label="Micro Freq" value={point.micro_frequency ?? 'N/A'} />
          {point.surface_type ? <InfoRow icon="layers" color={HUD.green} label="Surface" value={point.surface_type} /> : null}
        </View>

        {/* Last result */}
        <Text style={s.sectionLbl}>LAST ATP RESULT</Text>
        {lastStatus && point.last_atp_result !== null ? (
          <View style={[s.lastResultBox, { backgroundColor: lastStatus.dim, borderColor: lastStatus.color + '55' }]}>
            <View style={[s.lastResultDot, { backgroundColor: lastStatus.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.lastResultVal, { color: lastStatus.color }]}>
                {point.last_atp_result} RLU — {lastStatus.label}
              </Text>
              {point.last_tested_at ? (
                <Text style={s.lastResultDate}>
                  {new Date(point.last_tested_at).toLocaleDateString()} {new Date(point.last_tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[s.lastResultBox, { backgroundColor: HUD.bgCardAlt, borderColor: HUD.border }]}>
            <Text style={{ fontSize: 12, color: HUD.textDim }}>No results recorded yet.</Text>
          </View>
        )}

        {/* Status flags */}
        {(point.is_overdue || point.is_due_today) ? (
          <View style={[s.dueFlag, {
            backgroundColor: point.is_overdue ? HUD.redDim : HUD.amberDim,
            borderColor: (point.is_overdue ? HUD.red : HUD.amber) + '55',
          }]}>
            <Ionicons name="time" size={14} color={point.is_overdue ? HUD.red : HUD.amber} />
            <Text style={[s.dueFlagTxt, { color: point.is_overdue ? HUD.red : HUD.amber }]}>
              {point.is_overdue ? 'OVERDUE — Swab needed immediately' : 'DUE TODAY — Swab required today'}
            </Text>
          </View>
        ) : null}

        {/* Log ATP button */}
        {point.atp_frequency !== 'none' ? (
          <TouchableOpacity style={s.logATPBtn} onPress={onLogATP}>
            <Ionicons name="flask" size={16} color={HUD.bg} />
            <Text style={s.logATPBtnTxt}>LOG ATP RESULT FOR THIS POINT</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: HUD.textSec, width: 70 }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: HUD.text, flex: 1 }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// ZONE DETAIL MODAL
// ─────────────────────────────────────────────
function ZoneDetailModal({
  zone, swabPoints, onClose, onSelectPoint,
}: {
  zone: EMPZone;
  swabPoints: EMPSwabPoint[];
  onClose: () => void;
  onSelectPoint: (p: EMPSwabPoint) => void;
}) {
  const color = ZONE_COLORS[zone.zone_number] ?? HUD.textSec;
  const [roomFilter, setRoomFilter] = useState('All');

  const pts = useMemo(() => {
    let list = swabPoints.filter(p => p.zone_number === zone.zone_number);
    if (roomFilter !== 'All') list = list.filter(p => p.room === roomFilter);
    return list;
  }, [swabPoints, zone.zone_number, roomFilter]);

  return (
    <View style={s.sheet}>
      <View style={[s.sheetHeader, { borderLeftWidth: 4, borderLeftColor: color }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.sheetLabel, { color }]}>EMP — ZONE {zone.zone_number}</Text>
          <Text style={s.sheetTitle}>{zone.zone_name}</Text>
          <Text style={s.sheetMeta}>{ZONE_RISK[zone.zone_number]} RISK · {zone.sampling_frequency} · {zone.sample_size} samples</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      {/* Zone description */}
      <View style={[s.zoneDescBox, { borderLeftColor: color }]}>
        <Text style={s.zoneDescTxt}>{ZONE_DESCRIPTIONS[zone.zone_number]}</Text>
        {zone.zone_number === 1 && (
          <Text style={[s.zoneDescNote, { color: HUD.red }]}>
            ⚠ Any ATP FAIL in Zone 1 requires immediate production halt and 3 consecutive negative results before resuming.
          </Text>
        )}
      </View>

      {/* Room filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border }}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
        {['All', ...ROOMS].map(r => (
          <TouchableOpacity key={r}
            style={[s.filterChip, roomFilter === r && { backgroundColor: color + '22', borderColor: color + '55' }]}
            onPress={() => setRoomFilter(r)}>
            <Text style={[s.filterChipTxt, roomFilter === r && { color }]}>
              {r === 'All' ? 'ALL ROOMS' : r}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
        {pts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="search" size={36} color={HUD.textDim} />
            <Text style={[s.emptyTitle, { color: HUD.textDim }]}>NO POINTS</Text>
            <Text style={s.emptySub}>No swab points in this zone for the selected room.</Text>
          </View>
        ) : pts.map(pt => {
          const st = getATPStatus(pt.last_atp_result ?? null);
          return (
            <TouchableOpacity
              key={pt.id}
              style={[s.zonePointCard, { borderLeftColor: st ? st.color : HUD.border }]}
              onPress={() => onSelectPoint(pt)}
              activeOpacity={0.75}
            >
              <View style={s.zonePointTop}>
                <Text style={s.zonePointCode}>{pt.point_code}</Text>
                <Text style={s.zonePointRoom}>{pt.room}</Text>
                {pt.is_overdue && (
                  <View style={[s.miniChip, { backgroundColor: HUD.redDim, borderColor: HUD.red + '55' }]}>
                    <Text style={[s.miniChipTxt, { color: HUD.red }]}>OVERDUE</Text>
                  </View>
                )}
                {pt.is_due_today && !pt.is_overdue && (
                  <View style={[s.miniChip, { backgroundColor: HUD.amberDim, borderColor: HUD.amber + '55' }]}>
                    <Text style={[s.miniChipTxt, { color: HUD.amber }]}>DUE TODAY</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={14} color={HUD.textDim} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={s.zonePointName}>{pt.point_name}</Text>
              <Text style={s.zonePointLoc}>{pt.location_description}</Text>
              {st && pt.last_atp_result !== null ? (
                <View style={[s.zonePointResult, { backgroundColor: st.dim }]}>
                  <Text style={[s.zonePointResultTxt, { color: st.color }]}>
                    Last: {pt.last_atp_result} RLU — {st.label}
                  </Text>
                </View>
              ) : (
                <View style={[s.zonePointResult, { backgroundColor: HUD.bgCardAlt }]}>
                  <Text style={{ fontSize: 10, color: HUD.textDim }}>No result recorded</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// SCHEDULE TAB
// ─────────────────────────────────────────────
function ScheduleTab({
  schedule, swabPoints, loading,
}: {
  schedule: EMPSwabScheduleItem[];
  swabPoints: EMPSwabPoint[];
  loading: boolean;
}) {
  const grouped = useMemo(() => {
    const pending = schedule.filter(i => i.status === 'pending');
    const completed = schedule.filter(i => i.status === 'completed');
    const missed = schedule.filter(i => i.status === 'missed');
    return { pending, completed, missed };
  }, [schedule]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={HUD.cyan} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {grouped.missed.length > 0 && (
        <>
          <ScheduleSectionHeader label="MISSED" color={HUD.red} count={grouped.missed.length} />
          {grouped.missed.map(item => <ScheduleItem key={item.id} item={item} swabPoints={swabPoints} />)}
        </>
      )}
      {grouped.pending.length > 0 && (
        <>
          <ScheduleSectionHeader label="PENDING" color={HUD.amber} count={grouped.pending.length} />
          {grouped.pending.map(item => <ScheduleItem key={item.id} item={item} swabPoints={swabPoints} />)}
        </>
      )}
      {grouped.completed.length > 0 && (
        <>
          <ScheduleSectionHeader label="COMPLETED" color={HUD.green} count={grouped.completed.length} />
          {grouped.completed.map(item => <ScheduleItem key={item.id} item={item} swabPoints={swabPoints} />)}
        </>
      )}
      {schedule.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="calendar" size={48} color={HUD.textDim} />
          <Text style={[s.emptyTitle, { color: HUD.textDim }]}>NO SCHEDULE</Text>
          <Text style={s.emptySub}>No schedule generated yet. Schedule is created automatically each week.</Text>
        </View>
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function ScheduleSectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <View style={[s.schedSectionHeader, { borderLeftColor: color }]}>
      <Text style={[s.schedSectionTxt, { color }]}>{label}</Text>
      <View style={[s.schedSectionBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Text style={[s.schedSectionBadgeTxt, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

function ScheduleItem({ item, swabPoints }: { item: EMPSwabScheduleItem; swabPoints: EMPSwabPoint[] }) {
  const pt = swabPoints.find(p => p.id === item.swab_point_id);
  const color = ZONE_COLORS[item.zone_number ?? 1] ?? HUD.textSec;
  const statusColor = item.status === 'completed' ? HUD.green : item.status === 'missed' ? HUD.red : HUD.amber;

  return (
    <View style={[s.schedCard, { borderLeftColor: color }]}>
      <View style={s.schedCardTop}>
        <View style={[s.schedZoneDot, { backgroundColor: color }]}>
          <Text style={s.schedZoneDotTxt}>{item.zone_number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.schedPointCode}>{pt?.point_code ?? item.swab_point_id.slice(0, 8)}</Text>
          <Text style={s.schedPointName}>{pt?.point_name ?? 'Swab Point'}</Text>
        </View>
        <View style={[s.schedStatus, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <Text style={[s.schedStatusTxt, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={s.schedMeta}>
        <View style={s.metaItem}>
          <Ionicons name="calendar-outline" size={11} color={HUD.textDim} />
          <Text style={s.metaItemTxt}>
            {new Date(item.scheduled_date).toLocaleDateString()}
          </Text>
        </View>
        {item.completed_by && (
          <View style={s.metaItem}>
            <Ionicons name="person-outline" size={11} color={HUD.textDim} />
            <Text style={s.metaItemTxt}>{item.completed_by}</Text>
          </View>
        )}
        {item.rlu_result !== null && item.rlu_result !== undefined && (
          <View style={s.metaItem}>
            <Ionicons name="flask-outline" size={11} color={HUD.textDim} />
            <Text style={[s.metaItemTxt, {
              color: item.rlu_result <= ATP_PASS ? HUD.green : item.rlu_result <= ATP_WARN ? HUD.amber : HUD.red,
            }]}>
              {item.rlu_result} RLU
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function EMPMapScreen() {
  const {
    zones, swabPoints, schedule, loading,
    fetchZones, fetchSwabPoints, fetchDueSchedule,
  } = useEMPSwabs();

  const [viewMode, setViewMode] = useState<'map' | 'zones' | 'schedule'>('map');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<EMPZone | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<EMPSwabPoint | null>(null);
  const [zoneDetailModal, setZoneDetailModal] = useState(false);
  const [pointDetailModal, setPointDetailModal] = useState(false);
  const [roomFilter, setRoomFilter] = useState('All');

  useEffect(() => { loadData(); }, [viewMode]);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchZones(),
      fetchSwabPoints(),
      viewMode === 'schedule' ? fetchDueSchedule() : Promise.resolve(),
    ]);
  }, [viewMode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openZoneDetail = (zone: EMPZone) => {
    setSelectedZone(zone);
    setZoneDetailModal(true);
  };

  const openPointDetail = (point: EMPSwabPoint) => {
    setSelectedPoint(point);
    setPointDetailModal(true);
  };

  // Filtered points for zones tab
  const filteredPoints = useMemo(() => {
    if (roomFilter === 'All') return swabPoints;
    return swabPoints.filter(p => p.room === roomFilter);
  }, [swabPoints, roomFilter]);

  // Overall stats
  const overallStats = useMemo(() => {
    const withResults = swabPoints.filter(p => p.last_atp_result !== null);
    const passed = withResults.filter(p => (p.last_atp_result ?? 999) <= ATP_PASS).length;
    const failed = withResults.filter(p => (p.last_atp_result ?? 0) > ATP_WARN).length;
    const z1Fails = swabPoints.filter(p => p.zone_number === 1 && p.last_atp_result !== null && p.last_atp_result > ATP_WARN).length;
    const passRate = withResults.length > 0 ? Math.round((passed / withResults.length) * 100) : null;
    return {
      total: swabPoints.length,
      tested: withResults.length,
      passed,
      failed,
      z1Fails,
      passRate,
      overdue: swabPoints.filter(p => p.is_overdue).length,
      dueToday: swabPoints.filter(p => p.is_due_today).length,
    };
  }, [swabPoints]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>ENVIRONMENTAL MONITORING</Text>
          <Text style={s.headerTitle}>EMP Zone Map</Text>
        </View>
        {overallStats.z1Fails > 0 && (
          <View style={s.z1Alert}>
            <Ionicons name="alert-circle" size={12} color={HUD.red} />
            <Text style={s.z1AlertTxt}>ZONE 1 FAIL</Text>
          </View>
        )}
      </View>

      {/* ── STAT STRIP ── */}
      <View style={s.statStrip}>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.cyan }]}>{overallStats.total}</Text>
          <Text style={s.statLbl}>TOTAL PTS</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.red }]}>{overallStats.overdue}</Text>
          <Text style={s.statLbl}>OVERDUE</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.amber }]}>{overallStats.dueToday}</Text>
          <Text style={s.statLbl}>DUE TODAY</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.red }]}>{overallStats.failed}</Text>
          <Text style={s.statLbl}>FAILURES</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, {
            color: overallStats.passRate === null ? HUD.textDim
              : overallStats.passRate >= 90 ? HUD.green
              : overallStats.passRate >= 75 ? HUD.amber
              : HUD.red,
          }]}>
            {overallStats.passRate !== null ? `${overallStats.passRate}%` : '—'}
          </Text>
          <Text style={s.statLbl}>PASS RATE</Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabRow}>
        {([
          { k: 'map', l: 'FACILITY MAP', icon: 'grid-outline' },
          { k: 'zones', l: 'ZONE DETAIL', icon: 'layers-outline' },
          { k: 'schedule', l: 'SCHEDULE', icon: 'calendar-outline' },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.k}
            style={[s.tab, viewMode === tab.k && s.tabActive]}
            onPress={() => setViewMode(tab.k)}>
            <Ionicons name={tab.icon} size={14} color={viewMode === tab.k ? HUD.cyan : HUD.textDim} />
            <Text style={[s.tabTxt, viewMode === tab.k && s.tabTxtActive]}>{tab.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONTENT ── */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={HUD.cyan} size="large" />
          <Text style={s.loadingTxt}>LOADING EMP DATA...</Text>
        </View>
      ) : (
        <>
          {/* MAP TAB */}
          {viewMode === 'map' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>
              <FacilityHeatmap swabPoints={swabPoints} onRoomPress={(room) => {
                setRoomFilter(room);
                setViewMode('zones');
              }} />
              {/* Zone overview cards on map tab */}
              {zones.map(z => (
                <ZoneCard key={z.id} zone={z} swabPoints={swabPoints} onPress={() => openZoneDetail(z)} />
              ))}
              <View style={{ height: 80 }} />
            </ScrollView>
          )}

          {/* ZONES TAB */}
          {viewMode === 'zones' && (
            <>
              {/* Room filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={s.filterRow}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
                {['All', ...ROOMS].map(r => (
                  <TouchableOpacity key={r}
                    style={[s.filterChip, roomFilter === r && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                    onPress={() => setRoomFilter(r)}>
                    <Text style={[s.filterChipTxt, roomFilter === r && { color: HUD.purple }]}>
                      {r === 'All' ? 'ALL ROOMS' : r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>
                {zones.map(z => (
                  <ZoneCard key={z.id} zone={z} swabPoints={filteredPoints} onPress={() => openZoneDetail(z)} />
                ))}
                <View style={{ height: 80 }} />
              </ScrollView>
            </>
          )}

          {/* SCHEDULE TAB */}
          {viewMode === 'schedule' && (
            <ScheduleTab schedule={schedule} swabPoints={swabPoints} loading={loading} />
          )}
        </>
      )}

      {/* ── ZONE DETAIL MODAL ── */}
      <Modal visible={zoneDetailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedZone && (
            <ZoneDetailModal
              zone={selectedZone}
              swabPoints={swabPoints}
              onClose={() => setZoneDetailModal(false)}
              onSelectPoint={(p) => {
                setSelectedPoint(p);
                setZoneDetailModal(false);
                setPointDetailModal(true);
              }}
            />
          )}
        </View>
      </Modal>

      {/* ── SWAB POINT DETAIL MODAL ── */}
      <Modal visible={pointDetailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedPoint && (
            <SwabPointModal
              point={selectedPoint}
              onClose={() => setPointDetailModal(false)}
              onLogATP={() => {
                setPointDetailModal(false);
                router.push('/(tabs)/sanitation/atp-log');
              }}
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HUD.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: HUD.border,
    backgroundColor: HUD.bgCard,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerSub: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD.text },
  z1Alert: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  z1AlertTxt: { fontSize: 10, fontWeight: '800', color: HUD.red, letterSpacing: 1 },

  statStrip: { flexDirection: 'row', backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  statLbl: { fontSize: 7, fontWeight: '600', color: HUD.textDim, letterSpacing: 1.2, marginTop: 1 },
  statDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 8 },

  tabRow: { flexDirection: 'row', backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, gap: 3 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: HUD.cyan },
  tabTxt: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },
  tabTxtActive: { color: HUD.cyan },

  filterRow: { backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  filterChipTxt: { fontSize: 10, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 2 },

  // Zone card
  zoneCard: {
    backgroundColor: HUD.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3,
    marginBottom: 12, overflow: 'hidden',
  },
  zoneCardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  zoneNumberBox: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  zoneNumber: { fontSize: 18, fontWeight: '900' },
  zoneName: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  riskBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  riskTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  zoneDesc: { fontSize: 11, color: HUD.textSec, lineHeight: 16 },
  zoneStats: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: HUD.border,
    backgroundColor: HUD.bgCardAlt,
  },
  zoneStatItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  zoneStatVal: { fontSize: 16, fontWeight: '800' },
  zoneStatLbl: { fontSize: 7, fontWeight: '600', color: HUD.textDim, letterSpacing: 1, marginTop: 1 },
  zoneStatDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 6 },
  zoneSamplingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: HUD.border,
  },
  zoneSamplingTxt: { fontSize: 11, color: HUD.textSec, flex: 1 },
  z1Warning: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  z1WarningTxt: { fontSize: 9, fontWeight: '800', color: HUD.red, letterSpacing: 0.5 },

  // Zone detail modal point card
  zonePointCard: {
    backgroundColor: HUD.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3,
    marginBottom: 8, padding: 12,
  },
  zonePointTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  zonePointCode: { fontSize: 10, fontWeight: '800', color: HUD.cyan, letterSpacing: 1 },
  zonePointRoom: { fontSize: 10, fontWeight: '700', color: HUD.purple },
  miniChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  miniChipTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  zonePointName: { fontSize: 13, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  zonePointLoc: { fontSize: 11, color: HUD.textSec, marginBottom: 6 },
  zonePointResult: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  zonePointResultTxt: { fontSize: 10, fontWeight: '700' },

  // Point detail modal
  lastResultBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  lastResultDot: { width: 12, height: 12, borderRadius: 6 },
  lastResultVal: { fontSize: 16, fontWeight: '800' },
  lastResultDate: { fontSize: 11, color: HUD.textSec, marginTop: 2 },
  dueFlag: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12,
  },
  dueFlagTxt: { fontSize: 11, fontWeight: '700', flex: 1 },
  logATPBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: HUD.cyan, borderRadius: 10, padding: 14,
  },
  logATPBtnTxt: { fontSize: 12, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },

  // Schedule
  schedSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, paddingLeft: 10, marginTop: 16, marginBottom: 8,
  },
  schedSectionTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 2, flex: 1 },
  schedSectionBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  schedSectionBadgeTxt: { fontSize: 10, fontWeight: '800' },
  schedCard: {
    backgroundColor: HUD.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3,
    marginBottom: 8, padding: 12,
  },
  schedCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  schedZoneDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  schedZoneDotTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg },
  schedPointCode: { fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 1 },
  schedPointName: { fontSize: 13, fontWeight: '700', color: HUD.text },
  schedStatus: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  schedStatusTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  schedMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItemTxt: { fontSize: 11, color: HUD.textSec },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  emptySub: { fontSize: 13, color: HUD.textSec, textAlign: 'center' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderTopColor: HUD.borderBright, maxHeight: '94%', flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: HUD.border,
  },
  sheetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  sheetMeta: { fontSize: 11, color: HUD.textSec },
  closeBtn: { padding: 4, marginLeft: 12 },
  infoBox: {
    backgroundColor: HUD.bgCardAlt, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 16,
  },
  sectionLbl: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 8 },
  zoneDescBox: {
    borderLeftWidth: 3, paddingLeft: 12,
    paddingVertical: 10, paddingRight: 16,
    marginHorizontal: 20, marginBottom: 4,
  },
  zoneDescTxt: { fontSize: 12, color: HUD.textSec, lineHeight: 18 },
  zoneDescNote: { fontSize: 11, fontWeight: '600', marginTop: 6, lineHeight: 16 },
});
