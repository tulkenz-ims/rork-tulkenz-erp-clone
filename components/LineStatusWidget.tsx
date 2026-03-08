import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Activity, AlertTriangle, ChevronRight, Package, Radio, Timer, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

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
  green: HUD.green,
  yellow: HUD.amber,
  red: HUD.red,
  blue: HUD.cyan,
  gray: HUD.textDim,
};

const STATUS_LABELS: Record<string, string> = {
  running: 'RUNNING', idle: 'IDLE', cleaning: 'CLEANING',
  loto: 'LOTO', setup: 'SETUP', down: 'DOWN',
};

interface RoomStatus {
  room_code: string; room_name: string; status: string; andon_color: string;
  bags_today: number; bags_per_minute: number; target_bags_per_minute: number;
  uptime_percent: number; personnel_count: number; current_run_number: string | null; updated_at: string;
}
interface DowntimeEvent { room_code: string; started_at: string; reason: string | null; }

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
      map[ev.room_code] = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    return map;
  }, [now, events]);
}

function PulsingDot({ color }: { color: string }) {
  const anim = React.useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: anim, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }} />;
}

export default function LineStatusWidget() {
  const router = useRouter();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  const { data: rooms = [] } = useQuery({
    queryKey: ['room_status', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from('room_status').select('*').eq('organization_id', organizationId).in('room_code', ['PR1', 'PR2', 'PA1']).order('room_code');
      if (error) { console.error('[LineStatusWidget] Error:', error); return []; }
      return (data || []) as RoomStatus[];
    },
    enabled: !!organizationId, refetchInterval: 10000, staleTime: 5000,
  });

  const { data: downtimeEvents = [] } = useQuery({
    queryKey: ['production_events_active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from('production_events').select('room_code, started_at, reason').eq('organization_id', organizationId).eq('event_type', 'line_stopped').is('ended_at', null).order('started_at', { ascending: false });
      if (error) { console.error('[LineStatusWidget] Downtime events error:', error); return []; }
      const seen = new Set<string>(); const deduped: DowntimeEvent[] = [];
      for (const ev of (data || [])) { if (!seen.has(ev.room_code)) { seen.add(ev.room_code); deduped.push(ev as DowntimeEvent); } }
      return deduped;
    },
    enabled: !!organizationId, refetchInterval: 15000, staleTime: 5000,
  });

  const downtimeTimers = useDowntimeTimers(downtimeEvents);
  const anyIssue = rooms.some(r => r.andon_color === 'red' || r.andon_color === 'yellow');
  const runningCount = rooms.filter(r => r.status === 'running' && r.andon_color === 'green').length;
  const totalRooms = rooms.length;

  const handleRoomPress = (roomCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/production/room-dashboard?room=${roomCode}`);
  };

  if (rooms.length === 0) {
    return (
      <View>
        <View style={S.headerRow}>
          <View style={S.headerLeft}>
            <Activity size={14} color={HUD.amber} />
            <View>
              <Text style={S.headerTitle}>Live Room Status</Text>
              <Text style={S.headerSub}>Real-time production monitoring</Text>
            </View>
          </View>
          <View style={[S.badge, { backgroundColor: HUD.textDim + '30', borderColor: HUD.textDim + '50' }]}>
            <PulsingDot color={HUD.textDim} />
            <Text style={[S.badgeTxt, { color: HUD.textDim }]}>NO DATA</Text>
          </View>
        </View>
        <View style={S.placeholder}>
          <Radio size={22} color={HUD.textDim} />
          <Text style={S.placeholderTxt}>Start the simulator to see live room data</Text>
          <Text style={S.placeholderSub}>/api/simulator?action=start</Text>
        </View>
      </View>
    );
  }

  const badgeColor = anyIssue ? HUD.red : runningCount > 0 ? HUD.green : HUD.textDim;
  const badgeLabel = anyIssue ? 'ALERT' : runningCount > 0 ? `${runningCount}/${totalRooms} LIVE` : 'ALL IDLE';

  return (
    <View>
      <View style={S.headerRow}>
        <View style={S.headerLeft}>
          <Activity size={14} color={HUD.amber} />
          <View>
            <Text style={S.headerTitle}>Live Room Status</Text>
            <Text style={S.headerSub}>Real-time · Tap room for details</Text>
          </View>
        </View>
        <View style={[S.badge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '60' }]}>
          <PulsingDot color={badgeColor} />
          <Text style={[S.badgeTxt, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={S.roomsRow}>
        {rooms.map(room => {
          const col = ANDON[room.andon_color] || HUD.textDim;
          const isRunning = room.status === 'running';
          const isDown = room.status === 'down';
          const bpmPct = room.target_bags_per_minute > 0 ? (room.bags_per_minute / room.target_bags_per_minute) * 100 : 0;
          const bpmColor = bpmPct >= 90 ? HUD.green : bpmPct >= 70 ? HUD.amber : bpmPct > 0 ? HUD.red : HUD.textDim;
          const downtimeLabel = downtimeTimers[room.room_code];

          return (
            <TouchableOpacity
              key={room.room_code}
              activeOpacity={0.8}
              style={[S.roomCard, { borderColor: col + '50', shadowColor: col }]}
              onPress={() => handleRoomPress(room.room_code)}
            >
              {/* Top color strip */}
              <View style={[S.andonStrip, { backgroundColor: col }]} />

              {/* Status badge */}
              <View style={S.roomCardTop}>
                <PulsingDot color={col} />
                <View style={[S.statusPill, { backgroundColor: col + '18', borderColor: col + '40' }]}>
                  <Text style={[S.statusPillTxt, { color: col }]}>{STATUS_LABELS[room.status] || room.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Main metric */}
              {isRunning && room.bags_per_minute > 0 ? (
                <View style={S.heroSection}>
                  <Text style={[S.heroValue, { color: bpmColor }]}>{Math.round(room.bags_per_minute)}</Text>
                  <Text style={S.heroUnit}>/{room.target_bags_per_minute} bags/min</Text>
                </View>
              ) : (
                <View style={S.heroSection}>
                  <Text style={[S.heroValue, { color: col }]}>
                    {room.status === 'idle' ? '—' : room.status === 'cleaning' ? '🧹' : room.status === 'loto' ? '🔒' : '⚙️'}
                  </Text>
                  <Text style={S.heroUnit}>{STATUS_LABELS[room.status] || room.status}</Text>
                </View>
              )}

              <Text style={S.roomName}>{room.room_name}</Text>
              <Text style={S.roomCode}>{room.room_code}</Text>

              <View style={S.statsRow}>
                <View style={S.statItem}>
                  <Package size={9} color={HUD.textDim} />
                  <Text style={S.statValue}>{room.bags_today > 0 ? room.bags_today.toLocaleString() : '0'}</Text>
                </View>
                <View style={S.statItem}>
                  <TrendingUp size={9} color={HUD.textDim} />
                  <Text style={S.statValue}>{room.uptime_percent || 0}%</Text>
                </View>
              </View>

              {isRunning && room.target_bags_per_minute > 0 && (
                <View style={S.bpmBar}>
                  <View style={S.bpmTrack}>
                    <View style={[S.bpmFill, { width: `${Math.min(100, bpmPct)}%` as any, backgroundColor: bpmColor }]} />
                  </View>
                </View>
              )}

              {isDown && downtimeLabel && (
                <View style={S.downtimeBadge}>
                  <Timer size={9} color={HUD.red} />
                  <Text style={S.downtimeTxt}>Down {downtimeLabel}</Text>
                </View>
              )}

              <View style={S.tapIndicator}>
                <ChevronRight size={11} color={HUD.textDim} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {rooms.some(r => r.andon_color === 'red') && (
        <View style={S.alertBar}>
          <AlertTriangle size={11} color={HUD.red} />
          <Text style={S.alertTxt}>
            {rooms.filter(r => r.andon_color === 'red').map(r => r.room_code).join(', ')} — Equipment alert active
          </Text>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 13, fontWeight: '800', color: HUD.text, letterSpacing: 0.3 },
  headerSub:    { fontSize: 9, color: HUD.textDim, marginTop: 1, fontWeight: '600' },
  badge:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 6 },
  badgeTxt:     { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  roomsRow:     { flexDirection: 'row', gap: 10 },
  roomCard:     { flex: 1, backgroundColor: HUD.bgCardAlt, borderRadius: 14, padding: 12, paddingTop: 6, borderWidth: 1, overflow: 'hidden', position: 'relative', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
  andonStrip:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  roomCardTop:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 10 },
  statusPill:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  statusPillTxt:{ fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  heroSection:  { marginBottom: 4 },
  heroValue:    { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  heroUnit:     { fontSize: 9, color: HUD.textDim, marginTop: 1, fontWeight: '600' },
  roomName:     { fontSize: 11, fontWeight: '700', color: HUD.text, marginTop: 4 },
  roomCode:     { fontSize: 9, color: HUD.textDim, marginTop: 1, fontWeight: '600' },
  statsRow:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  statItem:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue:    { fontSize: 9, fontWeight: '700', color: HUD.textSec },
  bpmBar:       { marginTop: 8 },
  bpmTrack:     { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: HUD.border },
  bpmFill:      { height: '100%' as any, borderRadius: 2 },
  downtimeBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: HUD.red + '15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: HUD.red + '30' },
  downtimeTxt:  { fontSize: 9, fontWeight: '800', color: HUD.red, letterSpacing: 0.3 },
  tapIndicator: { position: 'absolute', bottom: 8, right: 8 },
  alertBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.red + '12', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, gap: 6, borderWidth: 1, borderColor: HUD.red + '30' },
  alertTxt:     { fontSize: 11, fontWeight: '700', color: HUD.red, flex: 1 },
  placeholder:  { borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, borderStyle: 'dashed', padding: 28, alignItems: 'center', gap: 8, backgroundColor: HUD.bgCardAlt },
  placeholderTxt:{ fontSize: 13, fontWeight: '600', color: HUD.textSec, textAlign: 'center' },
  placeholderSub:{ fontSize: 10, color: HUD.textDim, textAlign: 'center', fontWeight: '600' },
});
