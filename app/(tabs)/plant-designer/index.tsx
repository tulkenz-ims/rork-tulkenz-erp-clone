import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable,
  PanResponder, Dimensions, Alert, Platform, Modal, TextInput,
  ActivityIndicator, Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import Svg, { Line, Rect, Path, Ellipse, Circle, G, Text as SvgText, Polygon } from 'react-native-svg';
import * as THREE from 'three';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Plus, Save, FolderOpen, Trash2, RotateCw, RotateCcw,
  ZoomIn, ZoomOut, Crosshair, Link, AlertTriangle, X,
  ChevronRight, ChevronDown, Layers, Box, Cpu, Wrench,
  Tag, DollarSign, Play, Eraser, Activity, Package,
  Info, RotateCcw as Rotate3D,
} from 'lucide-react-native';

const { width: W, height: H } = Dimensions.get('window');

// ─── SCADA Theme ──────────────────────────────────────────────────────────────
const SCADA = {
  bg: '#060E1A', bgCard: '#0B1829', surface: '#0D1E36',
  border: '#1A3050', cyan: '#00E5CC', cyanDim: 'rgba(0,229,204,0.08)',
  green: '#00E676', amber: '#FFB300', red: '#FF3D71', purple: '#7B61FF',
  text: '#D0F0E8', textSec: '#6BBFAD', textDim: '#3A7A6A',
  grid: 'rgba(0,229,204,0.04)', gridAccent: 'rgba(0,229,204,0.08)',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface EquipmentModel {
  id: string; name: string; category: string; icon: string;
  canvas_width: number; canvas_height: number; color: string;
  description: string; specs: Record<string, string>;
  parts: EquipmentPart[]; has_3d_model: boolean; image_uri?: string;
}
interface EquipmentPart {
  id: string; name: string; description: string;
  offsetX: number; offsetY: number; width: number; height: number;
  color: string; shape: 'rect' | 'circle'; material?: string; weight?: string;
}
interface EquipmentRecord {
  id: string; name: string; equipment_tag: string; category: string;
  status: string; room_code: string; model_id: string | null;
  manufacturer: string; model: string; criticality: string;
  last_pm_date: string | null; next_pm_date: string | null;
  purchase_cost: number | null; installation_cost: number | null;
  annual_maintenance: number | null; power_consumption_kw: number | null;
  equipment_model?: EquipmentModel;
}
interface PlacedItem {
  id: string; layout_id?: string; equipment_id: string | null;
  model_id: string | null; label: string; x: number; y: number;
  rotation: number; scale: number;
  status: 'nominal' | 'alert' | 'offline' | 'planned';
  stats: { key: string; value: string; unit: string }[];
  model?: EquipmentModel; equipment?: EquipmentRecord;
}
interface CanvasConnection {
  id: string; from_item_id: string; to_item_id: string;
  connection_type: 'pipe' | 'belt' | 'wire' | 'chain' | 'conveyor' | 'pneumatic';
}
interface HazardZone {
  id: string; label: string; level: 'low' | 'medium' | 'high';
  x: number; y: number; width: number; height: number;
}
interface Layout {
  id: string; name: string; room_code: string | null;
  layout_type: 'production' | 'expansion' | 'concept' | 'archive';
  description: string | null; is_active: boolean;
  canvas_scale: number; canvas_offset_x: number; canvas_offset_y: number;
  updated_at: string;
}

// ─── 3D Model Builder ─────────────────────────────────────────────────────────
function hexToColor(hex: string): THREE.Color { return new THREE.Color(hex); }
function metalMat(color: string, roughness = 0.4): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hexToColor(color), roughness, metalness: 0.6 });
}
function partGroup(name: string): THREE.Group { const g = new THREE.Group(); g.name = name; return g; }

function buildMotor(): THREE.Group {
  const root = partGroup('motor');
  const housing = partGroup('Motor Housing');
  const hGeo = new THREE.CylinderGeometry(0.52, 0.52, 1.5, 32); hGeo.rotateZ(Math.PI/2);
  housing.add(new THREE.Mesh(hGeo, metalMat('#3A5A8A', 0.55)));
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.5), metalMat('#2E4A74', 0.6));
  foot.position.set(0, -0.56, 0); housing.add(foot); root.add(housing);
  const stator = partGroup('Stator');
  const sGeo = new THREE.CylinderGeometry(0.46, 0.46, 1.2, 32); sGeo.rotateZ(Math.PI/2);
  stator.add(new THREE.Mesh(sGeo, metalMat('#1A5276', 0.35)));
  const wGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 6); wGeo.rotateY(Math.PI/2);
  const w1 = new THREE.Mesh(wGeo, metalMat('#D4740E', 0.3)); w1.position.set(-0.5,0,0); stator.add(w1);
  const w2 = new THREE.Mesh(wGeo.clone(), metalMat('#D4740E', 0.3)); w2.position.set(0.5,0,0); stator.add(w2);
  root.add(stator);
  const rotor = partGroup('Rotor');
  const rGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.05, 24); rGeo.rotateZ(Math.PI/2);
  rotor.add(new THREE.Mesh(rGeo, metalMat('#78909C', 0.35)));
  root.add(rotor);
  const shaft = partGroup('Drive Shaft');
  const shGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.2, 16); shGeo.rotateZ(Math.PI/2);
  shaft.add(new THREE.Mesh(shGeo, metalMat('#90A4AE', 0.15))); root.add(shaft);
  const fan = partGroup('Cooling Fan');
  const fhGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16); fhGeo.rotateZ(Math.PI/2);
  const fh = new THREE.Mesh(fhGeo, metalMat('#37474F', 0.5)); fh.position.set(-0.88,0,0); fan.add(fh);
  for (let i=0;i<8;i++) {
    const angle=(i/8)*Math.PI*2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.22,0.06), metalMat('#455A64',0.45));
    blade.position.set(-0.88, Math.sin(angle)*0.2, Math.cos(angle)*0.2); blade.rotation.x=angle; fan.add(blade);
  }
  root.add(fan);
  const terminal = partGroup('Terminal Box');
  const tb = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.18,0.28), metalMat('#D4A017',0.4));
  tb.position.set(-0.1,0.6,0); terminal.add(tb); root.add(terminal);
  return root;
}

function buildPump(): THREE.Group {
  const root = partGroup('pump');
  const cGeo = new THREE.SphereGeometry(0.6,24,24); cGeo.scale(1,0.8,1);
  root.add(new THREE.Mesh(cGeo, metalMat('#4A6FA5',0.5)));
  const imp = partGroup('Impeller');
  imp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.12,6), metalMat('#7C4DFF',0.3)));
  root.add(imp);
  const psh = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.2,10), metalMat('#8BA3C7',0.2));
  const psG = partGroup('Shaft'); const pshGeo = new THREE.CylinderGeometry(0.05,0.05,1.2,10); pshGeo.rotateZ(Math.PI/2);
  psG.add(new THREE.Mesh(pshGeo, metalMat('#8BA3C7',0.2))); psG.position.set(0.5,0,0); root.add(psG);
  const inGeo = new THREE.CylinderGeometry(0.15,0.15,0.4,12);
  const inlet = new THREE.Mesh(inGeo, metalMat('#00D4FF',0.4)); inlet.position.set(0,-0.7,0); root.add(inlet);
  return root;
}

function buildConveyor(): THREE.Group {
  const root = partGroup('conveyor');
  const frame = partGroup('Frame');
  frame.add(new THREE.Mesh(new THREE.BoxGeometry(3,0.15,0.8), metalMat('#4A6FA5',0.6)));
  root.add(frame);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.04,0.6), new THREE.MeshStandardMaterial({color:0x222222,roughness:0.8,metalness:0.1}));
  root.add(belt);
  const hpGeo = new THREE.CylinderGeometry(0.18,0.18,0.65,16); hpGeo.rotateX(Math.PI/2);
  const hp = new THREE.Mesh(hpGeo, metalMat('#FF6B35',0.3)); hp.position.set(1.35,0,0); root.add(hp);
  const tpGeo = new THREE.CylinderGeometry(0.14,0.14,0.65,16); tpGeo.rotateX(Math.PI/2);
  const tp = new THREE.Mesh(tpGeo, metalMat('#8BA3C7',0.3)); tp.position.set(-1.35,0,0); root.add(tp);
  return root;
}

function buildTank(): THREE.Group {
  const root = partGroup('tank');
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,1.4,24), metalMat('#78909C',0.5)));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62,0.3,24), metalMat('#546E7A',0.5));
  roof.position.set(0,0.85,0); root.add(roof);
  const out = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.3,10), metalMat('#FF6B35',0.3));
  out.position.set(0,-1,0); root.add(out);
  return root;
}

function buildGearbox(): THREE.Group {
  const root = partGroup('gearbox');
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1,0.8,0.8), metalMat('#78909C',0.5)));
  const gGeo = new THREE.CylinderGeometry(0.28,0.28,0.15,20); gGeo.rotateX(Math.PI/2);
  root.add(new THREE.Mesh(gGeo, metalMat('#B0BEC5',0.3)));
  const inShGeo = new THREE.CylinderGeometry(0.04,0.04,0.6,10); inShGeo.rotateZ(Math.PI/2);
  const inSh = new THREE.Mesh(inShGeo, metalMat('#00D4FF',0.2)); inSh.position.set(-0.75,0,0); root.add(inSh);
  const outShGeo = new THREE.CylinderGeometry(0.06,0.06,0.6,10); outShGeo.rotateZ(Math.PI/2);
  const outSh = new THREE.Mesh(outShGeo, metalMat('#FF6B35',0.2)); outSh.position.set(0.75,0,0); root.add(outSh);
  return root;
}

function buildGenerator(): THREE.Group {
  const root = partGroup('generator');
  const eng = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.8,0.7), metalMat('#546E7A',0.5));
  eng.position.set(-0.4,0,0); root.add(eng);
  const altGeo = new THREE.CylinderGeometry(0.35,0.35,0.7,20); altGeo.rotateZ(Math.PI/2);
  const alt = new THREE.Mesh(altGeo, metalMat('#FFC107',0.4)); alt.position.set(0.45,0,0); root.add(alt);
  return root;
}

function buildShredder(): THREE.Group {
  const root = partGroup('shredder');
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1.2,1,1), metalMat('#4A6FA5',0.5)));
  const r1Geo = new THREE.CylinderGeometry(0.2,0.2,0.8,12); r1Geo.rotateX(Math.PI/2);
  const r1 = new THREE.Mesh(r1Geo, metalMat('#F44336',0.3)); r1.position.set(-0.2,0.1,0); root.add(r1);
  const r2 = new THREE.Mesh(r1Geo.clone(), metalMat('#F44336',0.3)); r2.position.set(0.2,0.1,0); root.add(r2);
  return root;
}

function buildValve(): THREE.Group {
  const root = partGroup('valve');
  root.add(new THREE.Mesh(new THREE.SphereGeometry(0.3,16,16), metalMat('#E91E63',0.4)));
  const actGeo = new THREE.CylinderGeometry(0.18,0.18,0.35,16);
  const act = new THREE.Mesh(actGeo, metalMat('#4A6FA5',0.4)); act.position.set(0,0.5,0); root.add(act);
  return root;
}

function buildFilter(): THREE.Group {
  const root = partGroup('filter');
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,1.4,20), metalMat('#4A6FA5',0.5)));
  ['#FFD600','#FF6B35','#00E676'].forEach((c,i) => {
    const el = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.3,16), metalMat(c,0.6));
    el.position.set(0, 0.4-i*0.4, 0); root.add(el);
  });
  return root;
}

function buildCompressor(): THREE.Group {
  const root = partGroup('compressor');
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1.2,0.9,0.8), metalMat('#4A6FA5',0.5)));
  const aeGeo = new THREE.CylinderGeometry(0.25,0.25,0.5,16); aeGeo.rotateX(Math.PI/2);
  const ae = new THREE.Mesh(aeGeo, metalMat('#03A9F4',0.3)); ae.position.set(-0.25,0.1,0); root.add(ae);
  return root;
}

function buildGeneric(color: string): THREE.Group {
  const root = partGroup('generic');
  root.add(new THREE.Mesh(new THREE.BoxGeometry(1,0.8,0.6), metalMat(color,0.5)));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.3,12), metalMat(color,0.3));
  top.position.set(0,0.55,0); root.add(top);
  return root;
}

function build3DModel(id: string, color: string): THREE.Group {
  switch(id) {
    case 'motor': return buildMotor();
    case 'pump': return buildPump();
    case 'conveyor': return buildConveyor();
    case 'tank': return buildTank();
    case 'gearbox': return buildGearbox();
    case 'generator': return buildGenerator();
    case 'shredder': return buildShredder();
    case 'valve': return buildValve();
    case 'filter': return buildFilter();
    case 'compressor': return buildCompressor();
    default: return buildGeneric(color || '#00E5CC');
  }
}

function explodeModel(model: THREE.Group, factor: number): void {
  model.children.forEach((child, i) => {
    if (child instanceof THREE.Group) {
      const angle = (i / model.children.length) * Math.PI * 2;
      const r = factor * 0.8;
      const yS = (i%2===0?1:-1) * factor * 0.3;
      child.position.x += Math.cos(angle)*r;
      child.position.y += yS;
      child.position.z += Math.sin(angle)*r;
    }
  });
}

function getOriginalPositions(model: THREE.Group): THREE.Vector3[] {
  return model.children.map(c => c.position.clone());
}

function resetModelPositions(model: THREE.Group, positions: THREE.Vector3[]): void {
  model.children.forEach((c,i) => { if (positions[i]) c.position.copy(positions[i]); });
}

// ─── ThreeViewer ──────────────────────────────────────────────────────────────
interface ThreeViewerProps {
  model: THREE.Group | null;
  height?: number;
  autoRotate?: boolean;
}

function ThreeViewerWeb({ model, height=300, autoRotate=true }: ThreeViewerProps) {
  const containerRef = useRef<any>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const rotRef = useRef({ x: -0.3, y: 0 });
  const zoomRef = useRef(3.5);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth || 340;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new THREE.Color(SCADA.bgCard).getHex(), 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(50, w/height, 0.1, 100);
    camera.position.set(0,1,zoomRef.current);
    cameraRef.current = camera;
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(3,5,4); scene.add(dir);
    const fill = new THREE.DirectionalLight(0x4488ff, 0.3); fill.position.set(-3,2,-2); scene.add(fill);
    const grid = new THREE.GridHelper(8, 16, 0x243B63, 0x1A2D52); grid.position.y=-1.2; scene.add(grid);
    if (model) { modelRef.current = model; scene.add(model); }
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (autoRotate && !isDragging.current) rotRef.current.y += 0.005;
      if (modelRef.current) { modelRef.current.rotation.y=rotRef.current.y; modelRef.current.rotation.x=rotRef.current.x; }
      if (cameraRef.current) {
        const sp = new THREE.Spherical(zoomRef.current, Math.PI/2-rotRef.current.x*0.3, rotRef.current.y*0.1);
        cameraRef.current.position.setFromSpherical(sp);
        cameraRef.current.lookAt(0,0,0);
      }
      renderer.render(scene, camera);
    };
    animate();
    const onDown = (e: MouseEvent) => { isDragging.current=true; lastMouse.current={x:e.clientX,y:e.clientY}; };
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      rotRef.current.y += (e.clientX-lastMouse.current.x)*0.008;
      rotRef.current.x += (e.clientY-lastMouse.current.y)*0.008;
      rotRef.current.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotRef.current.x));
      lastMouse.current={x:e.clientX,y:e.clientY};
    };
    const onUp = () => { isDragging.current=false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomRef.current=Math.max(1.5,Math.min(10,zoomRef.current+e.deltaY*0.005)); };
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown',onDown);
    canvas.addEventListener('mousemove',onMove);
    canvas.addEventListener('mouseup',onUp);
    canvas.addEventListener('mouseleave',onUp);
    canvas.addEventListener('wheel',onWheel,{passive:false});
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousedown',onDown);
      canvas.removeEventListener('mousemove',onMove);
      canvas.removeEventListener('mouseup',onUp);
      canvas.removeEventListener('mouseleave',onUp);
      canvas.removeEventListener('wheel',onWheel);
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, [height, autoRotate]);

  useEffect(() => {
    if (sceneRef.current && model && modelRef.current !== model) {
      if (modelRef.current) sceneRef.current.remove(modelRef.current);
      modelRef.current = model;
      sceneRef.current.add(model);
    }
  }, [model]);

  return (
    <View style={{ width: '100%', height, borderRadius: 10, overflow: 'hidden', backgroundColor: SCADA.bgCard }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }}/>
    </View>
  );
}

function ThreeViewerNative({ model, height=300, autoRotate=true }: ThreeViewerProps) {
  const [ready, setReady] = useState(false);
  const sceneRef = useRef<THREE.Scene|null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera|null>(null);
  const rendererRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group|null>(null);
  const animFrameRef = useRef<number>(0);
  const rotRef = useRef({ x: -0.3, y: 0 });
  const zoomRef = useRef(3.5);
  const lastPinch = useRef(0);
  const isPinching = useRef(false);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx)>2||Math.abs(gs.dy)>2,
    onPanResponderGrant: () => { isPinching.current=false; lastPinch.current=0; },
    onPanResponderMove: (evt, gs) => {
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        isPinching.current=true;
        const dx=(touches[0] as any).pageX-(touches[1] as any).pageX;
        const dy=(touches[0] as any).pageY-(touches[1] as any).pageY;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (lastPinch.current>0) zoomRef.current=Math.max(1.5,Math.min(10,zoomRef.current/(dist/lastPinch.current)));
        lastPinch.current=dist; return;
      }
      if (!isPinching.current) {
        rotRef.current.y+=gs.dx*0.008;
        rotRef.current.x+=gs.dy*0.008;
        rotRef.current.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,rotRef.current.x));
      }
    },
    onPanResponderRelease: () => { lastPinch.current=0; isPinching.current=false; },
  })).current;

  const onContextCreate = useCallback(async (gl: any) => {
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    let Renderer: any;
    try { const et = require('expo-three'); Renderer = et.Renderer; } catch(e) { return; }
    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);
    renderer.setClearColor(new THREE.Color(SCADA.bgCard).getHex(), 1);
    rendererRef.current = renderer;
    const scene = new THREE.Scene(); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 100);
    camera.position.set(0,1,zoomRef.current); cameraRef.current = camera;
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(3,5,4); scene.add(dir);
    const grid = new THREE.GridHelper(8,16,0x243B63,0x1A2D52); grid.position.y=-1.2; scene.add(grid);
    if (model) { modelRef.current=model; scene.add(model); }
    setReady(true);
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (autoRotate && !isPinching.current) rotRef.current.y+=0.005;
      if (modelRef.current) { modelRef.current.rotation.y=rotRef.current.y; modelRef.current.rotation.x=rotRef.current.x; }
      if (cameraRef.current) {
        const sp = new THREE.Spherical(zoomRef.current, Math.PI/2-rotRef.current.x*0.3, rotRef.current.y*0.1);
        cameraRef.current.position.setFromSpherical(sp);
        cameraRef.current.lookAt(0,0,0);
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  }, [model, autoRotate]);

  useEffect(() => {
    if (sceneRef.current && model && modelRef.current !== model) {
      if (modelRef.current) sceneRef.current.remove(modelRef.current);
      modelRef.current=model; sceneRef.current.add(model);
    }
  }, [model]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current?.dispose) rendererRef.current.dispose();
    };
  }, []);

  let GLView: any = null;
  try { GLView = require('expo-gl').GLView; } catch(e) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', backgroundColor: SCADA.bgCard, borderRadius: 10 }}>
        <Text style={{ color: SCADA.textDim, fontSize: 12 }}>3D not available</Text>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', height, borderRadius: 10, overflow: 'hidden', backgroundColor: SCADA.bgCard }} {...panResponder.panHandlers}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} msaaSamples={4}/>
      {!ready && (
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: SCADA.bgCard }}>
          <ActivityIndicator color={SCADA.cyan}/>
          <Text style={{ color: SCADA.textDim, fontSize: 11, marginTop: 8 }}>Loading 3D...</Text>
        </View>
      )}
    </View>
  );
}

function ThreeViewer(props: ThreeViewerProps) {
  if (Platform.OS === 'web') return <ThreeViewerWeb {...props}/>;
  return <ThreeViewerNative {...props}/>;
}

// ─── 2D SVG Schematic ─────────────────────────────────────────────────────────
function renderSchematic(modelId: string, w: number, h: number, selected: boolean, status: string): React.ReactNode {
  const stroke = status==='alert'?SCADA.red:status==='offline'?SCADA.textDim:SCADA.cyan;
  const fill = status==='alert'?'rgba(255,61,113,0.06)':'rgba(0,229,204,0.03)';
  switch(modelId) {
    case 'motor': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={2} y={4} width={w-4} height={h-8} rx={3} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Circle cx={w/2-4} cy={h/2} r={Math.min(w,h)/5} fill="none" stroke={stroke} strokeWidth={1.2}/><Circle cx={w/2-4} cy={h/2} r={3} fill={stroke} opacity={0.6}/><Line x1={w/2+Math.min(w,h)/5-2} y1={h/2} x2={w-3} y2={h/2} stroke={stroke} strokeWidth={2}/><Rect x={w-10} y={h/2-5} width={8} height={10} rx={1} fill="none" stroke={stroke} strokeWidth={1}/></Svg>;
    case 'pump': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Circle cx={w/2} cy={h/2} r={w/2-3} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Circle cx={w/2} cy={h/2} r={w/4} fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="3,2"/><Line x1={w/2} y1={h-3} x2={w/2} y2={h+4} stroke={stroke} strokeWidth={2}/></Svg>;
    case 'conveyor': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Line x1={14} y1={h/2} x2={w-14} y2={h/2} stroke={stroke} strokeWidth={1.5}/><Circle cx={12} cy={h/2} r={8} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Circle cx={w-12} cy={h/2} r={8} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Line x1={12} y1={h/2-8} x2={w-12} y2={h/2-8} stroke={stroke} strokeWidth={0.8}/><Line x1={12} y1={h/2+8} x2={w-12} y2={h/2+8} stroke={stroke} strokeWidth={0.8}/></Svg>;
    case 'hopper_silo': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={8} y={6} width={w-16} height={h*0.5} rx={2} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Ellipse cx={w/2} cy={8} rx={w/2-9} ry={5} fill="none" stroke={stroke} strokeWidth={1.2}/><Line x1={8} y1={h*0.5+4} x2={w/2-8} y2={h*0.85} stroke={stroke} strokeWidth={1.5}/><Line x1={w-8} y1={h*0.5+4} x2={w/2+8} y2={h*0.85} stroke={stroke} strokeWidth={1.5}/><Rect x={w/2-8} y={h*0.85} width={16} height={h*0.1} rx={1} fill={fill} stroke={stroke} strokeWidth={1}/></Svg>;
    case 'vffs_bagger': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={3} width={w-6} height={h-6} rx={3} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Rect x={w*0.25} y={8} width={w*0.35} height={h*0.25} rx={2} fill="none" stroke={stroke} strokeWidth={1}/><Circle cx={w*0.75} cy={h*0.2} r={w*0.12} fill="none" stroke={stroke} strokeWidth={1}/><Rect x={w*0.2} y={h*0.58} width={w*0.45} height={h*0.12} rx={1} fill="none" stroke={stroke} strokeWidth={0.8}/></Svg>;
    case 'screwfeed': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={2} y={8} width={w-25} height={h-16} rx={3} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/>{[0.15,0.3,0.45,0.6,0.75].map((p,i)=><Line key={i} x1={(w-25)*p+2} y1={10} x2={(w-25)*p+8} y2={h-10} stroke={stroke} strokeWidth={0.8} opacity={0.5}/>)}<Rect x={w-24} y={4} width={22} height={h-8} rx={3} fill={fill} stroke={stroke} strokeWidth={1.2}/><Circle cx={w-13} cy={h/2} r={6} fill="none" stroke={stroke} strokeWidth={1}/></Svg>;
    case 'metal_detector': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={3} width={w-6} height={h-6} rx={3} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Ellipse cx={w*0.35} cy={h/2} rx={w*0.2} ry={h*0.35} fill="none" stroke={stroke} strokeWidth={1}/><Ellipse cx={w*0.65} cy={h/2} rx={w*0.2} ry={h*0.35} fill="none" stroke={stroke} strokeWidth={1}/></Svg>;
    case 'heat_sealer': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={3} width={w-6} height={h-6} rx={2} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Line x1={8} y1={h/2-4} x2={w-8} y2={h/2-4} stroke={stroke} strokeWidth={3} opacity={0.8}/><Line x1={8} y1={h/2+4} x2={w-8} y2={h/2+4} stroke={SCADA.amber} strokeWidth={2} opacity={0.6}/></Svg>;
    case 'cone_filler': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Path d={`M${w*0.1} ${h*0.05} L${w*0.9} ${h*0.05} L${w*0.65} ${h*0.65} L${w*0.35} ${h*0.65} Z`} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Rect x={w*0.35} y={h*0.65} width={w*0.3} height={h*0.2} rx={1} fill={fill} stroke={stroke} strokeWidth={1.2}/></Svg>;
    case 'filter': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={3} width={w-6} height={h-6} rx={4} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/>{[0.25,0.5,0.75].map((p,i)=><Rect key={i} x={8} y={h*p-5} width={w-16} height={10} rx={2} fill="none" stroke={stroke} strokeWidth={0.8} strokeDasharray="3,2"/>)}</Svg>;
    case 'packout_area': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={2} y={h*0.3} width={w-4} height={h*0.6} rx={2} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Rect x={10} y={h*0.08} width={22} height={18} rx={2} fill="none" stroke={stroke} strokeWidth={1.2}/><Rect x={38} y={h*0.15} width={20} height={16} rx={2} fill="none" stroke={stroke} strokeWidth={1}/><Rect x={65} y={h*0.12} width={24} height={18} rx={2} fill="none" stroke={stroke} strokeWidth={1.2}/></Svg>;
    case 'supersack_frame': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Line x1={10} y1={5} x2={10} y2={h*0.7} stroke={stroke} strokeWidth={1.5}/><Line x1={w-10} y1={5} x2={w-10} y2={h*0.7} stroke={stroke} strokeWidth={1.5}/><Line x1={10} y1={5} x2={w-10} y2={5} stroke={stroke} strokeWidth={1.5}/><Path d={`M${w*0.2} ${h*0.22} Q${w*0.2} ${h*0.18} ${w/2} ${h*0.18} Q${w*0.8} ${h*0.18} ${w*0.8} ${h*0.22} L${w*0.75} ${h*0.7} Q${w*0.75} ${h*0.74} ${w/2} ${h*0.74} Q${w*0.25} ${h*0.74} ${w*0.25} ${h*0.7} Z`} fill={`${stroke}15`} stroke={stroke} strokeWidth={1.3}/></Svg>;
    case 'printer_coder': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={3} width={w-6} height={h-6} rx={4} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Rect x={8} y={8} width={w-16} height={h*0.4} rx={2} fill="none" stroke={stroke} strokeWidth={1}/><Line x1={10} y1={h*0.65} x2={w-10} y2={h*0.65} stroke={stroke} strokeWidth={1.5} opacity={0.7}/></Svg>;
    case 'security_kiosk': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={w/2-8} y={h*0.5} width={16} height={h*0.5} rx={1} fill={fill} stroke={stroke} strokeWidth={1.2}/><Rect x={3} y={5} width={w-6} height={h*0.5} rx={4} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Rect x={8} y={10} width={w-16} height={h*0.3} rx={2} fill="none" stroke={SCADA.purple} strokeWidth={1}/><Circle cx={w/2} cy={h*0.44} r={4} fill={SCADA.green} opacity={0.7}/></Svg>;
    case 'transfer_cart': return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={h*0.2} width={w-6} height={h*0.5} rx={2} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><Circle cx={12} cy={h*0.85} r={7} fill={fill} stroke={stroke} strokeWidth={1.5}/><Circle cx={w-12} cy={h*0.85} r={7} fill={fill} stroke={stroke} strokeWidth={1.5}/></Svg>;
    default: return <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><Rect x={3} y={3} width={w-6} height={h-6} rx={4} fill={fill} stroke={stroke} strokeWidth={selected?2:1.5}/><SvgText x={w/2} y={h/2+4} textAnchor="middle" fontSize={14} fill={stroke} fontWeight="bold" fontFamily="Courier New">{modelId.charAt(0).toUpperCase()}</SvgText></Svg>;
  }
}

// ─── Canvas Item ──────────────────────────────────────────────────────────────
function CanvasItem({ item, isSelected, isConnecting, canvasScale, onSelect, onMove, onLongPress }: {
  item: PlacedItem; isSelected: boolean; isConnecting: boolean; canvasScale: number;
  onSelect:(id:string)=>void; onMove:(id:string,x:number,y:number)=>void; onLongPress:(id:string)=>void;
}) {
  const model = item.model;
  const w = model?.canvas_width || 60;
  const h = model?.canvas_height || 60;
  const panRef = useRef({ x: item.x, y: item.y });
  const lastTap = useRef(0);
  const longTimer = useRef<ReturnType<typeof setTimeout>>();
  const statusColor = item.status==='alert'?SCADA.red:item.status==='offline'?SCADA.textDim:item.status==='planned'?SCADA.purple:SCADA.green;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_,gs) => Math.abs(gs.dx)>3||Math.abs(gs.dy)>3,
    onPanResponderGrant: () => {
      panRef.current={x:item.x,y:item.y};
      const now=Date.now();
      if (now-lastTap.current<300) { clearTimeout(longTimer.current); onLongPress(item.id); }
      else { onSelect(item.id); if(Platform.OS!=='web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
      lastTap.current=now;
      longTimer.current=setTimeout(()=>onLongPress(item.id),600);
    },
    onPanResponderMove: (_,gs) => {
      clearTimeout(longTimer.current);
      onMove(item.id, panRef.current.x+gs.dx/canvasScale, panRef.current.y+gs.dy/canvasScale);
    },
    onPanResponderRelease: () => clearTimeout(longTimer.current),
  })).current;

  return (
    <View {...panResponder.panHandlers} style={[styles.canvasItem,{left:item.x-w/2,top:item.y-h/2,transform:[{rotate:`${item.rotation}deg`}]}]}>
      {renderSchematic(item.model_id||'',w,h,isSelected,item.status)}
      <View style={styles.itemLabelRow}>
        <View style={[styles.statusDot,{backgroundColor:statusColor}]}/>
        <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
      </View>
      {isSelected && (
        <>
          <View style={[styles.selectionBorder,{width:w+8,height:h+8,top:-4,left:-4}]}>
            <View style={[styles.cornerTL,{borderColor:SCADA.cyan}]}/>
            <View style={[styles.cornerTR,{borderColor:SCADA.cyan}]}/>
            <View style={[styles.cornerBL,{borderColor:SCADA.cyan}]}/>
            <View style={[styles.cornerBR,{borderColor:SCADA.cyan}]}/>
          </View>
          {[styles.connDotTop,styles.connDotRight,styles.connDotBottom,styles.connDotLeft].map((s,i)=>(
            <View key={i} style={[styles.connDot,s,{backgroundColor:SCADA.cyan}]}/>
          ))}
        </>
      )}
    </View>
  );
}

// ─── Connection Line ──────────────────────────────────────────────────────────
function ConnectionLine({ conn, items }: { conn: CanvasConnection; items: PlacedItem[] }) {
  const from = items.find(i=>i.id===conn.from_item_id);
  const to = items.find(i=>i.id===conn.to_item_id);
  if (!from||!to) return null;
  const pad=30;
  const minX=Math.min(from.x,to.x)-pad; const minY=Math.min(from.y,to.y)-pad;
  const w=Math.max(from.x,to.x)+pad-minX; const h=Math.max(from.y,to.y)+pad-minY;
  const x1=from.x-minX; const y1=from.y-minY; const x2=to.x-minX; const y2=to.y-minY;
  const stroke=conn.connection_type==='wire'?SCADA.amber:SCADA.cyan;
  const dash=conn.connection_type==='wire'?'4,4':undefined;
  const dx=x2-x1; const dy=y2-y1; const len=Math.sqrt(dx*dx+dy*dy);
  const nx=len>0?dx/len:1; const ny=len>0?dy/len:0;
  const as=6; const ax=x2-nx*8; const ay=y2-ny*8;
  const p1x=ax-nx*as+ny*as*0.5; const p1y=ay-ny*as-nx*as*0.5;
  const p2x=ax-nx*as-ny*as*0.5; const p2y=ay-ny*as+nx*as*0.5;
  return (
    <View style={{position:'absolute',left:minX,top:minY,width,height}}>
      <Svg width={w} height={h}>
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.5} strokeDasharray={dash} opacity={0.8}/>
        <Circle cx={x1} cy={y1} r={3} fill={stroke} opacity={0.9}/>
        <Polygon points={`${ax},${ay} ${p1x},${p1y} ${p2x},${p2y}`} fill={stroke} opacity={0.9}/>
      </Svg>
    </View>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
function GridBg({ scale, offsetX, offsetY }: { scale:number; offsetX:number; offsetY:number }) {
  const gs=40*scale; const mgs=gs*5;
  const lines: React.ReactElement[] = [];
  for (let x=offsetX%gs; x<W*3; x+=gs) lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H*3} stroke={SCADA.grid} strokeWidth={0.5}/>);
  for (let y=offsetY%gs; y<H*3; y+=gs) lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W*3} y2={y} stroke={SCADA.grid} strokeWidth={0.5}/>);
  for (let x=offsetX%mgs; x<W*3; x+=mgs) lines.push(<Line key={`mv${x}`} x1={x} y1={0} x2={x} y2={H*3} stroke={SCADA.gridAccent} strokeWidth={1}/>);
  for (let y=offsetY%mgs; y<H*3; y+=mgs) lines.push(<Line key={`mh${y}`} x1={0} y1={y} x2={W*3} y2={y} stroke={SCADA.gridAccent} strokeWidth={1}/>);
  return <View style={StyleSheet.absoluteFill}><Svg width={W*3} height={H*3}>{lines}</Svg></View>;
}

// ─── Asset Intelligence Panel ─────────────────────────────────────────────────
function AssetIntelligencePanel({ item, onClose, orgId }: { item:PlacedItem; onClose:()=>void; orgId:string }) {
  const [tab, setTab] = useState<'overview'|'parts'|'procedures'|'cost'>('overview');
  const [viewMode, setViewMode] = useState<'2d'|'3d'>('2d');
  const [isExploded, setIsExploded] = useState(false);
  const [threeModel, setThreeModel] = useState<THREE.Group|null>(null);
  const originalPositions = useRef<THREE.Vector3[]>([]);
  const eq = item.equipment;
  const model = item.model;
  const has3D = model?.has_3d_model || false;

  // Build 3D model when switching to 3D view
  useEffect(() => {
    if (viewMode === '3d' && !threeModel && item.model_id) {
      const m = build3DModel(item.model_id, model?.color || '#00E5CC');
      originalPositions.current = getOriginalPositions(m);
      setThreeModel(m);
    }
  }, [viewMode, item.model_id]);

  const handleToggleExplode = useCallback(() => {
    if (!threeModel) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isExploded) {
      resetModelPositions(threeModel, originalPositions.current);
      setIsExploded(false);
    } else {
      explodeModel(threeModel, 1.2);
      setIsExploded(true);
    }
    setThreeModel(threeModel.clone());
  }, [threeModel, isExploded]);

  const { data: parts = [] } = useQuery({
    queryKey: ['eq_parts', eq?.id],
    queryFn: async () => {
      if (!eq?.id) return [];
      const { data } = await supabase.from('equipment_parts').select('*').eq('equipment_id', eq.id).eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!eq?.id,
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['eq_procs', eq?.id],
    queryFn: async () => {
      if (!eq?.id) return [];
      const { data } = await supabase.from('equipment_procedures').select('*').eq('equipment_id', eq.id).eq('organization_id', orgId);
      return data || [];
    },
    enabled: !!eq?.id,
  });

  const criticColor = eq?.criticality==='critical'?SCADA.red:eq?.criticality==='high'?SCADA.amber:SCADA.cyan;

  return (
    <View style={aiS.container}>
      {/* Header */}
      <View style={aiS.header}>
        <View style={{ flex: 1 }}>
          <Text style={aiS.name}>{eq?.name || item.label}</Text>
          <View style={aiS.tagRow}>
            {eq?.equipment_tag && <Text style={aiS.tag}>{eq.equipment_tag}</Text>}
            {eq?.criticality && (
              <View style={[aiS.critPill,{borderColor:criticColor+'60',backgroundColor:criticColor+'15'}]}>
                <Text style={[aiS.critText,{color:criticColor}]}>{eq.criticality.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={aiS.closeBtn}>
          <X size={16} color={SCADA.textDim}/>
        </TouchableOpacity>
      </View>

      {/* 2D / 3D toggle */}
      <View style={aiS.viewToggleRow}>
        <TouchableOpacity
          style={[aiS.viewToggleBtn, viewMode==='2d' && aiS.viewToggleBtnActive]}
          onPress={() => { setViewMode('2d'); setIsExploded(false); }}
        >
          <Layers size={12} color={viewMode==='2d'?SCADA.cyan:SCADA.textDim}/>
          <Text style={[aiS.viewToggleText, viewMode==='2d' && aiS.viewToggleTextActive]}>2D SCHEMATIC</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[aiS.viewToggleBtn, viewMode==='3d' && aiS.viewToggleBtnActive]}
          onPress={() => setViewMode('3d')}
        >
          <Box size={12} color={viewMode==='3d'?SCADA.cyan:SCADA.textDim}/>
          <Text style={[aiS.viewToggleText, viewMode==='3d' && aiS.viewToggleTextActive]}>3D MODEL</Text>
        </TouchableOpacity>
        {viewMode==='3d' && (
          <TouchableOpacity
            style={[aiS.explodeBtn, isExploded && aiS.explodeBtnActive]}
            onPress={handleToggleExplode}
          >
            <Text style={[aiS.explodeBtnText, isExploded && aiS.explodeBtnTextActive]}>
              {isExploded ? 'COLLAPSE' : 'EXPLODE'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Viewer */}
      <View style={aiS.viewerWrap}>
        {viewMode === '2d' ? (
          <View style={aiS.schematic2d}>
            {model && renderSchematic(item.model_id||'', Math.min(model.canvas_width*1.8,160), Math.min(model.canvas_height*1.8,130), false, item.status)}
          </View>
        ) : (
          <ThreeViewer model={threeModel} height={200} autoRotate={!isExploded}/>
        )}
        {viewMode==='3d' && (
          <Text style={aiS.gestureHint}>Drag to rotate · Pinch to zoom</Text>
        )}
      </View>

      {/* Tabs */}
      <View style={aiS.tabBar}>
        {(['overview','parts','procedures','cost'] as const).map(t => (
          <TouchableOpacity key={t} style={[aiS.tabBtn, tab===t && aiS.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[aiS.tabText, tab===t && aiS.tabTextActive]}>
              {t==='overview'?'INFO':t==='parts'?`PARTS${parts.length>0?` (${parts.length})`:''}`:t==='procedures'?'PROCS':'COST'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={aiS.body} showsVerticalScrollIndicator={false}>
        {tab==='overview' && (
          <View style={{gap:8}}>
            {eq?.manufacturer && <InfoRow label="Manufacturer" value={eq.manufacturer}/>}
            {eq?.model && <InfoRow label="Model" value={eq.model}/>}
            {eq?.room_code && <InfoRow label="Room" value={eq.room_code}/>}
            {eq?.status && <InfoRow label="Status" value={eq.status}/>}
            {eq?.last_pm_date && <InfoRow label="Last PM" value={new Date(eq.last_pm_date).toLocaleDateString()}/>}
            {eq?.next_pm_date && <InfoRow label="Next PM" value={new Date(eq.next_pm_date).toLocaleDateString()}/>}
            {model?.description && <Text style={aiS.desc}>{model.description}</Text>}
            {model?.specs && Object.keys(model.specs).length > 0 && (
              <View style={aiS.specsGrid}>
                {Object.entries(model.specs).map(([k,v]) => (
                  <View key={k} style={aiS.specChip}>
                    <Text style={aiS.specKey}>{k}</Text>
                    <Text style={aiS.specVal}>{v}</Text>
                  </View>
                ))}
              </View>
            )}
            {model?.parts && model.parts.length > 0 && (
              <>
                <Text style={aiS.sectionTitle}>COMPONENT BREAKDOWN</Text>
                {model.parts.map(p => (
                  <View key={p.id} style={aiS.partRow}>
                    <View style={[aiS.partDot,{backgroundColor:p.color}]}/>
                    <View style={{flex:1}}>
                      <Text style={aiS.partName}>{p.name}</Text>
                      <Text style={aiS.partDesc}>{p.description}</Text>
                    </View>
                    {p.material && <Text style={aiS.partMeta}>{p.material}</Text>}
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {tab==='parts' && (
          <View style={{gap:8}}>
            {parts.length===0 ? (
              <View style={aiS.empty}>
                <Package size={32} color={SCADA.textDim}/>
                <Text style={aiS.emptyText}>No parts added yet</Text>
                <Text style={aiS.emptyHint}>Add parts to track stock levels</Text>
              </View>
            ) : parts.map((p:any) => {
              const low = p.quantity_on_hand <= p.quantity_minimum;
              return (
                <View key={p.id} style={[aiS.stockCard, low && {borderColor:SCADA.red+'60'}]}>
                  <View style={{flex:1}}>
                    <Text style={aiS.partName}>{p.name}</Text>
                    {p.part_number && <Text style={aiS.partDesc}>{p.part_number}</Text>}
                  </View>
                  <View style={[aiS.qtyBadge,{backgroundColor:low?SCADA.red+'20':SCADA.green+'15',borderColor:low?SCADA.red+'50':SCADA.green+'40'}]}>
                    {low && <AlertTriangle size={10} color={SCADA.red}/>}
                    <Text style={[aiS.qty,{color:low?SCADA.red:SCADA.green}]}>{p.quantity_on_hand}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {tab==='procedures' && (
          <View style={{gap:8}}>
            {procedures.length===0 ? (
              <View style={aiS.empty}>
                <Wrench size={32} color={SCADA.textDim}/>
                <Text style={aiS.emptyText}>No procedures added yet</Text>
              </View>
            ) : procedures.map((p:any) => (
              <View key={p.id} style={aiS.procCard}>
                <View style={aiS.procHeader}>
                  <View style={[aiS.procTypePill,{backgroundColor:p.procedure_type==='repair'?SCADA.red+'20':SCADA.cyan+'15'}]}>
                    <Text style={[aiS.procType,{color:p.procedure_type==='repair'?SCADA.red:SCADA.cyan}]}>{p.procedure_type.toUpperCase()}</Text>
                  </View>
                  {p.requires_lockout && (
                    <View style={aiS.lockoutBadge}>
                      <AlertTriangle size={9} color={SCADA.red}/>
                      <Text style={aiS.lockoutText}>LOCKOUT</Text>
                    </View>
                  )}
                </View>
                <Text style={aiS.procTitle}>{p.title}</Text>
                {p.symptom && <Text style={aiS.procSymptom}>{p.symptom}</Text>}
                {p.steps?.length > 0 && p.steps.map((s:any,i:number) => (
                  <View key={i} style={aiS.stepRow}>
                    <Text style={aiS.stepNum}>{i+1}</Text>
                    <Text style={aiS.stepText}>{s.instruction||s}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {tab==='cost' && (
          <View style={{gap:10}}>
            {eq?.purchase_cost && <CostRow label="Purchase Cost" value={eq.purchase_cost}/>}
            {eq?.installation_cost && <CostRow label="Installation" value={eq.installation_cost}/>}
            {eq?.annual_maintenance && <CostRow label="Annual Maintenance" value={eq.annual_maintenance}/>}
            {eq?.power_consumption_kw && <InfoRow label="Power Draw" value={`${eq.power_consumption_kw} kW`}/>}
            {!eq?.purchase_cost && !eq?.installation_cost && (
              <View style={aiS.empty}>
                <DollarSign size={32} color={SCADA.textDim}/>
                <Text style={aiS.emptyText}>No cost data yet</Text>
              </View>
            )}
          </View>
        )}
        <View style={{height:20}}/>
      </ScrollView>
    </View>
  );
}

function InfoRow({label,value}:{label:string;value:string}) {
  return (
    <View style={aiS.infoRow}>
      <Text style={aiS.infoLabel}>{label}</Text>
      <Text style={aiS.infoValue}>{value}</Text>
    </View>
  );
}
function CostRow({label,value}:{label:string;value:number}) {
  return (
    <View style={aiS.infoRow}>
      <Text style={aiS.infoLabel}>{label}</Text>
      <Text style={[aiS.infoValue,{color:SCADA.green}]}>${value.toLocaleString()}</Text>
    </View>
  );
}

const aiS = StyleSheet.create({
  container: { backgroundColor:SCADA.bgCard, borderTopLeftRadius:16, borderTopRightRadius:16, borderWidth:1, borderColor:SCADA.border, maxHeight:H*0.85, paddingBottom:20 },
  header: { flexDirection:'row', alignItems:'flex-start', padding:16, borderBottomWidth:1, borderBottomColor:SCADA.border, gap:10 },
  name: { fontSize:16, fontWeight:'800', color:SCADA.text, letterSpacing:0.5 },
  tagRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop:4 },
  tag: { fontSize:10, color:SCADA.textDim, fontFamily:Platform.OS==='ios'?'Menlo':'monospace' },
  critPill: { paddingHorizontal:6, paddingVertical:2, borderRadius:4, borderWidth:1 },
  critText: { fontSize:8, fontWeight:'800', letterSpacing:1 },
  closeBtn: { padding:6, backgroundColor:SCADA.surface, borderRadius:8, borderWidth:1, borderColor:SCADA.border },
  viewToggleRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:8, borderBottomWidth:1, borderBottomColor:SCADA.border, gap:8 },
  viewToggleBtn: { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:SCADA.surface, borderWidth:1, borderColor:SCADA.border },
  viewToggleBtnActive: { backgroundColor:SCADA.cyanDim, borderColor:SCADA.cyan },
  viewToggleText: { fontSize:9, fontWeight:'800', color:SCADA.textDim, letterSpacing:1 },
  viewToggleTextActive: { color:SCADA.cyan },
  explodeBtn: { marginLeft:'auto' as any, paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:SCADA.surface, borderWidth:1, borderColor:SCADA.border },
  explodeBtnActive: { backgroundColor:SCADA.cyanDim, borderColor:SCADA.cyan },
  explodeBtnText: { fontSize:9, fontWeight:'800', color:SCADA.textDim, letterSpacing:1 },
  explodeBtnTextActive: { color:SCADA.cyan },
  viewerWrap: { paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:SCADA.border, alignItems:'center' },
  schematic2d: { alignItems:'center', justifyContent:'center', minHeight:120 },
  gestureHint: { fontSize:9, color:SCADA.textDim, marginTop:6, letterSpacing:0.5 },
  tabBar: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:SCADA.border },
  tabBtn: { flex:1, paddingVertical:10, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabBtnActive: { borderBottomColor:SCADA.cyan },
  tabText: { fontSize:9, fontWeight:'800', color:SCADA.textDim, letterSpacing:1 },
  tabTextActive: { color:SCADA.cyan },
  body: { padding:14 },
  desc: { fontSize:12, color:SCADA.textSec, lineHeight:18 },
  specsGrid: { flexDirection:'row', flexWrap:'wrap', gap:6 },
  specChip: { backgroundColor:SCADA.surface, borderRadius:6, borderWidth:1, borderColor:SCADA.border, paddingHorizontal:8, paddingVertical:4 },
  specKey: { fontSize:8, color:SCADA.textDim, fontWeight:'700', letterSpacing:0.8 },
  specVal: { fontSize:10, color:SCADA.cyan, fontWeight:'600' },
  sectionTitle: { fontSize:9, fontWeight:'800', color:SCADA.textDim, letterSpacing:1.5, marginTop:8, marginBottom:4 },
  partRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6, borderBottomWidth:1, borderBottomColor:SCADA.border },
  partDot: { width:8, height:8, borderRadius:4 },
  partName: { fontSize:12, fontWeight:'600', color:SCADA.text },
  partDesc: { fontSize:10, color:SCADA.textDim, marginTop:1 },
  partMeta: { fontSize:9, color:SCADA.textDim },
  infoRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:6, borderBottomWidth:1, borderBottomColor:SCADA.border },
  infoLabel: { fontSize:11, color:SCADA.textSec },
  infoValue: { fontSize:12, fontWeight:'600', color:SCADA.text },
  stockCard: { flexDirection:'row', alignItems:'center', backgroundColor:SCADA.surface, borderRadius:8, borderWidth:1, borderColor:SCADA.border, padding:10, gap:10 },
  qtyBadge: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:4, borderRadius:6, borderWidth:1 },
  qty: { fontSize:14, fontWeight:'800' },
  procCard: { backgroundColor:SCADA.surface, borderRadius:10, borderWidth:1, borderColor:SCADA.border, padding:12, gap:6 },
  procHeader: { flexDirection:'row', gap:6 },
  procTypePill: { paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  procType: { fontSize:8, fontWeight:'800', letterSpacing:1 },
  lockoutBadge: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:SCADA.red+'15', paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  lockoutText: { fontSize:8, fontWeight:'800', color:SCADA.red },
  procTitle: { fontSize:13, fontWeight:'700', color:SCADA.text },
  procSymptom: { fontSize:11, color:SCADA.amber },
  stepRow: { flexDirection:'row', gap:8 },
  stepNum: { fontSize:11, fontWeight:'900', color:SCADA.cyan, width:16 },
  stepText: { fontSize:11, color:SCADA.textSec, flex:1, lineHeight:16 },
  empty: { alignItems:'center', paddingVertical:30, gap:8 },
  emptyText: { fontSize:14, fontWeight:'600', color:SCADA.textSec },
  emptyHint: { fontSize:11, color:SCADA.textDim, textAlign:'center', maxWidth:220 },
});

// ─── ToolBtn ──────────────────────────────────────────────────────────────────
function ToolBtn({icon,label,onPress,active,danger,disabled,loading}:{
  icon:React.ReactNode;label:string;onPress:()=>void;
  active?:boolean;danger?:boolean;disabled?:boolean;loading?:boolean;
}) {
  return (
    <TouchableOpacity style={[styles.toolBtn,active&&styles.toolBtnActive,danger&&styles.toolBtnDanger,disabled&&styles.toolBtnDisabled]} onPress={onPress} disabled={disabled||loading}>
      {loading?<ActivityIndicator size={14} color={SCADA.green}/>:icon}
      <Text style={[styles.toolBtnLabel,active&&styles.toolBtnLabelActive,danger&&styles.toolBtnLabelDanger,disabled&&styles.toolBtnLabelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
let nextLocalId = 1;
function localId(p:string) { return `${p}_${Date.now()}_${nextLocalId++}`; }

export default function PlantDesignerScreen() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = organizationId || '';

  const [items, setItems] = useState<PlacedItem[]>([]);
  const [connections, setConnections] = useState<CanvasConnection[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string|null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({x:0,y:0});
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [layoutsVisible, setLayoutsVisible] = useState(false);
  const [intelItem, setIntelItem] = useState<PlacedItem|null>(null);
  const [activeLayoutId, setActiveLayoutId] = useState<string|null>(null);
  const [layoutName, setLayoutName] = useState('NEW LAYOUT');
  const [saving, setSaving] = useState(false);
  const [libTab, setLibTab] = useState<'assets'|'library'>('assets');
  const [libCategory, setLibCategory] = useState('all');

  const offsetRef = useRef({x:0,y:0});
  const lastDistance = useRef(0);
  const isPinching = useRef(false);

  const { data: equipment = [] } = useQuery<EquipmentRecord[]>({
    queryKey: ['equipment', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('equipment').select('*, equipment_model:equipment_models(*)').eq('organization_id', orgId).order('room_code',{ascending:true});
      return (data||[]) as EquipmentRecord[];
    },
    enabled: !!orgId,
  });

  const { data: models = [] } = useQuery<EquipmentModel[]>({
    queryKey: ['equipment_models'],
    queryFn: async () => {
      const { data } = await supabase.from('equipment_models').select('*').is('organization_id',null).order('name');
      return (data||[]) as EquipmentModel[];
    },
  });

  const { data: layouts = [] } = useQuery<Layout[]>({
    queryKey: ['plant_layouts', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('plant_layouts').select('*').eq('organization_id',orgId).order('updated_at',{ascending:false});
      return (data||[]) as Layout[];
    },
    enabled: !!orgId,
  });

  const modelMap = useMemo(() => {
    const m: Record<string,EquipmentModel> = {};
    models.forEach(mod => { m[mod.id]=mod; });
    return m;
  }, [models]);

  const resolveModel = useCallback((modelId:string|null, eq?: EquipmentRecord): EquipmentModel|undefined => {
    if (!modelId) return undefined;
    if (eq?.equipment_model) return eq.equipment_model as EquipmentModel;
    return modelMap[modelId];
  }, [modelMap]);

  const canvasPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (evt) => (evt.nativeEvent.touches?.length||0)===1,
    onMoveShouldSetPanResponder: (evt,gs) => {
      if ((evt.nativeEvent.touches?.length||0)>=2) { isPinching.current=true; return true; }
      return Math.abs(gs.dx)>5||Math.abs(gs.dy)>5;
    },
    onPanResponderGrant: () => { offsetRef.current={...canvasOffset}; },
    onPanResponderMove: (evt,gs) => {
      const touches=evt.nativeEvent.touches;
      if (touches&&touches.length>=2) {
        const dx=(touches[0] as any).pageX-(touches[1] as any).pageX;
        const dy=(touches[0] as any).pageY-(touches[1] as any).pageY;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (lastDistance.current>0) setCanvasScale(p=>Math.max(0.3,Math.min(3,p*(dist/lastDistance.current))));
        lastDistance.current=dist; return;
      }
      if (!isPinching.current) setCanvasOffset({x:offsetRef.current.x+gs.dx,y:offsetRef.current.y+gs.dy});
    },
    onPanResponderRelease: (_,gs) => {
      lastDistance.current=0; isPinching.current=false;
      if (Math.abs(gs.dx)<5&&Math.abs(gs.dy)<5) { setSelectedId(null); setConnectingFromId(null); }
    },
  })).current;

  const handleAddEquipment = useCallback((eq?: EquipmentRecord, modelId?: string) => {
    const mid = eq?.model_id||modelId||null;
    const model = resolveModel(mid, eq);
    const cx = (W/2-canvasOffset.x)/canvasScale;
    const cy = (H/2-canvasOffset.y)/canvasScale;
    const newItem: PlacedItem = {
      id: localId('item'), equipment_id:eq?.id||null, model_id:mid,
      label: eq?.name||model?.name||mid||'Equipment',
      x:cx, y:cy, rotation:0, scale:1,
      status: eq?.status==='operational'?'nominal':'planned',
      stats:[], model, equipment:eq,
    };
    setItems(prev=>[...prev,newItem]);
    setSelectedId(newItem.id);
    setLibraryVisible(false);
    if (Platform.OS!=='web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [canvasOffset, canvasScale, resolveModel]);

  const handleSelect = useCallback((id:string) => {
    if (connectingFromId&&connectingFromId!==id) {
      const exists=connections.find(c=>(c.from_item_id===connectingFromId&&c.to_item_id===id)||(c.from_item_id===id&&c.to_item_id===connectingFromId));
      if (!exists) setConnections(prev=>[...prev,{id:localId('conn'),from_item_id:connectingFromId,to_item_id:id,connection_type:'pipe'}]);
      setConnectingFromId(null);
    } else { setSelectedId(id); }
  }, [connectingFromId, connections]);

  const handleMove = useCallback((id:string,x:number,y:number) => {
    setItems(prev=>prev.map(i=>i.id===id?{...i,x,y}:i));
  }, []);

  const handleLongPress = useCallback((id:string) => {
    const item=items.find(i=>i.id===id);
    if (item) { if(Platform.OS!=='web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setIntelItem(item); }
  }, [items]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      let layoutId = activeLayoutId;
      if (!layoutId) {
        const { data, error } = await supabase.from('plant_layouts').insert({
          organization_id:orgId, name:layoutName, layout_type:'production',
          canvas_scale:canvasScale, canvas_offset_x:canvasOffset.x, canvas_offset_y:canvasOffset.y,
        }).select().single();
        if (error) throw error;
        layoutId=data.id; setActiveLayoutId(layoutId);
      } else {
        await supabase.from('plant_layouts').update({name:layoutName,canvas_scale:canvasScale,canvas_offset_x:canvasOffset.x,canvas_offset_y:canvasOffset.y,updated_at:new Date().toISOString()}).eq('id',layoutId);
        await supabase.from('layout_items').delete().eq('layout_id',layoutId);
        await supabase.from('layout_connections').delete().eq('layout_id',layoutId);
        await supabase.from('layout_hazard_zones').delete().eq('layout_id',layoutId);
      }
      if (items.length>0) {
        const { data:savedItems, error:itemErr } = await supabase.from('layout_items').insert(
          items.map(item=>({layout_id:layoutId,organization_id:orgId,equipment_id:item.equipment_id,model_id:item.model_id,label:item.label,x:item.x,y:item.y,rotation:item.rotation,scale:item.scale,status:item.status,stats:item.stats}))
        ).select();
        if (itemErr) throw itemErr;
        const idMap: Record<string,string>={};
        items.forEach((item,idx)=>{ if(savedItems?.[idx]) idMap[item.id]=savedItems[idx].id; });
        const validConns=connections.filter(c=>idMap[c.from_item_id]&&idMap[c.to_item_id]);
        if (validConns.length>0) await supabase.from('layout_connections').insert(validConns.map(c=>({layout_id:layoutId,organization_id:orgId,from_item_id:idMap[c.from_item_id],to_item_id:idMap[c.to_item_id],connection_type:c.connection_type})));
      }
      if (hazardZones.length>0) await supabase.from('layout_hazard_zones').insert(hazardZones.map(hz=>({layout_id:layoutId,organization_id:orgId,label:hz.label,level:hz.level,x:hz.x,y:hz.y,width:hz.width,height:hz.height})));
      queryClient.invalidateQueries({queryKey:['plant_layouts',orgId]});
      if (Platform.OS!=='web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved',`Layout "${layoutName}" saved.`);
    } catch(e:any) { Alert.alert('Error',e.message||'Failed to save.'); }
    finally { setSaving(false); }
  }, [activeLayoutId,items,connections,hazardZones,orgId,layoutName,canvasScale,canvasOffset,queryClient]);

  const handleLoadLayout = useCallback(async (layout:Layout) => {
    try {
      const { data:dbItems } = await supabase.from('layout_items').select('*, equipment:equipment(*, equipment_model:equipment_models(*))').eq('layout_id',layout.id);
      const { data:dbConns } = await supabase.from('layout_connections').select('*').eq('layout_id',layout.id);
      const { data:dbHz } = await supabase.from('layout_hazard_zones').select('*').eq('layout_id',layout.id);
      setItems((dbItems||[]).map((di:any)=>({...di,model:resolveModel(di.model_id,di.equipment),equipment:di.equipment})));
      setConnections(dbConns||[]);
      setHazardZones(dbHz||[]);
      setActiveLayoutId(layout.id); setLayoutName(layout.name);
      setCanvasScale(layout.canvas_scale||1);
      setCanvasOffset({x:layout.canvas_offset_x||0,y:layout.canvas_offset_y||0});
      setLayoutsVisible(false); setSelectedId(null);
      if (Platform.OS!=='web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch(e) { Alert.alert('Error','Failed to load layout.'); }
  }, [resolveModel]);

  const categories = useMemo(() => ['all',...Array.from(new Set(models.map(m=>m.category)))], [models]);
  const filteredModels = useMemo(() => libCategory==='all'?models:models.filter(m=>m.category===libCategory), [models,libCategory]);
  const filteredEquipment = useMemo(() => equipment.filter(eq=>eq.model_id!==null), [equipment]);
  const hasSelection = !!selectedId;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{headerShown:false}}/>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}><View style={styles.headerIconInner}/></View>
          <TextInput style={styles.layoutNameInput} value={layoutName} onChangeText={setLayoutName} selectTextOnFocus/>
        </View>
        <Text style={styles.headerHint}>TAP · HOLD TO INSPECT</Text>
      </View>

      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          <ToolBtn icon={<Save size={14} color={SCADA.green}/>} label="Save" onPress={handleSave} loading={saving}/>
          <ToolBtn icon={<FolderOpen size={14} color={SCADA.cyan}/>} label="Layouts" onPress={()=>setLayoutsVisible(true)}/>
          <View style={styles.toolDivider}/>
          <ToolBtn icon={<ZoomIn size={14} color={SCADA.text}/>} label="In" onPress={()=>setCanvasScale(p=>Math.min(3,p*1.3))}/>
          <ToolBtn icon={<ZoomOut size={14} color={SCADA.text}/>} label="Out" onPress={()=>setCanvasScale(p=>Math.max(0.3,p/1.3))}/>
          <ToolBtn icon={<Crosshair size={14} color={SCADA.text}/>} label="Reset" onPress={()=>{setCanvasScale(1);setCanvasOffset({x:0,y:0});}}/>
          <View style={styles.toolDivider}/>
          <ToolBtn icon={<RotateCcw size={14} color={hasSelection?SCADA.cyan:SCADA.textDim}/>} label="CCW" onPress={()=>selectedId&&setItems(p=>p.map(i=>i.id===selectedId?{...i,rotation:(i.rotation-45+360)%360}:i))} disabled={!hasSelection}/>
          <ToolBtn icon={<RotateCw size={14} color={hasSelection?SCADA.cyan:SCADA.textDim}/>} label="CW" onPress={()=>selectedId&&setItems(p=>p.map(i=>i.id===selectedId?{...i,rotation:(i.rotation+45)%360}:i))} disabled={!hasSelection}/>
          <ToolBtn icon={<Link size={14} color={connectingFromId?SCADA.green:hasSelection?SCADA.cyan:SCADA.textDim}/>} label={connectingFromId?'Cancel':'Connect'} onPress={()=>connectingFromId?setConnectingFromId(null):selectedId&&setConnectingFromId(selectedId)} active={!!connectingFromId} disabled={!hasSelection&&!connectingFromId}/>
          <ToolBtn icon={<Info size={14} color={hasSelection?SCADA.purple:SCADA.textDim}/>} label="Inspect" onPress={()=>{const item=items.find(i=>i.id===selectedId);if(item)setIntelItem(item);}} disabled={!hasSelection}/>
          <View style={styles.toolDivider}/>
          <ToolBtn icon={<AlertTriangle size={14} color={SCADA.amber}/>} label="Hazard" onPress={()=>{const cx=(W/2-canvasOffset.x)/canvasScale;const cy=(H/2-canvasOffset.y)/canvasScale;setHazardZones(p=>[...p,{id:localId('hz'),label:'Hazard Zone',level:'high',x:cx,y:cy,width:120,height:120}]);}}/>
          <ToolBtn icon={<Trash2 size={14} color={hasSelection?SCADA.red:SCADA.textDim}/>} label="Delete" onPress={()=>{if(!selectedId)return;Alert.alert('Delete','Remove from canvas?',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>{setItems(p=>p.filter(i=>i.id!==selectedId));setConnections(p=>p.filter(c=>c.from_item_id!==selectedId&&c.to_item_id!==selectedId));setSelectedId(null);}}]);}} disabled={!hasSelection} danger/>
          <ToolBtn icon={<Eraser size={14} color={SCADA.red}/>} label="Clear" onPress={()=>Alert.alert('Clear Canvas','Remove everything?',[{text:'Cancel',style:'cancel'},{text:'Clear',style:'destructive',onPress:()=>{setItems([]);setConnections([]);setHazardZones([]);setSelectedId(null);}}])} danger/>
        </ScrollView>
      </View>

      <View style={styles.canvas} {...canvasPanResponder.panHandlers}>
        <GridBg scale={canvasScale} offsetX={canvasOffset.x} offsetY={canvasOffset.y}/>
        <View style={[styles.canvasContent,{transform:[{translateX:canvasOffset.x},{translateY:canvasOffset.y},{scale:canvasScale}]}]}>
          {hazardZones.map(hz=>(
            <View key={hz.id} style={[styles.hazardZone,{left:hz.x,top:hz.y,width:hz.width,height:hz.height,borderColor:hz.level==='high'?SCADA.red:hz.level==='medium'?SCADA.amber:SCADA.cyan}]}>
              <Text style={[styles.hazardLabel,{color:hz.level==='high'?SCADA.red:hz.level==='medium'?SCADA.amber:SCADA.cyan}]}>{hz.label}</Text>
            </View>
          ))}
          {connections.map(conn=><ConnectionLine key={conn.id} conn={conn} items={items}/>)}
          {items.map(item=>(
            <CanvasItem key={item.id} item={item} isSelected={selectedId===item.id} isConnecting={connectingFromId!==null} canvasScale={canvasScale} onSelect={handleSelect} onMove={handleMove} onLongPress={handleLongPress}/>
          ))}
        </View>
        {connectingFromId&&(
          <View style={styles.connectBanner}>
            <View style={styles.connectDot}/><Text style={styles.connectText}>Tap another piece to connect</Text>
          </View>
        )}
        {items.length===0&&!libraryVisible&&(
          <View style={styles.emptyHint}>
            <Text style={styles.emptyTitle}>EMPTY CANVAS</Text>
            <Text style={styles.emptyDesc}>Tap "EQUIPMENT LIBRARY" below to place equipment</Text>
          </View>
        )}
        {items.length>0&&(
          <View style={styles.legend}>
            {[['nominal',SCADA.green],['alert',SCADA.red],['planned',SCADA.purple]].map(([s,c])=>{
              if(!items.some(i=>i.status===s)) return null;
              return <View key={s} style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:c}]}/><Text style={styles.legendText}>{(s as string).toUpperCase()}</Text></View>;
            })}
          </View>
        )}
      </View>

      {/* Library */}
      <View style={styles.libraryWrapper}>
        <TouchableOpacity style={styles.libraryToggle} onPress={()=>setLibraryVisible(p=>!p)}>
          <View style={styles.libraryToggleInner}>
            {libraryVisible?<ChevronDown size={14} color={SCADA.cyan}/>:<Plus size={14} color={SCADA.cyan}/>}
            <Text style={styles.libraryToggleText}>EQUIPMENT LIBRARY</Text>
            <View style={styles.libCountBadge}><Text style={styles.libCountText}>{equipment.length+models.length}</Text></View>
          </View>
        </TouchableOpacity>
        {libraryVisible&&(
          <View style={styles.libraryPanel}>
            <View style={styles.libTabBar}>
              <TouchableOpacity style={[styles.libTab,libTab==='assets'&&styles.libTabActive]} onPress={()=>setLibTab('assets')}>
                <Text style={[styles.libTabText,libTab==='assets'&&styles.libTabTextActive]}>YOUR ASSETS ({filteredEquipment.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.libTab,libTab==='library'&&styles.libTabActive]} onPress={()=>setLibTab('library')}>
                <Text style={[styles.libTabText,libTab==='library'&&styles.libTabTextActive]}>BASE LIBRARY ({models.length})</Text>
              </TouchableOpacity>
            </View>
            {libTab==='assets'&&(
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.libScroll} contentContainerStyle={styles.libScrollContent}>
                {filteredEquipment.map(eq=>{
                  const model=resolveModel(eq.model_id,eq);
                  const placed=items.some(i=>i.equipment_id===eq.id);
                  return (
                    <TouchableOpacity key={eq.id} style={[styles.libCard,placed&&styles.libCardPlaced]} onPress={()=>handleAddEquipment(eq)}>
                      <View style={[styles.libCardIcon,{borderColor:model?.color?model.color+'40':SCADA.border,backgroundColor:model?.color?model.color+'15':SCADA.surface}]}>
                        {model&&renderSchematic(model.id,36,36,false,eq.status==='operational'?'nominal':'offline')}
                      </View>
                      <Text style={styles.libCardName} numberOfLines={2}>{eq.name}</Text>
                      <Text style={styles.libCardTag}>{eq.equipment_tag}</Text>
                      {placed&&<View style={styles.placedBadge}><Text style={styles.placedText}>ON CANVAS</Text></View>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {libTab==='library'&&(
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
                  {categories.map(cat=>(
                    <TouchableOpacity key={cat} style={[styles.catChip,libCategory===cat&&styles.catChipActive]} onPress={()=>setLibCategory(cat)}>
                      <Text style={[styles.catText,libCategory===cat&&styles.catTextActive]}>{cat.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.libScroll} contentContainerStyle={styles.libScrollContent}>
                  {filteredModels.map(model=>(
                    <TouchableOpacity key={model.id} style={styles.libCard} onPress={()=>handleAddEquipment(undefined,model.id)}>
                      <View style={[styles.libCardIcon,{borderColor:model.color+'40',backgroundColor:model.color+'15'}]}>
                        {renderSchematic(model.id,36,36,false,'nominal')}
                      </View>
                      <Text style={styles.libCardName} numberOfLines={2}>{model.name}</Text>
                      <Text style={styles.libCardTag}>{model.category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}
      </View>

      {/* Layouts Modal */}
      <Modal visible={layoutsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setLayoutsVisible(false)}>
        <View style={modalS.container}>
          <View style={modalS.header}>
            <Text style={modalS.title}>SAVED LAYOUTS</Text>
            <TouchableOpacity onPress={()=>{setItems([]);setConnections([]);setHazardZones([]);setActiveLayoutId(null);setLayoutName('NEW LAYOUT');setLayoutsVisible(false);}} style={modalS.newBtn}>
              <Plus size={14} color={SCADA.bg}/><Text style={modalS.newBtnText}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setLayoutsVisible(false)} style={modalS.closeBtn}>
              <X size={18} color={SCADA.textSec}/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:16,gap:10}}>
            {layouts.length===0?(
              <View style={modalS.empty}>
                <FolderOpen size={40} color={SCADA.textDim}/>
                <Text style={modalS.emptyText}>No saved layouts yet</Text>
              </View>
            ):layouts.map(layout=>(
              <TouchableOpacity key={layout.id} style={[modalS.layoutCard,activeLayoutId===layout.id&&modalS.layoutCardActive]} onPress={()=>handleLoadLayout(layout)}>
                <View style={{flex:1}}>
                  <View style={modalS.layoutHeader}>
                    <Text style={modalS.layoutName}>{layout.name}</Text>
                    {activeLayoutId===layout.id&&<View style={modalS.currentBadge}><Text style={modalS.currentText}>ACTIVE</Text></View>}
                  </View>
                  <View style={modalS.layoutMeta}>
                    {layout.room_code&&<Text style={modalS.layoutMetaText}>{layout.room_code}</Text>}
                    <Text style={modalS.layoutMetaText}>{layout.layout_type}</Text>
                    <Text style={modalS.layoutMetaText}>{new Date(layout.updated_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <ChevronRight size={16} color={SCADA.textDim}/>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Intel overlay */}
      {intelItem&&(
        <View style={styles.intelOverlay}>
          <TouchableOpacity style={styles.intelBackdrop} onPress={()=>setIntelItem(null)}/>
          <AssetIntelligencePanel item={intelItem} onClose={()=>setIntelItem(null)} orgId={orgId}/>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:SCADA.bg},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:54,paddingBottom:8,backgroundColor:SCADA.bg,borderBottomWidth:1,borderBottomColor:`${SCADA.cyan}15`,zIndex:60},
  headerLeft:{flexDirection:'row',alignItems:'center',gap:8},
  headerIcon:{width:18,height:18,borderRadius:3,borderWidth:1.5,borderColor:SCADA.cyan,alignItems:'center',justifyContent:'center'},
  headerIconInner:{width:6,height:6,borderRadius:1,backgroundColor:SCADA.cyan},
  layoutNameInput:{color:SCADA.cyan,fontSize:13,fontWeight:'800',letterSpacing:1.5,fontFamily:Platform.OS==='ios'?'Menlo':'monospace',minWidth:100},
  headerHint:{color:SCADA.cyan,fontSize:9,fontWeight:'600',letterSpacing:0.8,opacity:0.5,fontFamily:Platform.OS==='ios'?'Menlo':'monospace'},
  toolbar:{backgroundColor:SCADA.surface,borderBottomWidth:1,borderBottomColor:SCADA.border,zIndex:50},
  toolbarContent:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingVertical:6,gap:2},
  toolBtn:{alignItems:'center',paddingHorizontal:8,paddingVertical:4,borderRadius:6,minWidth:44},
  toolBtnActive:{backgroundColor:SCADA.cyanDim},
  toolBtnDanger:{},
  toolBtnDisabled:{opacity:0.35},
  toolBtnLabel:{color:SCADA.textSec,fontSize:8,marginTop:2,fontWeight:'500'},
  toolBtnLabelActive:{color:SCADA.cyan},
  toolBtnLabelDanger:{color:SCADA.red},
  toolBtnLabelDisabled:{color:SCADA.textDim},
  toolDivider:{width:1,height:28,backgroundColor:SCADA.border,marginHorizontal:4},
  canvas:{flex:1,overflow:'hidden'},
  canvasContent:{...StyleSheet.absoluteFillObject,width:W*3,height:H*3},
  canvasItem:{position:'absolute',alignItems:'center',zIndex:10},
  itemLabelRow:{marginTop:5,flexDirection:'row',alignItems:'center',gap:4,maxWidth:120},
  statusDot:{width:5,height:5,borderRadius:2.5},
  itemLabel:{color:SCADA.cyan,fontSize:8,fontWeight:'700',letterSpacing:0.8,textTransform:'uppercase',fontFamily:Platform.OS==='ios'?'Menlo':'monospace',textAlign:'center'},
  selectionBorder:{position:'absolute',zIndex:20},
  cornerTL:{position:'absolute',top:0,left:0,width:8,height:8,borderTopWidth:2,borderLeftWidth:2},
  cornerTR:{position:'absolute',top:0,right:0,width:8,height:8,borderTopWidth:2,borderRightWidth:2},
  cornerBL:{position:'absolute',bottom:0,left:0,width:8,height:8,borderBottomWidth:2,borderLeftWidth:2},
  cornerBR:{position:'absolute',bottom:0,right:0,width:8,height:8,borderBottomWidth:2,borderRightWidth:2},
  connDot:{position:'absolute',width:10,height:10,borderRadius:5,borderWidth:2,borderColor:SCADA.bg},
  connDotTop:{top:-5,left:'50%',marginLeft:-5},
  connDotRight:{right:-5,top:'50%',marginTop:-5},
  connDotBottom:{bottom:-18,left:'50%',marginLeft:-5},
  connDotLeft:{left:-5,top:'50%',marginTop:-5},
  hazardZone:{position:'absolute',borderWidth:2,borderStyle:'dashed',borderRadius:8,zIndex:3,padding:4},
  hazardLabel:{fontSize:9,fontWeight:'700',letterSpacing:1,fontFamily:Platform.OS==='ios'?'Menlo':'monospace'},
  connectBanner:{position:'absolute',top:8,alignSelf:'center',flexDirection:'row',alignItems:'center',backgroundColor:SCADA.surface,paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,borderColor:SCADA.green,gap:8},
  connectDot:{width:8,height:8,borderRadius:4,backgroundColor:SCADA.green},
  connectText:{color:SCADA.green,fontSize:12,fontWeight:'600'},
  emptyHint:{position:'absolute',top:'38%',alignSelf:'center',alignItems:'center',gap:8,opacity:0.4},
  emptyTitle:{color:SCADA.cyan,fontSize:16,fontWeight:'700',letterSpacing:2,fontFamily:Platform.OS==='ios'?'Menlo':'monospace'},
  emptyDesc:{color:SCADA.textDim,fontSize:11,textAlign:'center',lineHeight:16,fontFamily:Platform.OS==='ios'?'Menlo':'monospace'},
  legend:{position:'absolute',bottom:12,left:12,flexDirection:'row',gap:12,zIndex:50},
  legendItem:{flexDirection:'row',alignItems:'center',gap:5},
  legendDot:{width:7,height:7,borderRadius:3.5},
  legendText:{color:SCADA.textSec,fontSize:8,fontWeight:'700',letterSpacing:1,fontFamily:Platform.OS==='ios'?'Menlo':'monospace'},
  libraryWrapper:{position:'absolute',bottom:0,left:0,right:0,zIndex:100},
  libraryToggle:{alignSelf:'center',marginBottom:-1},
  libraryToggleInner:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:SCADA.surface,paddingHorizontal:16,paddingVertical:8,borderTopLeftRadius:12,borderTopRightRadius:12,borderWidth:1,borderBottomWidth:0,borderColor:SCADA.border},
  libraryToggleText:{color:SCADA.cyan,fontSize:11,fontWeight:'700',letterSpacing:1,fontFamily:Platform.OS==='ios'?'Menlo':'monospace'},
  libCountBadge:{backgroundColor:SCADA.cyanDim,paddingHorizontal:6,paddingVertical:1,borderRadius:8},
  libCountText:{color:SCADA.cyan,fontSize:9,fontWeight:'700'},
  libraryPanel:{backgroundColor:SCADA.surface,borderTopWidth:1,borderColor:SCADA.border,paddingBottom:30},
  libTabBar:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:SCADA.border},
  libTab:{flex:1,paddingVertical:8,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  libTabActive:{borderBottomColor:SCADA.cyan},
  libTabText:{fontSize:9,fontWeight:'800',color:SCADA.textDim,letterSpacing:1},
  libTabTextActive:{color:SCADA.cyan},
  catScroll:{maxHeight:36},
  catContent:{paddingHorizontal:12,paddingVertical:6,gap:6,flexDirection:'row'},
  catChip:{paddingHorizontal:10,paddingVertical:4,borderRadius:12,backgroundColor:SCADA.bgCard,borderWidth:1,borderColor:SCADA.border},
  catChipActive:{backgroundColor:SCADA.cyan,borderColor:SCADA.cyan},
  catText:{color:SCADA.textSec,fontSize:9,fontWeight:'700',letterSpacing:0.5},
  catTextActive:{color:SCADA.bg},
  libScroll:{maxHeight:130},
  libScrollContent:{paddingHorizontal:12,paddingVertical:8,gap:8,flexDirection:'row'},
  libCard:{width:86,backgroundColor:SCADA.bgCard,borderRadius:10,borderWidth:1,borderColor:SCADA.border,padding:8,alignItems:'center',gap:5},
  libCardPlaced:{borderColor:SCADA.cyan+'50',backgroundColor:SCADA.cyanDim},
  libCardIcon:{width:44,height:44,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  libCardName:{color:SCADA.text,fontSize:9,fontWeight:'600',textAlign:'center',lineHeight:12},
  libCardTag:{color:SCADA.textDim,fontSize:7,textTransform:'uppercase',letterSpacing:0.5},
  placedBadge:{backgroundColor:SCADA.cyanDim,paddingHorizontal:4,paddingVertical:1,borderRadius:3},
  placedText:{color:SCADA.cyan,fontSize:6,fontWeight:'800',letterSpacing:0.5},
  intelOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:200,justifyContent:'flex-end'},
  intelBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(6,14,26,0.7)'},
});

const modalS = StyleSheet.create({
  container:{flex:1,backgroundColor:SCADA.bg},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:20,paddingBottom:14,borderBottomWidth:1,borderBottomColor:SCADA.border,gap:10},
  title:{fontSize:18,fontWeight:'900',color:SCADA.text,letterSpacing:1,fontFamily:Platform.OS==='ios'?'Menlo':'monospace',flex:1},
  newBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:SCADA.cyan,paddingHorizontal:12,paddingVertical:7,borderRadius:8},
  newBtnText:{color:SCADA.bg,fontSize:13,fontWeight:'700'},
  closeBtn:{padding:8,backgroundColor:SCADA.surface,borderRadius:10,borderWidth:1,borderColor:SCADA.border},
  empty:{alignItems:'center',paddingVertical:60,gap:10},
  emptyText:{fontSize:16,fontWeight:'600',color:SCADA.textSec},
  layoutCard:{flexDirection:'row',alignItems:'center',backgroundColor:SCADA.surface,borderRadius:12,borderWidth:1,borderColor:SCADA.border,padding:14},
  layoutCardActive:{borderColor:SCADA.cyan,backgroundColor:SCADA.cyanDim},
  layoutHeader:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  layoutName:{fontSize:15,fontWeight:'700',color:SCADA.text},
  currentBadge:{backgroundColor:SCADA.cyan,paddingHorizontal:6,paddingVertical:2,borderRadius:4},
  currentText:{color:SCADA.bg,fontSize:8,fontWeight:'800',letterSpacing:0.5},
  layoutMeta:{flexDirection:'row',gap:10},
  layoutMetaText:{fontSize:10,color:SCADA.textDim},
});
