import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, Animated, Dimensions, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ChevronLeft, Activity, Thermometer, Gauge, Package,
  AlertTriangle, TrendingUp, Zap, Cpu, BarChart2,
  Wrench, ChevronDown, ChevronRight, X, CheckCircle,
  Radio, Layers, Box,
} from 'lucide-react-native';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');

// ══════════════════════════════════ THEME ══════════════════════════════════
const HUD = {
  bg: '#020912', bgCard: '#050f1e', bgCardAlt: '#071525',
  cyan: '#00e5ff', cyanDim: '#00e5ff22', cyanMid: '#00e5ff55',
  green: '#00ff88', greenDim: '#00ff8822',
  amber: '#ffb800', amberDim: '#ffb80022',
  red: '#ff2d55', redDim: '#ff2d5522',
  purple: '#7b61ff', purpleDim: '#7b61ff22',
  text: '#e0f4ff', textSec: '#7aa8c8', textDim: '#3a6080',
  border: '#0d2840', borderBright: '#1a4060', grid: '#0a1f35',
};
const SC: Record<string, string> = { normal: HUD.green, warning: HUD.amber, critical: HUD.red, idle: HUD.textDim };
const AC: Record<string, string> = { green: HUD.green, yellow: HUD.amber, red: HUD.red, blue: HUD.cyan, gray: HUD.textDim };

// ══════════════════════════════ A1200 MANUAL DATA ══════════════════════════
// Avatar A1200/A2200 Installation & Maintenance Manual — AFI Publication 4110811
const A1200_SYSTEMS = [
  {
    id: 'belt_drive', name: 'Belt Drive System', short: 'Belt Drive', color: HUD.cyan,
    events: ['film_jam', 'auger_slowdown', 'vibration_spike'],
    desc: 'Dual symmetrical belt drives pull packaging film through the machine at controlled speed.',
    parts: [
      { pn: 'AVT-BD-101', name: 'Drive Belt', stock: 2, min: 2 },
      { pn: 'AVT-BD-102', name: 'Drive Motor', stock: 1, min: 1 },
      { pn: 'AVT-BD-103', name: 'Belt Tensioner Assy', stock: 1, min: 1 },
      { pn: 'AVT-BD-104', name: 'Idler Roller (Sm)', stock: 6, min: 4 },
      { pn: 'AVT-BD-105', name: 'Large Idler Pulley', stock: 2, min: 1 },
      { pn: 'AVT-BD-106', name: 'Drive Gear', stock: 1, min: 1 },
    ],
    troubleshooting: [
      { symptom: 'Film not advancing or binding up', steps: ['Check belt tension — loosen tensioner bolt, pivot, inspect belt surface', 'Verify both drive motors run at same speed via PLC outputs', 'Inspect belt for cracks, fraying, or glazing', 'Confirm pneumatic cylinder moves belt drive in/out freely', 'Check motor controller outputs in main electrical enclosure'] },
      { symptom: 'Vertical seal quality degrading', steps: ['Uneven belt speed between left/right sets causes film skew', 'Compare PLC output signals to both motor controllers', 'Inspect all idler rollers for flat spots or seized bearings'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Open front door of A1200/A2200', 'Remove 2 knobs retaining vertical sealing element assembly', 'Slide sealing assembly off mounting posts — support it, do not hang from connections', 'Loosen tensioner bolt and pivot to release belt tension', 'Remove worn belt from drive system', 'Position new belt — adjust tensioner so belt is tight — tighten tensioner bolt', 'Reinstall vertical sealing assembly on mounting posts', 'Close door, reconnect all connections, power on and test'],
  },
  {
    id: 'vertical_seal', name: 'Vertical Sealing Assembly', short: 'Vert Seal', color: HUD.amber,
    events: ['seal_temp_drift'],
    desc: 'Creates the vertical seam as film travels down the forming collar. Auto-Tuning PID controls heating element to ±1°F.',
    parts: [
      { pn: 'AVT-VS-201', name: 'Heating Element (Vert)', stock: 2, min: 1 },
      { pn: 'AVT-VS-202', name: 'Thermocouple', stock: 3, min: 2 },
      { pn: 'AVT-VS-203', name: 'Pneumatic Cylinder', stock: 1, min: 1 },
      { pn: 'AVT-VS-204', name: 'Quick-Connect Fitting', stock: 6, min: 4 },
      { pn: 'AVT-VS-205', name: '220V Solid-State Relay', stock: 2, min: 1 },
    ],
    troubleshooting: [
      { symptom: 'Cannot control sealing temperature', steps: ['Check PLC output connections to heating element relay — must be secure', 'Verify correct voltage at relay coil side — energized = switch side closes', 'Inspect thermocouple wiring in black electrical box for kinks or damage', 'Confirm programmed temp setpoint is correct for film type', 'After element or TC replacement: run AutoTune from TEMPERATURE menu'] },
      { symptom: 'Partial vertical seal', steps: ['Check side-to-side film roll positioning on unwind shaft', 'Verify film is tracking straight through the machine', 'Inspect forming collar for damage or misalignment', 'Check sealing element surface for contamination or wear'] },
      { symptom: 'Seals opening easily after filling', steps: ['Verify temperature setpoint matches film specification', 'Check sealing dwell time in PLC settings', 'Inspect heating element for hot/cold spots'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Open front door — remove 2 knobs from mounting posts', 'Pull vertical sealing assembly off mounting posts', 'Rotate assembly 180° facing forward — place back on posts loosely', 'Open black electrical box — remove 4 screws on cover', 'Label, loosen, and disconnect thermocouple connections inside box', 'Remove cable ties securing thermocouple to machine', 'Loosen thermocouple at jaw and slide out', 'Slide new thermocouple into vertical sealing jaw — tighten', 'Route cable to black box, connect, reinstall cover', 'Restore assembly to normal orientation, reinstall knobs', 'Reconnect all connections — power on — run AutoTune'],
  },
  {
    id: 'endseal_jaw', name: 'Endseal Jaw / Knife', short: 'Endseal', color: HUD.red,
    events: ['film_jam', 'metal_detect_rejects'],
    desc: 'Creates top + bottom seals simultaneously. Pneumatic knife blade cuts completed bags free.',
    parts: [
      { pn: 'AVT-EJ-301', name: 'Heating Element (Front)', stock: 2, min: 1 },
      { pn: 'AVT-EJ-302', name: 'Heating Element (Rear)', stock: 1, min: 1 },
      { pn: 'AVT-EJ-303', name: 'Knife Blade', stock: 4, min: 2 },
      { pn: 'AVT-EJ-304', name: 'Knife Cylinder', stock: 1, min: 1 },
      { pn: 'AVT-EJ-305', name: 'Endseal Jaw Pneumatic Cyl.', stock: 1, min: 1 },
      { pn: 'AVT-EJ-306', name: 'Bag Deflator Pad', stock: 4, min: 2 },
      { pn: 'AVT-EJ-307', name: 'Jaw Plastic Bushings', stock: 6, min: 4 },
    ],
    troubleshooting: [
      { symptom: 'Jaw not closing / not functioning', steps: ['Confirm compressed air is reaching jaw cylinder', 'Verify air can vent from opposite side of cylinder', 'Check PLC output voltage to electric/pneumatic solenoids', 'Use TEST button on valve block to manually test solenoid function', 'Inspect front jaw plastic bushings — replace if damaged or contaminated'] },
      { symptom: 'Incomplete or weak end seals', steps: ['Verify temperature setpoint matches film spec for both elements', 'Check bag deflator position — foam pads should LEAD seals by ¼"', 'Ensure bag deflators are not pushing product up into endseal zone'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Open front door to access endseal jaws', 'KNIFE BLADE: Remove 2 mounting bolts — slide blade out', 'Install new blade with cutting edge facing REAR of machine — tighten bolts', 'HEATING ELEMENT: Open left side door', 'Label and disconnect element connections in black electrical box', 'Remove element from endseal jaw', 'Install new element, route wires, connect inside box, reinstall cover', 'Close all doors, reconnect connections', 'Power on — run AutoTune for affected endseal temperature channel'],
  },
  {
    id: 'filter_regulator', name: 'Filter / Regulator', short: 'Air System', color: HUD.purple,
    events: ['air_pressure_drop'],
    desc: 'Filters moisture and debris from compressed air supply. Also functions as electronic dump valve on E-stop.',
    parts: [
      { pn: 'AVT-FR-401', name: 'Filter/Regulator Assembly', stock: 1, min: 1 },
      { pn: 'AVT-FR-402', name: 'Electronic Dump Valve', stock: 1, min: 1 },
      { pn: 'AVT-FR-403', name: 'Filter Element', stock: 3, min: 2 },
      { pn: 'AVT-FR-404', name: 'Air Supply QC Fitting ½"', stock: 4, min: 2 },
    ],
    troubleshooting: [
      { symptom: 'Air pressure drops after machine starts', steps: ['Check compressed air supply line for restrictions or damage', 'Inspect internal air lines for leaks — use soapy water test on all fittings', 'Verify filter element is not clogged (inspect monthly per PM schedule)', 'Confirm air supply spec: 70 PSI @ 25 SCFM (laminate) or 45 SCFM (poly)', 'Check main air supply compressor and refrigerated dryer'] },
      { symptom: 'Pneumatic component not actuating', steps: ['Check PLC I/O LEDs activating at correct timing', 'Test valve using TEST button on electric/pneumatic valve block', 'Check valve block solenoid electrical connections at block assembly', 'Confirm air pressure is at spec before the valve block'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Disconnect air line from Filter/Regulator', 'Disconnect electrical connection from electronic dump valve', 'Remove mounting bolts from base frame', 'Remove dump valve from old unit', 'Assemble dump valve onto new Filter/Regulator', 'Mount in position — tighten bolts', 'Connect air lines to quick-connect fittings and electrical connections', 'Adjust air pressure: CW = increase, CCW = decrease — target 70 PSI', 'Power on and test all pneumatic functions'],
  },
  {
    id: 'film_unwind', name: 'Film Unwind / Encoder', short: 'Film Feed', color: HUD.green,
    events: ['film_jam', 'hopper_low'],
    desc: 'Holds and feeds film roll. Encoder accurate to 0.001" monitors belt slippage. Photoeye reads registration marks.',
    parts: [
      { pn: 'AVT-FU-501', name: 'Film Brake Rotor', stock: 1, min: 1 },
      { pn: 'AVT-FU-502', name: 'Brake Caliper', stock: 1, min: 1 },
      { pn: 'AVT-FU-503', name: 'Conical Locking Collars', stock: 4, min: 2 },
      { pn: 'AVT-FU-504', name: 'Encoder Assembly', stock: 1, min: 1 },
      { pn: 'AVT-FU-505', name: 'Photoeye Sensing Tip', stock: 2, min: 1 },
    ],
    troubleshooting: [
      { symptom: 'Film tracking off-center or misaligned', steps: ['Use measuring scale on shaft flat to center film roll', 'Secure conical locking collars in centered position after adjusting', 'Adjust film tracking knob — right side, behind electrical box', 'Note 2:1 ratio: 1" knob adjustment = 2" film shift'] },
      { symptom: 'Photoeye not detecting registration marks', steps: ['Check output LED — must illuminate when mark is at sensing block', 'Flashing LED = short circuit condition', 'Advance film manually — monitor bar graph LEDs on photoeye controller', 'Confirm LIGHT film with DARK registration marks (A1200 requirement)', 'Adjust sensing tip angle to 10–15° perpendicular to film surface'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Open right side electrical panel door', 'Locate encoder/photoeye cable connection at PLC', 'Label and disconnect cable', 'Remove wire ties securing cable along base frame', 'Pull cable back to component — bundle so it cannot tangle with moving parts', 'Loosen hex head screw (encoder) or mounting bolt (photoeye)', 'Remove old component and install new one', 'Route cable to panel following original path — secure all cable ties', 'Connect to PLC — reconnect all power', 'Calibrate photoeye: advance film so mark is NOT under sensor, press white button on controller'],
  },
];

const EVENT_SYSTEM: Record<string, string> = {
  seal_temp_drift: 'vertical_seal',
  air_pressure_drop: 'filter_regulator',
  auger_slowdown: 'belt_drive',
  film_jam: 'belt_drive',
  vibration_spike: 'belt_drive',
  metal_detect_rejects: 'endseal_jaw',
  hopper_low: 'film_unwind',
};

const EVENT_LABEL: Record<string, { title: string; desc: string; severity: string }> = {
  seal_temp_drift: { title: 'SEAL TEMP DRIFT', desc: 'Vertical seal temperature deviation detected', severity: 'warning' },
  air_pressure_drop: { title: 'AIR PRESSURE DROP', desc: 'Pneumatic pressure below specification', severity: 'critical' },
  auger_slowdown: { title: 'AUGER SLOWDOWN', desc: 'Belt drive speed anomaly detected', severity: 'warning' },
  film_jam: { title: 'FILM JAM', desc: 'Film feed obstruction or belt drive fault', severity: 'critical' },
  vibration_spike: { title: 'VIBRATION SPIKE', desc: 'Abnormal vibration on belt drive assembly', severity: 'warning' },
  metal_detect_rejects: { title: 'METAL REJECTS', desc: 'Metal detector reject count elevated', severity: 'critical' },
  hopper_low: { title: 'HOPPER LOW', desc: 'Film supply / hopper level alert', severity: 'warning' },
  scheduled_break: { title: 'SCHEDULED BREAK', desc: 'Scheduled production break', severity: 'warning' },
};

// ══════════════════════════════ ANIMATED HOOKS ══════════════════════════════
function usePulse(ms = 1800) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: ms, useNativeDriver: true }), Animated.timing(a, { toValue: 0, duration: ms, useNativeDriver: true })])).start(); }, []);
  return a;
}
function useScan(width: number, ms = 3200) {
  const a = useRef(new Animated.Value(-40)).current;
  useEffect(() => { Animated.loop(Animated.timing(a, { toValue: width + 40, duration: ms, useNativeDriver: true })).start(); }, [width]);
  return a;
}

// ══════════════════════════════ SMALL COMPONENTS ══════════════════════════════
function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const p = usePulse(1600);
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }} />
  );
}

// ══════════════════════════ HEARTBEAT MONITOR ══════════════════════════════
// EKG-style scrolling waveform driven by live sensor values
const HB_POINTS = 48; // number of columns in the waveform

function HeartbeatMonitor({ bpm, sensors, color = HUD.green, onBeat }: { bpm: number; sensors: any[]; color?: string; onBeat?: () => void }) {
  const onBeatRef = useRef(onBeat);
  useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);

  const [waveData, setWaveData] = useState<number[]>(() => Array.from({ length: HB_POINTS }, () => 0.5));
  const waveRef = useRef<number[]>(Array.from({ length: HB_POINTS }, () => 0.5));
  const tickRef = useRef(0);
  const lastBeatPhaseRef = useRef(false);
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Interval never restarts — reads bpm and onBeat from refs
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      const bpmNorm = Math.min(Math.max((bpmRef.current || 0) / 70, 0), 1);
      const phase = (t % 20) / 20;
      let sample = 0.5;
      if (phase < 0.08) sample = 0.5 + 0.08 * Math.sin(phase / 0.08 * Math.PI);
      else if (phase < 0.18) sample = 0.5 - 0.04 * Math.sin((phase - 0.08) / 0.10 * Math.PI);
      else if (phase < 0.22) sample = 0.5 + (0.45 * bpmNorm + 0.1) * Math.sin((phase - 0.18) / 0.04 * Math.PI);
      else if (phase < 0.28) sample = 0.5 - 0.12 * Math.sin((phase - 0.22) / 0.06 * Math.PI);
      else if (phase < 0.45) sample = 0.5 + 0.18 * Math.sin((phase - 0.28) / 0.17 * Math.PI);
      sample += (Math.random() - 0.5) * 0.015;
      sample = Math.min(Math.max(sample, 0.02), 0.98);

      const inSpike = phase >= 0.18 && phase < 0.22;
      if (inSpike && !lastBeatPhaseRef.current) onBeatRef.current?.();
      lastBeatPhaseRef.current = inSpike;

      waveRef.current = [...waveRef.current.slice(1), sample];
      setWaveData([...waveRef.current]);
    }, 100);
    return () => clearInterval(interval);
  }, []); // ← empty deps: interval starts once, never restarts

  const sweepAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(sweepAnim, { toValue: 1, duration: 2000, useNativeDriver: true })).start();
  }, []);

  const chartW = W - 64;
  const chartH = 52;
  const barW = Math.max(1, Math.floor((chartW - HB_POINTS * 0.5) / HB_POINTS));
  const hasCrit = sensors.some(s => s.status === 'critical');
  const lineColor = hasCrit ? HUD.red : bpm === 0 ? HUD.textDim : color;

  return (
    <View style={hbS.container}>
      <View style={hbS.header}>
        <Animated.View style={{ opacity: sweepAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] }) }}>
          <Activity size={12} color={lineColor} />
        </Animated.View>
        <Text style={[hbS.title, { color: lineColor }]}>LINE HEARTBEAT</Text>
        <Text style={hbS.bpmLabel}>{bpm > 0 ? `${bpm} PKG/MIN` : 'IDLE'}</Text>
        {hasCrit && (
          <View style={[hbS.critPill, { backgroundColor: HUD.redDim, borderColor: HUD.red + '50' }]}>
            <Text style={[hbS.critTxt, { color: HUD.red }]}>FAULT DETECTED</Text>
          </View>
        )}
      </View>

      {/* EKG waveform — traced line: each column is a 3px dot at signal Y position */}
      <View style={{ height: chartH, backgroundColor: HUD.bg, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <View key={f} style={{ position: 'absolute', left: 0, right: 0, top: chartH * f, height: 1, backgroundColor: HUD.grid }} />
        ))}
        {/* Trace dots — Y position = signal value mapped to chart height */}
        {waveData.map((v, i) => {
          const y = (1 - v) * (chartH - 4); // top=spike, bottom=dip, mid=baseline
          const isSpike = v > 0.65;
          const isDip = v < 0.35;
          const isActive = isSpike || isDip;
          const dotH = isSpike ? 4 : 2;
          return (
            <View key={i} style={{
              position: 'absolute',
              top: y,
              left: i * (barW + 0.5),
              width: barW,
              height: dotH,
              borderRadius: 1,
              backgroundColor: isActive ? lineColor : lineColor + '80',
              shadowColor: isSpike ? lineColor : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isSpike ? 1 : 0,
              shadowRadius: isSpike ? 5 : 0,
            }} />
          );
        })}
        {/* Sweep cursor */}
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: 1.5,
          backgroundColor: lineColor, opacity: 0.4,
          shadowColor: lineColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4,
          transform: [{ translateX: sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [0, chartW - 2] }) }],
        }} />
      </View>

      {/* Scrollable sensor ticker — all sensors */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {sensors.map(s => {
            const col = SC[s.status] || HUD.textDim;
            return (
              <View key={s.sensor_id || s.sensor_name} style={[hbS.tickerItem, { borderColor: col + '40', backgroundColor: col + '08' }]}>
                <View style={[hbS.dot, { backgroundColor: col }]} />
                <Text style={hbS.tickerLabel}>{s.sensor_name}</Text>
                <Text style={[hbS.tickerVal, { color: col }]}>{s.value?.toFixed(1) ?? '—'}<Text style={{ fontSize: 8 }}> {s.unit}</Text></Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
const hbS = StyleSheet.create({
  container: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: '800', letterSpacing: 2, flex: 1 },
  bpmLabel: { fontSize: 10, fontWeight: '700', color: HUD.textSec, letterSpacing: 1 },
  critPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  critTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: HUD.grid },
  sweep: { position: 'absolute', top: 0, bottom: 0, width: 2, opacity: 0.35, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  tickerItem: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  tickerLabel: { fontSize: 9, color: HUD.textSec },
  tickerVal: { fontSize: 10, fontWeight: '700' },
});

// ══════════════════════════ AUTO-POST TOAST ══════════════════════════
function AutoPostToast({ visible, eventTitle, onDismiss }: { visible: boolean; eventTitle: string; onDismiss: () => void }) {
  const slideY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideY, { toValue: -60, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[toastS.container, { transform: [{ translateY: slideY }], opacity }]}>
      <CheckCircle size={14} color={HUD.green} />
      <View style={{ flex: 1 }}>
        <Text style={toastS.title}>AUTO-POSTED TO TASK FEED</Text>
        <Text style={toastS.sub}>{eventTitle} · All 5 departments notified · Audit image attached</Text>
      </View>
      <Pressable onPress={onDismiss}><X size={13} color={HUD.textDim} /></Pressable>
    </Animated.View>
  );
}
const toastS = StyleSheet.create({
  container: { position: 'absolute', top: 110, left: 16, right: 16, backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1.5, borderColor: HUD.green + '60', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: HUD.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 20, zIndex: 200 },
  title: { fontSize: 11, fontWeight: '900', color: HUD.green, letterSpacing: 1.5 },
  sub: { fontSize: 10, color: HUD.textSec, marginTop: 1 },
});

// ══════════════════════════ INCIDENT ALERT CARD ══════════════════════════════
interface ActiveAlert { eventType: string; sensorName?: string; value?: number; unit?: string; target?: number; }

function IncidentAlertCard({ alert, onCreatePost, onDismiss }: { alert: ActiveAlert; onCreatePost: () => void; onDismiss: () => void; }) {
  const info = EVENT_LABEL[alert.eventType] || { title: alert.eventType.toUpperCase(), desc: 'Sensor alert detected', severity: 'warning' };
  const color = info.severity === 'critical' ? HUD.red : HUD.amber;
  const slideY = useRef(new Animated.Value(80)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulse = usePulse(900);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[aS.container, { borderColor: color + '70', shadowColor: color, transform: [{ translateY: slideY }], opacity: fadeIn }]}>
      <View style={aS.header}>
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }}>
          <AlertTriangle size={15} color={color} />
        </Animated.View>
        <Text style={[aS.title, { color }]}>{info.title}</Text>
        <View style={[aS.sevPill, { backgroundColor: color + '20', borderColor: color + '50' }]}>
          <Text style={[aS.sevText, { color }]}>{info.severity.toUpperCase()}</Text>
        </View>
        <Pressable onPress={onDismiss} style={aS.xBtn}><X size={14} color={HUD.textDim} /></Pressable>
      </View>
      <Text style={aS.desc}>{info.desc}</Text>
      {alert.sensorName && alert.value != null && (
        <View style={[aS.sensorRow, { borderColor: color + '30', backgroundColor: color + '0a' }]}>
          <Text style={aS.sensorLabel}>{alert.sensorName}</Text>
          <Text style={[aS.sensorVal, { color }]}>{alert.value.toFixed(1)} {alert.unit || ''}</Text>
          {alert.target != null && <Text style={aS.sensorTarget}>TGT: {alert.target}{alert.unit || ''}</Text>}
        </View>
      )}
      <Pressable style={({ pressed }) => [aS.cta, { backgroundColor: pressed ? color + '35' : color + '18', borderColor: color + '60' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreatePost(); }}>
        <Wrench size={14} color={color} />
        <Text style={[aS.ctaText, { color }]}>POST TO TASK FEED · ALL DEPTS + AUDIT IMAGE</Text>
        <ChevronRight size={14} color={color} />
      </Pressable>
    </Animated.View>
  );
}
const aS = StyleSheet.create({
  container: { position: 'absolute', bottom: 90, left: 16, right: 16, backgroundColor: HUD.bgCard, borderRadius: 16, borderWidth: 2, padding: 14, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 24, zIndex: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  sevPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  sevText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  xBtn: { padding: 4 },
  desc: { fontSize: 12, color: HUD.textSec, marginBottom: 8, letterSpacing: 0.2 },
  sensorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, borderWidth: 1, padding: 8, marginBottom: 10 },
  sensorLabel: { fontSize: 11, fontWeight: '600', color: HUD.textSec, flex: 1 },
  sensorVal: { fontSize: 16, fontWeight: '900' },
  sensorTarget: { fontSize: 10, color: HUD.textDim },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  ctaText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, flex: 1, textAlign: 'center' },
});

// ══════════════════════════ WORK ORDER MODAL ══════════════════════════════
// Departments that receive every ACTIVE FAULT post
const FAULT_DEPARTMENTS = [
  { id: '1001', name: 'Maintenance', color: HUD.cyan },
  { id: '1002', name: 'Sanitation', color: HUD.green },
  { id: '1003', name: 'Production', color: HUD.amber },
  { id: '1004', name: 'Quality', color: HUD.purple },
  { id: '1005', name: 'Safety', color: HUD.red },
];

function TaskFeedPostModal({ visible, alert, roomCode, onClose, onOpenAvatar }: {
  visible: boolean; alert: ActiveAlert | null; roomCode: string;
  onClose: () => void; onOpenAvatar: () => void;
}) {
  const info = alert ? (EVENT_LABEL[alert.eventType] || { title: alert.eventType, desc: '', severity: 'warning' }) : null;
  const color = info?.severity === 'critical' ? HUD.red : HUD.amber;
  const systemId = alert ? EVENT_SYSTEM[alert.eventType] : null;
  const system = systemId ? A1200_SYSTEMS.find(s => s.id === systemId) : null;
  const [submitted, setSubmitted] = useState(false);

  const postTime = useMemo(() => new Date().toLocaleString(), [visible]);

  const aiDescription = useMemo(() => {
    if (!alert || !info || !system) return '';
    const sensorLine = alert.sensorName && alert.value != null
      ? `\nSensor reading at detection: ${alert.sensorName} = ${alert.value.toFixed(1)} ${alert.unit || ''} (target: ${alert.target ?? '—'}${alert.unit || ''})`
      : '';
    return `ACTIVE FAULT — ${info.title}\n\nEquipment: Avatar A1200 / A2200 VFFS\nAffected System: ${system.name}\nRoom: ${roomCode}\nDetected: ${postTime}${sensorLine}\n\nThis post was auto-generated by TulKenz OPS sensor monitoring. All listed departments are required to acknowledge. Maintenance to investigate and resolve. Safety, Quality, Sanitation, and Production to assess impact on operations and compliance.\n\nSee Equipment Intelligence for troubleshooting steps, affected parts, and repair procedures.`;
  }, [alert, info, system, postTime, roomCode]);

  if (!visible || !alert || !info) return null;

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); onClose(); }, 1800);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={tfS.container}>
        {/* Header */}
        <View style={tfS.header}>
          <View style={{ flex: 1 }}>
            <Text style={tfS.eyebrow}>TASK FEED  ·  TULSENZ OPS</Text>
            <Text style={tfS.title}>ACTIVE FAULT POST</Text>
          </View>
          <Pressable onPress={onClose} style={tfS.closeBtn}><X size={20} color={HUD.textSec} /></Pressable>
        </View>

        {submitted ? (
          // Success state
          <View style={tfS.successScreen}>
            <CheckCircle size={48} color={HUD.green} />
            <Text style={tfS.successTitle}>POST SUBMITTED</Text>
            <Text style={tfS.successSub}>Sent to all 5 departments · Audit trail recorded</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>

            {/* AI banner */}
            <View style={[tfS.aiBanner, { borderColor: HUD.cyan + '40', backgroundColor: HUD.cyanDim }]}>
              <Cpu size={12} color={HUD.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={[tfS.aiTitle, { color: HUD.cyan }]}>AI-GENERATED TASK FEED POST</Text>
                <Text style={[tfS.aiSub, { color: HUD.textSec }]}>Auto-filled from sensor event · {postTime}</Text>
              </View>
              <View style={[tfS.sevPill, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                <PulsingDot color={color} size={5} />
                <Text style={[tfS.sevTxt, { color }]}>{info.severity.toUpperCase()}</Text>
              </View>
            </View>

            {/* Template type */}
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>TEMPLATE TYPE</Text>
              <View style={[tfS.fieldRow, { borderColor: color + '50', backgroundColor: color + '0a' }]}>
                <AlertTriangle size={14} color={color} />
                <Text style={[tfS.fieldTxt, { color: HUD.text }]}>ACTIVE FAULT — Equipment Issue</Text>
                <View style={[tfS.lockedBadge, { backgroundColor: HUD.borderBright }]}>
                  <Text style={tfS.lockedTxt}>AI SET</Text>
                </View>
              </View>
            </View>

            {/* Equipment — taps to Avatar */}
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>EQUIPMENT  <Text style={{ color: HUD.cyan, letterSpacing: 0, fontWeight: '700' }}>← TAP TO VIEW MANUAL</Text></Text>
              <Pressable
                style={({ pressed }) => [tfS.fieldRow, tfS.equipBtn, { borderColor: HUD.cyan + '60', backgroundColor: pressed ? HUD.cyanDim : HUD.bgCardAlt }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onOpenAvatar(); }}
              >
                <Box size={14} color={HUD.cyan} />
                <View style={{ flex: 1 }}>
                  <Text style={[tfS.fieldTxt, { color: HUD.cyan }]}>Avatar A1200 / A2200 VFFS</Text>
                  {system && <Text style={{ fontSize: 10, color: HUD.textSec, marginTop: 1 }}>Affected: {system.name}</Text>}
                </View>
                <ChevronRight size={15} color={HUD.cyan} />
              </Pressable>
            </View>

            {/* AI-attached image */}
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>AUDIT IMAGE  <Text style={{ color: HUD.green, letterSpacing: 0, fontWeight: '700' }}>← AI-ATTACHED</Text></Text>
              <View style={[tfS.imageBox, { borderColor: HUD.green + '40', backgroundColor: HUD.green + '06' }]}>
                {/* Simulated sensor snapshot */}
                <View style={tfS.imagePlaceholder}>
                  <View style={tfS.imgGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <View key={i} style={[tfS.imgBar, { height: 12 + Math.sin(i * 1.3) * 8, backgroundColor: i === 3 ? color : HUD.cyan + '60' }]} />
                    ))}
                  </View>
                  <View style={[tfS.imgAlertOverlay, { borderColor: color + '60' }]}>
                    <AlertTriangle size={10} color={color} />
                    <Text style={[tfS.imgAlertTxt, { color }]}>{info.title}</Text>
                  </View>
                  <Text style={tfS.imgTimestamp}>{postTime}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[tfS.imgLabel, { color: HUD.green }]}>AI SENSOR SNAPSHOT</Text>
                  <Text style={tfS.imgDesc}>Auto-captured at time of fault detection. Includes sensor telemetry, room state, and alert classification. Required for SQF / BRCGS audit trail.</Text>
                  <View style={[tfS.auditBadge, { backgroundColor: HUD.green + '18', borderColor: HUD.green + '40' }]}>
                    <CheckCircle size={9} color={HUD.green} />
                    <Text style={[tfS.auditBadgeTxt, { color: HUD.green }]}>AUDIT COMPLIANT</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Departments — all 5 pre-selected */}
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>NOTIFIED DEPARTMENTS  <Text style={{ color: HUD.cyan, letterSpacing: 0, fontWeight: '700' }}>ALL REQUIRED</Text></Text>
              <View style={tfS.deptGrid}>
                {FAULT_DEPARTMENTS.map(d => (
                  <View key={d.id} style={[tfS.deptChip, { borderColor: d.color + '50', backgroundColor: d.color + '12' }]}>
                    <CheckCircle size={11} color={d.color} />
                    <Text style={[tfS.deptTxt, { color: d.color }]}>{d.name}</Text>
                  </View>
                ))}
              </View>
              <Text style={tfS.deptNote}>All departments must acknowledge. This is protocol for every Active Fault post.</Text>
            </View>

            {/* AI description */}
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>AI-GENERATED POST BODY</Text>
              <View style={[tfS.descBox, { borderColor: HUD.borderBright }]}>
                <Text style={tfS.descTxt}>{aiDescription}</Text>
              </View>
            </View>

            {/* PM / Work Order option */}
            <View style={[tfS.pmNote, { borderColor: HUD.purple + '40', backgroundColor: HUD.purpleDim }]}>
              <Wrench size={12} color={HUD.purple} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: HUD.purple, letterSpacing: 1.5, marginBottom: 3 }}>PM TEMPLATE AVAILABLE</Text>
                <Text style={{ fontSize: 11, color: HUD.textSec }}>A recurring Preventive Maintenance work order template can be configured for this equipment. Maintenance tab → PM Schedules → Avatar A1200.</Text>
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [tfS.submit, { backgroundColor: pressed ? color + '40' : color + '20', borderColor: color }]}
              onPress={handleSubmit}
            >
              <CheckCircle size={18} color={color} />
              <Text style={[tfS.submitTxt, { color }]}>POST TO ALL 5 DEPARTMENTS · AUDIT TRAIL</Text>
            </Pressable>

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
const tfS = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: HUD.borderBright, gap: 12 },
  eyebrow: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 3 },
  title: { fontSize: 20, fontWeight: '900', color: HUD.text },
  closeBtn: { padding: 8, backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.borderBright },
  aiBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  aiTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  aiSub: { fontSize: 10, marginTop: 2 },
  sevPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sevTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  label: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 5 },
  fBlock: { gap: 0 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, padding: 12 },
  fieldTxt: { fontSize: 13, fontWeight: '600', flex: 1 },
  equipBtn: {},
  lockedBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  lockedTxt: { fontSize: 8, fontWeight: '800', color: HUD.textSec, letterSpacing: 1 },
  imageBox: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  imagePlaceholder: { width: 72, height: 72, backgroundColor: HUD.bg, borderRadius: 8, borderWidth: 1, borderColor: HUD.borderBright, padding: 6, justifyContent: 'flex-end', overflow: 'hidden', gap: 4 },
  imgGrid: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 },
  imgBar: { flex: 1, borderRadius: 2, minHeight: 4 },
  imgAlertOverlay: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 4, paddingHorizontal: 3, paddingVertical: 2 },
  imgAlertTxt: { fontSize: 6, fontWeight: '800', letterSpacing: 0.3 },
  imgTimestamp: { fontSize: 5, color: HUD.textDim, marginTop: 2 },
  imgLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  imgDesc: { fontSize: 10, color: HUD.textSec, lineHeight: 14, flex: 1 },
  auditBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start', marginTop: 4 },
  auditBadgeTxt: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  deptChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  deptTxt: { fontSize: 11, fontWeight: '800' },
  deptNote: { fontSize: 10, color: HUD.textDim, fontStyle: 'italic' as any },
  descBox: { backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, padding: 12 },
  descTxt: { fontSize: 11, color: HUD.textSec, lineHeight: 17 },
  pmNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, borderWidth: 2, marginTop: 4, marginBottom: 20 },
  submitTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  successTitle: { fontSize: 24, fontWeight: '900', color: HUD.green, letterSpacing: 2 },
  successSub: { fontSize: 13, color: HUD.textSec, textAlign: 'center', letterSpacing: 0.5 },
});

// ══════════════════════════ PA1 PRODUCTION FLOW SCHEMATIC ══════════════════
// Two-row layout matching actual PA1 flow:
// Row 1 (ingredient input): SUPERSACK → AUGER/SCREWFEED → HOPPER (+ MAGNETS)
// Row 2 (packaging output): CONVEYOR → AVATAR A1200 VFFS → PACKOUT AREA
// The A1200 is tappable and opens the full equipment manual

function PA1Schematic({ activeSystem, onSelectSystem, sensors }: {
  activeSystem: string | null;
  onSelectSystem: (id: string) => void;
  sensors: any[];
}) {
  const schW = W - 48;
  const scanX = useScan(schW, 5000);

  // Sensor value lookup helpers
  const getSensor = (name: string) => sensors.find(s => s.sensor_name?.toLowerCase().includes(name.toLowerCase()));
  const augerSpeed = getSensor('Auger Speed');
  const augerTemp = getSensor('Auger Motor');
  const hopperLevel = getSensor('Hopper Level');
  const airPressure = getSensor('Air Pressure');
  const vertSeal = getSensor('Vertical Seal');
  const bpm = getSensor('Bags Per Minute');

  // Equipment nodes — positioned in a flow left→right across two rows
  // Row heights: row0 y=4, row1 y=68. Total height = 128.
  const colW = Math.floor((schW - 16) / 6); // 6 columns
  const nodes = [
    // Row 0: ingredient side
    { id: 'supersack',   label: 'SUPER\nSACK',       col: 0, row: 0, color: HUD.purple,  sys: false, icon: '⬛' },
    { id: 'auger',       label: 'AUGER /\nSCREWFEED', col: 1, row: 0, color: HUD.cyan,    sys: true,  sensorVal: augerSpeed ? `${augerSpeed.value?.toFixed(0)} RPM` : null, sensorStatus: augerSpeed?.status },
    { id: 'hopper',      label: 'HOPPER',             col: 2, row: 0, color: HUD.amber,   sys: false, sensorVal: hopperLevel ? `${hopperLevel.value?.toFixed(0)}%` : null, sensorStatus: hopperLevel?.status },
    { id: 'magnets',     label: 'MAGNETS',            col: 3, row: 0, color: HUD.red,     sys: false },
    // Row 1: packaging side
    { id: 'conveyor',    label: 'CONVEYOR\nFEED',     col: 1, row: 1, color: HUD.green,   sys: false },
    { id: 'avatar_a1200',label: 'AVATAR\nA1200 VFFS', col: 2, row: 1, color: HUD.cyan,    sys: true,  sensorVal: bpm ? `${bpm.value?.toFixed(0)} BPM` : null, sensorStatus: bpm?.status, isMachine: true },
    { id: 'packout',     label: 'PACKOUT\nAREA',      col: 3, row: 1, color: HUD.green,   sys: false },
  ];

  const nodeW = colW - 8;
  const nodeH = 46;
  const rowY = [6, 72];
  const totalH = 126;

  // Flow arrows (from→to by id)
  const arrows: { fromCol: number; fromRow: number; toCol: number; toRow: number; color: string }[] = [
    { fromCol: 0, fromRow: 0, toCol: 1, toRow: 0, color: HUD.purple },  // supersack→auger
    { fromCol: 1, fromRow: 0, toCol: 2, toRow: 0, color: HUD.cyan },    // auger→hopper
    { fromCol: 2, fromRow: 0, toCol: 3, toRow: 0, color: HUD.amber },   // hopper→magnets
    { fromCol: 1, fromRow: 1, toCol: 2, toRow: 1, color: HUD.green },   // conveyor→a1200
    { fromCol: 2, fromRow: 1, toCol: 3, toRow: 1, color: HUD.cyan },    // a1200→packout
    // vertical drop: magnets→conveyor (col 2, row0 → col1, row1)
    { fromCol: 3, fromRow: 0, toCol: 1, toRow: 1, color: HUD.amber },
  ];

  return (
    <View style={pa1S.wrap}>
      <View style={pa1S.head}>
        <Activity size={12} color={HUD.cyan} />
        <Text style={pa1S.headTitle}>PA1 · PRODUCTION FLOW</Text>
        <Text style={pa1S.headSub}>TAP EQUIPMENT TO INSPECT</Text>
      </View>

      <View style={{ height: totalH, position: 'relative' }}>
        {/* Grid */}
        {[0.4].map(f => <View key={f} style={[pa1S.gH, { top: totalH * f }]} />)}

        {/* Flow connectors */}
        {arrows.map((a, i) => {
          if (a.fromRow === a.toRow) {
            // Horizontal arrow
            const x1 = 8 + a.fromCol * colW + nodeW;
            const x2 = 8 + a.toCol * colW;
            const y = rowY[a.fromRow] + nodeH / 2;
            return (
              <View key={i} style={{ position: 'absolute', left: x1, top: y - 1, width: x2 - x1, height: 2, backgroundColor: a.color + '35' }}>
                {/* Arrowhead */}
                <View style={{ position: 'absolute', right: -4, top: -3, width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 6, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: a.color + '70' }} />
              </View>
            );
          } else {
            // Vertical drop (magnets→conveyor area): draw an elbow
            const x = 8 + 2.5 * colW; // midpoint
            const y1 = rowY[a.fromRow] + nodeH;
            const y2 = rowY[a.toRow];
            return (
              <View key={i}>
                <View style={{ position: 'absolute', left: x, top: y1, width: 2, height: (y2 - y1) / 2, backgroundColor: a.color + '30' }} />
                <View style={{ position: 'absolute', left: 8 + 1 * colW + nodeW, top: y1 + (y2 - y1) / 2 - 1, width: x - (8 + 1 * colW + nodeW), height: 2, backgroundColor: a.color + '30' }} />
              </View>
            );
          }
        })}

        {/* Row labels */}
        <Text style={[pa1S.rowLabel, { top: rowY[0] - 2 }]}>INGREDIENT FEED ↓</Text>
        <Text style={[pa1S.rowLabel, { top: rowY[1] - 2 }]}>PACKAGING LINE →</Text>

        {/* Nodes */}
        {nodes.map(n => {
          const x = 8 + n.col * colW;
          const y = rowY[n.row];
          const active = activeSystem === n.id;
          const col = n.color;
          const sCol = n.sensorStatus ? (SC[n.sensorStatus] || col) : col;
          return (
            <Pressable key={n.id} disabled={!n.sys}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectSystem(n.id); }}
              style={[pa1S.node, {
                left: x, top: y, width: nodeW, height: nodeH,
                borderColor: active ? col : col + '50',
                borderWidth: active ? 2 : 1,
                backgroundColor: active ? col + '1c' : col + '09',
                shadowColor: col, shadowOpacity: active ? 0.7 : 0.2,
              }]}
            >
              {/* Corner brackets */}
              <View style={[pa1S.cTL, { borderColor: col + (active ? 'ff' : '60') }]} />
              <View style={[pa1S.cBR, { borderColor: col + (active ? 'ff' : '60') }]} />
              {active && <View style={[pa1S.activeDot, { backgroundColor: col, shadowColor: col }]} />}
              {n.isMachine && <View style={[pa1S.machineBadge, { backgroundColor: HUD.cyan + '20', borderColor: HUD.cyan + '40' }]}>
                <Text style={{ fontSize: 5, color: HUD.cyan, fontWeight: '800' }}>VFFS</Text>
              </View>}
              <Text style={[pa1S.nodeLabel, { color: active ? col : col + 'cc' }]}>{n.label}</Text>
              {n.sensorVal && (
                <Text style={[pa1S.sensorVal, { color: sCol }]}>{n.sensorVal}</Text>
              )}
            </Pressable>
          );
        })}

        {/* Scan line */}
        <Animated.View style={[pa1S.scan, { transform: [{ translateX: scanX }] }]} pointerEvents="none" />
      </View>

      {/* Legend */}
      <View style={pa1S.legend}>
        {[
          { col: HUD.purple, label: 'BULK INPUT' },
          { col: HUD.cyan, label: 'METERING' },
          { col: HUD.amber, label: 'HOPPER' },
          { col: HUD.red, label: 'METAL SEP' },
          { col: HUD.green, label: 'PACKAGING / OUTPUT' },
        ].map(l => (
          <View key={l.label} style={pa1S.legendItem}>
            <View style={[pa1S.legendDot, { backgroundColor: l.col }]} />
            <Text style={pa1S.legendTxt}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const pa1S = StyleSheet.create({
  wrap: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 1.5, flex: 1 },
  headSub: { fontSize: 9, color: HUD.textDim, letterSpacing: 1 },
  gH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: HUD.grid },
  rowLabel: { position: 'absolute', left: 0, fontSize: 6, fontWeight: '800', color: HUD.textDim, letterSpacing: 1.5 },
  node: { position: 'absolute', borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  nodeLabel: { fontSize: 7, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3, lineHeight: 10 },
  sensorVal: { fontSize: 7, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },
  cTL: { position: 'absolute', top: 2, left: 2, width: 6, height: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRadius: 1 },
  cBR: { position: 'absolute', bottom: 2, right: 2, width: 6, height: 6, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderRadius: 1 },
  activeDot: { position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
  machineBadge: { position: 'absolute', top: 2, left: 2, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3, borderWidth: 1 },
  scan: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: HUD.cyan + '18', shadowColor: HUD.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendTxt: { fontSize: 8, color: HUD.textSec, fontWeight: '600' },
});

// Keep A1200Schematic for inside the Avatar modal (machine-internal view)
function A1200Schematic({ activeSystem, onSelectSystem }: { activeSystem: string | null; onSelectSystem: (id: string) => void }) {
  const schW = W - 48;
  const scanX = useScan(schW, 4000);

  const colW = Math.floor((schW - 16) / 5);
  const nodes = [
    { id: 'film_unwind',     label: 'FILM\nUNWIND',     col: 0, row: 0, color: HUD.green, sys: true },
    { id: 'belt_drive',      label: 'BELT\nDRIVE',      col: 1, row: 0, color: HUD.cyan,  sys: true },
    { id: 'vertical_seal',   label: 'VERT\nSEAL',       col: 2, row: 0, color: HUD.amber, sys: true },
    { id: 'endseal_jaw',     label: 'ENDSEAL\nJAW',     col: 3, row: 0, color: HUD.red,   sys: true },
    { id: 'filter_regulator',label: 'AIR\nFILTER',      col: 0, row: 1, color: HUD.purple,sys: true },
    { id: 'plc',             label: 'PLC\nHMI',         col: 1, row: 1, color: HUD.textSec,sys: false },
    { id: 'bag_out',         label: 'BAGS\nOUT',        col: 3, row: 1, color: HUD.green, sys: false },
  ];
  const nodeW = colW - 8;
  const rowY = [6, 66];
  const totalH = 118;

  return (
    <View style={schS.wrap}>
      <View style={schS.head}>
        <Cpu size={12} color={HUD.cyan} />
        <Text style={schS.headTitle}>AVATAR A1200 / A2200 — INTERNAL SYSTEMS</Text>
        <Text style={schS.headSub}>AFI 4110811</Text>
      </View>
      <View style={{ height: totalH, position: 'relative' }}>
        {[0.5].map(f => <View key={f} style={[schS.gH, { top: totalH * f }]} />)}
        {/* Film path connector */}
        {[1, 2, 3].map(c => (
          <View key={c} style={{ position: 'absolute', top: rowY[0] + 22, left: 8 + (c - 1) * colW + nodeW, width: colW - nodeW, height: 2, backgroundColor: HUD.cyan + '20' }} />
        ))}
        {nodes.map(n => {
          const x = 8 + n.col * colW;
          const y = rowY[n.row];
          const active = activeSystem === n.id;
          const col = n.color;
          return (
            <Pressable key={n.id} disabled={!n.sys}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectSystem(n.id); }}
              style={[schS.block, { left: x, top: y, width: nodeW, height: 44, borderColor: active ? col : col + '45', borderWidth: active ? 2 : 1, backgroundColor: active ? col + '1a' : col + '07', shadowColor: col, shadowOpacity: active ? 0.7 : 0.15 }]}
            >
              <View style={[schS.cTL, { borderColor: col + (active ? 'ff' : '55') }]} />
              <View style={[schS.cBR, { borderColor: col + (active ? 'ff' : '55') }]} />
              {active && <View style={[schS.dot, { backgroundColor: col, shadowColor: col }]} />}
              <Text style={[schS.bLabel, { color: active ? col : col + 'bb' }]}>{n.label}</Text>
            </Pressable>
          );
        })}
        <Animated.View style={[schS.scan, { transform: [{ translateX: scanX }] }]} pointerEvents="none" />
      </View>
      <Text style={schS.hint}>TAP A SYSTEM TO VIEW PARTS · TROUBLESHOOT · REPAIR</Text>
    </View>
  );
}
const schS = StyleSheet.create({
  wrap: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 1.5, flex: 1 },
  headSub: { fontSize: 9, color: HUD.textDim, letterSpacing: 1 },
  gH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: HUD.grid },
  block: { position: 'absolute', borderRadius: 8, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 4 },
  cTL: { position: 'absolute', top: 2, left: 2, width: 7, height: 7, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRadius: 1 },
  cBR: { position: 'absolute', bottom: 2, right: 2, width: 7, height: 7, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderRadius: 1 },
  dot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
  bLabel: { fontSize: 7, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3, lineHeight: 10 },
  scan: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: HUD.cyan + '20', shadowColor: HUD.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  hint: { fontSize: 8, color: HUD.textDim, letterSpacing: 1, marginTop: 8, textAlign: 'center', fontWeight: '700' },
});

// ══════════════════════════ SYSTEM DETAIL PANEL ══════════════════════════
function SystemDetailPanel({ system, highlightEvent }: { system: typeof A1200_SYSTEMS[0]; highlightEvent?: string }) {
  const [tab, setTab] = useState<'parts' | 'trouble' | 'repair'>('parts');
  const col = system.color;
  const isFault = system.events.includes(highlightEvent || '');

  return (
    <View style={sdS.wrap}>
      <View style={[sdS.sysHead, { borderLeftColor: col }]}>
        {isFault && (
          <View style={[sdS.faultFlag, { backgroundColor: col + '20', borderColor: col + '50' }]}>
            <AlertTriangle size={10} color={col} />
            <Text style={[sdS.faultText, { color: col }]}>ACTIVE FAULT SYSTEM</Text>
          </View>
        )}
        <Text style={[sdS.sysName, { color: col }]}>{system.name}</Text>
        <Text style={sdS.sysDesc}>{system.desc}</Text>
      </View>

      <View style={sdS.tabBar}>
        {(['parts', 'trouble', 'repair'] as const).map(t => (
          <Pressable key={t} style={[sdS.tab, tab === t && { borderBottomColor: col, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
            <Text style={[sdS.tabTxt, { color: tab === t ? col : HUD.textDim }]}>
              {t === 'parts' ? 'PARTS' : t === 'trouble' ? 'TROUBLESHOOT' : 'REPAIR STEPS'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'parts' && (
        <View style={sdS.content}>
          <View style={sdS.pHead}>
            <Text style={[sdS.colH, { flex: 1.2 }]}>PART #</Text>
            <Text style={[sdS.colH, { flex: 2 }]}>DESCRIPTION</Text>
            <Text style={[sdS.colH, { textAlign: 'right' }]}>QTY</Text>
          </View>
          {system.parts.map(p => {
            const low = p.stock <= p.min;
            const sc = low ? HUD.red : HUD.green;
            return (
              <View key={p.pn} style={[sdS.pRow, { borderBottomColor: HUD.border }]}>
                <Text style={[sdS.pn, { flex: 1.2 }]}>{p.pn}</Text>
                <Text style={[sdS.pName, { flex: 2 }]}>{p.name}</Text>
                <View style={[sdS.stockBadge, { backgroundColor: sc + '20', borderColor: sc + '50' }]}>
                  {low && <AlertTriangle size={8} color={sc} />}
                  <Text style={[sdS.stockNum, { color: sc }]}>{p.stock}</Text>
                </View>
              </View>
            );
          })}
          <Text style={sdS.stockNote}>Red badge = at or below minimum stocking level</Text>
        </View>
      )}

      {tab === 'trouble' && (
        <View style={sdS.content}>
          {system.troubleshooting.map((ts, i) => (
            <View key={i} style={sdS.tsBlock}>
              <View style={[sdS.symptomRow, { borderLeftColor: col }]}>
                <AlertTriangle size={11} color={col} />
                <Text style={[sdS.symptom, { color: col }]}>{ts.symptom}</Text>
              </View>
              {ts.steps.map((s, j) => (
                <View key={j} style={sdS.sRow}>
                  <Text style={[sdS.sNum, { color: col }]}>{j + 1}</Text>
                  <Text style={sdS.sTxt}>{s}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {tab === 'repair' && (
        <View style={sdS.content}>
          <View style={[sdS.lockBanner, { borderColor: HUD.red + '50', backgroundColor: HUD.redDim }]}>
            <AlertTriangle size={12} color={HUD.red} />
            <Text style={{ fontSize: 11, color: HUD.red, fontWeight: '700', flex: 1 }}>LOCKOUT / TAGOUT REQUIRED BEFORE ALL REPAIR WORK</Text>
          </View>
          {system.repair.map((step, i) => {
            const isLO = step.startsWith('LOCKOUT');
            return (
              <View key={i} style={[sdS.rRow, isLO && { backgroundColor: HUD.redDim, borderRadius: 8, padding: 8 }]}>
                <View style={[sdS.rCircle, { backgroundColor: col + '20', borderColor: col + '50' }]}>
                  <Text style={[sdS.rNum, { color: col }]}>{i + 1}</Text>
                </View>
                <Text style={[sdS.rTxt, isLO && { color: HUD.red, fontWeight: '700' }]}>{step}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
const sdS = StyleSheet.create({
  wrap: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, overflow: 'hidden', marginBottom: 14 },
  sysHead: { padding: 14, borderLeftWidth: 3, gap: 4 },
  faultFlag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 4 },
  faultText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sysName: { fontSize: 17, fontWeight: '900' },
  sysDesc: { fontSize: 12, color: HUD.textSec, lineHeight: 17 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: HUD.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  content: { padding: 14, gap: 8 },
  pHead: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: HUD.borderBright, gap: 4 },
  colH: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 1.5 },
  pRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 4 },
  pn: { fontSize: 9, color: HUD.textDim, fontWeight: '600' },
  pName: { fontSize: 12, color: HUD.text },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  stockNum: { fontSize: 12, fontWeight: '800' },
  stockNote: { fontSize: 10, color: HUD.textDim, marginTop: 4, fontStyle: 'italic' as any },
  tsBlock: { gap: 5, marginBottom: 12 },
  symptomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 5 },
  symptom: { fontSize: 13, fontWeight: '800', flex: 1 },
  sRow: { flexDirection: 'row', gap: 8, paddingLeft: 6 },
  sNum: { fontSize: 11, fontWeight: '900', width: 16, marginTop: 1 },
  sTxt: { fontSize: 12, color: HUD.textSec, lineHeight: 18, flex: 1 },
  lockBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  rRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  rCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  rNum: { fontSize: 10, fontWeight: '900' },
  rTxt: { fontSize: 12, color: HUD.textSec, lineHeight: 18, flex: 1, paddingTop: 2 },
});

// ══════════════════════════ EQUIPMENT AVATAR MODAL ══════════════════════════
function EquipmentAvatarModal({ visible, preSelectSystem, highlightEvent, onClose }: { visible: boolean; preSelectSystem?: string; highlightEvent?: string; onClose: () => void; }) {
  const [selected, setSelected] = useState<string | null>(preSelectSystem || null);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { if (preSelectSystem) setSelected(preSelectSystem); }, [preSelectSystem]);
  const system = selected ? A1200_SYSTEMS.find(s => s.id === selected) : null;

  const handleSelect = (id: string) => {
    setSelected(id);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 360, animated: true }), 150);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={avS.container}>
        <View style={avS.header}>
          <View style={{ flex: 1 }}>
            <Text style={avS.eyebrow}>EQUIPMENT INTELLIGENCE · TULSENZ OPS</Text>
            <Text style={avS.mainTitle}>AVATAR A1200 / A2200</Text>
            <Text style={avS.subTitle}>VERTICAL FORM-FILL-SEAL  ·  AFI PUB 4110811  ·  ISSUE 1  ·  JULY 2015</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            {highlightEvent && (
              <View style={[avS.faultBadge, { backgroundColor: HUD.amberDim, borderColor: HUD.amber + '60' }]}>
                <PulsingDot color={HUD.amber} size={6} />
                <Text style={[avS.faultBadgeText, { color: HUD.amber }]}>ACTIVE FAULT</Text>
              </View>
            )}
            <Pressable onPress={onClose} style={avS.closeBtn}><X size={18} color={HUD.textSec} /></Pressable>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* Machine specs strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { l: 'MODEL', v: 'A1200 / A2200' },
                { l: 'PKG RANGE', v: '2"×2" → 8"×14"' },
                { l: 'MAX SPEED', v: '70 PKG/MIN' },
                { l: 'AIR SPEC', v: '70 PSI' },
                { l: 'SEAL CTRL', v: '±1°F PID' },
                { l: 'ENCODER', v: '0.001" ACC' },
                { l: 'FILM TYPES', v: 'LAMI + POLY' },
              ].map(s => (
                <View key={s.l} style={avS.specChip}>
                  <Text style={avS.specL}>{s.l}</Text>
                  <Text style={avS.specV}>{s.v}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Schematic */}
          <A1200Schematic activeSystem={selected} onSelectSystem={handleSelect} />

          {/* System navigator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Layers size={12} color={HUD.cyan} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 2, flex: 1 }}>SYSTEM NAVIGATOR</Text>
            <Text style={{ fontSize: 9, color: HUD.textDim, letterSpacing: 1 }}>{A1200_SYSTEMS.length} SUBSYSTEMS</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {A1200_SYSTEMS.map(s => {
                const active = selected === s.id;
                const hasFault = s.events.includes(highlightEvent || '');
                return (
                  <Pressable key={s.id}
                    style={[avS.sysChip, { backgroundColor: active ? s.color + '22' : HUD.bgCard, borderColor: hasFault ? s.color : active ? s.color + '80' : HUD.borderBright, borderWidth: hasFault || active ? 2 : 1 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSelect(s.id); }}
                  >
                    {hasFault && <AlertTriangle size={10} color={s.color} />}
                    <Text style={[avS.sysChipTxt, { color: active ? s.color : hasFault ? s.color : HUD.textSec }]}>{s.short}</Text>
                    {active && <ChevronDown size={10} color={s.color} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {system ? (
            <SystemDetailPanel system={system} highlightEvent={highlightEvent} />
          ) : (
            <View style={avS.noSel}>
              <Cpu size={28} color={HUD.textDim} />
              <Text style={avS.noSelTxt}>TAP A COMPONENT IN THE SCHEMATIC{'\n'}OR SELECT A SYSTEM ABOVE TO VIEW{'\n'}PARTS · TROUBLESHOOTING · REPAIR</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
const avS = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: HUD.borderBright, gap: 10 },
  eyebrow: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 3 },
  mainTitle: { fontSize: 22, fontWeight: '900', color: HUD.cyan, letterSpacing: 1 },
  subTitle: { fontSize: 9, color: HUD.textSec, letterSpacing: 0.8, marginTop: 2 },
  faultBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  faultBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { padding: 8, backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.borderBright },
  specChip: { backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: HUD.borderBright, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 2 },
  specL: { fontSize: 8, fontWeight: '800', color: HUD.textDim, letterSpacing: 1.5 },
  specV: { fontSize: 11, fontWeight: '800', color: HUD.text },
  sysChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  sysChipTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  noSel: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  noSelTxt: { fontSize: 11, color: HUD.textDim, textAlign: 'center', letterSpacing: 1, lineHeight: 18 },
});

// ══════════════════════════ HEX METRIC CARD ══════════════════════════
function HexMetric({ label, value, unit, color, icon, beatSignal, jitter = 0 }: {
  label: string; value: string; unit: string; color: string; icon: React.ReactNode;
  beatSignal?: number; jitter?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [liveValue, setLiveValue] = useState(value);

  // Sync base value
  useEffect(() => { setLiveValue(value); }, [value]);

  // On each beat: pulse scale + apply jitter to displayed number
  useEffect(() => {
    if (beatSignal === undefined || beatSignal === 0) return;
    const isCritical = color === HUD.red;

    // Always jitter the number slightly — makes it feel live
    if (jitter > 0) {
      const base = parseFloat(value);
      if (!isNaN(base)) {
        const delta = (Math.random() - 0.5) * 2 * jitter;
        const jittered = base + delta;
        setLiveValue(Number.isInteger(base) ? Math.round(jittered).toString() : jittered.toFixed(1));
      }
    }

    // Only pulse/glow animation when critical
    if (isCritical) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]).start();
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start();
    }
  }, [beatSignal]);

  return (
    <Animated.View style={[hxS.card, {
      borderColor: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [color + '40', color + 'cc'] }),
      shadowColor: color,
      shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }),
      transform: [{ scale: scaleAnim }],
    }]}>
      <View style={[hxS.icon, { backgroundColor: color + '15' }]}>{icon}</View>
      <Text style={[hxS.value, { color }]}>{liveValue}</Text>
      <Text style={[hxS.unit, { color: color + 'aa' }]}>{unit}</Text>
      <Text style={hxS.label}>{label}</Text>
    </Animated.View>
  );
}
const hxS = StyleSheet.create({
  card: { width: 90, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 3, marginRight: 10, backgroundColor: HUD.bgCard, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 8, fontWeight: '600', letterSpacing: 1 },
  label: { fontSize: 8, fontWeight: '700', color: HUD.textSec, letterSpacing: 0.5, textAlign: 'center' },
});

// ══════════════════════════ TYPES ══════════════════════════════════════
interface RoomStatus { status: string; andon_color: string; bags_today: number; bags_per_minute: number; target_bags_per_minute: number; uptime_percent: number; updated_at: string; }
interface SensorReading { id: string; sensor_id: string; sensor_name: string; sensor_type: string; unit: string; value: number; status: string; target_value: number; recorded_at: string; equipment_name: string; room_equipment_id: string; }
interface RoomEquipment { id: string; equipment_name: string; position_x: number; position_y: number; position_width: number; position_height: number; status: string; display_order: number; }
interface ProductionEvent { id: string; event_type: string; category: string; reason: string; equipment_name: string; started_at: string; }

// ══════════════════════════════════ MAIN SCREEN ══════════════════════════════
export default function RoomDashboard() {
  const router = useRouter();
  const { room } = useLocalSearchParams<{ room: string }>();
  const orgCtx = useOrganization();
  const organizationId = orgCtx?.organizationId || '';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [showTFModal, setShowTFModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreSystem, setAvatarPreSystem] = useState<string | undefined>(undefined);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastEventTitle, setToastEventTitle] = useState('');
  const [beatSignal, setBeatSignal] = useState(0);

  const roomCode = room || 'PA1';
  const roomNames: Record<string, string> = { PA1: 'PACKET AREA 1', PR1: 'PRODUCTION ROOM 1', PR2: 'PRODUCTION ROOM 2' };
  const roomName = roomNames[roomCode] || roomCode;

  useEffect(() => {
    const t = setInterval(() => queryClient.invalidateQueries({ queryKey: ['rdb', roomCode] }), 10000);
    return () => clearInterval(t);
  }, [roomCode, queryClient]);

  const { data: equipment = [] } = useQuery<RoomEquipment[]>({
    queryKey: ['rdb', roomCode, 'equip'],
    queryFn: async () => { const { data, error } = await supabase.from('room_equipment').select('*').eq('organization_id', organizationId).eq('room_code', roomCode).order('display_order'); if (error) throw error; return data || []; },
    enabled: !!organizationId,
  });

  const { data: sensorReadings = [] } = useQuery<SensorReading[]>({
    queryKey: ['rdb', roomCode, 'sensors'],
    queryFn: async () => {
      const { data: sensors } = await supabase.from('equipment_sensors').select('*').eq('organization_id', organizationId).eq('room_code', roomCode);
      if (!sensors?.length) return [];
      const { data: readings } = await supabase.from('sensor_readings').select('sensor_id, value, status, recorded_at').eq('organization_id', organizationId).eq('room_code', roomCode).in('sensor_id', sensors.map(s => s.id)).order('recorded_at', { ascending: false }).limit(sensors.length * 2);
      const equipMap: Record<string, string> = {};
      equipment.forEach(e => { equipMap[e.id] = e.equipment_name; });
      const latest: Record<string, any> = {};
      (readings || []).forEach(r => { if (!latest[r.sensor_id]) latest[r.sensor_id] = r; });
      return sensors.map(s => ({ ...s, value: latest[s.id]?.value ?? null, status: latest[s.id]?.status ?? 'idle', recorded_at: latest[s.id]?.recorded_at ?? null, equipment_name: equipMap[s.room_equipment_id] || 'Unknown' }));
    },
    enabled: !!organizationId && equipment.length > 0,
    refetchInterval: 10000,
  });

  const { data: roomStatus } = useQuery<RoomStatus | null>({
    queryKey: ['rdb', roomCode, 'status'],
    queryFn: async () => { const { data } = await supabase.from('room_status').select('*').eq('organization_id', organizationId).eq('room_code', roomCode).single(); return data; },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  const { data: productionEvents = [] } = useQuery<ProductionEvent[]>({
    queryKey: ['rdb', roomCode, 'events'],
    queryFn: async () => { const { data } = await supabase.from('production_events').select('*').eq('organization_id', organizationId).eq('room_code', roomCode).order('started_at', { ascending: false }).limit(12); return data || []; },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  const andonColor = AC[roomStatus?.andon_color || 'gray'] || HUD.textDim;
  const bpm = roomStatus?.bags_per_minute || 0;
  const target = roomStatus?.target_bags_per_minute || 1;
  const bpmColor = bpm >= target * 0.9 ? HUD.green : bpm >= target * 0.7 ? HUD.amber : HUD.red;
  const uptColor = (roomStatus?.uptime_percent || 0) >= 90 ? HUD.green : (roomStatus?.uptime_percent || 0) >= 75 ? HUD.amber : HUD.red;
  const critSensors = sensorReadings.filter(s => s.status === 'critical' && s.value != null);

  const onRefresh = useCallback(async () => { setRefreshing(true); await queryClient.invalidateQueries({ queryKey: ['rdb', roomCode] }); setRefreshing(false); }, [queryClient, roomCode]);

  const handleTriggerEvent = useCallback(async (eventName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await fetch(`https://app.tulkenz.net/api/simulator?action=trigger&event=${eventName}&room=${roomCode}`, { method: 'POST' });
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 500));
        await fetch('https://app.tulkenz.net/api/simulator?action=tick', { method: 'POST' });
      }
      await queryClient.invalidateQueries({ queryKey: ['rdb', roomCode] });
      // Find relevant sensor to surface in alert
      const relevantSensor = sensorReadings.find(s =>
        s.value != null && (
          (eventName === 'seal_temp_drift' && s.sensor_type === 'temperature') ||
          (eventName === 'air_pressure_drop' && s.sensor_type === 'pressure') ||
          (['auger_slowdown', 'film_jam', 'vibration_spike'].includes(eventName) && s.sensor_type === 'speed') ||
          s.status === 'warning' || s.status === 'critical'
        )
      );
      // Surface the incident alert card (allows manual review + equipment manual tap)
      setActiveAlert({
        eventType: eventName,
        sensorName: relevantSensor?.sensor_name,
        value: relevantSensor?.value,
        unit: relevantSensor?.unit,
        target: relevantSensor?.target_value,
      });
      // Auto-post to Task Feed immediately — no button required
      const info = EVENT_LABEL[eventName];
      if (info) {
        setToastEventTitle(info.title);
        setToastVisible(true);
        // In production: call supabase to insert task_feed_posts row here
        // supabase.from('task_feed_posts').insert({ ... })
      }
    } catch (e) { console.error('[Trigger]', e); }
  }, [queryClient, roomCode, sensorReadings]);

  const handleTick = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch('https://app.tulkenz.net/api/simulator?action=tick', { method: 'POST' });
      const json = await res.json();
      setTickCount(json.tick || tickCount + 1);
      await queryClient.invalidateQueries({ queryKey: ['rdb', roomCode] });
    } catch (e) { console.error('[Tick]', e); }
  }, [queryClient, roomCode, tickCount]);

  const handleOpenAvatarFromWO = useCallback(() => {
    if (activeAlert) setAvatarPreSystem(EVENT_SYSTEM[activeAlert.eventType]);
    setShowTFModal(false);
    setShowAvatarModal(true);
  }, [activeAlert]);

  return (
    <View style={mS.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HUD Header */}
      <View style={[mS.header, { borderBottomColor: andonColor + '60', shadowColor: andonColor }]}>
        <Pressable style={mS.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={HUD.cyan} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={mS.roomCode}>{roomCode}</Text>
          <Text style={[mS.roomName, { color: andonColor }]}>{roomName}</Text>
          <Text style={mS.roomSub}>{roomStatus?.updated_at ? `SYS SYNC · ${new Date(roomStatus.updated_at).toLocaleTimeString()}` : 'AWAITING SIGNAL'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[mS.pill, { backgroundColor: andonColor + '18', borderColor: andonColor + '50' }]}>
            <PulsingDot color={andonColor} size={7} />
            <Text style={[mS.pillTxt, { color: andonColor }]}>{(roomStatus?.status || 'IDLE').toUpperCase()}</Text>
          </View>
          {critSensors.length > 0 && (
            <View style={[mS.pill, { backgroundColor: HUD.redDim, borderColor: HUD.red + '50' }]}>
              <AlertTriangle size={10} color={HUD.red} />
              <Text style={[mS.pillTxt, { color: HUD.red }]}>{critSensors.length} CRIT</Text>
            </View>
          )}
        </View>
        <Pressable style={mS.tickBtn} onPress={handleTick}><Zap size={16} color={HUD.purple} /></Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={andonColor} />}>

        {/* Metrics */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <HexMetric label="BAGS/MIN" value={bpm.toString()} unit={`/ ${target}`} color={bpmColor} icon={<Package size={14} color={bpmColor} />} beatSignal={beatSignal} jitter={1.5} />
            <HexMetric label="TODAY" value={(roomStatus?.bags_today || 0).toLocaleString()} unit="BAGS" color={HUD.cyan} icon={<BarChart2 size={14} color={HUD.cyan} />} beatSignal={beatSignal} jitter={0} />
            <HexMetric label="UPTIME" value={`${roomStatus?.uptime_percent || 0}%`} unit="OEE" color={uptColor} icon={<TrendingUp size={14} color={uptColor} />} beatSignal={beatSignal} jitter={0.4} />
            {sensorReadings.filter(s => s.value != null).slice(0, 4).map(s => (
              <HexMetric key={s.id} label={s.sensor_name.length > 9 ? s.sensor_name.substring(0, 8) + '…' : s.sensor_name} value={s.value.toFixed(1)} unit={s.unit || ''} color={SC[s.status] || HUD.textDim} icon={s.sensor_type === 'temperature' ? <Thermometer size={14} color={SC[s.status]} /> : <Gauge size={14} color={SC[s.status]} />} beatSignal={beatSignal} jitter={s.value * 0.008} />
            ))}
          </View>
        </ScrollView>

        {/* Heartbeat monitor */}
        <HeartbeatMonitor
          bpm={bpm}
          sensors={sensorReadings.filter(s => s.value != null)}
          color={bpmColor}
          onBeat={() => setBeatSignal(b => b + 1)}
        />

        {/* PA1 production flow schematic */}
        <PA1Schematic
          activeSystem={activeAlert ? (EVENT_SYSTEM[activeAlert.eventType] || null) : null}
          onSelectSystem={(id) => {
            if (id === 'avatar_a1200' || A1200_SYSTEMS.find(s => s.id === id)) {
              setAvatarPreSystem(id === 'avatar_a1200' ? undefined : id);
              setShowAvatarModal(true);
            }
          }}
          sensors={sensorReadings.filter(s => s.value != null)}
        />

        {/* Crit sensor banner */}
        {critSensors.length > 0 && (
          <View style={mS.critBanner}>
            <AlertTriangle size={13} color={HUD.red} />
            <Text style={mS.critBannerTxt}>{critSensors.length} CRITICAL: {critSensors.map(s => s.sensor_name).join(' · ')}</Text>
          </View>
        )}

        {/* Sensor matrix */}
        <View style={mS.card}>
          <View style={mS.cardHead}>
            <Activity size={12} color={HUD.cyan} />
            <Text style={mS.cardTitle}>SENSOR MATRIX</Text>
            <Text style={mS.cardCount}>{sensorReadings.filter(s => s.value != null).length} ACTIVE</Text>
          </View>
          {sensorReadings.filter(s => s.value != null).map((s, i, arr) => {
            const col = SC[s.status] || HUD.textDim;
            return (
              <View key={s.id} style={[mS.sRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: HUD.border }]}>
                <View style={[mS.sBar, { backgroundColor: col, shadowColor: col }]} />
                <View style={{ flex: 1 }}>
                  <Text style={mS.sName}>{s.sensor_name}</Text>
                  <Text style={mS.sEquip}>{s.equipment_name}</Text>
                </View>
                <Text style={[mS.sVal, { color: col }]}>{s.value.toFixed(1)}<Text style={{ fontSize: 10, fontWeight: '400' }}> {s.unit}</Text></Text>
              </View>
            );
          })}
        </View>

        {/* Events */}
        {productionEvents.length > 0 && (
          <View style={mS.card}>
            <View style={mS.cardHead}>
              <Radio size={12} color={HUD.amber} />
              <Text style={[mS.cardTitle, { color: HUD.amber }]}>EVENT LOG</Text>
              <Text style={[mS.cardCount, { color: HUD.amber + '80' }]}>{productionEvents.length} RECORDS</Text>
            </View>
            {productionEvents.slice(0, 6).map(evt => {
              const col = evt.event_type === 'equipment_fault' ? HUD.red : evt.category === 'scheduled' ? HUD.cyan : HUD.amber;
              return (
                <View key={evt.id} style={[mS.evtRow, { borderLeftColor: col }]}>
                  <View style={[mS.evtDot, { backgroundColor: col, shadowColor: col }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={mS.evtReason} numberOfLines={1}>{evt.reason || evt.event_type}</Text>
                    <Text style={mS.evtTime}>{new Date(evt.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{evt.equipment_name ? ` · ${evt.equipment_name}` : ''}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Sim + Equipment Avatar */}
        <View style={[mS.card, { borderColor: HUD.purple + '40' }]}>
          <View style={mS.cardHead}>
            <Zap size={12} color={HUD.purple} />
            <Text style={[mS.cardTitle, { color: HUD.purple }]}>SIM CONTROLS</Text>
            <Text style={[mS.cardCount, { color: HUD.purple + '80' }]}>DEMO MODE</Text>
          </View>

          {/* Equipment manual shortcut */}
          <Pressable
            style={({ pressed }) => [mS.avatarBtn, { backgroundColor: pressed ? HUD.cyanDim : HUD.bgCardAlt }]}
            onPress={() => { setAvatarPreSystem(undefined); setShowAvatarModal(true); }}
          >
            <Cpu size={15} color={HUD.cyan} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: HUD.cyan }}>AVATAR A1200 EQUIPMENT INTELLIGENCE</Text>
              <Text style={{ fontSize: 10, color: HUD.textSec, marginTop: 1 }}>Tap to view schematic · parts · troubleshooting · repair</Text>
            </View>
            <ChevronRight size={15} color={HUD.cyan} />
          </Pressable>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {[
              { e: 'seal_temp_drift', l: 'SEAL TEMP DRIFT', c: HUD.amber, r: ['PA1'] },
              { e: 'air_pressure_drop', l: 'AIR PRESSURE', c: HUD.red, r: ['PA1', 'PR1', 'PR2'] },
              { e: 'film_jam', l: 'FILM JAM', c: HUD.red, r: ['PA1'] },
              { e: 'auger_slowdown', l: 'AUGER SLOWDOWN', c: HUD.amber, r: ['PA1', 'PR1', 'PR2'] },
              { e: 'vibration_spike', l: 'VIBRATION SPIKE', c: HUD.amber, r: ['PR1', 'PR2'] },
              { e: 'metal_detect_rejects', l: 'METAL REJECTS', c: HUD.red, r: ['PR1', 'PR2'] },
              { e: 'hopper_low', l: 'HOPPER LOW', c: HUD.amber, r: ['PA1', 'PR1', 'PR2'] },
              { e: 'scheduled_break', l: 'SCHED BREAK', c: HUD.cyan, r: ['PA1', 'PR1', 'PR2'] },
            ].filter(x => x.r.includes(roomCode)).map(x => (
              <Pressable key={x.e} style={({ pressed }) => [mS.simBtn, { borderColor: x.c + '50', backgroundColor: pressed ? x.c + '30' : x.c + '12' }]} onPress={() => handleTriggerEvent(x.e)}>
                <Text style={[mS.simBtnTxt, { color: x.c }]}>{x.l}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={({ pressed }) => [mS.tickFull, { backgroundColor: pressed ? HUD.purple + '40' : HUD.purple + '15', borderColor: HUD.purple + '50' }]} onPress={handleTick}>
            <Zap size={15} color={HUD.purple} />
            <Text style={[mS.tickFullTxt, { color: HUD.purple }]}>ADVANCE TICK{tickCount > 0 ? ` · ${tickCount}` : ''}</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Auto-post confirmation toast */}
      <AutoPostToast
        visible={toastVisible}
        eventTitle={toastEventTitle}
        onDismiss={() => setToastVisible(false)}
      />

      {/* Floating incident alert */}
      {activeAlert && (
        <IncidentAlertCard
          alert={activeAlert}
          onCreatePost={() => setShowTFModal(true)}
          onDismiss={() => setActiveAlert(null)}
        />
      )}

      {/* Task Feed Post Modal */}
      <TaskFeedPostModal
        visible={showTFModal}
        alert={activeAlert}
        roomCode={roomCode}
        onClose={() => setShowTFModal(false)}
        onOpenAvatar={handleOpenAvatarFromWO}
      />

      {/* Equipment Avatar Modal */}
      <EquipmentAvatarModal
        visible={showAvatarModal}
        preSelectSystem={avatarPreSystem}
        highlightEvent={activeAlert?.eventType}
        onClose={() => setShowAvatarModal(false)}
      />
    </View>
  );
}

const mS = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 2, gap: 10, backgroundColor: HUD.bgCard, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  backBtn: { padding: 8, backgroundColor: HUD.cyanDim, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyanMid },
  roomCode: { fontSize: 10, fontWeight: '800', color: HUD.textDim, letterSpacing: 3 },
  roomName: { fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  roomSub: { fontSize: 9, color: HUD.textDim, letterSpacing: 1.5, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  pillTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  tickBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: HUD.purpleDim, borderWidth: 1, borderColor: HUD.purple + '40', alignItems: 'center', justifyContent: 'center' },
  critBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD.red + '15', borderWidth: 1, borderColor: HUD.red + '40', borderRadius: 10, padding: 10, marginBottom: 14 },
  critBannerTxt: { fontSize: 11, fontWeight: '700', color: HUD.red, flex: 1 },
  card: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 2, flex: 1 },
  cardCount: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 1 },
  sRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  sBar: { width: 5, height: 32, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  sName: { fontSize: 13, fontWeight: '600', color: HUD.text },
  sEquip: { fontSize: 10, color: HUD.textDim, marginTop: 1 },
  sVal: { fontSize: 15, fontWeight: '800' },
  evtRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9, paddingLeft: 10, borderLeftWidth: 2, gap: 8, marginBottom: 2 },
  evtDot: { width: 7, height: 7, borderRadius: 4, marginTop: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
  evtReason: { fontSize: 12, fontWeight: '600', color: HUD.text },
  evtTime: { fontSize: 10, color: HUD.textDim, marginTop: 1 },
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyan + '50' },
  simBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  simBtnTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tickFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  tickFullTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
});
