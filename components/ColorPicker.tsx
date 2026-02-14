import React, { useState, useCallback, useRef } from 'react';
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
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  let r = parseInt(clean.substring(0, 2), 16) / 255;
  let g = parseInt(clean.substring(2, 4), 16) / 255;
  let b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const isValidHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);

// ── Slider Bar ─────────────────────────────────────────────────
function SliderBar({
  gradient,
  value,
  max,
  onChange,
  thumbColor,
}: {
  gradient: string[];
  value: number;
  max: number;
  onChange: (val: number) => void;
  thumbColor: string;
}) {
  const barWidth = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        if (barWidth.current > 0) {
          onChange(Math.max(0, Math.min(max, (x / barWidth.current) * max)));
        }
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        if (barWidth.current > 0) {
          onChange(Math.max(0, Math.min(max, (x / barWidth.current) * max)));
        }
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  };

  const position = barWidth.current > 0 ? (value / max) * barWidth.current : (value / max) * 280;

  return (
    <View
      style={styles.sliderContainer}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrack}>
        {/* Gradient segments */}
        {gradient.map((color, i) => (
          <View
            key={i}
            style={[
              styles.gradientSegment,
              {
                backgroundColor: color,
                borderTopLeftRadius: i === 0 ? 6 : 0,
                borderBottomLeftRadius: i === 0 ? 6 : 0,
                borderTopRightRadius: i === gradient.length - 1 ? 6 : 0,
                borderBottomRightRadius: i === gradient.length - 1 ? 6 : 0,
              },
            ]}
          />
        ))}
      </View>
      <View
        style={[
          styles.sliderThumb,
          {
            left: Math.max(0, position - 10),
            backgroundColor: thumbColor,
          },
        ]}
      />
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function ColorPicker({ label, value, onChange, textColor, borderColor }: ColorPickerProps) {
  const hsl = hexToHsl(value);
  const [hue, setHue] = useState(hsl.h);
  const [saturation, setSaturation] = useState(hsl.s);
  const [lightness, setLightness] = useState(hsl.l);
  const [hexInput, setHexInput] = useState(value);

  const updateFromHsl = useCallback((h: number, s: number, l: number) => {
    const hex = hslToHex(h, s, l);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  const handleHueChange = useCallback((h: number) => {
    const rounded = Math.round(h);
    setHue(rounded);
    updateFromHsl(rounded, saturation, lightness);
  }, [saturation, lightness, updateFromHsl]);

  const handleSaturationChange = useCallback((s: number) => {
    const rounded = Math.round(s);
    setSaturation(rounded);
    updateFromHsl(hue, rounded, lightness);
  }, [hue, lightness, updateFromHsl]);

  const handleLightnessChange = useCallback((l: number) => {
    const rounded = Math.round(l);
    setLightness(rounded);
    updateFromHsl(hue, saturation, rounded);
  }, [hue, saturation, updateFromHsl]);

  const handleHexInput = useCallback((text: string) => {
    setHexInput(text);
    if (isValidHex(text)) {
      const newHsl = hexToHsl(text);
      setHue(newHsl.h);
      setSaturation(newHsl.s);
      setLightness(newHsl.l);
      onChange(text);
    }
  }, [onChange]);

  // Build gradient arrays
  const hueGradient = Array.from({ length: 12 }, (_, i) =>
    hslToHex(i * 30, Math.max(saturation, 50), 50)
  );

  const satGradient = [
    hslToHex(hue, 0, lightness),
    hslToHex(hue, 50, lightness),
    hslToHex(hue, 100, lightness),
  ];

  const lightnessGradient = [
    hslToHex(hue, saturation, 5),
    hslToHex(hue, saturation, 25),
    hslToHex(hue, saturation, 50),
    hslToHex(hue, saturation, 75),
    hslToHex(hue, saturation, 95),
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>

      {/* Hue slider */}
      <View style={styles.sliderRow}>
        <Text style={[styles.sliderLabel, { color: textColor }]}>Hue</Text>
        <SliderBar
          gradient={hueGradient}
          value={hue}
          max={360}
          onChange={handleHueChange}
          thumbColor={hslToHex(hue, Math.max(saturation, 50), 50)}
        />
      </View>

      {/* Saturation slider */}
      <View style={styles.sliderRow}>
        <Text style={[styles.sliderLabel, { color: textColor }]}>Sat</Text>
        <SliderBar
          gradient={satGradient}
          value={saturation}
          max={100}
          onChange={handleSaturationChange}
          thumbColor={hslToHex(hue, saturation, lightness)}
        />
      </View>

      {/* Lightness slider */}
      <View style={styles.sliderRow}>
        <Text style={[styles.sliderLabel, { color: textColor }]}>Light</Text>
        <SliderBar
          gradient={lightnessGradient}
          value={lightness}
          max={100}
          onChange={handleLightnessChange}
          thumbColor={hslToHex(hue, saturation, lightness)}
        />
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
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sliderLabel: {
    fontSize: 10,
    fontWeight: '600',
    width: 32,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.6,
  },
  sliderContainer: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gradientSegment: {
    flex: 1,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
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
