import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ChevronLeft, Activity, Thermometer, Gauge, Package,
  AlertTriangle, TrendingUp, Zap, Cpu, BarChart2,
  Wrench, ChevronDown, ChevronRight, X, CheckCircle,
  Radio, Layers, Box,
} from 'lucide-react-native';
import Svg, {
  Line, Rect, Path, Ellipse, Circle, G, Text as SvgText,
  Defs, Marker, Pattern, ClipPath, Polygon,
} from 'react-native-svg';
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
      { symptom: 'Cannot control sealing temperature', steps: ['Check PLC output connections to heating element relay', 'Verify correct voltage at relay coil side', 'Inspect thermocouple wiring for kinks or damage', 'Confirm programmed temp setpoint is correct for film type', 'After element or TC replacement: run AutoTune from TEMPERATURE menu'] },
      { symptom: 'Partial vertical seal', steps: ['Check side-to-side film roll positioning on unwind shaft', 'Verify film is tracking straight through the machine', 'Inspect forming collar for damage or misalignment'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Open front door — remove 2 knobs from mounting posts', 'Pull vertical sealing assembly off mounting posts', 'Rotate assembly 180° facing forward — place back on posts loosely', 'Open black electrical box — remove 4 screws on cover', 'Label, loosen, and disconnect thermocouple connections inside box', 'Remove cable ties securing thermocouple to machine', 'Loosen thermocouple at jaw and slide out', 'Slide new thermocouple into vertical sealing jaw — tighten', 'Route cable to black box, connect, reinstall cover', 'Reconnect all connections — power on — run AutoTune'],
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
      { symptom: 'Jaw not closing / not functioning', steps: ['Confirm compressed air is reaching jaw cylinder', 'Verify air can vent from opposite side of cylinder', 'Check PLC output voltage to electric/pneumatic solenoids', 'Use TEST button on valve block to manually test solenoid function'] },
      { symptom: 'Incomplete or weak end seals', steps: ['Verify temperature setpoint matches film spec for both elements', 'Check bag deflator position — foam pads should LEAD seals by ¼"'] },
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
      { symptom: 'Air pressure drops after machine starts', steps: ['Check compressed air supply line for restrictions or damage', 'Inspect internal air lines for leaks — use soapy water test', 'Verify filter element is not clogged', 'Confirm air supply spec: 70 PSI @ 25 SCFM'] },
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Disconnect air line from Filter/Regulator', 'Disconnect electrical connection from electronic dump valve', 'Remove mounting bolts from base frame', 'Remove dump valve from old unit', 'Assemble dump valve onto new Filter/Regulator', 'Mount in position — tighten bolts', 'Connect air lines and electrical connections', 'Adjust air pressure to 70 PSI', 'Power on and test all pneumatic functions'],
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
    ],
    repair: ['LOCKOUT: Disconnect electrical AND pneumatic connections', 'Open right side electrical panel door', 'Locate encoder/photoeye cable connection at PLC', 'Label and disconnect cable', 'Remove wire ties securing cable along base frame', 'Pull cable back to component', 'Loosen hex head screw (encoder) or mounting bolt (photoeye)', 'Remove old component and install new one', 'Route cable to panel following original path', 'Connect to PLC — reconnect all power', 'Calibrate photoeye: advance film so mark is NOT under sensor, press white button on controller'],
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
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: ms, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: ms, useNativeDriver: true }),
    ])).start();
  }, []);
  return a;
}

function useScan(width: number, ms = 3200) {
  const a = useRef(new Animated.Value(-40)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(a, { toValue: width + 40, duration: ms, useNativeDriver: true })).start();
  }, [width]);
  return a;
}

// ══════════════════════════════ SMALL COMPONENTS ══════════════════════════════
function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const p = usePulse(1600);
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
      transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
    }} />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PA1 PRODUCTION FLOW SCHEMATIC (native SVG)
// Flow: Super Sack → Hopper (with Magnets inside) → Screwfeed (angled up-left)
//       → Avatar A1200 → Conveyor Feed → Packout Area
// Layout: right-to-left, Super Sack top-right, Packout Area bottom-left
// ══════════════════════════════════════════════════════════════════════════════

interface SchematicNode {
  id: string;
  label: string;
  status: 'ok' | 'alert' | 'idle';
  sublabel?: string;
}

function PA1SchematicSVG({
  alertNodeId,
  onNodePress,
  sensors,
}: {
  alertNodeId?: string | null;
  onNodePress: (id: string) => void;
  sensors: any[];
}) {
  const schW = W - 32;
  const schH = 300;

  // Scale factor: design at 900px wide, scale to device
  const scale = schW / 900;
  const h = schH;

  const pulse = usePulse(1200);
  const alertOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const getSensor = (name: string) => sensors.find(s => s.sensor_name?.toLowerCase().includes(name.toLowerCase()));
  const hopperLevel = getSensor('Hopper Level');
  const augerSpeed = getSensor('Auger Speed');

  const hopperPct = hopperLevel?.value ? Math.min(Math.max(hopperLevel.value / 100, 0), 1) : 0.46;
  const augerRpm = augerSpeed?.value ? augerSpeed.value.toFixed(0) : '97';

  const isAlert = (id: string) => alertNodeId === id;

  // Colors
  const C = {
    stroke: '#00ff90',
    strokeDim: '#00ff9044',
    strokeAlert: '#ff4444',
    fill: '#001a0a',
    fillAlert: '#1a0000',
    text: '#00ff90',
    textAlert: '#ff4444',
    textDim: '#00ff9088',
    pipe: '#00ff9066',
    support: '#00ff9033',
    level: '#00ff9015',
    hatch: '#00ff9018',
    motor: '#001510',
  };

  // All coordinates designed at 900px width, scaled via transform
  return (
    <View style={{ width: schW, height: h }}>
      <Svg width={schW} height={h} viewBox={`0 0 900 ${h / scale}`}>

        {/* ── FLOOR LINE ── */}
        <Line x1="20" y1="320" x2="880" y2="320" stroke={C.strokeDim} strokeWidth="1" />

        {/* ══ 1. SUPER SACK (top-right) ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('supersack'); }}>
          {/* Gantry uprights */}
          <Line x1="760" y1="18" x2="760" y2="95" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="840" y1="18" x2="840" y2="95" stroke={C.stroke} strokeWidth="1.5" />
          {/* Top beam */}
          <Line x1="760" y1="18" x2="840" y2="18" stroke={C.stroke} strokeWidth="1.5" />
          {/* Cross brace */}
          <Line x1="760" y1="32" x2="840" y2="32" stroke={C.stroke} strokeWidth="0.7" />
          <Line x1="760" y1="22" x2="840" y2="32" stroke={C.stroke} strokeWidth="0.5" />
          <Line x1="840" y1="22" x2="760" y2="32" stroke={C.stroke} strokeWidth="0.5" />
          {/* Hoist beam */}
          <Rect x="786" y="18" width="28" height="5" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* Hook */}
          <Line x1="800" y1="23" x2="800" y2="34" stroke={C.stroke} strokeWidth="1.2" />
          <Path d="M794 34 Q794 41 800 41 Q806 41 806 34" fill="none" stroke={C.stroke} strokeWidth="1.2" />
          {/* FIBC Bag body */}
          <Path d="M778 41 Q778 35 800 35 Q822 35 822 41 L818 86 Q818 93 800 93 Q782 93 782 86 Z" fill={C.fill} stroke={C.stroke} strokeWidth="1.3" />
          {/* Bag straps */}
          <Line x1="790" y1="35" x2="790" y2="41" stroke={C.stroke} strokeWidth="2" />
          <Line x1="810" y1="35" x2="810" y2="41" stroke={C.stroke} strokeWidth="2" />
          {/* Discharge spout */}
          <Path d="M790 93 L793 107 L807 107 L810 93" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Rect x="792" y="107" width="16" height="8" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* Feet */}
          <Rect x="752" y="91" width="16" height="5" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Rect x="832" y="91" width="16" height="5" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* Step circle */}
          <Circle cx="762" cy="16" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="762" y="20" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">1</SvgText>
          {/* Label */}
          <SvgText x="800" y="136" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="1">SUPER SACK</SvgText>
          <SvgText x="800" y="147" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">BULK INPUT</SvgText>
        </G>

        {/* ── SS → Hopper pipe ── */}
        <Line x1="800" y1="115" x2="800" y2="128" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M796 124 L800 132 L804 124" fill={C.pipe} />

        {/* ══ 2. HOPPER with MAGNETS inside (center-right) ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('hopper'); }}>
          {/* Tank body */}
          <Rect x="768" y="128" width="64" height="82" rx="2" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Level fill */}
          <Rect x="770" y={128 + 82 * (1 - hopperPct)} width="60" height={82 * hopperPct} fill={C.level} />
          <Line x1="770" y1={128 + 82 * (1 - hopperPct)} x2="830" y1={128 + 82 * (1 - hopperPct)} stroke={C.stroke} strokeWidth="0.7" strokeDasharray="3,2" />
          {/* Level % */}
          <SvgText x="800" y="185" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New">{Math.round(hopperPct * 100)}%</SvgText>
          {/* Level gauge glass */}
          <Rect x="759" y="132" width="5" height="74" rx="1" fill="#001510" stroke={C.strokeDim} strokeWidth="0.8" />
          <Rect x="760" y={132 + 74 * (1 - hopperPct)} width="3" height={74 * hopperPct} rx="1" fill="#00ff9033" />
          {/* Inlet stub top */}
          <Rect x="793" y="118" width="14" height="12" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* Cone bottom */}
          <Path d="M768 210 L786 242 L814 242 L832 210" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Outlet stub */}
          <Rect x="788" y="242" width="24" height="14" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />

          {/* MAGNETS inside hopper — alert state */}
          <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNodePress('magnets'); }}>
            <Rect x="773" y="135" width="54" height="9" rx="1" fill={isAlert('magnets') ? C.fillAlert : '#0d1a10'} stroke={isAlert('magnets') ? C.strokeAlert : '#00ff9066'} strokeWidth="1" />
            <Rect x="773" y="148" width="54" height="9" rx="1" fill={isAlert('magnets') ? C.fillAlert : '#0d1a10'} stroke={isAlert('magnets') ? C.strokeAlert : '#00ff9066'} strokeWidth="1" />
            <Rect x="773" y="161" width="54" height="9" rx="1" fill={isAlert('magnets') ? C.fillAlert : '#0d1a10'} stroke={isAlert('magnets') ? C.strokeAlert : '#00ff9066'} strokeWidth="1" />
            {/* N/S labels */}
            {['N','S','N','S'].map((p, i) => (
              <SvgText key={`m1${i}`} x={780 + i * 13} y="142" textAnchor="middle" fontSize="5.5" fill={isAlert('magnets') ? C.textAlert : '#00ff9066'} fontFamily="Courier New">{p}</SvgText>
            ))}
            {['S','N','S','N'].map((p, i) => (
              <SvgText key={`m2${i}`} x={780 + i * 13} y="155" textAnchor="middle" fontSize="5.5" fill={isAlert('magnets') ? C.textAlert + '88' : '#00ff9044'} fontFamily="Courier New">{p}</SvgText>
            ))}
            {['N','S','N','S'].map((p, i) => (
              <SvgText key={`m3${i}`} x={780 + i * 13} y="168" textAnchor="middle" fontSize="5.5" fill={isAlert('magnets') ? C.textAlert : '#00ff9066'} fontFamily="Courier New">{p}</SvgText>
            ))}
            {/* Alert tag */}
            {isAlert('magnets') && (
              <SvgText x="836" y="155" fontSize="10" fill={C.textAlert}>⚠</SvgText>
            )}
          </G>

          {/* Magnets callout label */}
          <Line x1="832" y1="152" x2="854" y2="152" stroke={isAlert('magnets') ? '#ff444444' : C.strokeDim} strokeWidth="0.7" />
          <SvgText x="856" y="150" fontSize="7" fill={isAlert('magnets') ? C.textAlert : C.textDim} fontFamily="Courier New" fontWeight="bold">MAGNETS</SvgText>
          <SvgText x="856" y="159" fontSize="6" fill={isAlert('magnets') ? '#ff444488' : C.textDim} fontFamily="Courier New">{isAlert('magnets') ? 'ALERT' : 'METAL SEP'}</SvgText>

          {/* Step circle */}
          <Circle cx="770" cy="126" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="770" y="130" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">2</SvgText>
          {/* Label */}
          <SvgText x="800" y="268" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="1">HOPPER</SvgText>
          <SvgText x="800" y="278" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">{Math.round(hopperPct * 100)}% FULL</SvgText>
        </G>

        {/* ══ 3. SCREWFEED — angled from hopper bottom up-left ══
             Inlet (motor) at hopper outlet: ~800,256
             Outlet (discharge tip): ~440,58
             Top wall: (440,50) → (794,256)
             Bottom wall: (440,66) → (794,272)
        */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('screwfeed'); }}>
          {/* Tube walls */}
          <Line x1="440" y1="50" x2="794" y2="256" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="440" y1="66" x2="794" y2="272" stroke={C.stroke} strokeWidth="1.5" />
          {/* End caps */}
          <Line x1="440" y1="50" x2="440" y2="66" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="794" y1="256" x2="794" y2="272" stroke={C.stroke} strokeWidth="1.5" />
          {/* Screw flights */}
          {[480,520,560,600,640,680,720,760].map((x, i) => {
            const t = (x - 440) / (794 - 440);
            const yTop = 50 + t * (256 - 50);
            const yBot = 66 + t * (272 - 66);
            return <Line key={i} x1={x} y1={yTop} x2={x - 4} y2={yBot} stroke="#00ff9055" strokeWidth="0.9" />;
          })}
          {/* Motor housing at inlet (right/low) */}
          <Ellipse cx="800" cy="264" rx="10" ry="16" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Ellipse cx="800" cy="264" rx="5" ry="8" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.7" />
          <Line x1="800" y1="256" x2="800" y2="272" stroke={C.strokeDim} strokeWidth="0.5" />
          <Line x1="792" y1="264" x2="808" y2="264" stroke={C.strokeDim} strokeWidth="0.5" />
          {/* Support legs */}
          {[700, 600, 510].map((x, i) => {
            const t = (x - 440) / (794 - 440);
            const yMid = (50 + 66) / 2 + t * ((256 + 272) / 2 - (50 + 66) / 2);
            return (
              <G key={i}>
                <Line x1={x} y1={yMid} x2={x - 2} y2="320" stroke={C.support} strokeWidth="1" />
                <Line x1={x - 8} y1="320" x2={x + 6} y2="320" stroke={C.support} strokeWidth="1" />
              </G>
            );
          })}
          {/* Flow arrow */}
          <Line x1="660" y1="170" x2="540" y2="126" stroke={C.strokeDim} strokeWidth="1" />
          <Path d="M542 122 L536 128 L546 130" fill={C.strokeDim} />
          {/* RPM badge */}
          <Rect x="560" y="158" width="52" height="14" rx="2" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.7" />
          <SvgText x="586" y="168" textAnchor="middle" fontSize="7.5" fill={C.text} fontFamily="Courier New">{augerRpm} RPM</SvgText>
          {/* Step circle */}
          <Circle cx="806" cy="244" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="806" y="248" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">3</SvgText>
          {/* Label */}
          <SvgText x="610" y="218" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="1">AUGER / SCREWFEED</SvgText>
        </G>

        {/* ── Screwfeed discharge → Avatar drop ── */}
        <Line x1="440" y1="66" x2="440" y2="90" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M436 86 L440 94 L444 86" fill={C.pipe} />

        {/* ══ 4. AVATAR A1200 VFFS ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNodePress('avatar_a1200'); }}>
          {/* Main cabinet */}
          <Rect x="400" y="94" width="80" height="75" rx="2" fill={C.fill} stroke={isAlert('avatar_a1200') ? C.strokeAlert : C.stroke} strokeWidth="1.5" />
          {/* Film roll top */}
          <Ellipse cx="440" cy="99" rx="18" ry="8" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Ellipse cx="440" cy="99" rx="8" ry="3.5" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          {/* Form tube */}
          <Rect x="431" y="94" width="18" height="28" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          {/* Jaw sealing area */}
          <Rect x="412" y="125" width="56" height="16" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Line x1="412" y1="130" x2="468" y2="130" stroke={C.strokeDim} strokeWidth="0.5" />
          <Line x1="412" y1="135" x2="468" y2="135" stroke={C.strokeDim} strokeWidth="0.5" />
          <Line x1="412" y1="139" x2="468" y2="139" stroke={C.strokeDim} strokeWidth="0.5" />
          {/* Control panel side */}
          <Rect x="402" y="100" width="18" height="26" rx="1" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          <Rect x="405" y="103" width="12" height="7" rx="1" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.5" />
          <Circle cx="408" cy="117" r="2" fill={C.strokeDim} />
          <Circle cx="414" cy="117" r="2" fill="#00cc4455" />
          {/* Bag output chute */}
          <Path d="M416 141 L420 166 L460 166 L464 141" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* VFFS badge */}
          <Rect x="450" y="100" width="20" height="8" rx="1" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.5" />
          <SvgText x="460" y="107" textAnchor="middle" fontSize="5.5" fill={C.textDim} fontFamily="Courier New">VFFS</SvgText>
          {/* Support legs */}
          <Line x1="415" y1="166" x2="413" y2="320" stroke={C.support} strokeWidth="1" />
          <Line x1="465" y1="166" x2="463" y2="320" stroke={C.support} strokeWidth="1" />
          {/* Step circle */}
          <Circle cx="402" cy="92" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="402" y="96" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">4</SvgText>
          {/* Label */}
          <SvgText x="440" y="188" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="0.5">AVATAR A1200</SvgText>
          <SvgText x="440" y="198" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">VFFS BAGGER</SvgText>
        </G>

        {/* ── Avatar → Conveyor ── */}
        <Line x1="400" y1="155" x2="350" y2="155" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M354 151 L346 155 L354 159" fill={C.pipe} />

        {/* ══ 5. CONVEYOR FEED ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('conveyor'); }}>
          {/* Frame */}
          <Rect x="190" y="148" width="162" height="16" rx="2" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Belt surface */}
          <Rect x="192" y="150" width="158" height="7" rx="1" fill={C.motor} />
          {/* Belt segs */}
          {[210,228,246,264,282,300,318,336].map((x, i) => (
            <Line key={i} x1={x} y1="150" x2={x} y2="157" stroke={C.strokeDim} strokeWidth="0.8" />
          ))}
          {/* Drive roller right */}
          <Ellipse cx="346" cy="156" rx="6" ry="9" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Ellipse cx="346" cy="156" rx="3" ry="4" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.7" />
          {/* Tail roller left */}
          <Ellipse cx="196" cy="156" rx="5" ry="8" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          {/* Gearmotor */}
          <Rect x="348" y="152" width="14" height="8" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* Legs */}
          <Line x1="214" y1="164" x2="212" y2="320" stroke={C.support} strokeWidth="1" />
          <Line x1="318" y1="164" x2="316" y2="320" stroke={C.support} strokeWidth="1" />
          {/* Speed readout */}
          <Rect x="236" y="172" width="56" height="13" rx="2" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.7" />
          <SvgText x="264" y="181" textAnchor="middle" fontSize="7.5" fill={C.text} fontFamily="Courier New">24.3 ft/min</SvgText>
          {/* Step circle */}
          <Circle cx="192" cy="146" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="192" y="150" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">5</SvgText>
          {/* Label */}
          <SvgText x="270" y="198" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="1">CONVEYOR FEED</SvgText>
        </G>

        {/* ── Conveyor → Packout ── */}
        <Line x1="190" y1="156" x2="156" y2="156" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M160 152 L152 156 L160 160" fill={C.pipe} />

        {/* ══ 6. PACKOUT AREA (far left) ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('packout'); }}>
          {/* Work table */}
          <Rect x="20" y="148" width="134" height="12" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Legs */}
          <Line x1="34" y1="160" x2="32" y2="320" stroke={C.stroke} strokeWidth="1.2" />
          <Line x1="140" y1="160" x2="138" y2="320" stroke={C.stroke} strokeWidth="1.2" />
          <Line x1="32" y1="320" x2="140" y2="320" stroke={C.stroke} strokeWidth="0.8" />
          {/* Pallet */}
          <Rect x="20" y="321" width="134" height="6" rx="1" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          {[38,60,82,104,126].map((x, i) => (
            <Line key={i} x1={x} y1="321" x2={x} y2="327" stroke={C.strokeDim} strokeWidth="2" />
          ))}
          {/* Cases on table */}
          <Rect x="28" y="128" width="36" height="21" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Line x1="28" y1="138" x2="64" y2="138" stroke={C.strokeDim} strokeWidth="0.5" />
          <Rect x="72" y="131" width="30" height="18" rx="1" fill={C.fill} stroke={C.strokeDim} strokeWidth="1" />
          {/* Counter display */}
          <Rect x="24" y="112" width="66" height="14" rx="2" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="57" y="122" textAnchor="middle" fontSize="7.5" fill={C.text} fontFamily="Courier New">48 CASES/HR</SvgText>
          {/* Step circle */}
          <Circle cx="22" cy="146" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="22" y="150" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">6</SvgText>
          {/* Label */}
          <SvgText x="87" y="212" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="1">PACKOUT AREA</SvgText>
        </G>

        {/* ── Legend ── */}
        <Rect x="620" y="290" width="8" height="8" rx="1" fill="none" stroke={C.stroke} strokeWidth="1.2" />
        <SvgText x="634" y="297" fontSize="7.5" fill={C.textDim} fontFamily="Courier New">NOMINAL</SvgText>
        <Rect x="700" y="290" width="8" height="8" rx="1" fill="none" stroke={C.strokeAlert} strokeWidth="1.2" />
        <SvgText x="714" y="297" fontSize="7.5" fill="#ff444477" fontFamily="Courier New">ALERT</SvgText>

      </Svg>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PR1/PR2 PRODUCTION FLOW SCHEMATIC (native SVG)
// Flow: Super Sack → Hopper → Screwfeed (long steep) → [top of screwfeed]:
//       Cone Feed → Metal Detector → drop spout → Scale → Conveyor/Sealer → Packout
// ══════════════════════════════════════════════════════════════════════════════

function PR1PR2SchematicSVG({
  alertNodeId,
  onNodePress,
  sensors,
}: {
  alertNodeId?: string | null;
  onNodePress: (id: string) => void;
  sensors: any[];
}) {
  const schW = W - 32;
  const vbW = 1100;
  const vbH = 400;

  const pulse = usePulse(1200);

  const getSensor = (name: string) => sensors.find(s => s.sensor_name?.toLowerCase().includes(name.toLowerCase()));
  const hopperLevel = getSensor('Hopper Level');
  const augerSpeed = getSensor('Auger Speed');

  const hopperPct = hopperLevel?.value ? Math.min(Math.max(hopperLevel.value / 100, 0), 1) : 0.52;
  const augerRpm = augerSpeed?.value ? augerSpeed.value.toFixed(0) : '112';

  const C = {
    stroke: '#00ff90',
    strokeDim: '#00ff9044',
    strokeAlert: '#ff4444',
    fill: '#001a0a',
    fillAlert: '#1a0000',
    text: '#00ff90',
    textAlert: '#ff4444',
    textDim: '#00ff9088',
    pipe: '#00ff9066',
    support: '#00ff9033',
    level: '#00ff9015',
    motor: '#001510',
  };

  const isAlert = (id: string) => alertNodeId === id;

  return (
    <View style={{ width: schW, height: schW * vbH / vbW }}>
      <Svg width={schW} height={schW * vbH / vbW} viewBox={`0 0 ${vbW} ${vbH}`}>

        {/* Floor */}
        <Line x1="20" y1="365" x2="1080" y2="365" stroke={C.strokeDim} strokeWidth="1" />

        {/* Flow label */}
        <SvgText x="550" y="13" textAnchor="middle" fontSize="7" fill={C.strokeDim} fontFamily="Courier New" letterSpacing="2">FLOW DIRECTION ←</SvgText>

        {/* ══ 1. SUPER SACK (far right) ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('supersack'); }}>
          <Line x1="1010" y1="24" x2="1010" y2="100" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="1082" y1="24" x2="1082" y2="100" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="1010" y1="24" x2="1082" y2="24" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="1010" y1="40" x2="1082" y2="40" stroke={C.stroke} strokeWidth="0.7" />
          <Line x1="1010" y1="28" x2="1082" y2="40" stroke={C.stroke} strokeWidth="0.5" />
          <Line x1="1082" y1="28" x2="1010" y2="40" stroke={C.stroke} strokeWidth="0.5" />
          <Rect x="1034" y="24" width="28" height="5" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Line x1="1048" y1="29" x2="1048" y2="40" stroke={C.stroke} strokeWidth="1.2" />
          <Path d="M1042 40 Q1042 47 1048 47 Q1054 47 1054 40" fill="none" stroke={C.stroke} strokeWidth="1.2" />
          <Path d="M1026 47 Q1026 41 1048 41 Q1070 41 1070 47 L1066 94 Q1066 102 1048 102 Q1030 102 1030 94 Z" fill={C.fill} stroke={C.stroke} strokeWidth="1.3" />
          <Line x1="1037" y1="41" x2="1037" y2="47" stroke={C.stroke} strokeWidth="2" />
          <Line x1="1059" y1="41" x2="1059" y2="47" stroke={C.stroke} strokeWidth="2" />
          <Path d="M1038 102 L1041 116 L1055 116 L1058 102" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Rect x="1040" y="116" width="16" height="8" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Rect x="1002" y="96" width="16" height="5" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Rect x="1074" y="96" width="16" height="5" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Circle cx="1012" cy="22" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="1012" y="26" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">1</SvgText>
          <SvgText x="1048" y="142" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New" letterSpacing="1">SUPER SACK</SvgText>
        </G>

        {/* SS → Hopper */}
        <Line x1="1048" y1="124" x2="1048" y2="138" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M1044 134 L1048 142 L1052 134" fill={C.pipe} />

        {/* ══ 2. HOPPER ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('hopper'); }}>
          <Rect x="1016" y="138" width="64" height="84" rx="2" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          <Rect x="1018" y={138 + 84 * (1 - hopperPct)} width="60" height={84 * hopperPct} fill={C.level} />
          <Line x1="1018" y1={138 + 84 * (1 - hopperPct)} x2="1078" y1={138 + 84 * (1 - hopperPct)} stroke={C.stroke} strokeWidth="0.7" strokeDasharray="3,2" />
          <SvgText x="1048" y="186" textAnchor="middle" fontSize="9" fill={C.text} fontWeight="bold" fontFamily="Courier New">{Math.round(hopperPct * 100)}%</SvgText>
          <Rect x="1008" y="142" width="5" height="76" rx="1" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          <Rect x="1009" y={142 + 76 * (1 - hopperPct)} width="3" height={76 * hopperPct} rx="1" fill="#00ff9033" />
          <Path d="M1016 222 L1034 258 L1062 258 L1080 222" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          <Rect x="1036" y="258" width="24" height="16" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Circle cx="1018" cy="136" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="1018" y="140" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">2</SvgText>
          <SvgText x="1048" y="282" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New">HOPPER</SvgText>
          <SvgText x="1048" y="292" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">{Math.round(hopperPct * 100)}% FULL</SvgText>
        </G>

        {/* ══ 3. SCREWFEED — long steep, inlet at hopper outlet, outlet at x=700 y=58 ══
             Top wall:    (700,50) → (1036,260)
             Bottom wall: (700,66) → (1036,276)
        */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('screwfeed'); }}>
          <Line x1="700" y1="50" x2="1036" y2="260" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="700" y1="66" x2="1036" y2="276" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="700" y1="50" x2="700" y2="66" stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="1036" y1="260" x2="1036" y2="276" stroke={C.stroke} strokeWidth="1.5" />
          {/* Flights */}
          {[740,790,840,890,940,990,1000].map((x, i) => {
            const t = (x - 700) / (1036 - 700);
            const yT = 50 + t * (260 - 50);
            const yB = 66 + t * (276 - 66);
            return <Line key={i} x1={x} y1={yT} x2={x - 4} y2={yB} stroke="#00ff9055" strokeWidth="0.9" />;
          })}
          {/* Motor */}
          <Ellipse cx="1044" cy="268" rx="10" ry="16" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Ellipse cx="1044" cy="268" rx="5" ry="8" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.7" />
          {/* Support legs */}
          {[900, 800, 740].map((x, i) => {
            const t = (x - 700) / (1036 - 700);
            const yMid = (58 + t * (268 - 58));
            return (
              <G key={i}>
                <Line x1={x} y1={yMid} x2={x - 2} y2="365" stroke={C.support} strokeWidth="1" />
                <Line x1={x - 8} y1="365" x2={x + 6} y2="365" stroke={C.support} strokeWidth="1" />
              </G>
            );
          })}
          {/* Flow arrow */}
          <Line x1="900" y1="190" x2="780" y2="148" stroke={C.strokeDim} strokeWidth="1" />
          <Path d="M782 144 L776 150 L786 152" fill={C.strokeDim} />
          {/* RPM badge */}
          <Rect x="800" y="172" width="52" height="13" rx="2" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.7" />
          <SvgText x="826" y="181" textAnchor="middle" fontSize="7.5" fill={C.text} fontFamily="Courier New">{augerRpm} RPM</SvgText>
          <Circle cx="1048" cy="248" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="1048" y="252" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">3</SvgText>
          <SvgText x="860" y="380" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New">SCREWFEED</SvgText>
        </G>

        {/* Screwfeed tip → Cone Feed top */}
        <Line x1="700" y1="66" x2="700" y2="86" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M696 82 L700 90 L704 82" fill={C.pipe} />

        {/* ══ 4. CONE FEED — stacked directly at screwfeed discharge ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('conefeed'); }}>
          {/* Cone hopper shape */}
          <Path d="M658 86 L742 86 L724 162 L676 162 Z" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Fins inside */}
          <Line x1="678" y1="104" x2="677" y2="158" stroke={C.strokeDim} strokeWidth="0.8" />
          <Line x1="700" y1="100" x2="700" y2="160" stroke={C.strokeDim} strokeWidth="0.8" />
          <Line x1="722" y1="104" x2="723" y2="158" stroke={C.strokeDim} strokeWidth="0.8" />
          {/* Outlet tube */}
          <Rect x="676" y="162" width="48" height="20" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          {/* Side motor */}
          <Ellipse cx="746" cy="120" rx="8" ry="13" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Ellipse cx="746" cy="120" rx="4" ry="6" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.7" />
          {/* Legs */}
          <Line x1="658" y1="162" x2="654" y2="365" stroke={C.support} strokeWidth="1" />
          <Line x1="742" y1="162" x2="746" y2="365" stroke={C.support} strokeWidth="1" />
          <Circle cx="660" cy="84" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="660" y="88" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">4</SvgText>
          <SvgText x="700" y="200" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New">CONE FEED</SvgText>
        </G>

        {/* Cone Feed → Metal Detector */}
        <Line x1="700" y1="182" x2="700" y2="204" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M696 200 L700 208 L704 200" fill={C.pipe} />

        {/* ══ 5. METAL DETECTOR — stacked below cone feed ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNodePress('metaldet'); }}>
          {/* Tunnel housing */}
          <Rect x="658" y="204" width="84" height="68" rx="3" fill={isAlert('metaldet') ? C.fillAlert : C.fill} stroke={isAlert('metaldet') ? C.strokeAlert : C.stroke} strokeWidth="1.5" />
          {/* Coil rings */}
          <Ellipse cx="679" cy="238" rx="13" ry="25" fill="none" stroke={isAlert('metaldet') ? C.strokeAlert + '88' : C.strokeDim} strokeWidth="1" />
          <Ellipse cx="679" cy="238" rx="7" ry="13" fill="none" stroke={isAlert('metaldet') ? C.strokeAlert + '55' : '#00ff9033'} strokeWidth="0.7" />
          <Ellipse cx="721" cy="238" rx="13" ry="25" fill="none" stroke={isAlert('metaldet') ? C.strokeAlert + '88' : C.strokeDim} strokeWidth="1" />
          <Ellipse cx="721" cy="238" rx="7" ry="13" fill="none" stroke={isAlert('metaldet') ? C.strokeAlert + '55' : '#00ff9033'} strokeWidth="0.7" />
          {/* Control head */}
          <Rect x="666" y="190" width="68" height="16" rx="2" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          <Rect x="671" y="194" width="20" height="8" rx="1" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.5" />
          <Circle cx="700" cy="198" r="2.5" fill={isAlert('metaldet') ? C.strokeAlert : C.strokeDim} />
          <Circle cx="712" cy="198" r="2.5" fill="#00cc4455" />
          {/* Inlet/outlet stubs */}
          <Rect x="686" y="192" width="28" height="14" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Rect x="686" y="270" width="28" height="16" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          {/* Alert indicator */}
          {isAlert('metaldet') && (
            <SvgText x="700" y="244" textAnchor="middle" fontSize="12" fill={C.textAlert}>⚠</SvgText>
          )}
          {/* Legs */}
          <Line x1="664" y1="272" x2="662" y2="365" stroke={C.support} strokeWidth="1" />
          <Line x1="736" y1="272" x2="738" y2="365" stroke={C.support} strokeWidth="1" />
          <Circle cx="660" cy="202" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="660" y="206" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">5</SvgText>
          <SvgText x="700" y="302" textAnchor="middle" fontSize="8" fill={isAlert('metaldet') ? C.textAlert : C.text} fontWeight="bold" fontFamily="Courier New">METAL DET.</SvgText>
        </G>

        {/* Drop spout from metal det → floor level */}
        <Line x1="700" y1="286" x2="700" y2="330" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M688 308 L712 308 L707 330 L693 330 Z" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
        {/* Horizontal to scale */}
        <Line x1="700" y1="330" x2="576" y2="330" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M580 326 L572 330 L580 334" fill={C.pipe} />

        {/* ══ 6. SCALE ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('scale'); }}>
          {/* Platform */}
          <Rect x="504" y="322" width="72" height="14" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Load cell legs */}
          <Line x1="518" y1="336" x2="516" y2="355" stroke={C.stroke} strokeWidth="1.2" />
          <Line x1="562" y1="336" x2="560" y2="355" stroke={C.stroke} strokeWidth="1.2" />
          {/* Base */}
          <Rect x="510" y="355" width="56" height="8" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          {/* Display */}
          <Rect x="516" y="296" width="56" height="24" rx="2" fill={C.motor} stroke={C.strokeDim} strokeWidth="1" />
          <Rect x="521" y="301" width="46" height="12" rx="1" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.5" />
          <SvgText x="544" y="310" textAnchor="middle" fontSize="8" fill={C.text} fontFamily="Courier New">24.8 LB</SvgText>
          {/* Bag on platform */}
          <Path d="M512 312 L510 322 L574 322 L572 312 Q544 307 512 312 Z" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          <Circle cx="506" cy="320" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="506" y="324" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">6</SvgText>
          <SvgText x="544" y="378" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New">SCALE</SvgText>
        </G>

        {/* Scale → Conveyor/Sealer */}
        <Line x1="504" y1="329" x2="450" y2="329" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M454 325 L446 329 L454 333" fill={C.pipe} />

        {/* ══ 7. CONVEYOR / SEALER ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('sealer'); }}>
          {/* Frame */}
          <Rect x="196" y="321" width="256" height="16" rx="2" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          {/* Belt */}
          <Rect x="198" y="323" width="252" height="7" rx="1" fill={C.motor} />
          {/* Belt segs */}
          {[214,232,250,268,286,304,322,340,358,376,394,412,430].map((x, i) => (
            <Line key={i} x1={x} y1="323" x2={x} y2="330" stroke={C.strokeDim} strokeWidth="0.8" />
          ))}
          {/* Rollers */}
          <Ellipse cx="446" cy="329" rx="6" ry="9" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          <Ellipse cx="446" cy="329" rx="3" ry="4" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.7" />
          <Ellipse cx="200" cy="329" rx="5" ry="8" fill={C.fill} stroke={C.stroke} strokeWidth="1.2" />
          {/* Sealer arch */}
          <Path d="M300 321 Q300 296 320 294 Q340 296 340 321" fill="none" stroke={C.stroke} strokeWidth="1.5" />
          <Rect x="298" y="290" width="44" height="10" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {[308,315,322,329,336].map((x, i) => (
            <Line key={i} x1={x} y1="300" x2={x} y2="321" stroke={i % 2 === 0 ? C.strokeDim : '#00ff9033'} strokeWidth="0.8" />
          ))}
          {/* Gearmotor */}
          <Rect x="448" y="325" width="12" height="8" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          {/* Legs */}
          <Line x1="218" y1="337" x2="216" y2="365" stroke={C.support} strokeWidth="1" />
          <Line x1="414" y1="337" x2="412" y2="365" stroke={C.support} strokeWidth="1" />
          {/* Speed */}
          <Rect x="232" y="342" width="58" height="13" rx="2" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.7" />
          <SvgText x="261" y="351" textAnchor="middle" fontSize="7.5" fill={C.text} fontFamily="Courier New">18.5 ft/min</SvgText>
          <Circle cx="198" cy="319" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="198" y="323" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">7</SvgText>
          <SvgText x="322" y="382" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New">CONVEYOR / SEALER</SvgText>
        </G>

        {/* Sealer → Packout */}
        <Line x1="196" y1="329" x2="162" y2="329" stroke={C.pipe} strokeWidth="2.5" />
        <Path d="M166 325 L158 329 L166 333" fill={C.pipe} />

        {/* ══ 8. PACKOUT (compact, far left) ══ */}
        <G onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNodePress('packout'); }}>
          <Rect x="22" y="320" width="136" height="12" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1.5" />
          <Line x1="38" y1="332" x2="36" y2="365" stroke={C.stroke} strokeWidth="1.2" />
          <Line x1="144" y1="332" x2="142" y2="365" stroke={C.stroke} strokeWidth="1.2" />
          {/* Pallet */}
          <Rect x="22" y="366" width="136" height="6" rx="1" fill={C.motor} stroke={C.strokeDim} strokeWidth="0.8" />
          {[44,68,92,116,140].map((x, i) => (
            <Line key={i} x1={x} y1="366" x2={x} y2="372" stroke={C.strokeDim} strokeWidth="2" />
          ))}
          {/* Cases */}
          <Rect x="30" y="300" width="34" height="21" rx="1" fill={C.fill} stroke={C.stroke} strokeWidth="1" />
          <Line x1="30" y1="310" x2="64" y2="310" stroke={C.strokeDim} strokeWidth="0.5" />
          <Rect x="72" y="304" width="30" height="17" rx="1" fill={C.fill} stroke={C.strokeDim} strokeWidth="1" />
          {/* Counter */}
          <Rect x="28" y="284" width="72" height="14" rx="2" fill="#000d06" stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="64" y="294" textAnchor="middle" fontSize="7.5" fill={C.text} fontFamily="Courier New">52 CASES/HR</SvgText>
          <Circle cx="24" cy="318" r="6" fill={C.fill} stroke={C.strokeDim} strokeWidth="0.8" />
          <SvgText x="24" y="322" textAnchor="middle" fontSize="7" fill={C.textDim} fontFamily="Courier New">8</SvgText>
          <SvgText x="90" y="390" textAnchor="middle" fontSize="8" fill={C.text} fontWeight="bold" fontFamily="Courier New">PACKOUT</SvgText>
        </G>

        {/* Legend */}
        <Rect x="920" y="388" width="8" height="8" rx="1" fill="none" stroke={C.stroke} strokeWidth="1.2" />
        <SvgText x="934" y="395" fontSize="7.5" fill={C.textDim} fontFamily="Courier New">NOMINAL</SvgText>
        <Rect x="1014" y="388" width="8" height="8" rx="1" fill="none" stroke={C.strokeAlert} strokeWidth="1.2" />
        <SvgText x="1028" y="395" fontSize="7.5" fill="#ff444477" fontFamily="Courier New">ALERT</SvgText>

      </Svg>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMATIC WRAPPER — routes PA1 vs PR1/PR2, wraps with HUD card + sensor panel
// ══════════════════════════════════════════════════════════════════════════════

const SENSOR_DATA: Record<string, { label: string; sensors: string[] }> = {
  supersack:   { label: 'SUPER SACK',        sensors: ['Discharge flow: ACTIVE', 'Low level: NORMAL'] },
  hopper:      { label: 'HOPPER',             sensors: ['Level: 46%', 'Fill rate: 41.6 bags/min'] },
  magnets:     { label: 'MAGNETS',            sensors: ['Reject count: 0', 'Sensitivity: 98.4%', 'Last test: 4 hr ago'] },
  screwfeed:   { label: 'SCREWFEED / AUGER',  sensors: ['Speed: 97 RPM', 'Motor temp: 147.5°F', 'Vibration: 2.9 mm/s'] },
  avatar_a1200:{ label: 'AVATAR A1200 VFFS',  sensors: ['Seal temp: 301.1°F', 'Air pressure: 68.2 PSI', 'Fill rate: 41.6 bag/min'] },
  conveyor:    { label: 'CONVEYOR FEED',      sensors: ['Speed: 24.3 ft/min', 'Belt tension: NORMAL'] },
  packout:     { label: 'PACKOUT AREA',       sensors: ['Cases/hr: 48', 'Label verify: PASS', 'Scale check: PASS'] },
  conefeed:    { label: 'CONE FEED',          sensors: ['Feed rate: 42.0 bag/min', 'Motor: RUNNING'] },
  metaldet:    { label: 'METAL DETECTOR',     sensors: ['Sensitivity: 98.4%', 'Reject count: 0', 'Last test: 4 hr ago'] },
  scale:       { label: 'SCALE',              sensors: ['Net weight: 24.8 LB', 'Overweight alerts: 0', 'Underweight alerts: 0'] },
  sealer:      { label: 'CONVEYOR / SEALER',  sensors: ['Belt speed: 18.5 ft/min', 'Seal temp: 312.0°F', 'Belt tension: NORMAL'] },
};

function ProductionFlowSchematic({
  roomCode,
  alertNodeId,
  onSelectSystem,
  sensors,
}: {
  roomCode: string;
  alertNodeId?: string | null;
  onSelectSystem: (id: string) => void;
  sensors: any[];
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleNodePress = useCallback((id: string) => {
    setSelectedNode(prev => prev === id ? null : id);
    // If it's the Avatar machine, also open the modal
    if (id === 'avatar_a1200') {
      onSelectSystem(id);
    }
  }, [onSelectSystem]);

  const nodeInfo = selectedNode ? SENSOR_DATA[selectedNode] : null;

  return (
    <View style={fsS.wrap}>
      {/* Header */}
      <View style={fsS.header}>
        <Activity size={12} color={HUD.cyan} />
        <Text style={fsS.headerTitle}>{roomCode} · PRODUCTION FLOW</Text>
        <Text style={fsS.headerSub}>TAP EQUIPMENT TO INSPECT</Text>
      </View>

      {/* Schematic */}
      {roomCode === 'PA1' ? (
        <PA1SchematicSVG
          alertNodeId={alertNodeId}
          onNodePress={handleNodePress}
          sensors={sensors}
        />
      ) : (
        <PR1PR2SchematicSVG
          alertNodeId={alertNodeId}
          onNodePress={handleNodePress}
          sensors={sensors}
        />
      )}

      {/* Sensor panel — slides in when node selected */}
      {selectedNode && nodeInfo && (
        <View style={fsS.sensorPanel}>
          <View style={fsS.sensorPanelHeader}>
            <Text style={fsS.sensorPanelTitle}>{nodeInfo.label}</Text>
            <Pressable onPress={() => setSelectedNode(null)} style={fsS.sensorPanelClose}>
              <X size={12} color={HUD.textDim} />
            </Pressable>
          </View>
          {nodeInfo.sensors.map((s, i) => {
            const [label, val] = s.split(': ');
            return (
              <View key={i} style={fsS.sensorRow}>
                <Text style={fsS.sensorLabel}>{label}</Text>
                <Text style={fsS.sensorVal}>{val}</Text>
              </View>
            );
          })}
          {selectedNode === 'avatar_a1200' && (
            <Pressable
              style={fsS.viewManualBtn}
              onPress={() => onSelectSystem('avatar_a1200')}
            >
              <Cpu size={11} color={HUD.cyan} />
              <Text style={fsS.viewManualTxt}>VIEW EQUIPMENT MANUAL →</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Legend row */}
      <View style={fsS.legend}>
        {[
          { color: '#00ff90', label: 'NOMINAL' },
          { color: '#ff4444', label: 'ALERT' },
        ].map(l => (
          <View key={l.label} style={fsS.legendItem}>
            <View style={[fsS.legendDot, { backgroundColor: l.color }]} />
            <Text style={fsS.legendTxt}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const fsS = StyleSheet.create({
  wrap: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 12, marginBottom: 14, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headerTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 1.5, flex: 1 },
  headerSub: { fontSize: 9, color: HUD.textDim, letterSpacing: 1 },
  sensorPanel: { marginTop: 10, backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.borderBright, overflow: 'hidden' },
  sensorPanelHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00ff9012', borderBottomWidth: 1, borderBottomColor: HUD.borderBright, paddingHorizontal: 12, paddingVertical: 8 },
  sensorPanelTitle: { fontSize: 10, fontWeight: '800', color: '#00ff90', letterSpacing: 1, flex: 1, fontFamily: 'Courier New' },
  sensorPanelClose: { padding: 4 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: HUD.border },
  sensorLabel: { fontSize: 10, color: HUD.textSec, fontFamily: 'Courier New' },
  sensorVal: { fontSize: 11, fontWeight: '700', color: '#00ff90', fontFamily: 'Courier New' },
  viewManualBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: HUD.borderBright },
  viewManualTxt: { fontSize: 10, fontWeight: '800', color: HUD.cyan, letterSpacing: 1 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendTxt: { fontSize: 8, color: HUD.textSec, fontWeight: '600' },
});

// ══════════════════════════ HEARTBEAT MONITOR ══════════════════════════════
const HB_POINTS = 48;

function HeartbeatMonitor({ bpm, color, onBeat }: { bpm: number; color: string; onBeat?: () => void }) {
  const onBeatRef = useRef(onBeat);
  useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);
  const [waveData, setWaveData] = useState<number[]>(() => Array.from({ length: HB_POINTS }, (_, i) => 0.3 + 0.4 * Math.sin(i * 0.4)));
  const waveRef = useRef<number[]>(Array.from({ length: HB_POINTS }, (_, i) => 0.3 + 0.4 * Math.sin(i * 0.4)));
  const tickRef = useRef(0);
  const lastBeatPhaseRef = useRef(false);
  const bpmRef = useRef(bpm);
  const colorRef = useRef(color);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { colorRef.current = color; }, [color]);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      const bpmNorm = Math.min(Math.max((bpmRef.current || 0) / 70, 0), 1);
      const phase = (t % 20) / 20;
      let sample = 0.35;
      if (phase < 0.08) sample = 0.35 + 0.06 * Math.sin(phase / 0.08 * Math.PI);
      else if (phase < 0.18) sample = 0.32;
      else if (phase < 0.22) sample = 0.35 + (0.55 * bpmNorm + 0.2) * Math.sin((phase - 0.18) / 0.04 * Math.PI);
      else if (phase < 0.28) sample = 0.22 * Math.sin((phase - 0.22) / 0.06 * Math.PI);
      else if (phase < 0.45) sample = 0.35 + 0.15 * Math.sin((phase - 0.28) / 0.17 * Math.PI);
      sample += (Math.random() - 0.5) * 0.03;
      sample = Math.min(Math.max(sample, 0.02), 0.98);
      const inSpike = phase >= 0.18 && phase < 0.22;
      if (inSpike && !lastBeatPhaseRef.current) onBeatRef.current?.();
      lastBeatPhaseRef.current = inSpike;
      waveRef.current = [...waveRef.current.slice(1), sample];
      setWaveData([...waveRef.current]);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const chartW = W - 64;
  const chartH = 44;
  const barW = Math.max(1, Math.floor(chartW / HB_POINTS));

  return (
    <View style={hbS.container}>
      <View style={hbS.header}>
        <Activity size={12} color={color} />
        <Text style={[hbS.title, { color }]}>LINE HEARTBEAT</Text>
        <Text style={hbS.bpmLabel}>{bpm > 0 ? `${bpm} PKG/MIN` : 'IDLE'}</Text>
      </View>
      <View style={{ height: chartH, backgroundColor: HUD.bg, borderRadius: 8, overflow: 'hidden' }}>
        {waveData.map((v, i) => {
          const barH = Math.max(2, v * chartH);
          const isSpike = v > 0.6;
          return (
            <View key={i} style={{ position: 'absolute', bottom: 0, left: i * barW, width: barW - 0.5, height: barH, backgroundColor: isSpike ? color : color + '70', borderRadius: 1 }} />
          );
        })}
      </View>
    </View>
  );
}
const hbS = StyleSheet.create({
  container: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: '800', letterSpacing: 2, flex: 1 },
  bpmLabel: { fontSize: 11, fontWeight: '800', color: HUD.textSec, letterSpacing: 1 },
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
      <Pressable
        style={({ pressed }) => [aS.cta, { backgroundColor: pressed ? color + '35' : color + '18', borderColor: color + '60' }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreatePost(); }}
      >
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
const FAULT_DEPARTMENTS = [
  { id: '1001', name: 'Maintenance', color: HUD.cyan },
  { id: '1002', name: 'Sanitation', color: HUD.green },
  { id: '1003', name: 'Production', color: HUD.amber },
  { id: '1004', name: 'Quality', color: HUD.purple },
  { id: '1005', name: 'Safety', color: HUD.red },
];

function TaskFeedPostModal({ visible, alert, roomCode, onClose, onOpenAvatar }: {
  visible: boolean; alert: ActiveAlert | null; roomCode: string; onClose: () => void; onOpenAvatar: () => void;
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
    return `ACTIVE FAULT — ${info.title}\n\nEquipment: Avatar A1200 / A2200 VFFS\nAffected System: ${system.name}\nRoom: ${roomCode}\nDetected: ${postTime}${sensorLine}\n\nThis post was auto-generated by TulKenz OPS sensor monitoring. All listed departments are required to acknowledge.\n\nSee Equipment Intelligence for troubleshooting steps, affected parts, and repair procedures.`;
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
        <View style={tfS.header}>
          <View style={{ flex: 1 }}>
            <Text style={tfS.eyebrow}>TASK FEED  ·  TULKENZ OPS</Text>
            <Text style={tfS.title}>ACTIVE FAULT POST</Text>
          </View>
          <Pressable onPress={onClose} style={tfS.closeBtn}><X size={20} color={HUD.textSec} /></Pressable>
        </View>
        {submitted ? (
          <View style={tfS.successScreen}>
            <CheckCircle size={48} color={HUD.green} />
            <Text style={tfS.successTitle}>POST SUBMITTED</Text>
            <Text style={tfS.successSub}>Sent to all 5 departments · Audit trail recorded</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
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
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>EQUIPMENT  <Text style={{ color: HUD.cyan, letterSpacing: 0, fontWeight: '700' }}>← TAP TO VIEW MANUAL</Text></Text>
              <Pressable
                style={({ pressed }) => [tfS.fieldRow, { borderColor: HUD.cyan + '60', backgroundColor: pressed ? HUD.cyanDim : HUD.bgCardAlt }]}
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
            </View>
            <View style={tfS.fBlock}>
              <Text style={tfS.label}>AI-GENERATED POST BODY</Text>
              <View style={[tfS.descBox, { borderColor: HUD.borderBright }]}>
                <Text style={tfS.descTxt}>{aiDescription}</Text>
              </View>
            </View>
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
  lockedBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  lockedTxt: { fontSize: 8, fontWeight: '800', color: HUD.textSec, letterSpacing: 1 },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  deptChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  deptTxt: { fontSize: 11, fontWeight: '800' },
  descBox: { backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, padding: 12 },
  descTxt: { fontSize: 11, color: HUD.textSec, lineHeight: 17 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, borderWidth: 2, marginTop: 4, marginBottom: 20 },
  submitTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  successTitle: { fontSize: 24, fontWeight: '900', color: HUD.green, letterSpacing: 2 },
  successSub: { fontSize: 13, color: HUD.textSec, textAlign: 'center', letterSpacing: 0.5 },
});

// ══════════════════════════ A1200 INTERNAL SCHEMATIC (inside Avatar modal) ══
function A1200Schematic({ activeSystem, onSelectSystem }: { activeSystem: string | null; onSelectSystem: (id: string) => void }) {
  const schW = W - 48;
  const scanX = useScan(schW, 4000);
  const colW = Math.floor((schW - 16) / 5);
  const nodes = [
    { id: 'film_unwind', label: 'FILM\nUNWIND', col: 0, row: 0, color: HUD.green, sys: true },
    { id: 'belt_drive', label: 'BELT\nDRIVE', col: 1, row: 0, color: HUD.cyan, sys: true },
    { id: 'vertical_seal', label: 'VERT\nSEAL', col: 2, row: 0, color: HUD.amber, sys: true },
    { id: 'endseal_jaw', label: 'ENDSEAL\nJAW', col: 3, row: 0, color: HUD.red, sys: true },
    { id: 'filter_regulator', label: 'AIR\nFILTER', col: 0, row: 1, color: HUD.purple, sys: true },
    { id: 'plc', label: 'PLC\nHMI', col: 1, row: 1, color: HUD.textSec, sys: false },
    { id: 'bag_out', label: 'BAGS\nOUT', col: 3, row: 1, color: HUD.green, sys: false },
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
            <Text style={avS.eyebrow}>EQUIPMENT INTELLIGENCE · TULKENZ OPS</Text>
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
          <A1200Schematic activeSystem={selected} onSelectSystem={handleSelect} />
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

// ══════════════════════════ SENSOR SCORECARD ═════════════════════════════════
const BASELINES: Record<string, { min: number; max: number; label: string }> = {
  'Auger Speed':        { min: 110, max: 135, label: 'TARGET 120 RPM' },
  'Auger Motor Temp':   { min: 100, max: 160, label: 'MAX 160°F' },
  'Auger Vibration':    { min: 0,   max: 4,   label: 'MAX 4 mm/s' },
  'Hopper Level':       { min: 20,  max: 90,  label: '20–90%' },
  'Bags Per Minute':    { min: 50,  max: 65,  label: 'TARGET 60' },
  'Vertical Seal Temp': { min: 270, max: 310, label: '270–310°F' },
  'Front Endseal Temp': { min: 270, max: 310, label: '270–310°F' },
  'Rear Endseal Temp':  { min: 270, max: 310, label: '270–310°F' },
  'Air Pressure':       { min: 65,  max: 80,  label: '65–80 PSI' },
  'Film Tension':       { min: 12,  max: 22,  label: '12–22 N' },
  'Encoder Speed':      { min: 9,   max: 14,  label: '9–14 m/min' },
  'Metal Detector':     { min: 0,   max: 0.5, label: 'REJECTS < 1' },
  'Bag Weight':         { min: 4.8, max: 5.2, label: '5.0 ± 0.2 lb' },
};

function SensorCard({ sensor, beatSignal }: { sensor: any; beatSignal: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [liveVal, setLiveVal] = useState<number>(sensor.value);
  const valRef = useRef<number>(sensor.value);
  useEffect(() => { valRef.current = sensor.value; setLiveVal(sensor.value); }, [sensor.value]);
  const col = SC[sensor.status] || HUD.textDim;
  const isCrit = sensor.status === 'critical';
  const baseline = BASELINES[sensor.sensor_name];
  useEffect(() => {
    if (!beatSignal) return;
    const base = valRef.current;
    if (base != null) setLiveVal(base + (Math.random() - 0.5) * base * 0.016);
    if (isCrit) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]).start();
    }
  }, [beatSignal]);
  const baselinePct = useMemo(() => {
    if (!baseline || liveVal == null) return null;
    const { min, max } = baseline;
    if (max === min) return null;
    return Math.min(Math.max((liveVal - min) / (max - min), 0), 1);
  }, [liveVal, baseline]);
  return (
    <Animated.View style={[scS.card, { borderColor: isCrit ? col : col + '35', shadowColor: col, transform: [{ scale: scaleAnim }] }]}>
      <View style={[scS.statusBar, { backgroundColor: col }]} />
      <Text style={scS.name} numberOfLines={2}>{sensor.sensor_name}</Text>
      <Text style={[scS.value, { color: col }]}>{liveVal != null ? liveVal.toFixed(1) : '—'}</Text>
      <Text style={[scS.unit, { color: col + 'aa' }]}>{sensor.unit || ''}</Text>
      {baselinePct != null && (
        <View style={scS.baseWrap}>
          <View style={scS.baseTrack}>
            <View style={[scS.baseFill, { width: `${baselinePct * 100}%`, backgroundColor: col }]} />
          </View>
          <Text style={scS.baseLbl}>{baseline!.label}</Text>
        </View>
      )}
    </Animated.View>
  );
}
const CARD_COLS = 4;
const CARD_W = Math.floor((W - 32 - (CARD_COLS - 1) * 6) / CARD_COLS);
const scS = StyleSheet.create({
  card: { width: CARD_W, borderRadius: 10, borderWidth: 1, backgroundColor: HUD.bgCard, padding: 8, marginBottom: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4, overflow: 'hidden' },
  statusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  name: { fontSize: 7, fontWeight: '700', color: HUD.textSec, letterSpacing: 0.3, marginBottom: 2, paddingLeft: 6 },
  value: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5, paddingLeft: 6 },
  unit: { fontSize: 8, fontWeight: '600', letterSpacing: 0.3, paddingLeft: 6, marginBottom: 4 },
  baseWrap: { paddingLeft: 6, paddingRight: 3 },
  baseTrack: { height: 2, backgroundColor: HUD.border, borderRadius: 1, overflow: 'hidden', marginBottom: 2 },
  baseFill: { height: '100%', borderRadius: 1 },
  baseLbl: { fontSize: 6, color: HUD.textDim, fontWeight: '600', letterSpacing: 0.2 },
});

// ══════════════════════════ EQUIPMENT INTELLIGENCE ═══════════════════════════
const TODAY_D = new Date();
const addDays = (d: number) => { const dt = new Date(TODAY_D); dt.setDate(dt.getDate() + d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

type IntelSeverity = 'critical' | 'warning' | 'info';
interface IntelIncident { date: string; event: string; result: string; }
interface IntelItem { id: string; category: 'predictive' | 'operator' | 'product' | 'history'; severity: IntelSeverity; title: string; body: string; dueLabel?: string; dueDays?: number; source: string; incidents?: IntelIncident[]; }

const INTEL_DATA: IntelItem[] = [
  { id: 'bearing-1', category: 'predictive', severity: 'warning', title: 'Main Drive Bearing — End of Life', body: 'Historical avg life: 320 hrs. Current runtime: 304 hrs. Projected failure window: 2 weeks. Order P/N 5027-A before next PM.', dueLabel: addDays(14), dueDays: 14, source: 'PM History · 8 data points' },
  { id: 'heatband-1', category: 'predictive', severity: 'warning', title: 'Vertical Seal Heat Bands — Pre/Post Run Change', body: 'Product: Protein Powder Blend (10 oz). Historical protocol: change all 4 heat bands before AND after this SKU. 4 bands on-hand (P/N 5044-HB). Schedule 45 min per changeover.', dueLabel: 'Next run start', dueDays: 0, source: 'Product History · 12 runs' },
  { id: 'filter-1', category: 'predictive', severity: 'warning', title: 'Air Filter Element — Change Due', body: 'Last changed 87 days ago. Recommended interval: 90 days. Current air pressure trending 2 PSI low — may be related. P/N 5033-F in stock (qty 3).', dueLabel: addDays(3), dueDays: 3, source: 'PM Schedule · Quarterly' },
  { id: 'film-tension', category: 'predictive', severity: 'info', title: 'Film Dancer Roller — Inspect at Next PM', body: 'Avg replacement interval: 180 days. Last replaced: 147 days ago. Inspect at next scheduled PM. P/N 5031-C in stock (qty 2).', dueLabel: addDays(33), dueDays: 33, source: 'Maintenance Log' },
  { id: 'op-1', category: 'operator', severity: 'warning', title: 'Operator Pattern — Operator A: +52% Downtime', body: 'When Operator A operates PA1, avg downtime is 52% above line baseline (28 min/shift vs 18 min avg). Common cause: manual film tension overrides. Recommend retraining on auto-tension calibration procedure.', source: 'Labor Analytics · 90-day window' },
  { id: 'op-2', category: 'operator', severity: 'info', title: 'Operator Pattern — Operator B: High Efficiency', body: 'Operator B consistently achieves 96–100% OEE on this line. Runs avg 3.2 PKG/min above target. Recommended as peer trainer for film threading and tension calibration.', source: 'Labor Analytics · 90-day window' },
  { id: 'prod-1', category: 'product', severity: 'warning', title: '10 oz Powder SKU — Seal Temp Sensitivity', body: 'This SKU requires vertical seal temp 285–292°F (tighter than standard 270–310). Temps above 295°F cause seal blowouts at 8–12 min into run. Alert maintenance if temp exceeds 293°F.', source: 'Quality History · 7 runs' },
  { id: 'prod-2', category: 'product', severity: 'warning', title: 'Auger Over-Speed — Damage & Shutdown Pattern', body: 'Historically, when auger runs above 127 RPM for more than 20 continuous minutes, damage to the auger flight or drive coupling occurs within 48 hours. Current reading: 124.9 RPM. Monitor closely.', source: 'Work Order History · 4 incidents',
    incidents: [
      { date: 'Jan 14, 2025', event: 'Auger ran 131 RPM for ~35 min during high-volume run', result: 'Drive coupling sheared — 6.5 hr shutdown, WO-4108' },
      { date: 'Sep 3, 2024', event: 'Auger at 129 RPM, operator overrode auto-limit', result: 'Auger flight cracked — 4 hr shutdown, WO-3847' },
      { date: 'May 22, 2024', event: 'Speed crept to 128 RPM after encoder recalibration', result: 'Bearing failure 31 hrs later — 9 hr shutdown, WO-3601' },
      { date: 'Nov 8, 2023', event: 'New operator set auger to 133 RPM to chase throughput', result: 'Motor overtemp + coupling damage — 11 hr shutdown, WO-3312' },
    ],
  },
  { id: 'hist-1', category: 'history', severity: 'info', title: 'Last Unplanned Downtime — Film Jam (34 min)', body: 'Root cause: spliced roll not trimmed flush at splice point. Corrective action: added splice inspection step to job setup SOP. Repeat incidents since corrective action: 0.', dueLabel: '11 days ago', source: 'Work Order WO-4421' },
  { id: 'hist-2', category: 'history', severity: 'info', title: 'Last PM Completed — Full Service', body: 'Belt tension adjusted, drive chain lubricated, front endseal gasket replaced, all sensors calibrated. Completed on schedule. Runtime since PM: 304 hrs.', dueLabel: '38 days ago', source: 'PM Record PM-0218' },
];

const INTEL_COLORS: Record<IntelSeverity, string> = { critical: HUD.red, warning: HUD.amber, info: HUD.cyan };
const INTEL_CAT_LABELS: Record<string, string> = { predictive: 'PREDICTIVE', operator: 'OPERATOR INTEL', product: 'PRODUCT HISTORY', history: 'MAINT LOG' };
const INTEL_CAT_COLORS: Record<string, string> = { predictive: HUD.purple, operator: HUD.amber, product: HUD.green, history: HUD.textSec };

const EquipmentIntelligence = React.memo(function EquipmentIntelligence({ expanded, setExpanded }: { expanded: string | null; setExpanded: (id: string | null) => void }) {
  const [filter, setFilter] = useState<string>('all');
  const categories = ['all', 'predictive', 'operator', 'product', 'history'];
  const items = filter === 'all' ? INTEL_DATA : INTEL_DATA.filter(i => i.category === filter);
  const warnCount = INTEL_DATA.filter(i => i.severity === 'warning').length;
  return (
    <View style={eiS.wrap}>
      <View style={eiS.head}>
        <Cpu size={13} color={HUD.purple} />
        <Text style={eiS.title}>EQUIPMENT INTELLIGENCE</Text>
        <View style={[eiS.badge, { backgroundColor: HUD.amber + '20', borderColor: HUD.amber + '50' }]}>
          <Text style={[eiS.badgeTxt, { color: HUD.amber }]}>{warnCount} ALERTS</Text>
        </View>
      </View>
      <View style={eiS.machineRow}>
        <View style={eiS.machinePill}><Text style={eiS.machineLabel}>AVATAR A1200 VFFS</Text></View>
        <Text style={eiS.machineDetail}>PA1 · S/N A1200-#### · 304 hrs since PM</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {categories.map(cat => {
          const active = filter === cat;
          const col = cat === 'all' ? HUD.purple : INTEL_CAT_COLORS[cat];
          return (
            <TouchableOpacity key={cat} onPress={() => setFilter(cat)} activeOpacity={0.7} style={[eiS.filterTab, { borderColor: active ? col : HUD.border, backgroundColor: active ? col + '20' : 'transparent' }]}>
              <Text style={[eiS.filterTxt, { color: active ? col : HUD.textDim }]}>{cat === 'all' ? 'ALL' : INTEL_CAT_LABELS[cat]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {items.map(item => {
        const sevCol = INTEL_COLORS[item.severity];
        const catCol = INTEL_CAT_COLORS[item.category];
        const isOpen = expanded === item.id;
        const urgent = item.dueDays !== undefined && item.dueDays <= 7;
        return (
          <View key={item.id} style={[eiS.item, { borderLeftColor: sevCol }]}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(expanded === item.id ? null : item.id); }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <View style={{ flex: 1 }}>
                <View style={eiS.itemHead}>
                  <View style={[eiS.catPill, { backgroundColor: catCol + '15', borderColor: catCol + '40' }]}>
                    <Text style={[eiS.catTxt, { color: catCol }]}>{INTEL_CAT_LABELS[item.category]}</Text>
                  </View>
                  {item.dueLabel && (
                    <View style={[eiS.duePill, { backgroundColor: urgent ? HUD.redDim : HUD.bgCardAlt, borderColor: urgent ? HUD.red + '50' : HUD.border }]}>
                      <Text style={[eiS.dueTxt, { color: urgent ? HUD.red : HUD.textSec }]}>{item.dueLabel}</Text>
                    </View>
                  )}
                </View>
                <Text style={[eiS.itemTitle, { color: sevCol }]}>{item.title}</Text>
              </View>
              <ChevronDown size={14} color={isOpen ? HUD.cyan : HUD.textDim} />
            </TouchableOpacity>
            {isOpen && (
              <View style={{ marginTop: 8 }}>
                <Text style={eiS.itemBody}>{item.body}</Text>
                {item.incidents && item.incidents.length > 0 && (
                  <View style={eiS.incidentWrap}>
                    <Text style={eiS.incidentHeader}>INCIDENT HISTORY</Text>
                    {item.incidents.map((inc, idx) => (
                      <View key={idx} style={eiS.incidentRow}>
                        <View style={eiS.incidentLeft}>
                          <Text style={eiS.incidentDate}>{inc.date}</Text>
                          <Text style={eiS.incidentEvent}>{inc.event}</Text>
                        </View>
                        <View style={eiS.incidentResult}>
                          <Text style={eiS.incidentResultTxt}>{inc.result}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <View style={eiS.sourceRow}>
                  <Layers size={9} color={HUD.textDim} />
                  <Text style={eiS.sourceTxt}>{item.source}</Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});
const eiS = StyleSheet.create({
  wrap: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: '800', color: HUD.purple, letterSpacing: 1.5, flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeTxt: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  machineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  machinePill: { backgroundColor: HUD.cyan + '15', borderRadius: 6, borderWidth: 1, borderColor: HUD.cyan + '40', paddingHorizontal: 8, paddingVertical: 3 },
  machineLabel: { fontSize: 9, fontWeight: '900', color: HUD.cyan, letterSpacing: 1 },
  machineDetail: { fontSize: 9, color: HUD.textSec, flex: 1 },
  filterTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  filterTxt: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  item: { backgroundColor: HUD.bg, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' },
  catPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  catTxt: { fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
  duePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  dueTxt: { fontSize: 7, fontWeight: '700' },
  itemTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  itemBody: { fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 6 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sourceTxt: { fontSize: 9, color: HUD.textDim, fontWeight: '600', fontStyle: 'italic' as any },
  incidentWrap: { marginTop: 10, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.red + '30', backgroundColor: HUD.red + '06', overflow: 'hidden' },
  incidentHeader: { fontSize: 8, fontWeight: '900', color: HUD.red, letterSpacing: 1.5, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: HUD.red + '25', backgroundColor: HUD.red + '10' },
  incidentRow: { flexDirection: 'row', gap: 8, padding: 8, borderBottomWidth: 1, borderBottomColor: HUD.red + '15' },
  incidentLeft: { flex: 1.4 },
  incidentDate: { fontSize: 8, fontWeight: '800', color: HUD.amber, letterSpacing: 0.3, marginBottom: 2 },
  incidentEvent: { fontSize: 9, color: HUD.textSec, lineHeight: 13 },
  incidentResult: { flex: 2 },
  incidentResultTxt: { fontSize: 9, color: HUD.red + 'cc', lineHeight: 13, fontWeight: '600' },
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
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null);
  const handleSetExpandedIntel = useCallback((id: string | null) => setExpandedIntel(id), []);

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
  const critSensors = sensorReadings.filter(s => s.status === 'critical' && s.value != null);

  // Determine alert node id for schematic highlighting
  const alertNodeId = useMemo(() => {
    if (!activeAlert) return null;
    const eventToNode: Record<string, string> = {
      seal_temp_drift: 'avatar_a1200',
      air_pressure_drop: 'avatar_a1200',
      auger_slowdown: 'screwfeed',
      film_jam: 'avatar_a1200',
      vibration_spike: 'screwfeed',
      metal_detect_rejects: 'metaldet',
      hopper_low: 'hopper',
    };
    return eventToNode[activeAlert.eventType] || null;
  }, [activeAlert]);

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
      const relevantSensor = sensorReadings.find(s =>
        s.value != null && (
          (eventName === 'seal_temp_drift' && s.sensor_type === 'temperature') ||
          (eventName === 'air_pressure_drop' && s.sensor_type === 'pressure') ||
          (['auger_slowdown', 'film_jam', 'vibration_spike'].includes(eventName) && s.sensor_type === 'speed') ||
          s.status === 'warning' || s.status === 'critical'
        )
      );
      setActiveAlert({ eventType: eventName, sensorName: relevantSensor?.sensor_name, value: relevantSensor?.value, unit: relevantSensor?.unit, target: relevantSensor?.target_value });
      const info = EVENT_LABEL[eventName];
      if (info) { setToastEventTitle(info.title); setToastVisible(true); }
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

  const handleSchematicNodeSelect = useCallback((id: string) => {
    if (id === 'avatar_a1200') {
      setAvatarPreSystem(undefined);
      setShowAvatarModal(true);
    }
  }, []);

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
        <TouchableOpacity activeOpacity={0.6} style={mS.tickBtn} onPress={handleTick}><Zap size={16} color={HUD.purple} /></TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={andonColor} />}
      >

        {/* 1. HEARTBEAT */}
        <HeartbeatMonitor bpm={bpm} color={bpmColor} onBeat={() => setBeatSignal(b => b + 1)} />

        {/* 2. PRODUCTION FLOW SCHEMATIC — PA1 or PR1/PR2 */}
        <ProductionFlowSchematic
          roomCode={roomCode}
          alertNodeId={alertNodeId}
          onSelectSystem={handleSchematicNodeSelect}
          sensors={sensorReadings.filter(s => s.value != null)}
        />

        {/* 3. SENSOR SCORECARD GRID */}
        <View style={mS.card}>
          <View style={mS.cardHead}>
            <Activity size={12} color={HUD.cyan} />
            <Text style={mS.cardTitle}>SENSOR MATRIX</Text>
            <Text style={mS.cardCount}>{sensorReadings.filter(s => s.value != null).length} ACTIVE</Text>
            {critSensors.length > 0 && (
              <View style={[mS.pill, { backgroundColor: HUD.redDim, borderColor: HUD.red + '50' }]}>
                <AlertTriangle size={9} color={HUD.red} />
                <Text style={[mS.pillTxt, { color: HUD.red }]}>{critSensors.length} CRIT</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {sensorReadings.filter(s => s.value != null).map(s => (
              <SensorCard key={s.sensor_id || s.id} sensor={s} beatSignal={beatSignal} />
            ))}
          </View>
        </View>

        {/* 4. EQUIPMENT INTELLIGENCE */}
        <EquipmentIntelligence expanded={expandedIntel} setExpanded={handleSetExpandedIntel} />

        {/* 5. SIM CONTROLS */}
        <View style={[mS.card, { borderColor: HUD.purple + '40' }]}>
          <View style={mS.cardHead}>
            <Zap size={12} color={HUD.purple} />
            <Text style={[mS.cardTitle, { color: HUD.purple }]}>SIM CONTROLS</Text>
            <Text style={[mS.cardCount, { color: HUD.purple + '80' }]}>DEMO MODE</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={[mS.avatarBtn, { backgroundColor: HUD.bgCardAlt }]} onPress={() => { setAvatarPreSystem(undefined); setShowAvatarModal(true); }}>
            <Cpu size={15} color={HUD.cyan} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: HUD.cyan }}>AVATAR A1200 EQUIPMENT INTELLIGENCE</Text>
              <Text style={{ fontSize: 10, color: HUD.textSec, marginTop: 1 }}>Schematic · Parts · Troubleshooting · Repair</Text>
            </View>
            <ChevronRight size={15} color={HUD.cyan} />
          </TouchableOpacity>
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
              <TouchableOpacity key={x.e} activeOpacity={0.6}
                style={[mS.simBtn, { borderColor: x.c + '50', backgroundColor: x.c + '12' }]}
                onPressIn={() => handleTriggerEvent(x.e)}
              >
                <Text style={[mS.simBtnTxt, { color: x.c }]}>{x.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity activeOpacity={0.6} style={[mS.tickFull, { backgroundColor: HUD.purple + '15', borderColor: HUD.purple + '50' }]} onPressIn={handleTick}>
            <Zap size={15} color={HUD.purple} />
            <Text style={[mS.tickFullTxt, { color: HUD.purple }]}>ADVANCE TICK{tickCount > 0 ? ` · ${tickCount}` : ''}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Toast */}
      <AutoPostToast visible={toastVisible} eventTitle={toastEventTitle} onDismiss={() => setToastVisible(false)} />

      {/* Floating incident alert */}
      {activeAlert && (
        <IncidentAlertCard alert={activeAlert} onCreatePost={() => setShowTFModal(true)} onDismiss={() => setActiveAlert(null)} />
      )}

      {/* Task Feed Post Modal */}
      <TaskFeedPostModal visible={showTFModal} alert={activeAlert} roomCode={roomCode} onClose={() => setShowTFModal(false)} onOpenAvatar={handleOpenAvatarFromWO} />

      {/* Equipment Avatar Modal */}
      <EquipmentAvatarModal visible={showAvatarModal} preSelectSystem={avatarPreSystem} highlightEvent={activeAlert?.eventType} onClose={() => setShowAvatarModal(false)} />
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
  card: { backgroundColor: HUD.bgCard, borderRadius: 14, borderWidth: 1, borderColor: HUD.borderBright, padding: 14, marginBottom: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 2, flex: 1 },
  cardCount: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 1 },
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyan + '50' },
  simBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  simBtnTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tickFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  tickFullTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
});
