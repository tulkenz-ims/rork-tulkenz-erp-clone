import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { ShieldCheck, CalendarClock, Rocket, X, Save, Edit3, Plus, Trash2 } from 'lucide-react-native';

const HUD = {
  bg:           '#020912',
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  green:        '#00ff88',
  amber:        '#ffb800',
  red:          '#ff2d55',
  purple:       '#7b61ff',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

// ── All logic unchanged ────────────────────────────────────────────────────────
interface AuditDate { label: string; date: Date; color: string; }
interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; total: number; }

function getTimeLeft(target: Date): TimeLeft {
  const now = new Date().getTime();
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: diff };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function getUrgencyColor(days: number, total: number): string {
  if (total <= 0) return HUD.purple;
  if (days <= 1)  return HUD.purple;
  if (days <= 30) return HUD.red;
  if (days <= 90) return HUD.amber;
  return HUD.green;
}

const GO_MESSAGES = [
  { text: "It's Go Time!", sub: "We're ready. We've got this." },
  { text: "Bring It On!",  sub: "Every checklist complete." },
  { text: "Let's Do This!", sub: "Prepared. Confident. Ready." },
];

const AUDIT_COLORS = [HUD.cyan, HUD.purple, HUD.amber, HUD.green, HUD.red, '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

const ALL_AUDITS: AuditDate[] = [
  { label: 'SQF Audit',       date: new Date(2026, 1, 15, 9, 0, 0),  color: HUD.cyan },
  { label: 'GFCO Audit',      date: new Date(2026, 3, 10, 9, 0, 0),  color: HUD.purple },
  { label: 'FDA Inspection',  date: new Date(2026, 4, 20, 9, 0, 0),  color: HUD.red },
  { label: 'Kosher Audit',    date: new Date(2026, 5, 5,  9, 0, 0),  color: HUD.green },
  { label: 'EPA Audit',       date: new Date(2026, 6, 15, 9, 0, 0),  color: '#06B6D4' },
  { label: 'FSMA Inspection', date: new Date(2026, 8, 1,  9, 0, 0),  color: '#F97316' },
  { label: 'Pest Control',    date: new Date(2026, 2, 15, 9, 0, 0),  color: '#84CC16' },
  { label: 'Fire Marshal',    date: new Date(2026, 7, 1,  9, 0, 0),  color: '#EC4899' },
  { label: 'OSHA Inspection', date: new Date(2026, 10, 1, 9, 0, 0),  color: HUD.amber },
  { label: 'State Health Dept',date: new Date(2026, 9, 15, 9, 0, 0), color: '#6366F1' },
];

export default function ComplianceCountdown() {
  const [now, setNow] = useState(Date.now());
  const [audits, setAudits] = useState<AuditDate[]>(ALL_AUDITS);
  const [showManage, setShowManage] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editYear, setEditYear] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleAudits = useMemo(() => {
    const upcoming = audits
      .filter(a => getTimeLeft(a.date).total > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const within90 = upcoming.filter(a => getTimeLeft(a.date).days <= 90);
    if (within90.length >= 3) return within90.slice(0, 4);
    return upcoming.slice(0, 3);
  }, [audits, now]);

  const openEdit = (idx: number | null) => {
    if (idx !== null) {
      const a = audits[idx];
      setEditLabel(a.label);
      setEditMonth(String(a.date.getMonth() + 1));
      setEditDay(String(a.date.getDate()));
      setEditYear(String(a.date.getFullYear()));
    } else {
      setEditLabel(''); setEditMonth(''); setEditDay('');
      setEditYear(String(new Date().getFullYear()));
    }
    setEditIdx(idx);
  };

  const saveEdit = () => {
    const m = parseInt(editMonth) - 1, d = parseInt(editDay), y = parseInt(editYear);
    if (!editLabel.trim() || isNaN(m) || isNaN(d) || isNaN(y) || m < 0 || m > 11 || d < 1 || d > 31 || y < 2024) {
      Alert.alert('Invalid', 'Please enter a valid name and date.'); return;
    }
    const newAudits = [...audits];
    if (editIdx !== null) {
      newAudits[editIdx] = { ...newAudits[editIdx], label: editLabel.trim(), date: new Date(y, m, d, 9, 0, 0) };
    } else {
      newAudits.push({ label: editLabel.trim(), date: new Date(y, m, d, 9, 0, 0), color: AUDIT_COLORS[newAudits.length % AUDIT_COLORS.length] });
    }
    setAudits(newAudits);
    setEditIdx(null);
  };

  const deleteAudit = (idx: number) => {
    Alert.alert('Delete', `Remove "${audits[idx].label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setAudits(prev => prev.filter((_, i) => i !== idx)) },
    ]);
  };

  const totalUpcoming = audits.filter(a => getTimeLeft(a.date).total > 0).length;

  return (
    <View>
      {/* Header */}
      <View style={S.header}>
        <View style={S.titleRow}>
          <ShieldCheck size={13} color={HUD.green} />
          <Text style={S.title}>Compliance</Text>
          <View style={S.countBadge}>
            <Text style={S.countTxt}>{totalUpcoming}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowManage(true)} hitSlop={8}>
          <Text style={S.manageLink}>Manage</Text>
        </TouchableOpacity>
      </View>

      {/* Cards row */}
      <View style={S.cardRow}>
        {visibleAudits.map((audit, idx) => {
          const tl = getTimeLeft(audit.date);
          const urgency = getUrgencyColor(tl.days, tl.total);
          const isGoTime = tl.days <= 1 && tl.total > 0;
          const isPast = tl.total <= 0;
          const isTomorrow = tl.days === 1 || (tl.days === 0 && tl.hours >= 12);
          const msg = GO_MESSAGES[idx % GO_MESSAGES.length];

          if (isPast || isGoTime) {
            return (
              <View key={audit.label} style={[S.card, { borderColor: audit.color + '50', shadowColor: audit.color }]}>
                <View style={[S.iconBox, { backgroundColor: audit.color + '18' }]}>
                  <Rocket size={13} color={audit.color} />
                </View>
                <Text style={S.auditLabel} numberOfLines={1}>{audit.label}</Text>
                <Text style={[S.goHeadline, { color: audit.color }]} numberOfLines={1}>
                  {isPast ? 'Complete!' : msg.text}
                </Text>
                <Text style={S.goSub} numberOfLines={1}>{isPast ? 'Audit passed.' : msg.sub}</Text>
                <Text style={S.goDate}>
                  {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {isTomorrow && !isPast ? ' · TMW' : ''}
                </Text>
              </View>
            );
          }

          return (
            <View key={audit.label} style={[S.card, { borderColor: audit.color + '40', shadowColor: urgency }]}>
              <View style={[S.iconBox, { backgroundColor: audit.color + '15' }]}>
                <CalendarClock size={11} color={audit.color} />
              </View>
              <Text style={S.auditLabel} numberOfLines={1}>{audit.label}</Text>
              <Text style={S.dateText}>
                {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={S.timerCol}>
                <Text style={[S.timerBig, { color: urgency }]}>{tl.days}</Text>
                <Text style={S.timerUnit}>days</Text>
              </View>
              <View style={S.timerRow}>
                <Text style={[S.timerSm, { color: urgency }]}>{String(tl.hours).padStart(2, '0')}</Text>
                <Text style={[S.timerColon, { color: urgency }]}>:</Text>
                <Text style={[S.timerSm, { color: urgency }]}>{String(tl.minutes).padStart(2, '0')}</Text>
                <Text style={[S.timerColon, { color: urgency }]}>:</Text>
                <Text style={[S.timerSm, { color: urgency }]}>{String(tl.seconds).padStart(2, '0')}</Text>
              </View>
              <Text style={S.hmsLabel}>hr : min : sec</Text>
            </View>
          );
        })}
      </View>

      {/* ── Manage Modal ── */}
      <Modal visible={showManage} animationType="slide" transparent onRequestClose={() => setShowManage(false)}>
        <KeyboardAvoidingView style={M.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={M.sheet}>
            <View style={M.sheetHead}>
              <Text style={M.sheetTitle}>MANAGE AUDITS</Text>
              <Pressable onPress={() => setShowManage(false)} hitSlop={12}>
                <X size={20} color={HUD.textSec} />
              </Pressable>
            </View>

            {editIdx !== null || editLabel !== '' ? (
              <>
                <Text style={M.fieldLabel}>AUDIT NAME</Text>
                <TextInput style={M.textInput} value={editLabel} onChangeText={setEditLabel} placeholder="e.g. GFCO Audit" placeholderTextColor={HUD.textDim} />
                <View style={M.dateRow}>
                  {[
                    { label: 'Month', val: editMonth, set: setEditMonth, ph: 'MM', len: 2 },
                    { label: 'Day',   val: editDay,   set: setEditDay,   ph: 'DD', len: 2 },
                    { label: 'Year',  val: editYear,  set: setEditYear,  ph: 'YYYY', len: 4 },
                  ].map(f => (
                    <View key={f.label} style={M.dateField}>
                      <Text style={M.dateFieldLabel}>{f.label}</Text>
                      <TextInput style={M.dateInput} value={f.val} onChangeText={f.set} keyboardType="number-pad" maxLength={f.len} placeholder={f.ph} placeholderTextColor={HUD.textDim} />
                    </View>
                  ))}
                </View>
                <View style={M.editActions}>
                  <TouchableOpacity style={M.cancelBtn} onPress={() => { setEditIdx(null); setEditLabel(''); }}>
                    <Text style={M.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={M.saveBtn} onPress={saveEdit}>
                    <Save size={14} color={HUD.bg} />
                    <Text style={M.saveTxt}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 360 }}>
                  {audits.sort((a, b) => a.date.getTime() - b.date.getTime()).map((a, idx) => {
                    const tl = getTimeLeft(a.date);
                    const isPast = tl.total <= 0;
                    const realIdx = audits.indexOf(a);
                    return (
                      <View key={a.label + idx} style={M.auditRow}>
                        <View style={[M.auditDot, { backgroundColor: a.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={M.auditRowLabel}>{a.label}</Text>
                          <Text style={[M.auditRowDate, { color: isPast ? HUD.red : HUD.textSec }]}>
                            {a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {isPast ? ' · PAST' : ` · ${tl.days}d`}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => openEdit(realIdx)} hitSlop={8} style={M.rowBtn}>
                          <Edit3 size={14} color={HUD.textSec} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteAudit(realIdx)} hitSlop={8} style={M.rowBtn}>
                          <Trash2 size={14} color={HUD.red} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={M.addBtn} onPress={() => openEdit(null)}>
                  <Plus size={15} color={HUD.bg} />
                  <Text style={M.addTxt}>Add Audit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:      { fontSize: 12, fontWeight: '900', color: HUD.green, letterSpacing: 1.5, textTransform: 'uppercase' },
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: HUD.green + '20', borderWidth: 1, borderColor: HUD.green + '40', marginLeft: 2 },
  countTxt:   { fontSize: 10, fontWeight: '900', color: HUD.green },
  manageLink: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 0.5 },
  cardRow:    { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1, backgroundColor: HUD.bgCardAlt, borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 3,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  iconBox:    { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  auditLabel: { fontSize: 9, fontWeight: '800', color: HUD.text, textAlign: 'center', letterSpacing: 0.3, textTransform: 'uppercase' },
  dateText:   { fontSize: 8, color: HUD.textDim, fontWeight: '600' },
  timerCol:   { alignItems: 'center' },
  timerBig:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  timerUnit:  { fontSize: 7, color: HUD.textDim, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: -3 },
  timerRow:   { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
  timerSm:    { fontSize: 11, fontWeight: '800' },
  timerColon: { fontSize: 10, fontWeight: '800', marginTop: -1 },
  hmsLabel:   { fontSize: 6, color: HUD.textDim, fontWeight: '700', letterSpacing: 0.8 },
  goHeadline: { fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  goSub:      { fontSize: 8, color: HUD.textSec, textAlign: 'center' },
  goDate:     { fontSize: 7, color: HUD.textDim, fontWeight: '700', marginTop: 1 },
});

const M = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: HUD.borderBright, maxHeight: '85%', paddingBottom: 36, paddingHorizontal: 20, paddingTop: 20 },
  sheetHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 13, fontWeight: '900', color: HUD.text, letterSpacing: 2 },
  auditRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: HUD.border },
  auditDot:       { width: 9, height: 9, borderRadius: 5 },
  auditRowLabel:  { fontSize: 13, fontWeight: '700', color: HUD.text },
  auditRowDate:   { fontSize: 11, marginTop: 1, fontWeight: '600' },
  rowBtn:         { padding: 6 },
  addBtn:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 42, borderRadius: 10, marginTop: 12, backgroundColor: HUD.cyan },
  addTxt:         { color: HUD.bg, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  fieldLabel:     { fontSize: 9, fontWeight: '900', color: HUD.textDim, letterSpacing: 1.5, marginBottom: 6, marginTop: 8, textTransform: 'uppercase' },
  textInput:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 8, backgroundColor: HUD.bgCardAlt, color: HUD.text, borderColor: HUD.borderBright },
  dateRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateField:      { flex: 1, gap: 4 },
  dateFieldLabel: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 1, textTransform: 'uppercase' },
  dateInput:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 16, fontWeight: '800', textAlign: 'center', backgroundColor: HUD.bgCardAlt, color: HUD.text, borderColor: HUD.borderBright },
  editActions:    { flexDirection: 'row', gap: 10 },
  cancelBtn:      { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: HUD.borderBright, justifyContent: 'center', alignItems: 'center' },
  cancelTxt:      { fontSize: 13, fontWeight: '700', color: HUD.textSec },
  saveBtn:        { flex: 2, height: 42, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: HUD.cyan },
  saveTxt:        { color: HUD.bg, fontSize: 13, fontWeight: '900' },
});
