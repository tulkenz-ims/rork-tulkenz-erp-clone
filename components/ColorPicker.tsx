import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  textColor: string;
  borderColor: string;
}

// ── Color math ─────────────────────────────────────────────────
function hsvToHex(h: number, s: number, v: number): string {
  h = h / 360; s = s / 100; v = v / 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const hex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(max === 0 ? 0 : (d / max) * 100),
    v: Math.round(max * 100),
  };
}

const isValidHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const WHITE_COLS = 16;
const BLACK_ROWS = 12;

// ── Main Component ─────────────────────────────────────────────
export default function ColorPicker({ label, value, onChange, textColor, borderColor }: ColorPickerProps) {
  const initial = hexToHsv(value);
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [bri, setBri] = useState(initial.v);
  const [hexInput, setHexInput] = useState(value);

  // ── Refs for latest state (avoids PanResponder stale closures) ──
  const hueRef = useRef(hue);
  const satRef = useRef(sat);
  const briRef = useRef(bri);
  const onChangeRef = useRef(onChange);
  const paletteSize = useRef({ w: 0, h: 0 });
  const hueStripH = useRef(0);

  useEffect(() => { hueRef.current = hue; }, [hue]);
  useEffect(() => { satRef.current = sat; }, [sat]);
  useEffect(() => { briRef.current = bri; }, [bri]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // ── Shared update function (always reads latest refs) ──
  const emitColor = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChangeRef.current(hex);
  }, []);

  // ── Palette PanResponder (saturation=X, brightness=Y) ──
  const palettePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const w = paletteSize.current.w || 1;
        const h = paletteSize.current.h || 1;
        const s = clamp(Math.round((locationX / w) * 100), 0, 100);
        const v = clamp(Math.round(100 - (locationY / h) * 100), 0, 100);
        satRef.current = s;
        briRef.current = v;
        setSat(s);
        setBri(v);
        const hex = hsvToHex(hueRef.current, s, v);
        setHexInput(hex);
        onChangeRef.current(hex);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const w = paletteSize.current.w || 1;
        const h = paletteSize.current.h || 1;
        const s = clamp(Math.round((locationX / w) * 100), 0, 100);
        const v = clamp(Math.round(100 - (locationY / h) * 100), 0, 100);
        satRef.current = s;
        briRef.current = v;
        setSat(s);
        setBri(v);
        const hex = hsvToHex(hueRef.current, s, v);
        setHexInput(hex);
        onChangeRef.current(hex);
      },
    })
  ).current;

  // ── Hue PanResponder ──
  const huePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const stripH = hueStripH.current || 1;
        const h = clamp(Math.round((e.nativeEvent.locationY / stripH) * 360), 0, 360);
        hueRef.current = h;
        setHue(h);
        const hex = hsvToHex(h, satRef.current, briRef.current);
        setHexInput(hex);
        onChangeRef.current(hex);
      },
      onPanResponderMove: (e) => {
        const stripH = hueStripH.current || 1;
        const h = clamp(Math.round((e.nativeEvent.locationY / stripH) * 360), 0, 360);
        hueRef.current = h;
        setHue(h);
        const hex = hsvToHex(h, satRef.current, briRef.current);
        setHexInput(hex);
        onChangeRef.current(hex);
      },
    })
  ).current;

  // ── Hex input handler ──
  const handleHexInput = useCallback((text: string) => {
    setHexInput(text);
    if (isValidHex(text)) {
      const hsv = hexToHsv(text);
      setHue(hsv.h); hueRef.current = hsv.h;
      setSat(hsv.s); satRef.current = hsv.s;
      setBri(hsv.v); briRef.current = hsv.v;
      onChangeRef.current(text);
    }
  }, []);

  // ── Sync when external value changes ──
  useEffect(() => {
    if (isValidHex(value)) {
      const hsv = hexToHsv(value);
      setHue(hsv.h); hueRef.current = hsv.h;
      setSat(hsv.s); satRef.current = hsv.s;
      setBri(hsv.v); briRef.current = hsv.v;
      setHexInput(value);
    }
  }, [value]);

  // ── Gradient layers (memoized) ──
  const whiteCols = useMemo(() =>
    Array.from({ length: WHITE_COLS }, (_, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: `rgba(255,255,255,${1 - i / (WHITE_COLS - 1)})` }} />
    )), []);

  const blackRows = useMemo(() =>
    Array.from({ length: BLACK_ROWS }, (_, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${i / (BLACK_ROWS - 1)})` }} />
    )), []);

  const hueColors = useMemo(() => [
    '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
    '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
    '#0000FF', '#8000FF', '#FF00FF', '#FF0080', '#FF0000',
  ], []);

  const pureColor = hsvToHex(hue, 100, 100);
  const cursorX = (sat / 100) * (paletteSize.current.w || 200);
  const cursorY = ((100 - bri) / 100) * (paletteSize.current.h || 150);
  const huePos = hueStripH.current > 0 ? (hue / 360) * hueStripH.current : 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>

      <View style={styles.pickerRow}>
        {/* 2D saturation/brightness palette */}
        <View
          style={[styles.paletteBox, { backgroundColor: pureColor }]}
          onLayout={(e) => {
            paletteSize.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
          }}
          {...palettePan.panHandlers}
        >
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
            {whiteCols}
          </View>
          <View style={StyleSheet.absoluteFill}>
            {blackRows}
          </View>
          <View
            style={[
              styles.cursor,
              {
                left: clamp(cursorX - 9, -4, (paletteSize.current.w || 200) - 14),
                top: clamp(cursorY - 9, -4, (paletteSize.current.h || 150) - 14),
                borderColor: bri > 50 ? '#000000' : '#FFFFFF',
              },
            ]}
          />
        </View>

        {/* Vertical hue strip */}
        <View
          style={styles.hueStrip}
          onLayout={(e) => { hueStripH.current = e.nativeEvent.layout.height; }}
          {...huePan.panHandlers}
        >
          {hueColors.map((color, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
          <View
            style={[
              styles.hueIndicator,
              { top: clamp(huePos - 3, 0, (hueStripH.current || 150) - 6) },
            ]}
          />
        </View>
      </View>

      {/* Hex input + preview */}
      <View style={styles.hexRow}>
        <View style={[styles.preview, { backgroundColor: hsvToHex(hue, sat, bri) }]} />
        <TextInput
          style={[styles.hexInput, { color: textColor, borderColor }]}
          value={hexInput}
          onChangeText={handleHexInput}
          placeholder="#000000"
          placeholderTextColor={borderColor}
          maxLength={7}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  label: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },
  pickerRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  paletteBox: {
    flex: 1, height: 150,
    borderRadius: 8, overflow: 'hidden', position: 'relative',
  },
  cursor: {
    position: 'absolute', width: 18, height: 18,
    borderRadius: 9, borderWidth: 3,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5, shadowRadius: 3,
  },
  hueStrip: {
    width: 24, height: 150,
    borderRadius: 6, overflow: 'hidden', position: 'relative',
  },
  hueIndicator: {
    position: 'absolute', left: -1, right: -1,
    height: 6, borderRadius: 3,
    borderWidth: 2, borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 2,
  },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preview: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(128,128,128,0.3)',
  },
  hexInput: {
    flex: 1, fontSize: 14, fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderRadius: 8,
  },
});
