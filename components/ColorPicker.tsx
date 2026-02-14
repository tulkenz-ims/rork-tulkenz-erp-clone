import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  h = h / 360;
  s = s / 100;
  v = v / 100;
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
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

const isValidHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// Number of strips for gradient simulation
const WHITE_COLS = 20;
const BLACK_ROWS = 15;

// ── 2D Palette (saturation X, brightness Y) ────────────────────
function PaletteBox({
  hue,
  saturation,
  brightness,
  onChangeSV,
}: {
  hue: number;
  saturation: number;
  brightness: number;
  onChangeSV: (s: number, v: number) => void;
}) {
  const boxSize = useRef({ w: 0, h: 0 });

  const handleTouch = useCallback((x: number, y: number) => {
    if (boxSize.current.w > 0) {
      const s = clamp((x / boxSize.current.w) * 100, 0, 100);
      const v = clamp(100 - (y / boxSize.current.h) * 100, 0, 100);
      onChangeSV(Math.round(s), Math.round(v));
    }
  }, [onChangeSV]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    boxSize.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
  };

  const pureColor = hsvToHex(hue, 100, 100);
  const cursorX = (saturation / 100) * (boxSize.current.w || 200);
  const cursorY = ((100 - brightness) / 100) * (boxSize.current.h || 150);

  // Pre-build white column overlays (saturation gradient: white→transparent, left→right)
  const whiteCols = useMemo(() => {
    return Array.from({ length: WHITE_COLS }, (_, i) => {
      const opacity = 1 - (i / (WHITE_COLS - 1));
      return (
        <View
          key={`w${i}`}
          style={{
            flex: 1,
            backgroundColor: `rgba(255,255,255,${opacity})`,
          }}
        />
      );
    });
  }, []);

  // Pre-build black row overlays (brightness gradient: transparent→black, top→bottom)
  const blackRows = useMemo(() => {
    return Array.from({ length: BLACK_ROWS }, (_, i) => {
      const opacity = i / (BLACK_ROWS - 1);
      return (
        <View
          key={`b${i}`}
          style={{
            flex: 1,
            backgroundColor: `rgba(0,0,0,${opacity})`,
          }}
        />
      );
    });
  }, []);

  return (
    <View
      style={[styles.paletteBox, { backgroundColor: pureColor }]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {/* White overlay: columns left→right with decreasing opacity */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
        {whiteCols}
      </View>
      {/* Black overlay: rows top→bottom with increasing opacity */}
      <View style={StyleSheet.absoluteFill}>
        {blackRows}
      </View>
      {/* Cursor */}
      <View
        style={[
          styles.cursor,
          {
            left: clamp(cursorX - 9, -4, (boxSize.current.w || 200) - 14),
            top: clamp(cursorY - 9, -4, (boxSize.current.h || 150) - 14),
          },
        ]}
      />
    </View>
  );
}

// ── Hue Strip (vertical) ───────────────────────────────────────
function HueStrip({
  hue,
  onChangeHue,
}: {
  hue: number;
  onChangeHue: (h: number) => void;
}) {
  const stripHeight = useRef(0);

  const handleTouch = useCallback((y: number) => {
    if (stripHeight.current > 0) {
      const h = clamp((y / stripHeight.current) * 360, 0, 360);
      onChangeHue(Math.round(h));
    }
  }, [onChangeHue]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationY),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationY),
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    stripHeight.current = e.nativeEvent.layout.height;
  };

  const position = stripHeight.current > 0 ? (hue / 360) * stripHeight.current : 0;

  // 13 hue stops for smooth rainbow
  const hueColors = useMemo(() => [
    '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
    '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
    '#0000FF', '#8000FF', '#FF00FF', '#FF0080', '#FF0000',
  ], []);

  return (
    <View
      style={styles.hueStrip}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {hueColors.map((color, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: color }} />
      ))}
      <View
        style={[
          styles.hueIndicator,
          { top: clamp(position - 3, 0, (stripHeight.current || 150) - 6) },
        ]}
      />
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function ColorPicker({ label, value, onChange, textColor, borderColor }: ColorPickerProps) {
  const hsv = hexToHsv(value);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [bri, setBri] = useState(hsv.v);
  const [hexInput, setHexInput] = useState(value);

  const updateFromHsv = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleSVChange = useCallback((s: number, v: number) => {
    setSat(s);
    setBri(v);
    updateFromHsv(hue, s, v);
  }, [hue, updateFromHsv]);

  const handleHueChange = useCallback((h: number) => {
    setHue(h);
    updateFromHsv(h, sat, bri);
  }, [sat, bri, updateFromHsv]);

  const handleHexInput = useCallback((text: string) => {
    setHexInput(text);
    if (isValidHex(text)) {
      const newHsv = hexToHsv(text);
      setHue(newHsv.h);
      setSat(newHsv.s);
      setBri(newHsv.v);
      onChange(text);
    }
  }, [onChange]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>

      <View style={styles.pickerRow}>
        {/* 2D sat/brightness palette */}
        <PaletteBox
          hue={hue}
          saturation={sat}
          brightness={bri}
          onChangeSV={handleSVChange}
        />
        {/* Vertical hue strip */}
        <HueStrip hue={hue} onChangeHue={handleHueChange} />
      </View>

      {/* Hex input + preview */}
      <View style={styles.hexRow}>
        <View style={[styles.preview, { backgroundColor: value }]} />
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
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  paletteBox: {
    flex: 1,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  cursor: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  hueStrip: {
    width: 24,
    height: 150,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  hueIndicator: {
    position: 'absolute',
    left: -1,
    right: -1,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preview: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  hexInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
});
