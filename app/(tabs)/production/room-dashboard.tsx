import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ChevronLeft,
  Activity,
  Thermometer,
  Gauge,
  Wind,
  Package,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Radio,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ══════════════════════════════════ TYPES ══════════════════════════════════

interface RoomEquipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
  display_order: number;
  position_x: number;
  position_y: number;
  position_width: number;
  position_height: number;
  status: string;
  status_color: string;
  equipment_id: string | null;
}

interface SensorReading {
  id: string;
  sensor_id: string;
  sensor_name: string;
  sensor_type: string;
  unit: string;
  value: number;
  status: string;
  target_value: number;
  warning_low: number;
  warning_high: number;
  critical_low: number;
  critical_high: number;
  recorded_at: string;
  equipment_name: string;
  room_equipment_id: string;
}

interface RoomStatus {
  status: string;
  andon_color: string;
  bags_today: number;
  bags_per_minute: number;
  target_bags_per_minute: number;
  uptime_percent: number;
  personnel_count: number;
  current_run_number: string | null;
  updated_at: string;
}

interface ProductionEvent {
  id: string;
  event_type: string;
  category: string;
  reason: string;
  equipment_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

// ══════════════════════════════════ STATUS COLORS ══════════════════════════════════

const STATUS_COLORS: Record<string, string> = {
  normal: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  idle: '#6B7280',
};

const ANDON_COLORS: Record<string, string> = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
  gray: '#6B7280',
};

const EQUIPMENT_COLORS: Record<string, string> = {
  material_staging: '#64748B',
  foreign_material: '#F59E0B',
  conveyor: '#3B82F6',
  vessel: '#8B5CF6',
  packaging: '#EC4899',
  filler: '#EC4899',
  sealer: '#EF4444',
  printer: '#06B6D4',
  manual_station: '#10B981',
  quality_control: '#F97316',
};

// ══════════════════════════════════ COMPONENT ══════════════════════════════════

export default function RoomDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const { room } = useLocalSearchParams<{ room: string }>();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  const roomCode = room || 'PA1';
  const roomNames: Record<string, string> = {
    PA1: 'Packet Area 1',
    PR1: 'Production Room 1',
    PR2: 'Production Room 2',
  };
  const roomName = roomNames[roomCode] || roomCode;

  // ── Auto-refresh every 10 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    }, 10000);
    return () => clearInterval(interval);
  }, [roomCode, queryClient]);

  // ── Fetch room equipment ──
  const { data: equipment = [], isLoading: equipLoading } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_equipment')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('room_code', roomCode)
        .order('display_order');
      if (error) throw error;
      return (data || []) as RoomEquipment[];
    },
    enabled: !!organizationId,
  });

  // ── Fetch latest sensor readings ──
  const { data: sensorReadings = [], isLoading: sensorsLoading } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'sensors'],
    queryFn: async () => {
      // Get latest reading per sensor
      const { data: sensors, error: sensorErr } = await supabase
        .from('equipment_sensors')
        .select('id, room_equipment_id, sensor_name, sensor_type, unit, target_value, warning_low, warning_high, critical_low, critical_high')
        .eq('organization_id', organizationId)
        .eq('room_code', roomCode);

      if (sensorErr) throw sensorErr;
      if (!sensors || sensors.length === 0) return [];

      const sensorIds = sensors.map(s => s.id);

      // Get latest reading for each sensor
      const { data: readings, error: readErr } = await supabase
        .from('sensor_readings')
        .select('sensor_id, value, status, recorded_at')
        .eq('organization_id', organizationId)
        .eq('room_code', roomCode)
        .in('sensor_id', sensorIds)
        .order('recorded_at', { ascending: false })
        .limit(sensorIds.length * 2);

      if (readErr) throw readErr;

      // Get the equipment names
      const equipMap: Record<string, string> = {};
      equipment.forEach(e => { equipMap[e.id] = e.equipment_name; });

      // Merge: latest reading per sensor
      const latestMap: Record<string, any> = {};
      (readings || []).forEach(r => {
        if (!latestMap[r.sensor_id]) {
          latestMap[r.sensor_id] = r;
        }
      });

      return sensors.map(s => ({
        ...s,
        value: latestMap[s.id]?.value ?? null,
        status: latestMap[s.id]?.status ?? 'idle',
        recorded_at: latestMap[s.id]?.recorded_at ?? null,
        equipment_name: equipMap[s.room_equipment_id] || 'Unknown',
      })) as SensorReading[];
    },
    enabled: !!organizationId && equipment.length > 0,
    refetchInterval: 10000,
  });

  // ── Fetch room status ──
  const { data: roomStatus } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_status')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('room_code', roomCode)
        .single();
      if (error) return null;
      return data as RoomStatus;
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  // ── Fetch recent production events ──
  const { data: productionEvents = [] } = useQuery({
    queryKey: ['room-dashboard', roomCode, 'events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('room_code', roomCode)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return (data || []) as ProductionEvent[];
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  // ── Get sensor readings grouped by equipment ──
  const sensorsByEquipment = useMemo(() => {
    const map: Record<string, SensorReading[]> = {};
    sensorReadings.forEach(s => {
      if (!map[s.equipment_name]) map[s.equipment_name] = [];
      map[s.equipment_name].push(s);
    });
    return map;
  }, [sensorReadings]);

  // ── Get worst status per equipment ──
  const equipmentStatus = useMemo(() => {
    const map: Record<string, string> = {};
    equipment.forEach(e => {
      const sensors = sensorsByEquipment[e.equipment_name] || [];
      if (sensors.length === 0) {
        map[e.equipment_name] = 'idle';
        return;
      }
      const hasCritical = sensors.some(s => s.status === 'critical');
      const hasWarning = sensors.some(s => s.status === 'warning');
      map[e.equipment_name] = hasCritical ? 'critical' : hasWarning ? 'warning' : 'normal';
    });
    return map;
  }, [equipment, sensorsByEquipment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    setRefreshing(false);
  }, [queryClient, roomCode]);

  // ── Call simulator tick ──
  const handleTick = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await fetch('https://app.tulkenz.net/api/simulator?action=tick', { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    } catch (err) {
      console.error('[RoomDashboard] Tick error:', err);
    }
  }, [queryClient, roomCode]);

  // ── Trigger event ──
  const handleTriggerEvent = useCallback(async (eventName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await fetch(`https://app.tulkenz.net/api/simulator?action=trigger&event=${eventName}&room=${roomCode}`, { method: 'POST' });
      // Run a few ticks to show the effect
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 500));
        await fetch('/api/simulator?action=tick', { method: 'POST' });
      }
      await queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomCode] });
    } catch (err) {
      console.error('[RoomDashboard] Trigger error:', err);
    }
  }, [queryClient, roomCode]);

  const andonColor = ANDON_COLORS[roomStatus?.andon_color || 'gray'] || '#6B7280';
  const isLoading = equipLoading || sensorsLoading;

  // ── Scale equipment positions to screen width ──
  const maxX = Math.max(...equipment.map(e => e.position_x + e.position_width), 750);
  const scaleX = (SCREEN_WIDTH - 32) / maxX;
  const mapHeight = 140;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: andonColor }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.andonDot, { backgroundColor: andonColor }]} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{roomName}</Text>
            <View style={[styles.andonBadge, { backgroundColor: andonColor + '20', borderColor: andonColor }]}>
              <Text style={[styles.andonBadgeText, { color: andonColor }]}>
                {(roomStatus?.status || 'idle').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {roomStatus?.current_run_number ? `Run: ${roomStatus.current_run_number}` : 'No active run'} • Updated {roomStatus?.updated_at ? new Date(roomStatus.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '--'}
          </Text>
        </View>
        <Pressable style={[styles.tickBtn, { backgroundColor: '#8B5CF620' }]} onPress={handleTick}>
          <Zap size={18} color="#8B5CF6" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={andonColor} />}
      >
        {/* Live Metrics Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsStrip}>
          <View style={styles.metricsRow}>
            <MetricCard
              icon={<Package size={16} color="#8B5CF6" />}
              label="Bags/Min"
              value={roomStatus?.bags_per_minute?.toString() || '0'}
              target={`/ ${roomStatus?.target_bags_per_minute || 0}`}
              color={
                (roomStatus?.bags_per_minute || 0) >= (roomStatus?.target_bags_per_minute || 0) * 0.9 ? '#10B981'
                : (roomStatus?.bags_per_minute || 0) >= (roomStatus?.target_bags_per_minute || 0) * 0.7 ? '#F59E0B'
                : '#EF4444'
              }
              colors={colors}
            />
            <MetricCard
              icon={<Activity size={16} color="#10B981" />}
              label="Today"
              value={(roomStatus?.bags_today || 0).toLocaleString()}
              target="bags"
              color="#10B981"
              colors={colors}
            />
            <MetricCard
              icon={<TrendingUp size={16} color="#3B82F6" />}
              label="Uptime"
              value={`${roomStatus?.uptime_percent || 0}%`}
              target=""
              color={(roomStatus?.uptime_percent || 0) >= 90 ? '#10B981' : (roomStatus?.uptime_percent || 0) >= 75 ? '#F59E0B' : '#EF4444'}
              colors={colors}
            />
            {/* Key sensor values */}
            {sensorReadings.filter(s => ['temperature', 'pressure'].includes(s.sensor_type)).slice(0, 4).map(s => (
              <MetricCard
                key={s.id}
                icon={s.sensor_type === 'temperature' ? <Thermometer size={16} color={STATUS_COLORS[s.status]} /> : <Gauge size={16} color={STATUS_COLORS[s.status]} />}
                label={s.sensor_name.length > 14 ? s.sensor_name.substring(0, 12) + '..' : s.sensor_name}
                value={s.value !== null ? s.value.toString() : '--'}
                target={s.unit}
                color={STATUS_COLORS[s.status] || '#6B7280'}
                colors={colors}
              />
            ))}
          </View>
        </ScrollView>

        {/* Side-View Equipment Map */}
        <View style={[styles.mapContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.mapHeader}>
            <Radio size={14} color={andonColor} />
            <Text style={[styles.mapTitle, { color: colors.text }]}>Equipment Layout — Side View</Text>
            <View style={[styles.liveDot, { backgroundColor: andonColor }]} />
            <Text style={[styles.liveText, { color: andonColor }]}>LIVE</Text>
          </View>

          {/* Flow arrow */}
          <View style={[styles.flowArrow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.flowText, { color: colors.textTertiary }]}>Product Flow →</Text>
          </View>

          {/* Equipment blocks */}
          <View style={[styles.mapArea, { height: mapHeight }]}>
            {/* Floor line */}
            <View style={[styles.floorLine, { backgroundColor: colors.border, top: mapHeight - 10 }]} />

            {equipment.map(eq => {
              const status = equipmentStatus[eq.equipment_name] || 'idle';
              const statusColor = STATUS_COLORS[status] || '#6B7280';
              const baseColor = EQUIPMENT_COLORS[eq.equipment_type] || '#6B7280';
              const isSelected = selectedEquipment === eq.equipment_name;
              const sensors = sensorsByEquipment[eq.equipment_name] || [];

              const scaledX = eq.position_x * scaleX;
              const scaledW = Math.max(eq.position_width * scaleX, 40);
              const scaledY = eq.position_y * (mapHeight / 100);
              const scaledH = eq.position_height * (mapHeight / 100);

              return (
                <Pressable
                  key={eq.id}
                  style={[
                    styles.equipBlock,
                    {
                      left: scaledX,
                      top: scaledY,
                      width: scaledW,
                      height: scaledH,
                      backgroundColor: status === 'idle' ? baseColor + '15' : statusColor + '20',
                      borderColor: isSelected ? statusColor : (status === 'idle' ? baseColor + '40' : statusColor + '60'),
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedEquipment(isSelected ? null : eq.equipment_name);
                  }}
                >
                  {/* Status indicator dot */}
                  {status !== 'idle' && (
                    <View style={[styles.equipStatusDot, { backgroundColor: statusColor }]} />
                  )}

                  {/* Equipment name */}
                  <Text style={[styles.equipName, { color: status === 'idle' ? baseColor : statusColor }]} numberOfLines={2}>
                    {eq.equipment_name.replace(' - ' + roomCode, '')}
                  </Text>

                  {/* Primary sensor value */}
                  {sensors.length > 0 && sensors[0].value !== null && (
                    <Text style={[styles.equipValue, { color: STATUS_COLORS[sensors[0].status] || '#6B7280' }]}>
                      {Math.round(sensors[0].value)}{sensors[0].unit?.replace('°F', '°').replace('bags/min', '/m').replace('ft/min', 'ft').replace('mm/s', 'mm')}
                    </Text>
                  )}
                </Pressable>
              );
            })}

            {/* Connection lines between equipment */}
            {equipment.length > 1 && equipment.slice(0, -1).map((eq, i) => {
              const next = equipment[i + 1];
              const x1 = (eq.position_x + eq.position_width) * scaleX;
              const x2 = next.position_x * scaleX;
              const y = mapHeight * 0.55;
              const w = x2 - x1;
              if (w < 2) return null;
              return (
                <View
                  key={`conn-${i}`}
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y,
                    width: w,
                    height: 2,
                    backgroundColor: andonColor + '40',
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* Selected Equipment Detail */}
        {selectedEquipment && (
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedEquipment}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[equipmentStatus[selectedEquipment] || 'idle'] + '20' }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[equipmentStatus[selectedEquipment] || 'idle'] }]}>
                  {(equipmentStatus[selectedEquipment] || 'idle').toUpperCase()}
                </Text>
              </View>
            </View>

            {(sensorsByEquipment[selectedEquipment] || []).map(sensor => (
              <View key={sensor.id} style={[styles.sensorRow, { borderBottomColor: colors.border }]}>
                <View style={styles.sensorInfo}>
                  <View style={[styles.sensorDot, { backgroundColor: STATUS_COLORS[sensor.status] || '#6B7280' }]} />
                  <Text style={[styles.sensorName, { color: colors.text }]}>{sensor.sensor_name}</Text>
                </View>
                <View style={styles.sensorValues}>
                  <Text style={[styles.sensorValue, { color: STATUS_COLORS[sensor.status] || '#6B7280' }]}>
                    {sensor.value !== null ? sensor.value.toFixed(1) : '--'}
                  </Text>
                  <Text style={[styles.sensorUnit, { color: colors.textSecondary }]}>{sensor.unit}</Text>
                </View>
                <View style={styles.sensorRange}>
                  {/* Mini gauge bar */}
                  <View style={[styles.gaugeTrack, { backgroundColor: colors.backgroundSecondary }]}>
                    <View style={[
                      styles.gaugeFill,
                      {
                        backgroundColor: STATUS_COLORS[sensor.status] || '#6B7280',
                        width: sensor.value !== null && sensor.critical_high
                          ? `${Math.min(100, Math.max(5, ((sensor.value - (sensor.critical_low || 0)) / ((sensor.critical_high || 100) - (sensor.critical_low || 0))) * 100))}%`
                          : '50%',
                      },
                    ]} />
                  </View>
                  <Text style={[styles.sensorTarget, { color: colors.textTertiary }]}>
                    Target: {sensor.target_value}{sensor.unit}
                  </Text>
                </View>
              </View>
            ))}

            {(sensorsByEquipment[selectedEquipment] || []).length === 0 && (
              <Text style={[styles.noSensors, { color: colors.textSecondary }]}>No sensors on this equipment</Text>
            )}
          </View>
        )}

        {/* All Sensors Overview */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sensor Readings</Text>
          {sensorReadings.filter(s => s.value !== null).map(sensor => {
            const icon = sensor.status === 'critical' ? <XCircle size={14} color="#EF4444" />
              : sensor.status === 'warning' ? <AlertTriangle size={14} color="#F59E0B" />
              : <CheckCircle size={14} color="#10B981" />;

            return (
              <View key={sensor.id} style={[styles.sensorListRow, { borderBottomColor: colors.border }]}>
                {icon}
                <View style={styles.sensorListInfo}>
                  <Text style={[styles.sensorListName, { color: colors.text }]}>{sensor.sensor_name}</Text>
                  <Text style={[styles.sensorListEquip, { color: colors.textTertiary }]}>{sensor.equipment_name}</Text>
                </View>
                <Text style={[styles.sensorListValue, { color: STATUS_COLORS[sensor.status] || colors.text }]}>
                  {sensor.value.toFixed(1)} {sensor.unit}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Downtime / Events */}
        {productionEvents.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Events</Text>
            {productionEvents.slice(0, 10).map(evt => {
              const isScheduled = evt.category === 'scheduled';
              const color = isScheduled ? '#3B82F6' : evt.event_type === 'equipment_fault' ? '#EF4444' : '#F59E0B';
              return (
                <View key={evt.id} style={[styles.eventRow, { borderLeftColor: color }]}>
                  <View style={[styles.eventDot, { backgroundColor: color }]} />
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventReason, { color: colors.text }]} numberOfLines={2}>
                      {evt.reason || evt.event_type}
                    </Text>
                    <Text style={[styles.eventTime, { color: colors.textTertiary }]}>
                      {new Date(evt.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {evt.equipment_name ? ` • ${evt.equipment_name}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.eventBadge, { backgroundColor: color + '15' }]}>
                    <Text style={[styles.eventBadgeText, { color }]}>
                      {isScheduled ? 'SCHED' : evt.event_type === 'equipment_fault' ? 'FAULT' : 'WARN'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Simulator Controls (demo only) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: '#8B5CF640' }]}>
          <View style={styles.simHeader}>
            <Zap size={16} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: '#8B5CF6', marginBottom: 0 }]}>Simulator Controls</Text>
          </View>
          <Text style={[styles.simDesc, { color: colors.textSecondary }]}>
            Trigger events to see how the system responds. Each event generates sensor data, updates equipment status, and may auto-create work orders.
          </Text>
          <View style={styles.simGrid}>
            {[
              { event: 'seal_temp_drift', label: 'Seal Temp Drift', color: '#F59E0B', rooms: ['PA1'] },
              { event: 'air_pressure_drop', label: 'Air Pressure Drop', color: '#EF4444', rooms: ['PA1', 'PR1', 'PR2'] },
              { event: 'auger_slowdown', label: 'Auger Slowdown', color: '#F59E0B', rooms: ['PA1', 'PR1', 'PR2'] },
              { event: 'film_jam', label: 'Film Jam (Stops Line)', color: '#EF4444', rooms: ['PA1'] },
              { event: 'vibration_spike', label: 'Vibration Spike', color: '#F59E0B', rooms: ['PR1', 'PR2'] },
              { event: 'metal_detect_rejects', label: 'Metal Detector Rejects', color: '#EF4444', rooms: ['PR1', 'PR2'] },
              { event: 'hopper_low', label: 'Hopper Low', color: '#F59E0B', rooms: ['PA1', 'PR1', 'PR2'] },
              { event: 'scheduled_break', label: 'Scheduled Break', color: '#3B82F6', rooms: ['PA1', 'PR1', 'PR2'] },
            ].filter(e => e.rooms.includes(roomCode)).map(evt => (
              <Pressable
                key={evt.event}
                style={[styles.simBtn, { borderColor: evt.color + '40', backgroundColor: evt.color + '10' }]}
                onPress={() => handleTriggerEvent(evt.event)}
              >
                <Text style={[styles.simBtnText, { color: evt.color }]}>{evt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.tickBtnLarge, { backgroundColor: '#8B5CF620', borderColor: '#8B5CF640' }]}
            onPress={handleTick}
          >
            <Zap size={18} color="#8B5CF6" />
            <Text style={[styles.tickBtnText, { color: '#8B5CF6' }]}>Advance Tick</Text>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════ METRIC CARD ══════════════════════════════════

function MetricCard({ icon, label, value, target, color, colors }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={[metricStyles.card, { backgroundColor: colors.surface, borderColor: color + '30' }]}>
      {icon}
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      <Text style={[metricStyles.target, { color: colors.textTertiary }]}>{target}</Text>
      <Text style={[metricStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 2,
    marginRight: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  target: {
    fontSize: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
});

// ══════════════════════════════════ STYLES ══════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingTop: 54,
    paddingBottom: 12,
    borderBottomWidth: 3,
    gap: 8,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1 },
  headerTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  andonDot: { width: 12, height: 12, borderRadius: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700' as const },
  andonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  andonBadgeText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, marginTop: 2 },
  tickBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  metricsStrip: { marginBottom: 16 },
  metricsRow: { flexDirection: 'row' as const },
  mapContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden' as const,
  },
  mapHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  mapTitle: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
  flowArrow: { borderBottomWidth: 1, paddingBottom: 4, marginBottom: 8 },
  flowText: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const },
  mapArea: { position: 'relative' as const, width: '100%' as any },
  floorLine: { position: 'absolute' as const, left: 0, right: 0, height: 2 },
  equipBlock: {
    position: 'absolute' as const,
    borderRadius: 8,
    padding: 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  equipStatusDot: {
    position: 'absolute' as const,
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  equipName: { fontSize: 8, fontWeight: '600' as const, textAlign: 'center' as const },
  equipValue: { fontSize: 10, fontWeight: '800' as const, marginTop: 1 },
  detailCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 14,
  },
  detailTitle: { fontSize: 16, fontWeight: '700' as const },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' as const },
  sensorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  sensorInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flex: 1,
  },
  sensorDot: { width: 8, height: 8, borderRadius: 4 },
  sensorName: { fontSize: 13, fontWeight: '500' as const },
  sensorValues: { alignItems: 'flex-end' as const, minWidth: 60 },
  sensorValue: { fontSize: 16, fontWeight: '700' as const },
  sensorUnit: { fontSize: 10 },
  sensorRange: { width: 80 },
  gaugeTrack: { height: 6, borderRadius: 3, overflow: 'hidden' as const },
  gaugeFill: { height: '100%' as any, borderRadius: 3 },
  sensorTarget: { fontSize: 9, marginTop: 2 },
  noSensors: { fontSize: 13, fontStyle: 'italic' as const, paddingVertical: 16, textAlign: 'center' as const },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 12 },
  sensorListRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  sensorListInfo: { flex: 1 },
  sensorListName: { fontSize: 13, fontWeight: '500' as const },
  sensorListEquip: { fontSize: 10, marginTop: 1 },
  sensorListValue: { fontSize: 14, fontWeight: '700' as const },
  eventRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    gap: 10,
    marginBottom: 6,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  eventInfo: { flex: 1 },
  eventReason: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  eventTime: { fontSize: 11, marginTop: 2 },
  eventBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  eventBadgeText: { fontSize: 9, fontWeight: '700' as const },
  simHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  simDesc: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  simGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  simBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  simBtnText: { fontSize: 12, fontWeight: '600' as const },
  tickBtnLarge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tickBtnText: { fontSize: 14, fontWeight: '600' as const },
});
