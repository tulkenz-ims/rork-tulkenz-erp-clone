// app/(tabs)/labor-tracking/index.tsx
// TulKenz OPS — Live Floor
// Full production floor status: all 9 rooms, live rates, room labor, daily summary

import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Animated, Platform,
} from 'react-native';
import {
  Activity, AlertTriangle, ChevronRight, Package,
  Timer, TrendingUp, Users, Clock, Radio,
  Layers, ArrowRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── HUD colors ─────────────────────────────────────────────────
const HUD = {
  bg:           '#020912',
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  green:        '#00ff88',
  amber:        '#ffb800',
  red:          '#ff2d55',
  purple:       '#7b61ff',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

const ANDON: Record<string, string> = {
  green:  HUD.green,
  yellow: HUD.amber,
  red:    HUD.red,
  blue:   HUD.cyan,
  gray:   HUD.textDim,
};

const STATUS_COLORS: Record<string, string> = {
  running:  HUD.green,
  idle:     HUD.textDim,
  cleaning: HUD.cyan,
  loto:     HUD.amber,
  setup:    HUD.amber,
  down:     HUD.red,
};

const STATUS_LABELS: Record<string, string> = {
  running:  'RUNNING',
  idle:     'IDLE',
  cleaning: 'CLEANING',
  loto:     'LOTO',
  setup:    'SETUP',
  down:     'DOWN',
};

// ── Production layout ──────────────────────────────────────────
const PRODUCTION_LINES = [
  { label: 'LINE 1', color: '#F59E0B', production: { code: 'PR1', name: 'Production Room 1' }, packout: { code: 'PO1', name: 'Packout 1' } },
  { label: 'LINE 2', color: '#10B981', production: { code: 'PR2', name: 'Production Room 2' }, packout: { code: 'PO2', name: 'Packout 2' } },
  { label: 'LINE 3', color: '#8B5CF6', production: { code: 'PA1', name: 'Packet Room 1'    }, packout: { code: 'PO3', name: 'Packout 3' } },
];

const SUPPORT_ROOMS = [
  { code: 'PW1', name: 'Pre-Weigh',   color: '#06B6D4' },
  { code: 'BB1', name: 'Big Blend',   color: '#F97316' },
  { code: 'SB1', name: 'Small Blend', color: '#EC4899' },
];

const ALL_ROOM_CODES = ['PR1','PR2','PA1','PO1','PO2','PO3','PW1','BB1','SB1'];

// ── Types ──────────────────────────────────────────────────────
interface RoomStatus {
  room_code: string; room_name: string; status: string; andon_color: string;
  bags_today: number; bags_per_minute: number; target_bags_per_minute: number;
  uptime_percent: number; personnel_count: number;
  current_run_number: string | null; updated_at: string;
}

interface RoomLaborEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  location_code: string;
  location_name: string;
  entered_at: string;
  exited_at: string | null;
  hours_in_room: number | null;
}

interface DowntimeEvent {
  room_code: string; started_at: string; reason: string | null;
}

// ── Hooks ──────────────────────────────────────────────────────
function useDowntimeTimers(events: DowntimeEvent[]) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [events.length]);
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of events) {
      const elapsed = Math.max(0, Math.floor((now - new Date(ev.started_at).getTime()) / 1000));
      const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
      map[ev.room_code] = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    return map;
  }, [now, events]);
}

function useLiveTimers(entries: RoomLaborEntry[]) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (entries.filter(e => !e.exited_at).length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [entries.length]);
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of entries) {
      if (e.exited_at) continue;
      const elapsed = Math.max(0, Math.floor((now - new Date(e.entered_at).getTime()) / 1000 / 60));
      map[e.id] = elapsed >= 60
        ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`
        : `${elapsed}m`;
    }
    return map;
  }, [now, entries]);
}

// ── Pulsing dot ────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const anim = React.useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: color, opacity: anim,
    }} />
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function LiveFloorScreen() {
  const router = useRouter();
  const { organizationId } = useOrganization();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'lines' | 'labor'>('lines');

  // Room status
  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['room_status_all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('room_status')
        .select('*')
        .eq('organization_id', organizationId)
        .in('room_code', ALL_ROOM_CODES)
        .order('room_code');
      return (data || []) as RoomStatus[];
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Active downtime events
  const { data: downtimeEvents = [], refetch: refetchDowntime } = useQuery({
    queryKey: ['production_events_active_all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('production_events')
        .select('room_code, started_at, reason')
        .eq('organization_id', organizationId)
        .eq('event_type', 'line_stopped')
        .is('ended_at', null);
      const seen = new Set<string>(); const deduped: DowntimeEvent[] = [];
      for (const ev of (data || [])) {
        if (!seen.has(ev.room_code)) { seen.add(ev.room_code); deduped.push(ev as DowntimeEvent); }
      }
      return deduped;
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  // Room labor entries — today, active + completed
  const { data: laborEntries = [], refetch: refetchLabor } = useQuery({
    queryKey: ['room_labor_today_all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('room_labor_entries')
        .select('id, employee_id, employee_name, location_code, location_name, entered_at, exited_at, hours_in_room')
        .eq('organization_id', organizationId)
        .gte('entered_at', `${today}T00:00:00`)
        .order('entered_at', { ascending: false });
      return (data || []) as RoomLaborEntry[];
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  const downtimeTimers = useDowntimeTimers(downtimeEvents);
  const liveTimers     = useLiveTimers(laborEntries);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchRooms(), refetchDowntime(), refetchLabor()]);
    setRefreshing(false);
  };

  // Computed
  const roomMap = useMemo(() => {
    const map: Record<string, RoomStatus> = {};
    rooms.forEach(r => { map[r.room_code] = r; });
    return map;
  }, [rooms]);

  const activeEntriesByCode = useMemo(() => {
    const map: Record<string, RoomLaborEntry[]> = {};
    laborEntries.filter(e => !e.exited_at).forEach(e => {
      if (!map[e.location_code]) map[e.location_code] = [];
      map[e.location_code].push(e);
    });
    return map;
  }, [laborEntries]);

  const hoursPerRoom = useMemo(() => {
    const map: Record<string, number> = {};
    laborEntries.forEach(e => {
      const hrs = e.hours_in_room || 0;
      map[e.location_code] = (map[e.location_code] || 0) + hrs;
    });
    return map;
  }, [laborEntries]);

  const runningCount = rooms.filter(r => r.status === 'running').length;
  const downCount    = rooms.filter(r => r.status === 'down').length;
  const totalAssigned = laborEntries.filter(e => !e.exited_at).length;
  const anyAlert = downCount > 0 || rooms.some(r => r.andon_color === 'red');

  const badgeColor = anyAlert ? HUD.red : runningCount > 0 ? HUD.green : HUD.textDim;
  const badgeLabel = anyAlert ? 'ALERT' : `${runningCount}/${rooms.length} LIVE`;

  const getRoomStatus = (code: string) => roomMap[code];
  const getStatusColor = (r?: RoomStatus) => r ? (ANDON[r.andon_color] || STATUS_COLORS[r.status] || HUD.textDim) : HUD.textDim;

  const handleRoomPress = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/production/room-dashboard?room=${code}`);
  };

  return (
    <View style={S.container}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Activity size={16} color={HUD.amber} />
          <View>
            <Text style={S.headerTitle}>LIVE FLOOR</Text>
            <Text style={S.headerSub}>Real-time · All 9 rooms</Text>
          </View>
        </View>
        <View style={[S.liveBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '60' }]}>
          <PulsingDot color={badgeColor} />
          <Text style={[S.liveBadgeTxt, { color: badgeColor, fontFamily: MONO }]}>{badgeLabel}</Text>
        </View>
      </View>

      {/* ── KPI Strip ──────────────────────────────────────── */}
      <View style={S.kpiStrip}>
        {[
          { label: 'RUNNING',  value: runningCount,   color: HUD.green  },
          { label: 'DOWN',     value: downCount,       color: downCount > 0 ? HUD.red : HUD.textDim },
          { label: 'ASSIGNED', value: totalAssigned,   color: HUD.cyan   },
          { label: 'ALERTS',   value: downtimeEvents.length, color: downtimeEvents.length > 0 ? HUD.red : HUD.textDim },
        ].map(k => (
          <View key={k.label} style={[S.kpiCard, { borderTopColor: k.color }]}>
            <Text style={[S.kpiValue, { color: k.color, fontFamily: MONO }]}>{k.value}</Text>
            <Text style={S.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Alert bar ──────────────────────────────────────── */}
      {anyAlert && (
        <View style={S.alertBar}>
          <AlertTriangle size={12} color={HUD.red} />
          <Text style={S.alertTxt}>
            {rooms.filter(r => r.status === 'down' || r.andon_color === 'red').map(r => r.room_code).join(' · ')} — Alert active
          </Text>
        </View>
      )}

      {/* ── Tab strip ──────────────────────────────────────── */}
      <View style={S.tabStrip}>
        {([['lines', 'Lines & Rooms', Layers], ['labor', 'Room Labor', Users]] as const).map(([key, label, Icon]) => (
          <TouchableOpacity
            key={key}
            style={[S.tab, activeTab === key && { borderBottomColor: HUD.cyan, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(key as any)}
          >
            <Icon size={13} color={activeTab === key ? HUD.cyan : HUD.textDim} />
            <Text style={[S.tabTxt, { color: activeTab === key ? HUD.cyan : HUD.textDim, fontFamily: MONO }]}>
              {label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}
      >

        {/* ════════════════════════════════════════════════ */}
        {/* LINES & ROOMS TAB                               */}
        {/* ════════════════════════════════════════════════ */}
        {activeTab === 'lines' && (
          <>
            {/* Production Lines */}
            <Text style={[S.sectionLabel, { fontFamily: MONO }]}>PRODUCTION LINES</Text>
            {PRODUCTION_LINES.map(line => {
              const prodRoom  = getRoomStatus(line.production.code);
              const poRoom    = getRoomStatus(line.packout.code);
              const prodColor = getStatusColor(prodRoom);
              const poColor   = getStatusColor(poRoom);
              const prodAssigned = activeEntriesByCode[line.production.code] || [];
              const poAssigned   = activeEntriesByCode[line.packout.code]   || [];
              const prodDown = downtimeTimers[line.production.code];

              return (
                <View key={line.label} style={[S.lineCard, { borderLeftColor: line.color }]}>
                  {/* Line label */}
                  <View style={S.lineHeader}>
                    <View style={[S.linePill, { backgroundColor: line.color + '20', borderColor: line.color + '40' }]}>
                      <Text style={[S.linePillTxt, { color: line.color, fontFamily: MONO }]}>{line.label}</Text>
                    </View>
                    {prodRoom && (
                      <View style={[S.statusPill, { backgroundColor: prodColor + '18', borderColor: prodColor + '40' }]}>
                        <PulsingDot color={prodColor} />
                        <Text style={[S.statusPillTxt, { color: prodColor, fontFamily: MONO }]}>
                          {STATUS_LABELS[prodRoom.status] || prodRoom.status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Room pair */}
                  <View style={S.roomPair}>
                    {/* Production room */}
                    <TouchableOpacity
                      style={[S.roomTile, { borderColor: prodColor + '40', backgroundColor: prodColor + '08' }]}
                      onPress={() => handleRoomPress(line.production.code)}
                      activeOpacity={0.8}
                    >
                      <Text style={[S.roomTileCode, { color: prodColor, fontFamily: MONO }]}>{line.production.code}</Text>
                      <Text style={[S.roomTileName, { color: HUD.text }]}>{line.production.name}</Text>

                      {prodRoom?.status === 'running' && prodRoom.bags_per_minute > 0 && (
                        <>
                          <Text style={[S.roomTileMetric, { color: prodColor, fontFamily: MONO }]}>
                            {Math.round(prodRoom.bags_per_minute)}
                            <Text style={[S.roomTileMetricUnit, { color: HUD.textDim }]}>/{prodRoom.target_bags_per_minute} bpm</Text>
                          </Text>
                          <View style={S.miniBar}>
                            <View style={[S.miniBarFill, {
                              width: `${Math.min(100, (prodRoom.bags_per_minute / prodRoom.target_bags_per_minute) * 100)}%` as any,
                              backgroundColor: prodColor,
                            }]} />
                          </View>
                        </>
                      )}

                      {prodDown && (
                        <View style={S.downBadge}>
                          <Timer size={9} color={HUD.red} />
                          <Text style={[S.downBadgeTxt, { fontFamily: MONO }]}>{prodDown}</Text>
                        </View>
                      )}

                      {prodAssigned.length > 0 && (
                        <View style={S.assignedRow}>
                          <Users size={9} color={HUD.textDim} />
                          <Text style={S.assignedTxt}>{prodAssigned.length} assigned</Text>
                        </View>
                      )}

                      <ChevronRight size={10} color={HUD.textDim} style={{ alignSelf: 'flex-end', marginTop: 4 }} />
                    </TouchableOpacity>

                    {/* Arrow */}
                    <View style={S.arrowWrap}>
                      <ArrowRight size={14} color={line.color + '60'} />
                    </View>

                    {/* Packout room */}
                    <TouchableOpacity
                      style={[S.roomTile, { borderColor: poColor + '40', backgroundColor: poColor + '08' }]}
                      onPress={() => handleRoomPress(line.packout.code)}
                      activeOpacity={0.8}
                    >
                      <Text style={[S.roomTileCode, { color: poColor, fontFamily: MONO }]}>{line.packout.code}</Text>
                      <Text style={[S.roomTileName, { color: HUD.text }]}>{line.packout.name}</Text>

                      {poRoom?.status === 'running' && (
                        <View style={[S.statusPill, { backgroundColor: poColor + '18', borderColor: poColor + '40', marginTop: 4 }]}>
                          <PulsingDot color={poColor} />
                          <Text style={[S.statusPillTxt, { color: poColor, fontFamily: MONO }]}>RUNNING</Text>
                        </View>
                      )}

                      {poAssigned.length > 0 && (
                        <View style={S.assignedRow}>
                          <Users size={9} color={HUD.textDim} />
                          <Text style={S.assignedTxt}>{poAssigned.length} assigned</Text>
                        </View>
                      )}

                      <ChevronRight size={10} color={HUD.textDim} style={{ alignSelf: 'flex-end', marginTop: 4 }} />
                    </TouchableOpacity>
                  </View>

                  {/* Bags today */}
                  {prodRoom && prodRoom.bags_today > 0 && (
                    <View style={S.bagsTodayRow}>
                      <Package size={10} color={HUD.textDim} />
                      <Text style={S.bagsTodayTxt}>{prodRoom.bags_today.toLocaleString()} bags today</Text>
                      <TrendingUp size={10} color={HUD.textDim} />
                      <Text style={S.bagsTodayTxt}>{prodRoom.uptime_percent || 0}% uptime</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Support Areas */}
            <Text style={[S.sectionLabel, { fontFamily: MONO, marginTop: 8 }]}>SUPPORT AREAS</Text>
            <View style={S.supportGrid}>
              {SUPPORT_ROOMS.map(room => {
                const rs = getRoomStatus(room.code);
                const col = rs ? getStatusColor(rs) : HUD.textDim;
                const assigned = activeEntriesByCode[room.code] || [];
                const hours = hoursPerRoom[room.code] || 0;

                return (
                  <TouchableOpacity
                    key={room.code}
                    style={[S.supportTile, { borderColor: col + '40', backgroundColor: col + '08', borderTopColor: room.color, borderTopWidth: 3 }]}
                    onPress={() => handleRoomPress(room.code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[S.roomTileCode, { color: room.color, fontFamily: MONO }]}>{room.code}</Text>
                    <Text style={[S.roomTileName, { color: HUD.text }]}>{room.name}</Text>
                    <View style={[S.statusPill, { backgroundColor: col + '18', borderColor: col + '40', marginTop: 6 }]}>
                      <PulsingDot color={col} />
                      <Text style={[S.statusPillTxt, { color: col, fontFamily: MONO }]}>
                        {rs ? (STATUS_LABELS[rs.status] || rs.status.toUpperCase()) : 'NO DATA'}
                      </Text>
                    </View>
                    {assigned.length > 0 && (
                      <View style={[S.assignedRow, { marginTop: 6 }]}>
                        <Users size={9} color={HUD.textDim} />
                        <Text style={S.assignedTxt}>{assigned.length} assigned</Text>
                      </View>
                    )}
                    {hours > 0 && (
                      <View style={[S.assignedRow, { marginTop: 2 }]}>
                        <Clock size={9} color={HUD.textDim} />
                        <Text style={S.assignedTxt}>{hours.toFixed(1)}h today</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* ROOM LABOR TAB                                  */}
        {/* ════════════════════════════════════════════════ */}
        {activeTab === 'labor' && (
          <>
            {/* Daily summary per room */}
            <Text style={[S.sectionLabel, { fontFamily: MONO }]}>TODAY — HOURS BY ROOM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.hoursScroll}>
              <View style={S.hoursRow}>
                {ALL_ROOM_CODES.map(code => {
                  const hrs = hoursPerRoom[code] || 0;
                  const active = (activeEntriesByCode[code] || []).length;
                  const roomConf = SUPPORT_ROOMS.find(r => r.code === code);
                  const lineConf = PRODUCTION_LINES.find(l => l.production.code === code || l.packout.code === code);
                  const color = roomConf?.color || lineConf?.color || HUD.textDim;
                  return (
                    <View key={code} style={[S.hoursCard, { borderTopColor: color }]}>
                      <Text style={[S.hoursCardCode, { color, fontFamily: MONO }]}>{code}</Text>
                      <Text style={[S.hoursCardValue, { color: hrs > 0 ? HUD.text : HUD.textDim, fontFamily: MONO }]}>
                        {hrs > 0 ? hrs.toFixed(1) : '—'}
                      </Text>
                      <Text style={S.hoursCardLabel}>hrs</Text>
                      {active > 0 && (
                        <View style={[S.activeCountBadge, { backgroundColor: HUD.green + '20', borderColor: HUD.green + '40' }]}>
                          <Text style={[S.activeCountTxt, { color: HUD.green, fontFamily: MONO }]}>{active} IN</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Active assignments */}
            {laborEntries.filter(e => !e.exited_at).length > 0 && (
              <>
                <Text style={[S.sectionLabel, { fontFamily: MONO, marginTop: 8 }]}>CURRENTLY ASSIGNED</Text>
                {laborEntries.filter(e => !e.exited_at).map(entry => {
                  const roomConf = SUPPORT_ROOMS.find(r => r.code === entry.location_code);
                  const lineConf = PRODUCTION_LINES.find(l => l.production.code === entry.location_code || l.packout.code === entry.location_code);
                  const color = roomConf?.color || lineConf?.color || HUD.cyan;
                  const timer = liveTimers[entry.id] || '—';
                  return (
                    <View key={entry.id} style={[S.laborRow, { borderLeftColor: color }]}>
                      <View style={[S.laborAvatar, { backgroundColor: color + '20' }]}>
                        <Text style={[S.laborAvatarTxt, { color }]}>
                          {entry.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={S.laborName}>{entry.employee_name}</Text>
                        <View style={S.laborRoomRow}>
                          <View style={[S.laborRoomBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                            <Text style={[S.laborRoomCode, { color, fontFamily: MONO }]}>{entry.location_code}</Text>
                          </View>
                          <Text style={S.laborRoomName}>{entry.location_name}</Text>
                        </View>
                      </View>
                      <View style={S.laborTimerWrap}>
                        <Clock size={10} color={HUD.green} />
                        <Text style={[S.laborTimer, { color: HUD.green, fontFamily: MONO }]}>{timer}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Completed entries today */}
            {laborEntries.filter(e => !!e.exited_at).length > 0 && (
              <>
                <Text style={[S.sectionLabel, { fontFamily: MONO, marginTop: 8 }]}>COMPLETED TODAY</Text>
                {laborEntries.filter(e => !!e.exited_at).map(entry => {
                  const roomConf = SUPPORT_ROOMS.find(r => r.code === entry.location_code);
                  const lineConf = PRODUCTION_LINES.find(l => l.production.code === entry.location_code || l.packout.code === entry.location_code);
                  const color = roomConf?.color || lineConf?.color || HUD.textDim;
                  const hrs = entry.hours_in_room ? entry.hours_in_room.toFixed(2) : '—';
                  const inTime  = new Date(entry.entered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const outTime = entry.exited_at ? new Date(entry.exited_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
                  return (
                    <View key={entry.id} style={[S.laborRowDone, { borderLeftColor: color + '60' }]}>
                      <View style={[S.laborAvatar, { backgroundColor: color + '12' }]}>
                        <Text style={[S.laborAvatarTxt, { color: color + 'AA' }]}>
                          {entry.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[S.laborName, { color: HUD.textSec }]}>{entry.employee_name}</Text>
                        <View style={S.laborRoomRow}>
                          <Text style={[S.laborRoomCode, { color: color + 'AA', fontFamily: MONO }]}>{entry.location_code}</Text>
                          <Text style={[S.laborRoomName, { color: HUD.textDim }]}>{inTime} → {outTime}</Text>
                        </View>
                      </View>
                      <Text style={[S.laborTimer, { color: HUD.textSec, fontFamily: MONO }]}>{hrs}h</Text>
                    </View>
                  );
                })}
              </>
            )}

            {laborEntries.length === 0 && (
              <View style={S.emptyState}>
                <Radio size={36} color={HUD.textDim} />
                <Text style={S.emptyTitle}>No room labor entries today</Text>
                <Text style={S.emptySub}>Assign operators to rooms via Roll Call</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: HUD.bg },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: HUD.text, letterSpacing: 1 },
  headerSub:    { fontSize: 10, color: HUD.textDim, marginTop: 2 },
  liveBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  liveBadgeTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  kpiStrip:     { flexDirection: 'row', backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  kpiCard:      { flex: 1, alignItems: 'center', paddingVertical: 10, borderTopWidth: 3 },
  kpiValue:     { fontSize: 20, fontWeight: '800' },
  kpiLabel:     { fontSize: 8, color: HUD.textDim, letterSpacing: 0.5, marginTop: 2 },

  alertBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.red + '12', paddingVertical: 8, paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: HUD.red + '30' },
  alertTxt:     { fontSize: 11, fontWeight: '700', color: HUD.red, flex: 1 },

  tabStrip:     { flexDirection: 'row', backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 5, borderBottomWidth: 0, borderBottomColor: 'transparent' },
  tabTxt:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  scroll:       { flex: 1 },
  scrollContent:{ padding: 14, gap: 10 },

  sectionLabel: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 8 },

  // Line cards
  lineCard:     { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3, padding: 12, gap: 10 },
  lineHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  linePillTxt:  { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusPillTxt:{ fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

  roomPair:     { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  arrowWrap:    { alignItems: 'center', justifyContent: 'center' },
  roomTile:     { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },
  roomTileCode: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  roomTileName: { fontSize: 10, fontWeight: '600' },
  roomTileMetric:    { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  roomTileMetricUnit:{ fontSize: 9, fontWeight: '600' },
  miniBar:      { height: 3, borderRadius: 2, backgroundColor: HUD.border, overflow: 'hidden', marginTop: 4 },
  miniBarFill:  { height: '100%' as any, borderRadius: 2 },
  downBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: HUD.red + '15', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: HUD.red + '30' },
  downBadgeTxt: { fontSize: 9, fontWeight: '800', color: HUD.red },
  assignedRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  assignedTxt:  { fontSize: 9, color: HUD.textDim, fontWeight: '600' },
  bagsTodayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: HUD.border },
  bagsTodayTxt: { fontSize: 10, color: HUD.textDim, fontWeight: '600' },

  // Support grid
  supportGrid:  { flexDirection: 'row', gap: 8 },
  supportTile:  { flex: 1, backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },

  // Hours scroll
  hoursScroll:  { marginHorizontal: -14 },
  hoursRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 4 },
  hoursCard:    { width: 72, backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, borderTopWidth: 3, padding: 10, alignItems: 'center', gap: 2 },
  hoursCardCode:{ fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  hoursCardValue:{ fontSize: 18, fontWeight: '900' },
  hoursCardLabel:{ fontSize: 9, color: HUD.textDim, fontWeight: '600' },
  activeCountBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 4 },
  activeCountTxt:   { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  // Labor rows
  laborRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3, padding: 12, gap: 10, marginBottom: 6 },
  laborRowDone: { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.bgCard + 'AA', borderRadius: 10, borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 2, padding: 10, gap: 10, marginBottom: 4, opacity: 0.7 },
  laborAvatar:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  laborAvatarTxt:{ fontSize: 13, fontWeight: '800' },
  laborName:    { fontSize: 13, fontWeight: '700', color: HUD.text },
  laborRoomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  laborRoomBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  laborRoomCode:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  laborRoomName:{ fontSize: 10, color: HUD.textSec },
  laborTimerWrap:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  laborTimer:   { fontSize: 12, fontWeight: '800' },

  emptyState:   { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: HUD.textSec },
  emptySub:     { fontSize: 12, color: HUD.textDim, textAlign: 'center' },
});
