import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ChevronLeft,
  Activity,
  Thermometer,
  Gauge,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
  Radio,
  Cpu,
  Layers,
  BarChart2,
} from 'lucide-react-native';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ══════════════════════════════════ THEME ══════════════════════════════════

const HUD = {
  bg:          '#020912',
  bgCard:      '#050f1e',
  bgCardAlt:   '#071525',
  cyan:        '#00e5ff',
  cyanDim:     '#00e5ff22',
  cyanMid:     '#00e5ff55',
  green:       '#00ff88',
  greenDim:    '#00ff8822',
  amber:       '#ffb800',
  amberDim:    '#ffb80022',
  red:         '#ff2d55',
  redDim:      '#ff2d5522',
  purple:      '#7b61ff',
  purpleDim:   '#7b61ff22',
  text:        '#e0f4ff',
  textSec:     '#7aa8c8',
  textDim:     '#3a6080',
  border:      '#0d2840',
  borderBright:'#1a4060',
  grid:        '#0a1f35',
};

const STATUS_COLOR: Record<string, string> = {
  normal:   HUD.green,
  warning:  HUD.amber,
  critical: HUD.red,
  idle:     HUD.textDim,
};

const ANDON_COLOR: Record<string, string> = {
  green:  HUD.green,
  yellow: HUD.amber,
  red:    HUD.red,
  blue:   HUD.cyan,
  gray:   HUD.textDim,
};

// ══════════════════════════════════ TYPES ══════════════════════════════════

interface RoomEquipment {
  id: string; equipment_name: string; equipment_type: string;
  display_order: number; position_x: number; position_y: number;
  position_width: number; position_height: number;
  status: string; status_color: string; equipment_id: string | null;
}
interface SensorReading {
  id: string; sensor_id: string; sensor_name: string; sensor_type: string;
  unit: string; value: number; status: string; target_value: number;
  warning_low: number; warning_high: number; critical_low: number; critical_high: number;
  recorded_at: string; equipment_name: string; room_equipment_id: string;
}
interface RoomStatus {
  status: string; andon_color: string; bags_today: number;
  bags_per_minute: number; target_bags_per_minute: number;
  uptime_percent: number; personnel_count: number;
  current_run_number: string | null; updated_at: string;
}
interface ProductionEvent {
  id: string; event_type: string; category: string; reason: string;
  equipment_name: string; started_at: string; ended_at: string | null;
  duration_seconds: number | null;
}

// ══════════════════════════════════ ANIMATED HOOKS ══════════════════════════

function usePulse(duration = 1800) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

function useScan(width: number, duration = 3000) {
  const anim = useRef(new Animated.Value(-40)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: width + 40, duration, useNativeDriver: true })
    ).start();
  }, [width]);
  return anim;
}

// ══════════════════════════════════ SUB COMPONENTS ══════════════════════════

function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const pulse = usePulse(1600);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity,
      transform: [{ scale }],
    }} />
  );
}

function GlowBorder({ color, children, style }: { color: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      borderRadius: 12, borderWidth: 1,
      borderColor: color + '60',
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
      backgroundColor: HUD.bgCard,
    }, style]}>
      {children}
    </View>
  );
}

function HexMetric({ label, value, unit, color, icon }: {
  label: string; value: string; unit: string; color: string; icon: React.ReactNode;
}) {
  return (
    <View style={[hexStyles.card, { borderColor: color + '40', shadowColor: color }]}>
      <View style={[hexStyles.iconWrap, { backgroundColor: color + '15' }]}>{icon}</View>
      <Text style={[hexStyles.value, { color }]}>{value}</Text>
      <Text style={[hexStyles.unit, { color: color + 'aa' }]}>{unit}</Text>
      <Text style={hexStyles.label}>{label}</Text>
    </View>
  );
}

const hexStyles = StyleSheet.create({
  card: {
    width: 92, paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 12, borderWidth: 1,
    alignItems: 'center', gap: 3, marginRight: 10,
    backgroundColor: HUD.bgCard,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 9, fontWeight: '600', letterSpacing: 1 },
  label: { fontSize: 9, fontWeight: '700', color: HUD.textSec, letterSpacing: 0.5, textAlign: 'center' },
});

function ArcGauge({ value, min, max, color, size = 60 }: {
  value: number; min: number; max: number; color: string; size?: number;
}) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const filled = Math.round(pct * 12);
  const segments = Array.from({ length: 12 }, (_, i) => i < filled);
  return (
    <View style={{ width: size, height: size / 2 + 8, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 2, flexWrap: 'nowrap' }}>
        {segments.map((on, i) => (
          <View key={i} style={{
            width: (size - 24) / 12, height: 6, borderRadius: 2,
            backgroundColor: on ? color : HUD.border,
          }} />
        ))}
      </View>
      <Text style={{ color, fontSize: 13, fontWeight: '800', marginTop: 4 }}>
        {typeof value === 'number' ? value.toFixed(1) : '--'}
      </Text>
    </View>
  );
}

// ══════════════════════════════════ EQUIPMENT MAP ══════════════════════════

function EquipmentSchematic({
  equipment, sensorsByEquipment, equipmentStatus, selectedEquipment, onSelect, andonColor,
}: {
  equipment: RoomEquipment[];
  sensorsByEquipment: Record<string, SensorReading[]>;
  equipmentStatus: Record<string, string>;
  selectedEquipment: string | null;
  onSelect: (name: string | null) => void;
  andonColor: string;
}) {
  const mapW = SCREEN_WIDTH - 32;
  const mapH = 160;
  const scanX = useScan(mapW, 3500);
  const pulse = usePulse(2000);

  const maxX = Math.max(...equipment.map(e => e.position_x + e.position_width), 750);
  const scaleX = mapW / maxX;

  return (
    <View style={schematicStyles.container}>
      {/* Header */}
      <View style={schematicStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Cpu size={13} color={HUD.cyan} />
          <Text style={schematicStyles.title}>EQUIPMENT SCHEMATIC</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PulsingDot color={andonColor} size={7} />
          <Text style={[schematicStyles.liveText, { color: andonColor }]}>LIVE FEED</Text>
        </View>
      </View>

      {/* Flow label */}
      <View style={schematicStyles.flowRow}>
        {['INTAKE', '→', 'PROCESS', '→', 'SEAL', '→', 'DETECT', '→', 'PACK'].map((t, i) => (
          <Text key={i} style={[schematicStyles.flowItem, t === '→' ? { color: HUD.textDim } : { color: HUD.textSec }]}>{t}</Text>
        ))}
      </View>

      {/* Map area */}
      <View style={[schematicStyles.mapArea, { height: mapH }]}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <View key={f} style={[schematicStyles.gridLine, { top: mapH * f }]} />
        ))}
        {/* Vertical grid */}
        {[0.2, 0.4, 0.6, 0.8].map(f => (
          <View key={f} style={[schematicStyles.gridLineV, { left: mapW * f }]} />
        ))}

        {/* Floor line */}
        <View style={[schematicStyles.floor, { top: mapH - 12, shadowColor: andonColor }]} />

        {/* Connections */}
        {equipment.length > 1 && equipment.slice(0, -1).map((eq, i) => {
          const next = equipment[i + 1];
          const x1 = (eq.position_x + eq.position_width) * scaleX;
          const x2 = next.position_x * scaleX;
          const y = mapH * 0.52;
          const w = x2 - x1;
          if (w < 2) return null;
          return (
            <View key={`pipe-${i}`} style={{
              position: 'absolute', left: x1, top: y - 1,
              width: w, height: 3,
              backgroundColor: andonColor + '30',
              shadowColor: andonColor, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6, shadowRadius: 4,
            }}>
              {/* Pipe arrow */}
              <View style={{
                position: 'absolute', right: 0, top: -3,
                width: 0, height: 0,
                borderLeftWidth: 6, borderLeftColor: andonColor + '60',
                borderTopWidth: 4, borderTopColor: 'transparent',
                borderBottomWidth: 4, borderBottomColor: 'transparent',
              }} />
            </View>
          );
        })}

        {/* Equipment blocks */}
        {equipment.map(eq => {
          const status = equipmentStatus[eq.equipment_name] || 'idle';
          const color = STATUS_COLOR[status] || HUD.textDim;
          const isSelected = selectedEquipment === eq.equipment_name;
          const sensors = sensorsByEquipment[eq.equipment_name] || [];
          const primarySensor = sensors[0];

          const x = eq.position_x * scaleX;
          const w = Math.max(eq.position_width * scaleX, 52);
          const y = eq.position_y * (mapH / 100);
          const h = Math.max(eq.position_height * (mapH / 100), 48);

          return (
            <Pressable
              key={eq.id}
              style={[schematicStyles.equipBlock, {
                left: x, top: y, width: w, height: h,
                borderColor: isSelected ? color : color + '40',
                borderWidth: isSelected ? 2 : 1,
                backgroundColor: isSelected ? color + '18' : color + '08',
                shadowColor: color,
                shadowOpacity: isSelected ? 0.6 : 0.2,
              }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(isSelected ? null : eq.equipment_name);
              }}
            >
              {/* Corner accents */}
              <View style={[schematicStyles.cornerTL, { borderColor: color }]} />
              <View style={[schematicStyles.cornerBR, { borderColor: color }]} />

              {/* Status dot */}
              {status !== 'idle' && (
                <View style={[schematicStyles.statusDot, { backgroundColor: color, shadowColor: color }]} />
              )}

              <Text style={[schematicStyles.equipName, { color: isSelected ? color : color + 'cc' }]} numberOfLines={2}>
                {eq.equipment_name.replace(' - PA1', '').replace(' - PR1', '').replace(' - PR2', '')}
              </Text>

              {primarySensor?.value != null && (
                <Text style={[schematicStyles.equipVal, { color: STATUS_COLOR[primarySensor.status] || HUD.textDim }]}>
                  {primarySensor.value.toFixed(0)}{primarySensor.unit?.replace('°F', '°').replace('bags/min', '/m').replace('ft/min', 'ft').replace('mm/s', 'mm') || ''}
                </Text>
              )}

              {status === 'critical' && (
                <View style={schematicStyles.critBadge}>
                  <Text style={schematicStyles.critText}>!</Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Scanning line */}
        <Animated.View
          style={[schematicStyles.scanLine, {
            transform: [{ translateX: scanX }],
            shadowColor: HUD.cyan,
          }]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const schematicStyles = StyleSheet.create({
  container: {
    backgroundColor: HUD.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: HUD.borderBright,
    padding: 14, marginBottom: 16,
    shadowColor: HUD.cyan, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 2 },
  liveText: { fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  flowItem: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  mapArea: { position: 'relative', width: '100%', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: HUD.grid },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: HUD.grid },
  floor: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: HUD.borderBright,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2,
  },
  equipBlock: {
    position: 'absolute', borderRadius: 8,
    padding: 5, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4,
  },
  cornerTL: {
    position: 'absolute', top: 2, left: 2, width: 8, height: 8,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRadius: 1,
  },
  cornerBR: {
    position: 'absolute', bottom: 2, right: 2, width: 8, height: 8,
    borderBottomWidth: 1.5, borderRightWidth: 1.5, borderRadius: 1,
  },
  statusDot: {
    position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3,
  },
  equipName: { fontSize: 7, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  equipVal: { fontSize: 11, fontWeight: '900', marginTop: 1 },
  critBadge: {
    position: 'absolute', bottom: 3, left: 3,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: HUD.red, alignItems: 'center', justifyContent: 'center',
  },
  critText: { fontSize: 8, fontWeight: '900', color: '#fff' },
  scanLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: HUD.cyan + '30',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 5,
  },
});

// ══════════════════════════════════ EQUIPMENT DETAIL ════════════════════════

function EquipmentDetailPanel({
  name, status, sensors,
}: { name: string; status: string; sensors: SensorReading[] }) {
  const color = STATUS_COLOR[status] || HUD.textDim;

  return (
    <GlowBorder color={color} style={{ marginBottom: 16 }}>
      <View style={detailStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={detailStyles.eyebrow}>SELECTED EQUIPMENT</Text>
          <Text style={[detailStyles.name, { color }]}>{name}</Text>
        </View>
        <View style={[detailStyles.statusPill, { backgroundColor: color + '18', borderColor: color + '50' }]}>
          <PulsingDot color={color} size={6} />
          <Text style={[detailStyles.statusText, { color }]}>{status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Sensor grid */}
      <View style={detailStyles.sensorGrid}>
        {sensors.map(s => {
          const sc = STATUS_COLOR[s.status] || HUD.textDim;
          const pct = s.critical_high
            ? Math.min(100, Math.max(0, ((s.value - (s.critical_low || 0)) / ((s.critical_high) - (s.critical_low || 0))) * 100))
            : 50;

          return (
            <View key={s.id} style={[detailStyles.sensorCard, { borderColor: sc + '30', backgroundColor: sc + '08' }]}>
              <Text style={[detailStyles.sensorName, { color: HUD.textSec }]} numberOfLines={2}>{s.sensor_name}</Text>
              <Text style={[detailStyles.sensorVal, { color: sc }]}>
                {s.value != null ? s.value.toFixed(1) : '--'}
                <Text style={detailStyles.sensorUnit}> {s.unit}</Text>
              </Text>
              {/* Bar */}
              <View style={detailStyles.barTrack}>
                <View style={[detailStyles.barFill, { width: `${pct}%` as any, backgroundColor: sc }]} />
              </View>
              <Text style={detailStyles.targetLabel}>TGT: {s.target_value}{s.unit}</Text>
            </View>
          );
        })}

        {sensors.length === 0 && (
          <Text style={{ color: HUD.textDim, fontSize: 12, padding: 16 }}>No sensors on this equipment</Text>
        )}
      </View>
    </GlowBorder>
  );
}

const detailStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: HUD.border,
  },
  eyebrow: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 2, marginBottom: 3 },
  name: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sensorGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12,
  },
  sensorCard: {
    width: (SCREEN_WIDTH - 32 - 36 - 24) / 2,
    padding: 12, borderRadius: 10, borderWidth: 1, gap: 4,
  },
  sensorName: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  sensorVal: { fontSize: 20, fontWeight: '900' },
  sensorUnit: { fontSize: 11, fontWeight: '400' },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: HUD.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  targetLabel: { fontSize: 9, color: HUD.textDim, letterSpacing: 0.5 },
});

// ══════════════════════════════════ MAIN SCREEN ══════════════════════════════

export default function RoomDashboard() {
  const router = useRouter();
  const { room } = useLocalSearchParams<{ room: string }>();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [tickCount, setTickCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const roomCode = room || 'PA1';
  const roomNames: Record<string, string> = { PA1: 'PACKET AREA 1', PR1: 'PRODUCTION ROOM 1', PR2: 'PRODUCTION ROOM 2' };
  const roomName = roomNames[roomCode] || roomCode;

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    }, 10000);
    return () => clearInterval(interval);
  }, [roomCode, queryClient]);

  const { data: equipment = [], isLoading: equipLoading } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'equipment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_equipment').select('*')
        .eq('organization_id', organizationId).eq('room_code', roomCode).order('display_order');
      if (error) throw error;
      return (data || []) as RoomEquipment[];
    },
    enabled: !!organizationId,
  });

  const { data: sensorReadings = [] } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'sensors'],
    queryFn: async () => {
      const { data: sensors, error: sErr } = await supabase.from('equipment_sensors')
        .select('id, room_equipment_id, sensor_name, sensor_type, unit, target_value, warning_low, warning_high, critical_low, critical_high')
        .eq('organization_id', organizationId).eq('room_code', roomCode);
      if (sErr) throw sErr;
      if (!sensors || !sensors.length) return [];
      const ids = sensors.map(s => s.id);
      const { data: readings } = await supabase.from('sensor_readings')
        .select('sensor_id, value, status, recorded_at')
        .eq('organization_id', organizationId).eq('room_code', roomCode)
        .in('sensor_id', ids).order('recorded_at', { ascending: false }).limit(ids.length * 2);
      const equipMap: Record<string, string> = {};
      equipment.forEach(e => { equipMap[e.id] = e.equipment_name; });
      const latestMap: Record<string, any> = {};
      (readings || []).forEach(r => { if (!latestMap[r.sensor_id]) latestMap[r.sensor_id] = r; });
      return sensors.map(s => ({
        ...s, value: latestMap[s.id]?.value ?? null,
        status: latestMap[s.id]?.status ?? 'idle',
        recorded_at: latestMap[s.id]?.recorded_at ?? null,
        equipment_name: equipMap[s.room_equipment_id] || 'Unknown',
      })) as SensorReading[];
    },
    enabled: !!organizationId && equipment.length > 0,
    refetchInterval: 10000,
  });

  const { data: roomStatus } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'status'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_status').select('*')
        .eq('organization_id', organizationId).eq('room_code', roomCode).single();
      if (error) return null;
      return data as RoomStatus;
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  const { data: productionEvents = [] } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('production_events').select('*')
        .eq('organization_id', organizationId).eq('room_code', roomCode)
        .order('started_at', { ascending: false }).limit(20);
      if (error) return [];
      return (data || []) as ProductionEvent[];
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  const sensorsByEquipment = useMemo(() => {
    const map: Record<string, SensorReading[]> = {};
    sensorReadings.forEach(s => {
      if (!map[s.equipment_name]) map[s.equipment_name] = [];
      map[s.equipment_name].push(s);
    });
    return map;
  }, [sensorReadings]);

  const equipmentStatus = useMemo(() => {
    const map: Record<string, string> = {};
    equipment.forEach(e => {
      const sensors = sensorsByEquipment[e.equipment_name] || [];
      if (!sensors.length) { map[e.equipment_name] = 'idle'; return; }
      const hasCrit = sensors.some(s => s.status === 'critical');
      const hasWarn = sensors.some(s => s.status === 'warning');
      map[e.equipment_name] = hasCrit ? 'critical' : hasWarn ? 'warning' : 'normal';
    });
    return map;
  }, [equipment, sensorsByEquipment]);

  const andonColor = ANDON_COLOR[roomStatus?.andon_color || 'gray'] || HUD.textDim;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    setRefreshing(false);
  }, [queryClient, roomCode]);

  const handleTick = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch('https://app.tulkenz.net/api/simulator?action=tick', { method: 'POST' });
      const json = await res.json();
      setTickCount(json.tick || tickCount + 1);
      await queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    } catch (err: any) {
      Alert.alert('Tick Error', err.message || 'Failed to connect to simulator');
    }
  }, [queryClient, roomCode, tickCount]);

  const handleTriggerEvent = useCallback(async (eventName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await fetch(`https://app.tulkenz.net/api/simulator?action=trigger&event=${eventName}&room=${roomCode}`, { method: 'POST' });
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 500));
        await fetch('https://app.tulkenz.net/api/simulator?action=tick', { method: 'POST' });
      }
      await queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    } catch (err) { console.error('[RoomDashboard] Trigger error:', err); }
  }, [queryClient, roomCode]);

  const bpm = roomStatus?.bags_per_minute || 0;
  const target = roomStatus?.target_bags_per_minute || 1;
  const bpmColor = bpm >= target * 0.9 ? HUD.green : bpm >= target * 0.7 ? HUD.amber : HUD.red;
  const uptime = roomStatus?.uptime_percent || 0;
  const uptimeColor = uptime >= 90 ? HUD.green : uptime >= 75 ? HUD.amber : HUD.red;

  const criticalSensors = sensorReadings.filter(s => s.status === 'critical' && s.value != null);
  const warningSensors = sensorReadings.filter(s => s.status === 'warning' && s.value != null);

  return (
    <View style={mainStyles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HUD Header ── */}
      <View style={[mainStyles.header, { borderBottomColor: andonColor + '60', shadowColor: andonColor }]}>
        {/* Grid overlay */}
        <View style={mainStyles.headerGrid} pointerEvents="none">
          {[0.2, 0.4, 0.6, 0.8].map(f => (
            <View key={f} style={[mainStyles.headerGridLine, { left: `${f * 100}%` as any }]} />
          ))}
        </View>

        <Pressable style={mainStyles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={HUD.cyan} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={mainStyles.roomCode}>{roomCode}</Text>
          <Text style={[mainStyles.roomName, { color: andonColor }]}>{roomName}</Text>
          <Text style={mainStyles.roomSub}>
            {roomStatus?.updated_at
              ? `SYS SYNC • ${new Date(roomStatus.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
              : 'AWAITING SIGNAL'}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[mainStyles.statusPill, { backgroundColor: andonColor + '18', borderColor: andonColor + '50' }]}>
            <PulsingDot color={andonColor} size={7} />
            <Text style={[mainStyles.statusPillText, { color: andonColor }]}>
              {(roomStatus?.status || 'IDLE').toUpperCase()}
            </Text>
          </View>
          {criticalSensors.length > 0 && (
            <View style={[mainStyles.alertPill, { backgroundColor: HUD.red + '18', borderColor: HUD.red + '50' }]}>
              <AlertTriangle size={10} color={HUD.red} />
              <Text style={[mainStyles.alertPillText, { color: HUD.red }]}>{criticalSensors.length} CRIT</Text>
            </View>
          )}
        </View>

        <Pressable style={mainStyles.tickBtn} onPress={handleTick}>
          <Zap size={16} color={HUD.purple} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: HUD.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={andonColor} />}
      >

        {/* ── Metrics Strip ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <HexMetric
              label="BAGS/MIN"
              value={bpm.toString()}
              unit={`/ ${target}`}
              color={bpmColor}
              icon={<Package size={14} color={bpmColor} />}
            />
            <HexMetric
              label="TODAY"
              value={(roomStatus?.bags_today || 0).toLocaleString()}
              unit="BAGS"
              color={HUD.cyan}
              icon={<BarChart2 size={14} color={HUD.cyan} />}
            />
            <HexMetric
              label="UPTIME"
              value={`${uptime}%`}
              unit="OEE"
              color={uptimeColor}
              icon={<TrendingUp size={14} color={uptimeColor} />}
            />
            {sensorReadings.filter(s => ['temperature', 'pressure'].includes(s.sensor_type) && s.value != null).slice(0, 4).map(s => (
              <HexMetric
                key={s.id}
                label={s.sensor_name.length > 10 ? s.sensor_name.substring(0, 9) + '…' : s.sensor_name}
                value={s.value.toFixed(0)}
                unit={s.unit || ''}
                color={STATUS_COLOR[s.status] || HUD.textDim}
                icon={s.sensor_type === 'temperature'
                  ? <Thermometer size={14} color={STATUS_COLOR[s.status]} />
                  : <Gauge size={14} color={STATUS_COLOR[s.status]} />}
              />
            ))}
          </View>
        </ScrollView>

        {/* ── Alert Banner (critical only) ── */}
        {criticalSensors.length > 0 && (
          <View style={mainStyles.alertBanner}>
            <AlertTriangle size={14} color={HUD.red} />
            <Text style={mainStyles.alertBannerText}>
              {criticalSensors.length} CRITICAL SENSOR{criticalSensors.length > 1 ? 'S' : ''}: {criticalSensors.map(s => s.sensor_name).join(' · ')}
            </Text>
          </View>
        )}

        {/* ── Schematic ── */}
        <EquipmentSchematic
          equipment={equipment}
          sensorsByEquipment={sensorsByEquipment}
          equipmentStatus={equipmentStatus}
          selectedEquipment={selectedEquipment}
          onSelect={setSelectedEquipment}
          andonColor={andonColor}
        />

        {/* ── Selected Equipment Panel ── */}
        {selectedEquipment && (
          <EquipmentDetailPanel
            name={selectedEquipment}
            status={equipmentStatus[selectedEquipment] || 'idle'}
            sensors={sensorsByEquipment[selectedEquipment] || []}
          />
        )}

        {/* ── All Sensors ── */}
        <View style={mainStyles.sectionCard}>
          <View style={mainStyles.sectionHeader}>
            <Activity size={13} color={HUD.cyan} />
            <Text style={mainStyles.sectionTitle}>SENSOR MATRIX</Text>
            <Text style={mainStyles.sectionCount}>{sensorReadings.filter(s => s.value != null).length} ACTIVE</Text>
          </View>

          {sensorReadings.filter(s => s.value != null).map((sensor, i) => {
            const sc = STATUS_COLOR[sensor.status] || HUD.textDim;
            const isLast = i === sensorReadings.filter(s => s.value != null).length - 1;
            return (
              <View key={sensor.id} style={[mainStyles.sensorRow, !isLast && { borderBottomColor: HUD.border, borderBottomWidth: 1 }]}>
                <View style={[mainStyles.sensorIndicator, { backgroundColor: sc, shadowColor: sc }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[mainStyles.sensorName, { color: HUD.text }]}>{sensor.sensor_name}</Text>
                  <Text style={mainStyles.sensorEquip}>{sensor.equipment_name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[mainStyles.sensorVal, { color: sc }]}>
                    {sensor.value.toFixed(1)} <Text style={{ fontSize: 10, fontWeight: '400' }}>{sensor.unit}</Text>
                  </Text>
                  {sensor.status !== 'normal' && sensor.status !== 'idle' && (
                    <View style={[mainStyles.statusMini, { backgroundColor: sc + '20', borderColor: sc + '50' }]}>
                      <Text style={[mainStyles.statusMiniText, { color: sc }]}>{sensor.status.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Events ── */}
        {productionEvents.length > 0 && (
          <View style={mainStyles.sectionCard}>
            <View style={mainStyles.sectionHeader}>
              <Radio size={13} color={HUD.amber} />
              <Text style={[mainStyles.sectionTitle, { color: HUD.amber }]}>EVENT LOG</Text>
              <Text style={[mainStyles.sectionCount, { color: HUD.amber + '80' }]}>{productionEvents.length} RECORDS</Text>
            </View>
            {productionEvents.slice(0, 8).map(evt => {
              const isScheduled = evt.category === 'scheduled';
              const color = isScheduled ? HUD.cyan : evt.event_type === 'equipment_fault' ? HUD.red : HUD.amber;
              return (
                <View key={evt.id} style={[mainStyles.eventRow, { borderLeftColor: color }]}>
                  <View style={[mainStyles.eventDot, { backgroundColor: color, shadowColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[mainStyles.eventReason, { color: HUD.text }]} numberOfLines={2}>{evt.reason || evt.event_type}</Text>
                    <Text style={mainStyles.eventTime}>
                      {new Date(evt.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {evt.equipment_name ? ` · ${evt.equipment_name}` : ''}
                    </Text>
                  </View>
                  <View style={[mainStyles.eventBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                    <Text style={[mainStyles.eventBadgeText, { color }]}>
                      {isScheduled ? 'SCHED' : evt.event_type === 'equipment_fault' ? 'FAULT' : 'WARN'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Simulator ── */}
        <View style={[mainStyles.sectionCard, { borderColor: HUD.purple + '40' }]}>
          <View style={mainStyles.sectionHeader}>
            <Zap size={13} color={HUD.purple} />
            <Text style={[mainStyles.sectionTitle, { color: HUD.purple }]}>SIM CONTROLS</Text>
            <Text style={[mainStyles.sectionCount, { color: HUD.purple + '80' }]}>DEMO MODE</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {[
              { event: 'seal_temp_drift', label: 'SEAL TEMP DRIFT', color: HUD.amber, rooms: ['PA1'] },
              { event: 'air_pressure_drop', label: 'AIR PRESSURE DROP', color: HUD.red, rooms: ['PA1', 'PR1', 'PR2'] },
              { event: 'auger_slowdown', label: 'AUGER SLOWDOWN', color: HUD.amber, rooms: ['PA1', 'PR1', 'PR2'] },
              { event: 'film_jam', label: 'FILM JAM', color: HUD.red, rooms: ['PA1'] },
              { event: 'vibration_spike', label: 'VIBRATION SPIKE', color: HUD.amber, rooms: ['PR1', 'PR2'] },
              { event: 'metal_detect_rejects', label: 'METAL REJECTS', color: HUD.red, rooms: ['PR1', 'PR2'] },
              { event: 'hopper_low', label: 'HOPPER LOW', color: HUD.amber, rooms: ['PA1', 'PR1', 'PR2'] },
              { event: 'scheduled_break', label: 'SCHED BREAK', color: HUD.cyan, rooms: ['PA1', 'PR1', 'PR2'] },
            ].filter(e => e.rooms.includes(roomCode)).map(evt => (
              <Pressable
                key={evt.event}
                style={({ pressed }) => [mainStyles.simBtn, {
                  borderColor: evt.color + '50',
                  backgroundColor: pressed ? evt.color + '30' : evt.color + '12',
                }]}
                onPress={() => handleTriggerEvent(evt.event)}
              >
                <Text style={[mainStyles.simBtnText, { color: evt.color }]}>{evt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [mainStyles.tickBtnFull, {
              backgroundColor: pressed ? HUD.purple + '40' : HUD.purple + '15',
              borderColor: HUD.purple + '50',
            }]}
            onPress={handleTick}
          >
            <Zap size={16} color={HUD.purple} />
            <Text style={[mainStyles.tickBtnText, { color: HUD.purple }]}>
              ADVANCE TICK{tickCount > 0 ? ` · ${tickCount}` : ''}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════ STYLES ══════════════════════════════════

const mainStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 54, paddingBottom: 14,
    borderBottomWidth: 2, gap: 10,
    backgroundColor: HUD.bgCard,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    overflow: 'hidden',
  },
  headerGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  headerGridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: HUD.grid },
  backBtn: { padding: 8, backgroundColor: HUD.cyanDim, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyanMid },
  roomCode: { fontSize: 10, fontWeight: '800', color: HUD.textDim, letterSpacing: 3 },
  roomName: { fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  roomSub: { fontSize: 9, color: HUD.textDim, letterSpacing: 1.5, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  alertPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  tickBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: HUD.purpleDim, borderWidth: 1, borderColor: HUD.purple + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: HUD.red + '15', borderWidth: 1, borderColor: HUD.red + '40',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  alertBannerText: { fontSize: 11, fontWeight: '700', color: HUD.red, flex: 1, letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: HUD.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: HUD.borderBright,
    padding: 14, marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 2, flex: 1 },
  sectionCount: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 1 },
  sensorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  sensorIndicator: {
    width: 6, height: 32, borderRadius: 3,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3,
  },
  sensorName: { fontSize: 13, fontWeight: '600' },
  sensorEquip: { fontSize: 10, color: HUD.textDim, marginTop: 1, letterSpacing: 0.3 },
  sensorVal: { fontSize: 15, fontWeight: '800' },
  statusMini: {
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 2,
  },
  statusMiniText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  eventRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, paddingLeft: 12,
    borderLeftWidth: 2, gap: 10, marginBottom: 4,
  },
  eventDot: {
    width: 7, height: 7, borderRadius: 4, marginTop: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3,
  },
  eventReason: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  eventTime: { fontSize: 10, color: HUD.textDim, marginTop: 2, letterSpacing: 0.5 },
  eventBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  eventBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  simBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  simBtnText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tickBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 13, borderRadius: 10, borderWidth: 1,
  },
  tickBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
});
