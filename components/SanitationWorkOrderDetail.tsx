import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  TouchableOpacity, Alert, Modal, BackHandler, Animated,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useUser } from '@/contexts/UserContext';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  X, CheckCircle, Clock, Play, Pause, Camera, Trash2,
  AlertTriangle, ClipboardList, Droplets, FlaskConical,
  ShieldCheck, UserCheck, Lock, ChevronRight,
  Activity, Zap, Image as ImageIcon, FileText, Plus,
} from 'lucide-react-native';
import {
  SanitationWorkOrder,
  ChecklistCompletion,
  SanPhoto,
  useSupabaseSanitationWorkOrders,
} from '@/hooks/useSupabaseSanitationWorkOrders';
import FormPickerModal from '@/components/FormPickerModal';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

// ─── HUD Theme ────────────────────────────────────────────────────────────────
const HUD = {
  bg: '#020912', bgCard: '#050f1e', bgCardAlt: '#071525',
  cyan: '#00e5ff', cyanDim: '#00e5ff22', cyanMid: '#00e5ff55',
  green: '#00ff88', greenDim: '#00ff8822',
  amber: '#ffb800', amberDim: '#ffb80022',
  red: '#ff2d55', redDim: '#ff2d5522',
  purple: '#7b61ff', purpleDim: '#7b61ff22',
  text: '#e0f4ff', textSec: '#7aa8c8', textDim: '#3a6080',
  border: '#0d2840', borderBright: '#1a4060',
};

const STATUS_COLOR: Record<string, string> = {
  pending: HUD.textDim, in_progress: HUD.cyan,
  awaiting_qa: HUD.amber, completed: HUD.green, cancelled: HUD.red,
};

const FREQ_LABEL: Record<string, string> = {
  hourly: 'HOURLY', per_shift: 'PER SHIFT', daily: 'DAILY',
  weekly: 'WEEKLY', monthly: 'MONTHLY', quarterly: 'QUARTERLY',
  annual: 'ANNUAL', as_needed: 'AS NEEDED', pre_op: 'PRE-OP',
};

// ─── Linked Form type ─────────────────────────────────────────────────────────
interface LinkedForm {
  id: string;
  formType: string;
  formTitle: string;
  formNumber: string;
  completedByName?: string;
  completedAt: string;
}

// ─── Animated Helpers ─────────────────────────────────────────────────────────
function usePulse(ms = 1600) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: ms, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: ms, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return a;
}

function PulsingDot({ color, size = 8 }: { color: string; size?: number }) {
  const p = usePulse(1400);
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
      transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }) }],
    }} />
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHead({ icon, label, color = HUD.cyan }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <View style={sH.row}>
      {icon}
      <Text style={[sH.label, { color }]}>{label}</Text>
      <View style={[sH.line, { backgroundColor: color + '30' }]} />
    </View>
  );
}
const sH = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  line: { flex: 1, height: 1 },
});

// ─── HUD Card ─────────────────────────────────────────────────────────────────
function HUDCard({ children, color = HUD.borderBright, style }: { children: React.ReactNode; color?: string; style?: any }) {
  return (
    <View style={[hC.card, { borderColor: color }, style]}>
      <View style={[hC.cTL, { borderColor: color }]} />
      <View style={[hC.cBR, { borderColor: color }]} />
      {children}
    </View>
  );
}
const hC = StyleSheet.create({
  card: { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, padding: 14, position: 'relative', overflow: 'hidden' },
  cTL: { position: 'absolute', top: 4, left: 4, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRadius: 1 },
  cBR: { position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderRadius: 1 },
});

// ─── HUD Input ────────────────────────────────────────────────────────────────
function HUDInput({
  label, value, onChangeText, placeholder, keyboardType, maxLength,
  editable = true, required = false, accentColor = HUD.cyan, multiline = false,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; maxLength?: number;
  editable?: boolean; required?: boolean; accentColor?: string; multiline?: boolean;
}) {
  const isEmpty = required && value.trim() === '';
  const borderColor = !editable ? HUD.border : isEmpty ? HUD.red + '80' : accentColor + '60';
  return (
    <View style={inp.wrap}>
      <Text style={inp.label}>
        {label}{required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
      <TextInput
        style={[inp.input, {
          borderColor, color: editable ? HUD.text : HUD.textSec,
          backgroundColor: editable ? HUD.bgCardAlt : HUD.border + '40',
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || (required ? 'Required — cannot be left blank' : 'N/A if not applicable')}
        placeholderTextColor={HUD.textDim}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        multiline={multiline}
      />
      {isEmpty && editable && <Text style={inp.err}>This field is required</Text>}
    </View>
  );
}
const inp = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: '500' },
  err: { fontSize: 9, color: HUD.red, marginTop: 3, letterSpacing: 0.5 },
});

// ─── Timer Display ────────────────────────────────────────────────────────────
function TimerDisplay({ elapsed, running, color }: { elapsed: number; running: boolean; color: string }) {
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const sec = elapsed % 60;
  const fmt = (v: number) => String(v).padStart(2, '0');
  const pulse = usePulse(1000);
  return (
    <View style={timerS.display}>
      <Animated.View style={{ opacity: running ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) : 1 }}>
        <Text style={[timerS.digits, { color }]}>{fmt(h)}:{fmt(m)}:{fmt(sec)}</Text>
      </Animated.View>
      <Text style={timerS.unit}>HH:MM:SS ELAPSED</Text>
    </View>
  );
}
const timerS = StyleSheet.create({
  display: { alignItems: 'center', paddingVertical: 8 },
  digits: { fontSize: 40, fontWeight: '900', letterSpacing: 4, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginTop: 4 },
});

// ─── Pause Modal ──────────────────────────────────────────────────────────────
function PauseModal({ visible, onPauseLeave, onStay }: {
  visible: boolean; onPauseLeave: () => void; onStay: () => void;
}) {
  const slideY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 14 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { slideY.setValue(60); opacity.setValue(0); }
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onStay}>
      <View style={pmS.overlay}>
        <Animated.View style={[pmS.sheet, { transform: [{ translateY: slideY }], opacity }]}>
          <View style={[pmS.cTL, { borderColor: HUD.amber }]} />
          <View style={[pmS.cBR, { borderColor: HUD.amber }]} />
          <View style={pmS.iconRow}>
            <View style={[pmS.iconBg, { backgroundColor: HUD.amber + '20', borderColor: HUD.amber + '50' }]}>
              <Clock size={22} color={HUD.amber} />
            </View>
          </View>
          <Text style={pmS.title}>ACTIVE TASK IN PROGRESS</Text>
          <Text style={pmS.body}>
            You have a timer running on this task. Leaving now will pause the clock —
            your labor time won't be fully captured, which can affect work order accuracy and your audit trail.
          </Text>
          <Text style={pmS.question}>Do you want to pause and leave?</Text>
          <TouchableOpacity activeOpacity={0.75} style={[pmS.btn, pmS.btnPause]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPauseLeave(); }}>
            <Pause size={14} color={HUD.amber} />
            <View style={{ flex: 1 }}>
              <Text style={[pmS.btnTitle, { color: HUD.amber }]}>PAUSE &amp; LEAVE</Text>
              <Text style={pmS.btnSub}>Timer pauses. Resume when you return.</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={[pmS.btn, pmS.btnStay]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStay(); }}>
            <Activity size={14} color={HUD.cyan} />
            <View style={{ flex: 1 }}>
              <Text style={[pmS.btnTitle, { color: HUD.cyan }]}>STAY ON TASK</Text>
              <Text style={pmS.btnSub}>Continue working — keep the clock running.</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
const pmS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: HUD.amber + '60', padding: 24, paddingBottom: 44,
    position: 'relative', shadowColor: HUD.amber, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
  },
  cTL: { position: 'absolute', top: 10, left: 10, width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 1 },
  cBR: { position: 'absolute', bottom: 44, right: 10, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderRadius: 1 },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '900', color: HUD.text, textAlign: 'center', letterSpacing: 1, marginBottom: 10 },
  body: { fontSize: 13, color: HUD.textSec, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  question: { fontSize: 11, fontWeight: '800', color: HUD.textDim, letterSpacing: 1.5, textAlign: 'center', marginBottom: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  btnPause: { backgroundColor: HUD.amber + '15', borderColor: HUD.amber + '50' },
  btnStay: { backgroundColor: HUD.cyanDim, borderColor: HUD.cyanMid },
  btnTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  btnSub: { fontSize: 11, color: HUD.textSec, marginTop: 2 },
});

// ─── Photo Thumbnail ──────────────────────────────────────────────────────────
function PhotoThumb({ photo, index, onRemove }: { photo: SanPhoto; index: number; onRemove: () => void }) {
  return (
    <View style={ptS.wrap}>
      <View style={[ptS.thumb, { borderColor: HUD.green + '50' }]}>
        <ImageIcon size={22} color={HUD.green} />
        <Text style={ptS.num}>#{index + 1}</Text>
      </View>
      <Text style={ptS.time}>{new Date(photo.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      <TouchableOpacity onPress={onRemove} style={ptS.del}><Trash2 size={12} color={HUD.red} /></TouchableOpacity>
    </View>
  );
}
const ptS = StyleSheet.create({
  wrap: { width: 72, alignItems: 'center', gap: 3 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: HUD.green + '12', borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  num: { fontSize: 8, fontWeight: '800', color: HUD.green + '99', letterSpacing: 1 },
  time: { fontSize: 8, color: HUD.textDim },
  del: { padding: 3 },
});

// ─── Checklist Item Row ───────────────────────────────────────────────────────
function ChecklistRow({ item, checked, onToggle }: {
  item: { id: string; label: string; required: boolean }; checked: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[clS.row, { borderColor: checked ? HUD.green + '50' : HUD.border }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}>
      <View style={[clS.box, { backgroundColor: checked ? HUD.green + '20' : HUD.bgCardAlt, borderColor: checked ? HUD.green : HUD.borderBright }]}>
        {checked && <CheckCircle size={14} color={HUD.green} />}
      </View>
      <Text style={[clS.label, { color: checked ? HUD.text : HUD.textSec }]}>
        {item.label}{item.required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
    </TouchableOpacity>
  );
}
const clS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: HUD.bgCardAlt, borderRadius: 8, borderWidth: 1, padding: 11, marginBottom: 6 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { fontSize: 12, flex: 1, lineHeight: 17 },
});

// ─── Linked Form Row ──────────────────────────────────────────────────────────
function LinkedFormRow({ form }: { form: LinkedForm }) {
  const typeLabel = (t: string) => {
    if (t === 'sanitation_capa') return 'CAPA';
    if (t === 'sanitation_atp_log') return 'ATP Swab';
    if (t === 'sanitation_ssop_reference') return 'SSOP Ref';
    return t;
  };
  const typeColor = (t: string) => {
    if (t === 'sanitation_capa') return HUD.red;
    if (t === 'sanitation_atp_log') return HUD.amber;
    if (t === 'sanitation_ssop_reference') return HUD.purple;
    return HUD.cyan;
  };
  const color = typeColor(form.formType);
  return (
    <View style={[lfS.row, { borderColor: color + '40', backgroundColor: color + '08' }]}>
      <View style={[lfS.iconBox, { backgroundColor: color + '20' }]}>
        <FileText size={13} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[lfS.typePill, { backgroundColor: color + '20', borderColor: color + '40' }]}>
            <Text style={[lfS.typeLabel, { color }]}>{typeLabel(form.formType)}</Text>
          </View>
          <Text style={lfS.number}>{form.formNumber}</Text>
        </View>
        <Text style={lfS.title} numberOfLines={1}>{form.formTitle}</Text>
        <Text style={lfS.meta}>
          {form.completedByName ? `${form.completedByName} · ` : ''}
          {new Date(form.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <CheckCircle size={14} color={color} />
    </View>
  );
}
const lfS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  number: { fontSize: 10, color: HUD.textDim, fontWeight: '700' },
  title: { fontSize: 12, color: HUD.text, fontWeight: '600', marginTop: 2 },
  meta: { fontSize: 10, color: HUD.textDim, marginTop: 1 },
});

// ═══════════════════════════ MAIN COMPONENT ═══════════════════════════════════

interface Props {
  workOrder: SanitationWorkOrder;
  onClose: () => void;
  canEdit?: boolean;
}

export default function SanitationWorkOrderDetail({ workOrder: initialWO, onClose, canEdit = true }: Props) {
  const { user } = useUser();
  const { organizationId } = useOrganization();
  const router = useRouter();
  const {
    startTimer, pauseTimer, updateWorkOrder,
    submitTechSignature, submitQASignature,
    addPhoto, removePhoto,
    isSubmittingTech, isSubmittingQA,
    formatElapsed,
  } = useSupabaseSanitationWorkOrders();

  // ── Local WO state ─────────────────────────────────────────────────────────
  const [wo, setWO] = useState<SanitationWorkOrder>(initialWO);
  useEffect(() => { setWO(initialWO); }, [initialWO.updated_at]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState<number>(
    (wo.total_elapsed_sec ?? 0) +
    (wo.timer_started_at ? Math.floor((Date.now() - new Date(wo.timer_started_at).getTime()) / 1000) : 0)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<Date | null>(wo.timer_started_at ? new Date(wo.timer_started_at) : null);
  const timerRunning = !!wo.timer_started_at;

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        const base = wo.total_elapsed_sec ?? 0;
        const since = timerStartRef.current ? Math.floor((Date.now() - timerStartRef.current.getTime()) / 1000) : 0;
        setElapsed(base + since);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, wo.total_elapsed_sec]);

  // ── Pause modal ────────────────────────────────────────────────────────────
  const [showPauseModal, setShowPauseModal] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { handleCloseRequest(); return true; });
    return () => sub.remove();
  }, [timerRunning]);

  const handleCloseRequest = useCallback(() => {
    if (timerRunning) { setShowPauseModal(true); } else { onClose(); }
  }, [timerRunning, onClose]);

  const handlePauseLeave = useCallback(async () => {
    setShowPauseModal(false);
    const addSec = timerStartRef.current ? Math.floor((Date.now() - timerStartRef.current.getTime()) / 1000) : 0;
    try { const updated = await pauseTimer({ id: wo.id, additionalSec: addSec }); setWO(updated); }
    catch (e) { console.error('[SanWO] pauseTimer failed', e); }
    onClose();
  }, [wo.id, timerRunning]);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [chemical, setChemical] = useState(wo.chemical_used || '');
  const [concentration, setConcentration] = useState(wo.actual_concentration || '');
  const [method, setMethod] = useState(wo.application_method || '');
  const [notes, setNotes] = useState(wo.notes || '');
  const [checklistCompletion, setChecklistCompletion] = useState<ChecklistCompletion>(wo.checklist_completion || {});
  const [atpReading, setAtpReading] = useState(wo.atp_reading_rlu != null ? String(wo.atp_reading_rlu) : '');
  const [techInitial, setTechInitial] = useState(wo.tech_initial || '');
  const [techPPN, setTechPPN] = useState(wo.tech_ppn || '');
  const [qaInitial, setQAInitial] = useState(wo.qa_initial || '');
  const [qaPPN, setQAPPN] = useState(wo.qa_ppn || '');
  const photos: SanPhoto[] = wo.photos || [];

  const isCompleted = wo.status === 'completed';
  const isAwaitingQA = wo.status === 'awaiting_qa';
  const techSigned = !!wo.tech_signed_at;
  const isEditable = canEdit && !isCompleted;

  // ── ATP result ─────────────────────────────────────────────────────────────
  const atpRLU = parseFloat(atpReading);
  const atpResult = !isNaN(atpRLU) ? (atpRLU <= (wo.atp_pass_threshold || 250) ? 'pass' : 'fail') : null;

  // ── REACTIVE FORMS section ─────────────────────────────────────────────────
  const [linkedForms, setLinkedForms] = useState<LinkedForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [pendingFormReturn, setPendingFormReturn] = useState(false);

  const loadLinkedForms = useCallback(async () => {
    setFormsLoading(true);
    try {
      const [capaRes, atpRes, ssopRes] = await Promise.all([
        supabase
          .from('sanitation_capa')
          .select('id, capa_number, how_detected, room, tech_name, tech_signed_at')
          .eq('sanitation_wo_id', wo.id)
          .eq('org_id', organizationId)
          .order('tech_signed_at', { ascending: false }),
        supabase
          .from('sanitation_atp_logs')
          .select('id, log_number, surface_location, room, atp_result, tech_name, tech_signed_at')
          .eq('sanitation_wo_id', wo.id)
          .eq('org_id', organizationId)
          .order('tech_signed_at', { ascending: false }),
        supabase
          .from('sanitation_ssop_references')
          .select('id, ref_number, ssop_code, ssop_title, room, tech_name, tech_signed_at')
          .eq('sanitation_wo_id', wo.id)
          .eq('org_id', organizationId)
          .order('tech_signed_at', { ascending: false }),
      ]);

      const forms: LinkedForm[] = [];
      for (const row of capaRes.data || []) {
        forms.push({ id: row.id, formType: 'sanitation_capa', formNumber: row.capa_number, formTitle: `CAPA — ${row.room} — ${row.how_detected}`, completedByName: row.tech_name, completedAt: row.tech_signed_at });
      }
      for (const row of atpRes.data || []) {
        forms.push({ id: row.id, formType: 'sanitation_atp_log', formNumber: row.log_number, formTitle: `ATP Swab — ${row.room} — ${row.surface_location} — ${(row.atp_result || '').toUpperCase()}`, completedByName: row.tech_name, completedAt: row.tech_signed_at });
      }
      for (const row of ssopRes.data || []) {
        forms.push({ id: row.id, formType: 'sanitation_ssop_reference', formNumber: row.ref_number, formTitle: `SSOP Ref — ${row.ssop_code} — ${row.room}`, completedByName: row.tech_name, completedAt: row.tech_signed_at });
      }
      forms.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setLinkedForms(forms);
    } catch (err) {
      console.warn('[SanWO] loadLinkedForms error (non-blocking):', err);
    } finally {
      setFormsLoading(false);
    }
  }, [wo.id, organizationId]);

  useEffect(() => { loadLinkedForms(); }, [loadLinkedForms]);

  // Refresh linked forms when returning from a reactive form screen
  useFocusEffect(
    useCallback(() => {
      if (pendingFormReturn) {
        setPendingFormReturn(false);
        loadLinkedForms();
      }
    }, [pendingFormReturn, loadLinkedForms])
  );

  const handleFormSelected = useCallback((form: { id: string; label: string; route: string }) => {
    setShowFormPicker(false);
    setPendingFormReturn(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const postId = wo.task_feed_post_id || '';
    const postNumber = wo.task_feed_post_number || wo.wo_number || '';
    const separator = form.route.includes('?') ? '&' : '?';
    const routeWithParams = `${form.route}${separator}woId=${wo.id}&postId=${encodeURIComponent(postId)}&postNumber=${encodeURIComponent(postNumber)}`;

    setTimeout(() => { router.push(routeWithParams as any); }, 300);
  }, [wo.id, wo.task_feed_post_id, wo.task_feed_post_number, wo.wo_number, router]);

  // ── Start Timer ────────────────────────────────────────────────────────────
  const handleStartTimer = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isFirstStart = !wo.started_at;
    const now = new Date();
    timerStartRef.current = now;
    setWO(prev => ({ ...prev, timer_started_at: now.toISOString(), status: 'in_progress', started_at: prev.started_at || now.toISOString() }));
    try {
      const updated = await startTimer({ id: wo.id, isFirstStart });
      setWO(updated);
      timerStartRef.current = updated.timer_started_at ? new Date(updated.timer_started_at) : now;
    } catch (e) { console.error('[SanWO] startTimer failed', e); setWO(prev => ({ ...prev, timer_started_at: null })); }
  }, [wo.id, wo.started_at]);

  // ── Pause Timer ────────────────────────────────────────────────────────────
  const handlePauseTimer = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const addSec = timerStartRef.current ? Math.floor((Date.now() - timerStartRef.current.getTime()) / 1000) : 0;
    const newTotal = (wo.total_elapsed_sec ?? 0) + addSec;
    setWO(prev => ({ ...prev, timer_started_at: null, total_elapsed_sec: newTotal }));
    setElapsed(newTotal);
    timerStartRef.current = null;
    try { const updated = await pauseTimer({ id: wo.id, additionalSec: addSec }); setWO(updated); }
    catch (e) { console.error('[SanWO] pauseTimer failed', e); }
  }, [wo.id, wo.total_elapsed_sec]);

  // ── Add Photo ──────────────────────────────────────────────────────────────
  const handleAddPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera Access Required', 'Please allow camera access in Settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      const photo: SanPhoto = { uri: result.assets[0].uri, capturedAt: new Date().toISOString() };
      const updated = await addPhoto({ id: wo.id, photo });
      setWO(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [wo.id]);

  const handleRemovePhoto = useCallback(async (index: number) => {
    Alert.alert('Remove Photo', 'Remove this photo from the task record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { const updated = await removePhoto({ id: wo.id, photoIndex: index }); setWO(updated); } },
    ]);
  }, [wo.id]);

  // ── Checklist ──────────────────────────────────────────────────────────────
  const handleChecklistToggle = useCallback((itemId: string) => {
    setChecklistCompletion(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const allRequiredChecked = (wo.checklist_items || []).filter(i => i.required).every(i => checklistCompletion[i.id]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const canSubmitTech = (
    chemical.trim() !== '' && concentration.trim() !== '' && method.trim() !== '' &&
    allRequiredChecked && photos.length >= 1 &&
    techInitial.trim() !== '' && techPPN.trim() !== '' &&
    (!wo.requires_atp_test || atpReading.trim() !== '')
  );
  const canSubmitQA = techSigned && qaInitial.trim() !== '' && qaPPN.trim() !== '';

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSave = useCallback((field: string, value: any) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(async () => {
      try { await updateWorkOrder({ id: wo.id, updates: { [field]: value } }); }
      catch (e) { console.error('[SanWO] autoSave failed', e); }
    }, 1500);
  }, [wo.id]);

  // ── Submit Tech ────────────────────────────────────────────────────────────
  const handleSubmitTech = useCallback(async () => {
    if (!canSubmitTech) {
      Alert.alert('Incomplete Task', 'All required fields must be filled. Every required checklist item must be checked. At least one photo required. Initial and PPN required.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let additionalSec = 0;
    if (timerRunning && timerStartRef.current) additionalSec = Math.floor((Date.now() - timerStartRef.current.getTime()) / 1000);
    const atpRLUVal = wo.requires_atp_test && atpReading ? parseFloat(atpReading) : null;
    try {
      const updated = await submitTechSignature({
        id: wo.id, initial: techInitial, ppn: techPPN, requiresQA: wo.requires_qa_signoff,
        finalUpdates: {
          chemical_used: chemical, actual_concentration: concentration, application_method: method,
          notes: notes || null, checklist_completion: checklistCompletion,
          atp_reading_rlu: atpRLUVal,
          atp_result: atpRLUVal != null ? (atpRLUVal <= wo.atp_pass_threshold ? 'pass' : 'fail') : null,
          total_elapsed_sec: (wo.total_elapsed_sec ?? 0) + additionalSec, timer_started_at: null,
        },
      });
      setWO(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Submission Error', 'Failed to submit tech signature. Please try again.');
      console.error('[SanWO] submitTech failed', e);
    }
  }, [canSubmitTech, wo, chemical, concentration, method, notes, checklistCompletion, techInitial, techPPN, atpReading, timerRunning]);

  // ── Submit QA ──────────────────────────────────────────────────────────────
  const handleSubmitQA = useCallback(async () => {
    if (!canSubmitQA) { Alert.alert('Incomplete QA Sign-Off', 'Tech signature must be complete. Initial and PPN required.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const updated = await submitQASignature({
        id: wo.id, initial: qaInitial, ppn: qaPPN,
        signedByName: user ? `${user.first_name} ${user.last_name}` : 'QA', signedById: user?.id || '',
      });
      setWO(updated);
    } catch (e) { Alert.alert('QA Sign-Off Error', 'Failed to submit QA signature.'); console.error('[SanWO] submitQA failed', e); }
  }, [canSubmitQA, wo.id, qaInitial, qaPPN, user]);

  const statusColor = STATUS_COLOR[wo.status] || HUD.textDim;
  const timerColor = timerRunning ? HUD.cyan : elapsed > 0 ? HUD.textSec : HUD.textDim;
  const postNumberDisplay = wo.task_feed_post_number || wo.wo_number || '';

  // ─────────────────────────────────── RENDER ────────────────────────────────
  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: statusColor + '50', shadowColor: statusColor }]}>
        <Pressable style={s.backBtn} onPress={handleCloseRequest}>
          <X size={18} color={HUD.cyan} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>SANITATION  ·  TULSENZ OPS</Text>
          <Text style={s.woNumber}>{wo.wo_number || wo.sanitation_wo_number}</Text>
          <Text style={[s.taskName, { color: statusColor }]} numberOfLines={1}>{wo.task_name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[s.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor + '60' }]}>
            {timerRunning ? <PulsingDot color={statusColor} size={6} /> : null}
            <Text style={[s.statusTxt, { color: statusColor }]}>{wo.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          {wo.is_preop && (
            <View style={[s.statusPill, { backgroundColor: HUD.amber + '20', borderColor: HUD.amber + '50' }]}>
              <Text style={[s.statusTxt, { color: HUD.amber }]}>PRE-OP</Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">

          {/* ── 1: WO INFO ── */}
          <View style={s.section}>
            <SectionHead icon={<ClipboardList size={12} color={HUD.cyan} />} label="WORK ORDER INFO" />
            <HUDCard>
              <View style={s.infoGrid}>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>AREA / ROOM</Text>
                  <Text style={s.infoValue}>{wo.room || wo.room_code || wo.area || '—'}</Text>
                </View>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>FREQUENCY</Text>
                  <Text style={[s.infoValue, { color: HUD.cyan }]}>{FREQ_LABEL[wo.frequency] || wo.frequency?.toUpperCase()}</Text>
                </View>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>SCHEDULED DATE</Text>
                  <Text style={s.infoValue}>{wo.scheduled_date}</Text>
                </View>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>TEMPLATE CODE</Text>
                  <Text style={[s.infoValue, { color: HUD.textSec }]}>{wo.template_code || '—'}</Text>
                </View>
                {wo.requires_atp_test && (
                  <View style={s.infoCell}>
                    <Text style={s.infoLabel}>ATP THRESHOLD</Text>
                    <Text style={[s.infoValue, { color: HUD.amber }]}>≤ {wo.atp_pass_threshold} RLU</Text>
                  </View>
                )}
                {wo.requires_qa_signoff && (
                  <View style={s.infoCell}>
                    <Text style={s.infoLabel}>QA SIGN-OFF</Text>
                    <Text style={[s.infoValue, { color: HUD.amber }]}>REQUIRED</Text>
                  </View>
                )}
              </View>
            </HUDCard>
          </View>

          {/* ── 2: ASSIGNMENT ── */}
          <View style={s.section}>
            <SectionHead icon={<UserCheck size={12} color={HUD.green} />} label="ASSIGNMENT" color={HUD.green} />
            <HUDCard color={HUD.green + '40'}>
              <Text style={s.infoLabel}>ASSIGNED TO</Text>
              <View style={s.assignedRow}>
                <View style={[s.assignedDot, { backgroundColor: HUD.green }]} />
                <Text style={[s.assignedName, { color: HUD.green }]}>
                  {wo.assigned_to_name || wo.assigned_to || (user ? `${user.first_name} ${user.last_name}` : 'Unassigned')}
                </Text>
                <View style={[s.lockedBadge, { backgroundColor: HUD.green + '20', borderColor: HUD.green + '40' }]}>
                  <Lock size={8} color={HUD.green} />
                  <Text style={[s.lockedTxt, { color: HUD.green }]}>AUTO-FILL</Text>
                </View>
              </View>
              {wo.started_at && <Text style={s.startedAt}>Started: {new Date(wo.started_at).toLocaleString()}</Text>}
            </HUDCard>
          </View>

          {/* ── 3: TIMER ── */}
          <View style={s.section}>
            <SectionHead icon={<Clock size={12} color={timerColor} />} label="TASK TIMER" color={timerColor} />
            <HUDCard color={timerColor + '50'} style={{ alignItems: 'center' }}>
              <TimerDisplay elapsed={elapsed} running={timerRunning} color={timerColor} />
              {isEditable && !isCompleted && !isAwaitingQA && (
                <View style={s.timerBtnRow}>
                  {!timerRunning ? (
                    <TouchableOpacity activeOpacity={0.75} style={[s.timerBtn, { backgroundColor: HUD.cyanDim, borderColor: HUD.cyanMid }]} onPress={handleStartTimer}>
                      <Play size={15} color={HUD.cyan} />
                      <Text style={[s.timerBtnTxt, { color: HUD.cyan }]}>{elapsed > 0 ? 'RESUME TASK' : 'START TASK'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity activeOpacity={0.75} style={[s.timerBtn, { backgroundColor: HUD.amber + '18', borderColor: HUD.amber + '50' }]} onPress={handlePauseTimer}>
                      <Pause size={15} color={HUD.amber} />
                      <Text style={[s.timerBtnTxt, { color: HUD.amber }]}>PAUSE TIMER</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {(isCompleted || isAwaitingQA) && elapsed > 0 && (
                <Text style={s.finalTime}>TOTAL LABOR: {formatElapsed(elapsed)}</Text>
              )}
            </HUDCard>
          </View>

          {/* ── 3b: REACTIVE FORMS ── */}
          <View style={s.section}>
            <SectionHead icon={<FileText size={12} color={HUD.red} />} label="REACTIVE FORMS" color={HUD.red} />
            <HUDCard color={linkedForms.length > 0 ? HUD.red + '40' : HUD.borderBright}>
              <Text style={fS.explainer}>
                File a CAPA, ATP Swab Log, or SSOP Reference if this task uncovered an issue requiring documentation beyond the standard work order.
              </Text>

              {formsLoading && (
                <View style={fS.loadingRow}>
                  <ActivityIndicator size="small" color={HUD.red} />
                  <Text style={fS.loadingTxt}>Loading linked forms...</Text>
                </View>
              )}

              {!formsLoading && linkedForms.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  {linkedForms.map(form => <LinkedFormRow key={form.id} form={form} />)}
                </View>
              )}

              {!formsLoading && linkedForms.length === 0 && (
                <View style={fS.emptyRow}>
                  <FileText size={16} color={HUD.textDim} />
                  <Text style={fS.emptyTxt}>No reactive forms filed yet</Text>
                </View>
              )}

              {isEditable && !techSigned && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[fS.addBtn, { borderColor: HUD.red + '50', backgroundColor: HUD.redDim }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFormPicker(true); }}
                >
                  <Plus size={14} color={HUD.red} />
                  <Text style={[fS.addBtnTxt, { color: HUD.red }]}>FILE REACTIVE FORM</Text>
                </TouchableOpacity>
              )}

              {(techSigned || isCompleted) && linkedForms.length === 0 && (
                <View style={[fS.lockedNote, { borderColor: HUD.borderBright, backgroundColor: HUD.bgCardAlt }]}>
                  <Lock size={10} color={HUD.textDim} />
                  <Text style={fS.lockedNoteTxt}>Reactive forms can only be filed before tech signature</Text>
                </View>
              )}
            </HUDCard>
          </View>

          {/* ── 4: TASK EXECUTION ── */}
          <View style={s.section}>
            <SectionHead icon={<Droplets size={12} color={HUD.cyan} />} label="TASK EXECUTION" />
            <HUDCard>
              <HUDInput label="CHEMICAL USED" value={chemical} onChangeText={(t) => { setChemical(t); autoSave('chemical_used', t); }} required editable={isEditable && !techSigned} placeholder="e.g. Kay-5 Sanitizer" />
              <HUDInput label="ACTUAL CONCENTRATION (PPM / RATIO)" value={concentration} onChangeText={(t) => { setConcentration(t); autoSave('actual_concentration', t); }} required editable={isEditable && !techSigned} placeholder="e.g. 200 ppm / 1:128" />
              <HUDInput label="APPLICATION METHOD" value={method} onChangeText={(t) => { setMethod(t); autoSave('application_method', t); }} required editable={isEditable && !techSigned} placeholder="e.g. Spray & Wipe, Foam, Flood" />
            </HUDCard>
          </View>

          {/* ── 4b: CHECKLIST ── */}
          {(wo.checklist_items || []).length > 0 && (
            <View style={s.section}>
              <SectionHead icon={<ClipboardList size={12} color={HUD.purple} />} label="CHECKLIST" color={HUD.purple} />
              <View>
                {(wo.checklist_items || []).map((item) => (
                  <ChecklistRow key={item.id} item={item} checked={!!checklistCompletion[item.id]}
                    onToggle={() => { if (!isEditable || techSigned) return; handleChecklistToggle(item.id); }} />
                ))}
              </View>
              {!allRequiredChecked && isEditable && !techSigned && (
                <View style={[s.alertBanner, { borderColor: HUD.amber + '50', backgroundColor: HUD.amberDim }]}>
                  <AlertTriangle size={12} color={HUD.amber} />
                  <Text style={[s.alertTxt, { color: HUD.amber }]}>All required checklist items must be completed before signing</Text>
                </View>
              )}
            </View>
          )}

          {/* ── 5: ATP READING ── */}
          {wo.requires_atp_test && (
            <View style={s.section}>
              <SectionHead icon={<FlaskConical size={12} color={HUD.amber} />} label="ATP SWAB READING" color={HUD.amber} />
              <HUDCard color={HUD.amber + '40'}>
                <HUDInput label="RLU READING" value={atpReading} onChangeText={setAtpReading} required keyboardType="numeric" editable={isEditable && !techSigned} accentColor={HUD.amber} placeholder="Enter RLU value from meter" />
                {atpResult && (
                  <View style={[s.atpResult, { backgroundColor: atpResult === 'pass' ? HUD.green + '15' : HUD.red + '15', borderColor: atpResult === 'pass' ? HUD.green + '50' : HUD.red + '50' }]}>
                    {atpResult === 'pass' ? <CheckCircle size={14} color={HUD.green} /> : <AlertTriangle size={14} color={HUD.red} />}
                    <Text style={[s.atpResultTxt, { color: atpResult === 'pass' ? HUD.green : HUD.red }]}>
                      {atpResult === 'pass' ? `PASS — ${atpRLU} RLU ≤ ${wo.atp_pass_threshold} threshold` : `FAIL — ${atpRLU} RLU exceeds ${wo.atp_pass_threshold} threshold`}
                    </Text>
                  </View>
                )}
                {atpResult === 'fail' && (
                  <View style={[s.alertBanner, { borderColor: HUD.red + '50', backgroundColor: HUD.redDim, marginTop: 8 }]}>
                    <AlertTriangle size={12} color={HUD.red} />
                    <Text style={[s.alertTxt, { color: HUD.red }]}>
                      ATP failure requires corrective action. File a Reactive ATP Swab Log above and notify Quality.
                    </Text>
                  </View>
                )}
              </HUDCard>
            </View>
          )}

          {/* ── 6: PHOTOS ── */}
          <View style={s.section}>
            <SectionHead icon={<Camera size={12} color={HUD.green} />} label="PHOTOS" color={HUD.green} />
            <HUDCard color={photos.length >= 1 ? HUD.green + '40' : HUD.red + '40'}>
              <View style={s.photoHeader}>
                <Text style={s.photoCount}>
                  {photos.length} / {photos.length < 1 ? <Text style={{ color: HUD.red }}>0 — MINIMUM 1 REQUIRED</Text> : photos.length}
                </Text>
                {photos.length < 1 && (
                  <View style={[s.lockedBadge, { backgroundColor: HUD.red + '20', borderColor: HUD.red + '40' }]}>
                    <AlertTriangle size={8} color={HUD.red} />
                    <Text style={[s.lockedTxt, { color: HUD.red }]}>REQUIRED</Text>
                  </View>
                )}
              </View>
              <View style={s.photoGrid}>
                {photos.map((photo, i) => <PhotoThumb key={i} photo={photo} index={i} onRemove={() => handleRemovePhoto(i)} />)}
                {isEditable && !techSigned && (
                  <TouchableOpacity activeOpacity={0.75} style={s.addPhotoBtn} onPress={handleAddPhoto}>
                    <Camera size={20} color={HUD.green} />
                    <Text style={s.addPhotoBtnTxt}>ADD PHOTO</Text>
                  </TouchableOpacity>
                )}
              </View>
            </HUDCard>
          </View>

          {/* ── 7: NOTES ── */}
          <View style={s.section}>
            <HUDCard>
              <HUDInput label="NOTES" value={notes} onChangeText={(t) => { setNotes(t); autoSave('notes', t); }} editable={isEditable} multiline placeholder="N/A if not applicable" />
            </HUDCard>
          </View>

          {/* ── 8: TECH SIGNATURE ── */}
          <View style={s.section}>
            <SectionHead icon={<ShieldCheck size={12} color={HUD.cyan} />} label="TECHNICIAN SIGNATURE" />
            <HUDCard color={techSigned ? HUD.green + '50' : HUD.cyan + '40'}>
              {techSigned ? (
                <View style={s.signedConfirm}>
                  <CheckCircle size={18} color={HUD.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.signedTitle, { color: HUD.green }]}>TECH SIGNED</Text>
                    <Text style={s.signedMeta}>{wo.tech_initial} · PPN {wo.tech_ppn} · {wo.tech_signed_at ? new Date(wo.tech_signed_at).toLocaleString() : ''}</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={s.signNote}>By signing, I confirm this task was completed per SSOP and all information above is accurate.</Text>
                  <View style={s.sigRow}>
                    <View style={{ flex: 1 }}>
                      <HUDInput label="INITIAL(S)" value={techInitial} onChangeText={setTechInitial} required maxLength={4} editable={isEditable && !techSigned} placeholder="e.g. VK" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <HUDInput label="PPN" value={techPPN} onChangeText={setTechPPN} required maxLength={10} editable={isEditable && !techSigned} placeholder="Employee PPN" />
                    </View>
                  </View>
                  {isEditable && (
                    <TouchableOpacity
                      activeOpacity={canSubmitTech ? 0.75 : 0.4}
                      style={[s.submitBtn, { backgroundColor: canSubmitTech ? HUD.cyanDim : HUD.border, borderColor: canSubmitTech ? HUD.cyanMid : HUD.borderBright, opacity: canSubmitTech ? 1 : 0.5 }]}
                      onPress={handleSubmitTech}
                      disabled={!canSubmitTech || isSubmittingTech}
                    >
                      {isSubmittingTech ? <ActivityIndicator size="small" color={HUD.cyan} /> : <CheckCircle size={16} color={HUD.cyan} />}
                      <Text style={[s.submitBtnTxt, { color: HUD.cyan }]}>{wo.requires_qa_signoff ? 'SIGN & SUBMIT FOR QA REVIEW' : 'SIGN & COMPLETE TASK'}</Text>
                    </TouchableOpacity>
                  )}
                  {!canSubmitTech && isEditable && <Text style={s.submitNote}>Complete all required fields, checklist, and photos before signing</Text>}
                </>
              )}
            </HUDCard>
          </View>

          {/* ── 9: QA SIGNATURE ── */}
          {wo.requires_qa_signoff && (
            <View style={s.section}>
              <SectionHead icon={<ShieldCheck size={12} color={HUD.amber} />} label="QA SIGN-OFF" color={HUD.amber} />
              <HUDCard color={wo.qa_signed_at ? HUD.green + '50' : techSigned ? HUD.amber + '40' : HUD.border}>
                {wo.qa_signed_at ? (
                  <View style={s.signedConfirm}>
                    <CheckCircle size={18} color={HUD.green} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.signedTitle, { color: HUD.green }]}>QA SIGNED</Text>
                      <Text style={s.signedMeta}>{wo.qa_initial} · PPN {wo.qa_ppn} · {wo.qa_signed_by_name} · {wo.qa_signed_at ? new Date(wo.qa_signed_at).toLocaleString() : ''}</Text>
                    </View>
                  </View>
                ) : !techSigned ? (
                  <View style={s.lockedSection}>
                    <Lock size={16} color={HUD.textDim} />
                    <Text style={s.lockedMsg}>QA sign-off is locked until technician signature is complete</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.signNote}>QA verification: I confirm this area meets sanitation standards and is cleared for production.</Text>
                    <View style={s.sigRow}>
                      <View style={{ flex: 1 }}>
                        <HUDInput label="QA INITIAL(S)" value={qaInitial} onChangeText={setQAInitial} required maxLength={4} editable={true} accentColor={HUD.amber} placeholder="e.g. JR" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <HUDInput label="QA PPN" value={qaPPN} onChangeText={setQAPPN} required maxLength={10} editable={true} accentColor={HUD.amber} placeholder="QA PPN" />
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={canSubmitQA ? 0.75 : 0.4}
                      style={[s.submitBtn, { backgroundColor: canSubmitQA ? HUD.amber + '18' : HUD.border, borderColor: canSubmitQA ? HUD.amber + '60' : HUD.borderBright, opacity: canSubmitQA ? 1 : 0.5 }]}
                      onPress={handleSubmitQA}
                      disabled={!canSubmitQA || isSubmittingQA}
                    >
                      {isSubmittingQA ? <ActivityIndicator size="small" color={HUD.amber} /> : <CheckCircle size={16} color={HUD.amber} />}
                      <Text style={[s.submitBtnTxt, { color: HUD.amber }]}>QA SIGN-OFF — MARK COMPLETE</Text>
                    </TouchableOpacity>
                  </>
                )}
              </HUDCard>
            </View>
          )}

          {/* ── COMPLETED BANNER ── */}
          {isCompleted && (
            <HUDCard color={HUD.green + '60'} style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
              <CheckCircle size={28} color={HUD.green} />
              <Text style={{ fontSize: 16, fontWeight: '900', color: HUD.green, letterSpacing: 1.5 }}>TASK COMPLETE</Text>
              {wo.completed_at && <Text style={{ fontSize: 11, color: HUD.textSec }}>Completed {new Date(wo.completed_at).toLocaleString()}</Text>}
              {elapsed > 0 && <Text style={{ fontSize: 11, color: HUD.textSec }}>Total labor: {formatElapsed(elapsed)}</Text>}
            </HUDCard>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Pause Modal ── */}
      <PauseModal visible={showPauseModal} onPauseLeave={handlePauseLeave} onStay={() => setShowPauseModal(false)} />

      {/* ── Form Picker Modal ── */}
      <FormPickerModal
        visible={showFormPicker}
        onClose={() => setShowFormPicker(false)}
        departmentCode="1002"
        departmentName="Sanitation"
        taskPostNumber={postNumberDisplay}
        templateName={wo.task_name}
        onFormSelected={handleFormSelected}
        completedForms={linkedForms.map(f => ({
          formId: f.id,
          formType: f.formType,
          completedAt: f.completedAt,
          completedByName: f.completedByName || '',
        }))}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const fS = StyleSheet.create({
  explainer: { fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingTxt: { fontSize: 11, color: HUD.textDim },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 10 },
  emptyTxt: { fontSize: 12, color: HUD.textDim, fontStyle: 'italic' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 10, borderWidth: 1 },
  addBtnTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  lockedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  lockedNoteTxt: { fontSize: 10, color: HUD.textDim, fontStyle: 'italic', flex: 1 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 2, gap: 10, backgroundColor: HUD.bgCard,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  backBtn: { padding: 8, backgroundColor: HUD.cyanDim, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyanMid },
  eyebrow: { fontSize: 8, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 2 },
  woNumber: { fontSize: 16, fontWeight: '900', color: HUD.text, letterSpacing: 1 },
  taskName: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  section: { marginBottom: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoCell: { minWidth: '45%', gap: 3 },
  infoLabel: { fontSize: 8, fontWeight: '800', color: HUD.textDim, letterSpacing: 1.5 },
  infoValue: { fontSize: 13, fontWeight: '700', color: HUD.text },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  assignedDot: { width: 8, height: 8, borderRadius: 4 },
  assignedName: { fontSize: 15, fontWeight: '800', flex: 1 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  lockedTxt: { fontSize: 7, fontWeight: '800', letterSpacing: 1 },
  startedAt: { fontSize: 10, color: HUD.textDim, marginTop: 6, letterSpacing: 0.3 },
  timerBtnRow: { marginTop: 12, width: '100%' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  timerBtnTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  finalTime: { fontSize: 12, color: HUD.textSec, marginTop: 8, letterSpacing: 1, fontWeight: '700' },
  signNote: { fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 12 },
  sigRow: { flexDirection: 'row', gap: 10 },
  signedConfirm: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signedTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  signedMeta: { fontSize: 10, color: HUD.textSec, marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  submitBtnTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  submitNote: { fontSize: 10, color: HUD.textDim, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
  lockedSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  lockedMsg: { fontSize: 12, color: HUD.textDim, flex: 1, lineHeight: 17 },
  atpResult: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  atpResultTxt: { fontSize: 13, fontWeight: '800', flex: 1 },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  photoCount: { fontSize: 11, fontWeight: '700', color: HUD.textSec },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addPhotoBtn: { width: 64, height: 64, borderRadius: 8, backgroundColor: HUD.green + '12', borderWidth: 1, borderColor: HUD.green + '50', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 3 },
  addPhotoBtnTxt: { fontSize: 7, fontWeight: '800', color: HUD.green, letterSpacing: 1 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  alertTxt: { fontSize: 11, flex: 1, lineHeight: 16, fontWeight: '600' },
});
