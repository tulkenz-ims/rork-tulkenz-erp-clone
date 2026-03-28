import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Line,
  Rect,
  Polygon,
  Ellipse,
  Path,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  G,
  Pattern,
} from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Animated SVG wrappers ──────────────────────────────────────
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function HUDBackground() {
  const { colors, isHUD } = useTheme();

  // ── Animation values ──────────────────────────────────────
  const scanY = useRef(new Animated.Value(0)).current;
  const ring1Rot = useRef(new Animated.Value(0)).current;
  const ring2Rot = useRef(new Animated.Value(0)).current;
  const ring3Rot = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const starOpacity1 = useRef(new Animated.Value(0.3)).current;
  const starOpacity2 = useRef(new Animated.Value(0.15)).current;
  const fireOpacity = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    if (!isHUD) return;

    // Scan line — sweeps top to bottom continuously
    Animated.loop(
      Animated.timing(scanY, {
        toValue: SCREEN_H,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ring 1 — slow clockwise
    Animated.loop(
      Animated.timing(ring1Rot, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ring 2 — medium counter-clockwise
    Animated.loop(
      Animated.timing(ring2Rot, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ring 3 — fast clockwise
    Animated.loop(
      Animated.timing(ring3Rot, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Throne pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Star blink group 1
    Animated.loop(
      Animated.sequence([
        Animated.timing(starOpacity1, {
          toValue: 0.6,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(starOpacity1, {
          toValue: 0.15,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Star blink group 2 — offset
    Animated.loop(
      Animated.sequence([
        Animated.timing(starOpacity2, {
          toValue: 0.5,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(starOpacity2, {
          toValue: 0.1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fire river shimmer
    Animated.loop(
      Animated.sequence([
        Animated.timing(fireOpacity, {
          toValue: 0.28,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fireOpacity, {
          toValue: 0.12,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      scanY.stopAnimation();
      ring1Rot.stopAnimation();
      ring2Rot.stopAnimation();
      ring3Rot.stopAnimation();
      pulseOpacity.stopAnimation();
      starOpacity1.stopAnimation();
      starOpacity2.stopAnimation();
      fireOpacity.stopAnimation();
    };
  }, [isHUD]);

  // Don't render if not a HUD theme
  if (!isHUD) return null;

  const c = colors.hudPrimary;        // primary HUD color
  const c2 = colors.hudSecondary;     // secondary HUD color
  const amber = '#FFB800';            // fire color — always amber in Enoch
  const cityOpacity = 0.07;           // silhouette opacity — subtle
  const gridOpacity = 0.05;           // grid opacity

  // Ring rotation interpolations
  const ring1Rotate = ring1Rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ring2Rotate = ring2Rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const ring3Rotate = ring3Rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Grid cell size
  const GRID = 32;
  const cols = Math.ceil(SCREEN_W / GRID) + 1;
  const rows = Math.ceil(SCREEN_H / GRID) + 1;

  // Throne/wheel center
  const CX = SCREEN_W / 2;
  const CY = SCREEN_H * 0.42;

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="throneGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={c} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={amber} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={amber} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── GRID ──────────────────────────────────────────── */}
        {Array.from({ length: cols }).map((_, ci) =>
          <Line
            key={`v${ci}`}
            x1={ci * GRID} y1={0} x2={ci * GRID} y2={SCREEN_H}
            stroke={c} strokeWidth={0.5} opacity={gridOpacity}
          />
        )}
        {Array.from({ length: rows }).map((_, ri) =>
          <Line
            key={`h${ri}`}
            x1={0} y1={ri * GRID} x2={SCREEN_W} y2={ri * GRID}
            stroke={c} strokeWidth={0.5} opacity={gridOpacity}
          />
        )}

        {/* ── THRONE RADIANCE ───────────────────────────────── */}
        <Ellipse
          cx={CX} cy={CY}
          rx={SCREEN_W * 0.45} ry={SCREEN_H * 0.25}
          fill="url(#throneGlow)"
        />

        {/* ── STELLAR PATH / STAR ORBIT ─────────────────────── */}
        <Ellipse
          cx={CX} cy={CY}
          rx={SCREEN_W * 0.48} ry={SCREEN_H * 0.2}
          fill="none"
          stroke={c}
          strokeWidth={0.6}
          strokeDasharray="3 10"
          opacity={0.14}
        />

        {/* ── ENOCH CITY SILHOUETTE ─────────────────────────── */}
        <G opacity={cityOpacity}>

          {/* Mountains of Darkness — far edges, Enoch 17:6 */}
          <Polygon
            points={`0,${SCREEN_H} ${SCREEN_W * 0.06},${SCREEN_H * 0.78} ${SCREEN_W * 0.12},${SCREEN_H}`}
            fill={c}
          />
          <Polygon
            points={`0,${SCREEN_H} ${SCREEN_W * 0.03},${SCREEN_H * 0.85} ${SCREEN_W * 0.07},${SCREEN_H}`}
            fill={c} opacity={0.6}
          />
          <Polygon
            points={`${SCREEN_W},${SCREEN_H} ${SCREEN_W * 0.94},${SCREEN_H * 0.78} ${SCREEN_W * 0.88},${SCREEN_H}`}
            fill={c}
          />
          <Polygon
            points={`${SCREEN_W},${SCREEN_H} ${SCREEN_W * 0.97},${SCREEN_H * 0.85} ${SCREEN_W * 0.93},${SCREEN_H}`}
            fill={c} opacity={0.6}
          />

          {/* Four Pillars of Heaven — Enoch 18:2 */}
          {/* Far left pillar */}
          <Polygon
            points={`${SCREEN_W * 0.08},${SCREEN_H} ${SCREEN_W * 0.09},${SCREEN_H * 0.45} ${SCREEN_W * 0.1},${SCREEN_H}`}
            fill={c} opacity={1.4}
          />
          <Polygon
            points={`${SCREEN_W * 0.1},${SCREEN_H} ${SCREEN_W * 0.11},${SCREEN_H * 0.45} ${SCREEN_W * 0.12},${SCREEN_H}`}
            fill={c} opacity={0.9}
          />
          <Polygon
            points={`${SCREEN_W * 0.08},${SCREEN_H * 0.45} ${SCREEN_W * 0.1},${SCREEN_H * 0.4} ${SCREEN_W * 0.12},${SCREEN_H * 0.45}`}
            fill={c}
          />
          <Rect
            x={SCREEN_W * 0.076} y={SCREEN_H * 0.96}
            width={SCREEN_W * 0.048} height={SCREEN_H * 0.02}
            fill={c} opacity={0.8}
          />

          {/* Far right pillar */}
          <Polygon
            points={`${SCREEN_W * 0.88},${SCREEN_H} ${SCREEN_W * 0.89},${SCREEN_H * 0.45} ${SCREEN_W * 0.9},${SCREEN_H}`}
            fill={c} opacity={1.4}
          />
          <Polygon
            points={`${SCREEN_W * 0.9},${SCREEN_H} ${SCREEN_W * 0.91},${SCREEN_H * 0.45} ${SCREEN_W * 0.92},${SCREEN_H}`}
            fill={c} opacity={0.9}
          />
          <Polygon
            points={`${SCREEN_W * 0.88},${SCREEN_H * 0.45} ${SCREEN_W * 0.9},${SCREEN_H * 0.4} ${SCREEN_W * 0.92},${SCREEN_H * 0.45}`}
            fill={c}
          />
          <Rect
            x={SCREEN_W * 0.876} y={SCREEN_H * 0.96}
            width={SCREEN_W * 0.048} height={SCREEN_H * 0.02}
            fill={c} opacity={0.8}
          />

          {/* Inner left pillar */}
          <Polygon
            points={`${SCREEN_W * 0.18},${SCREEN_H} ${SCREEN_W * 0.19},${SCREEN_H * 0.55} ${SCREEN_W * 0.2},${SCREEN_H}`}
            fill={c} opacity={1.2}
          />
          <Polygon
            points={`${SCREEN_W * 0.18},${SCREEN_H * 0.55} ${SCREEN_W * 0.19},${SCREEN_H * 0.5} ${SCREEN_W * 0.2},${SCREEN_H * 0.55}`}
            fill={c}
          />

          {/* Inner right pillar */}
          <Polygon
            points={`${SCREEN_W * 0.8},${SCREEN_H} ${SCREEN_W * 0.81},${SCREEN_H * 0.55} ${SCREEN_W * 0.82},${SCREEN_H}`}
            fill={c} opacity={1.2}
          />
          <Polygon
            points={`${SCREEN_W * 0.8},${SCREEN_H * 0.55} ${SCREEN_W * 0.81},${SCREEN_H * 0.5} ${SCREEN_W * 0.82},${SCREEN_H * 0.55}`}
            fill={c}
          />

          {/* Crystal wall — faceted, Enoch 14:9 */}
          <Polygon
            points={`${SCREEN_W * 0.14},${SCREEN_H} ${SCREEN_W * 0.18},${SCREEN_H * 0.72} ${SCREEN_W * 0.82},${SCREEN_H * 0.72} ${SCREEN_W * 0.86},${SCREEN_H}`}
            fill={c} opacity={0.5}
          />
          {/* Crystal facet lines */}
          {[0.22, 0.28, 0.34, 0.4, 0.46, 0.52, 0.58, 0.64, 0.7, 0.76].map((p, i) => (
            <Line
              key={`facet${i}`}
              x1={SCREEN_W * p} y1={SCREEN_H * 0.72}
              x2={SCREEN_W * (p + 0.04)} y2={SCREEN_H}
              stroke={c} strokeWidth={0.5} opacity={0.3}
            />
          ))}

          {/* Gate towers — left */}
          <Polygon
            points={`${SCREEN_W * 0.25},${SCREEN_H} ${SCREEN_W * 0.26},${SCREEN_H * 0.63} ${SCREEN_W * 0.28},${SCREEN_H * 0.63} ${SCREEN_W * 0.29},${SCREEN_H}`}
            fill={c}
          />
          <Polygon
            points={`${SCREEN_W * 0.25},${SCREEN_H * 0.63} ${SCREEN_W * 0.27},${SCREEN_H * 0.58} ${SCREEN_W * 0.29},${SCREEN_H * 0.63}`}
            fill={c}
          />

          {/* Gate towers — right */}
          <Polygon
            points={`${SCREEN_W * 0.71},${SCREEN_H} ${SCREEN_W * 0.72},${SCREEN_H * 0.63} ${SCREEN_W * 0.74},${SCREEN_H * 0.63} ${SCREEN_W * 0.75},${SCREEN_H}`}
            fill={c}
          />
          <Polygon
            points={`${SCREEN_W * 0.71},${SCREEN_H * 0.63} ${SCREEN_W * 0.73},${SCREEN_H * 0.58} ${SCREEN_W * 0.75},${SCREEN_H * 0.63}`}
            fill={c}
          />

          {/* Crystal gate arch */}
          <Path
            d={`M${SCREEN_W * 0.29},${SCREEN_H * 0.72} Q${SCREEN_W * 0.5},${SCREEN_H * 0.55} ${SCREEN_W * 0.71},${SCREEN_H * 0.72}`}
            fill="none" stroke={c} strokeWidth={1} opacity={0.4}
          />

          {/* Treasury of Winds — left, Enoch 18:1 */}
          <Polygon
            points={`${SCREEN_W * 0.11},${SCREEN_H} ${SCREEN_W * 0.12},${SCREEN_H * 0.7} ${SCREEN_W * 0.145},${SCREEN_H * 0.7} ${SCREEN_W * 0.155},${SCREEN_H}`}
            fill={c} opacity={0.8}
          />
          <Polygon
            points={`${SCREEN_W * 0.11},${SCREEN_H * 0.7} ${SCREEN_W * 0.13},${SCREEN_H * 0.65} ${SCREEN_W * 0.155},${SCREEN_H * 0.7}`}
            fill={c} opacity={0.8}
          />

          {/* Treasury of Winds — right */}
          <Polygon
            points={`${SCREEN_W * 0.845},${SCREEN_H} ${SCREEN_W * 0.855},${SCREEN_H * 0.7} ${SCREEN_W * 0.88},${SCREEN_H * 0.7} ${SCREEN_W * 0.89},${SCREEN_H}`}
            fill={c} opacity={0.8}
          />
          <Polygon
            points={`${SCREEN_W * 0.845},${SCREEN_H * 0.7} ${SCREEN_W * 0.865},${SCREEN_H * 0.65} ${SCREEN_W * 0.89},${SCREEN_H * 0.7}`}
            fill={c} opacity={0.8}
          />

          {/* Inner sanctuary — the greater house, Enoch 14:15 */}
          <Rect
            x={SCREEN_W * 0.36} y={SCREEN_H * 0.48}
            width={SCREEN_W * 0.28} height={SCREEN_H * 0.26}
            fill={c} opacity={0.5}
          />
          {/* Sanctuary roof */}
          <Rect
            x={SCREEN_W * 0.35} y={SCREEN_H * 0.46}
            width={SCREEN_W * 0.3} height={SCREEN_H * 0.022}
            fill={c}
          />

          {/* Watchers — left, Enoch 71:7 */}
          <Polygon
            points={`${SCREEN_W * 0.31},${SCREEN_H} ${SCREEN_W * 0.315},${SCREEN_H * 0.68} ${SCREEN_W * 0.32},${SCREEN_H * 0.68} ${SCREEN_W * 0.325},${SCREEN_H}`}
            fill={c} opacity={0.9}
          />
          <Ellipse
            cx={SCREEN_W * 0.318} cy={SCREEN_H * 0.66}
            rx={SCREEN_W * 0.008} ry={SCREEN_H * 0.015}
            fill={c} opacity={0.9}
          />
          {/* Wings */}
          <Path
            d={`M${SCREEN_W * 0.31},${SCREEN_H * 0.71} Q${SCREEN_W * 0.29},${SCREEN_H * 0.67} ${SCREEN_W * 0.28},${SCREEN_H * 0.69}`}
            fill="none" stroke={c} strokeWidth={0.8} opacity={0.5}
          />
          <Path
            d={`M${SCREEN_W * 0.325},${SCREEN_H * 0.71} Q${SCREEN_W * 0.34},${SCREEN_H * 0.67} ${SCREEN_W * 0.35},${SCREEN_H * 0.69}`}
            fill="none" stroke={c} strokeWidth={0.8} opacity={0.5}
          />

          {/* Watchers — right */}
          <Polygon
            points={`${SCREEN_W * 0.675},${SCREEN_H} ${SCREEN_W * 0.68},${SCREEN_H * 0.68} ${SCREEN_W * 0.685},${SCREEN_H * 0.68} ${SCREEN_W * 0.69},${SCREEN_H}`}
            fill={c} opacity={0.9}
          />
          <Ellipse
            cx={SCREEN_W * 0.682} cy={SCREEN_H * 0.66}
            rx={SCREEN_W * 0.008} ry={SCREEN_H * 0.015}
            fill={c} opacity={0.9}
          />
          <Path
            d={`M${SCREEN_W * 0.675},${SCREEN_H * 0.71} Q${SCREEN_W * 0.66},${SCREEN_H * 0.67} ${SCREEN_W * 0.65},${SCREEN_H * 0.69}`}
            fill="none" stroke={c} strokeWidth={0.8} opacity={0.5}
          />
          <Path
            d={`M${SCREEN_W * 0.69},${SCREEN_H * 0.71} Q${SCREEN_W * 0.705},${SCREEN_H * 0.67} ${SCREEN_W * 0.715},${SCREEN_H * 0.69}`}
            fill="none" stroke={c} strokeWidth={0.8} opacity={0.5}
          />

          {/* Side chambers — Enoch 41:5 */}
          <Rect
            x={SCREEN_W * 0.29} y={SCREEN_H * 0.52}
            width={SCREEN_W * 0.07} height={SCREEN_H * 0.2}
            fill={c} opacity={0.55}
          />
          <Rect
            x={SCREEN_W * 0.64} y={SCREEN_H * 0.52}
            width={SCREEN_W * 0.07} height={SCREEN_H * 0.2}
            fill={c} opacity={0.55}
          />

        </G>

        {/* ── RIVERS OF FIRE — animated shimmer, Enoch 14:19 ── */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: fireOpacity }]}
          pointerEvents="none"
        >
          <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
            <Path
              d={`M${SCREEN_W * 0.5},${SCREEN_H * 0.82} Q${SCREEN_W * 0.4},${SCREEN_H * 0.87} ${SCREEN_W * 0.28},${SCREEN_H * 0.9} Q${SCREEN_W * 0.15},${SCREEN_H * 0.93} ${0},${SCREEN_H * 0.95}`}
              fill="none" stroke={amber} strokeWidth={2.5}
            />
            <Path
              d={`M${SCREEN_W * 0.5},${SCREEN_H * 0.82} Q${SCREEN_W * 0.6},${SCREEN_H * 0.87} ${SCREEN_W * 0.72},${SCREEN_H * 0.9} Q${SCREEN_W * 0.85},${SCREEN_H * 0.93} ${SCREEN_W},${SCREEN_H * 0.95}`}
              fill="none" stroke={amber} strokeWidth={2.5}
            />
            <Path
              d={`M${SCREEN_W * 0.35},${SCREEN_H * 0.84} Q${SCREEN_W * 0.42},${SCREEN_H * 0.81} ${SCREEN_W * 0.5},${SCREEN_H * 0.84} Q${SCREEN_W * 0.58},${SCREEN_H * 0.87} ${SCREEN_W * 0.65},${SCREEN_H * 0.84}`}
              fill="none" stroke={amber} strokeWidth={1}
            />
          </Svg>
        </Animated.View>

        {/* ── THRONE WHEEL RINGS — animated, Enoch 14:18 ──────── */}
        {/* Outer orbit ring — slow clockwise */}
        <AnimatedG
          style={{
            transform: [{ rotate: ring1Rotate }],
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <Circle
            cx={CX} cy={CY} r={SCREEN_W * 0.38}
            fill="none" stroke={c}
            strokeWidth={0.8}
            strokeDasharray="4 12"
            opacity={0.14}
          />
        </AnimatedG>

        {/* Middle ring — counter-clockwise */}
        <AnimatedG
          style={{
            transform: [{ rotate: ring2Rotate }],
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <Circle
            cx={CX} cy={CY} r={SCREEN_W * 0.26}
            fill="none" stroke={c}
            strokeWidth={0.8}
            strokeDasharray="2 8"
            opacity={0.16}
          />
          {/* Spoke hints */}
          <Line x1={CX - SCREEN_W * 0.26} y1={CY} x2={CX + SCREEN_W * 0.26} y2={CY} stroke={c} strokeWidth={0.4} opacity={0.1} />
          <Line x1={CX} y1={CY - SCREEN_W * 0.26} x2={CX} y2={CY + SCREEN_W * 0.26} stroke={c} strokeWidth={0.4} opacity={0.1} />
        </AnimatedG>

        {/* Inner ring — fast clockwise */}
        <AnimatedG
          style={{
            transform: [{ rotate: ring3Rotate }],
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <Circle
            cx={CX} cy={CY} r={SCREEN_W * 0.14}
            fill="none" stroke={c2}
            strokeWidth={1}
            strokeDasharray="3 6"
            opacity={0.2}
          />
        </AnimatedG>

        {/* Throne core — pulsing */}
        <AnimatedCircle
          cx={CX} cy={CY} r={SCREEN_W * 0.05}
          fill={c} opacity={pulseOpacity as any}
          style={{ opacity: pulseOpacity }}
        />
        <Circle
          cx={CX} cy={CY} r={SCREEN_W * 0.05}
          fill="none" stroke={c} strokeWidth={1} opacity={0.25}
        />

        {/* ── SCAN LINE ──────────────────────────────────────── */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanLine,
            {
              backgroundColor: colors.hudScanColor,
              transform: [{ translateY: scanY }],
            },
          ]}
        />

        {/* ── BLINKING STARS on stellar path ────────────────── */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: starOpacity1 }]} pointerEvents="none">
          <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
            <Circle cx={SCREEN_W * 0.06} cy={SCREEN_H * 0.32} r={2} fill={c} />
            <Line x1={SCREEN_W * 0.06 - 4} y1={SCREEN_H * 0.32} x2={SCREEN_W * 0.06 + 4} y2={SCREEN_H * 0.32} stroke={c} strokeWidth={0.5} />
            <Line x1={SCREEN_W * 0.06} y1={SCREEN_H * 0.32 - 4} x2={SCREEN_W * 0.06} y2={SCREEN_H * 0.32 + 4} stroke={c} strokeWidth={0.5} />
            <Circle cx={SCREEN_W * 0.2} cy={SCREEN_H * 0.2} r={1.5} fill={c} />
            <Circle cx={SCREEN_W * 0.8} cy={SCREEN_H * 0.2} r={1.5} fill={c} />
            <Circle cx={SCREEN_W * 0.94} cy={SCREEN_H * 0.32} r={2} fill={c} />
            <Line x1={SCREEN_W * 0.94 - 4} y1={SCREEN_H * 0.32} x2={SCREEN_W * 0.94 + 4} y2={SCREEN_H * 0.32} stroke={c} strokeWidth={0.5} />
            <Line x1={SCREEN_W * 0.94} y1={SCREEN_H * 0.32 - 4} x2={SCREEN_W * 0.94} y2={SCREEN_H * 0.32 + 4} stroke={c} strokeWidth={0.5} />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { opacity: starOpacity2 }]} pointerEvents="none">
          <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
            <Circle cx={SCREEN_W * 0.34} cy={SCREEN_H * 0.14} r={1.5} fill={c} />
            <Circle cx={SCREEN_W * 0.66} cy={SCREEN_H * 0.14} r={1.5} fill={c} />
            <Circle cx={SCREEN_W * 0.5} cy={SCREEN_H * 0.1} r={2} fill={c} />
            <Line x1={SCREEN_W * 0.5 - 4} y1={SCREEN_H * 0.1} x2={SCREEN_W * 0.5 + 4} y2={SCREEN_H * 0.1} stroke={c} strokeWidth={0.5} />
            <Line x1={SCREEN_W * 0.5} y1={SCREEN_H * 0.1 - 4} x2={SCREEN_W * 0.5} y2={SCREEN_H * 0.1 + 4} stroke={c} strokeWidth={0.5} />
          </Svg>
        </Animated.View>

      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.5,
  },
});
