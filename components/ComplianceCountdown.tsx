import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { ShieldCheck, CalendarClock, Rocket, X, Save, Edit3, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AuditDate {
  label: string;
  date: Date;
  color: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const now = new Date().getTime();
  const t = new Date(target).getTime();
  const diff = t - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: diff };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function getUrgencyColor(days: number, total: number): string {
  if (total <= 0) return '#8B5CF6';
  if (days <= 1) return '#8B5CF6';
  if (days <= 30) return '#EF4444';
  if (days <= 90) return '#F59E0B';
  return '#10B981';
}

const GO_MESSAGES = [
  { text: "It's Go Time!", sub: "We're ready. We've got this." },
  { text: "Bring It On!", sub: "Every checklist complete." },
  { text: "Let's Do This!", sub: "Prepared. Confident. Ready." },
];

const AUDIT_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

const ALL_AUDITS: AuditDate[] = [
  { label: 'SQF Audit', date: new Date(2026, 1, 15, 9, 0, 0), color: '#3B82F6' },
  { label: 'GFCO Audit', date: new Date(2026, 3, 10, 9, 0, 0), color: '#8B5CF6' },
  { label: 'FDA Inspection', date: new Date(2026, 4, 20, 9, 0, 0), color: '#EF4444' },
  { label: 'Kosher Audit', date: new Date(2026, 5, 5, 9, 0, 0), color: '#10B981' },
  { label: 'EPA Audit', date: new Date(2026, 6, 15, 9, 0, 0), color: '#06B6D4' },
  { label: 'FSMA Inspection', date: new Date(2026, 8, 1, 9, 0, 0), color: '#F97316' },
  { label: 'Pest Control', date: new Date(2026, 2, 15, 9, 0, 0), color: '#84CC16' },
  { label: 'Fire Marshal', date: new Date(2026, 7, 1, 9, 0, 0), color: '#EC4899' },
  { label: 'OSHA Inspection', date: new Date(2026, 10, 1, 9, 0, 0), color: '#F59E0B' },
  { label: 'State Health Dept', date: new Date(2026, 9, 15, 9, 0, 0), color: '#6366F1' },
];

export default function ComplianceCountdown() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  // Show: any within 90 days OR next 3 upcoming, whichever is more
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
      setEditLabel('');
      setEditMonth('');
      setEditDay('');
      setEditYear(String(new Date().getFullYear()));
    }
    setEditIdx(idx);
  };

  const saveEdit = () => {
    const m = parseInt(editMonth) - 1;
    const d = parseInt(editDay);
    const y = parseInt(editYear);
    if (!editLabel.trim() || isNaN(m) || isNaN(d) || isNaN(y) || m < 0 || m > 11 || d < 1 || d > 31 || y < 2024) {
      Alert.alert('Invalid', 'Please enter a valid name and date.');
      return;
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ShieldCheck size={14} color="#10B981" />
          <Text style={styles.title}>Compliance</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{totalUpcoming}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowManage(true)} hitSlop={8}>
          <Text style={[styles.manageLink, { color: colors.primary }]}>Manage</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardRow}>
        {visibleAudits.map((audit, idx) => {
          const tl = getTimeLeft(audit.date);
          const urgency = getUrgencyColor(tl.days, tl.total);
          const isGoTime = tl.days <= 1 && tl.total > 0;
          const isPast = tl.total <= 0;
          const isTomorrow = tl.days === 1 || (tl.days === 0 && tl.hours >= 12);
          const msg = GO_MESSAGES[idx % GO_MESSAGES.length];

          if (isPast || isGoTime) {
            return (
              <View key={audit.label} style={[styles.goCard, { borderColor: audit.color + '40' }]}>
                <View style={[styles.goIconBg, { backgroundColor: audit.color + '20' }]}>
                  <Rocket size={14} color={audit.color} />
                </View>
                <Text style={styles.goLabel} numberOfLines={1}>{audit.label}</Text>
                <Text style={[styles.goHeadline, { color: audit.color }]} numberOfLines={1}>
                  {isPast ? 'Complete!' : msg.text}
                </Text>
                <Text style={styles.goSub} numberOfLines={1}>
                  {isPast ? 'Audit passed.' : msg.sub}
                </Text>
                <Text style={styles.goDate}>
                  {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {isTomorrow && !isPast ? ' · TMW' : ''}
                </Text>
              </View>
            );
          }

          return (
            <View key={audit.label} style={[styles.card, { borderColor: colors.border }]}>
              <View style={[styles.iconDot, { backgroundColor: audit.color + '20' }]}>
                <CalendarClock size={11} color={audit.color} />
              </View>
              <Text style={styles.auditLabel} numberOfLines={1}>{audit.label}</Text>
              <Text style={styles.dateText}>
                {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={styles.timerCol}>
                <Text style={[styles.timerBig, { color: urgency }]}>{tl.days}</Text>
                <Text style={styles.timerUnitBig}>days</Text>
              </View>
              <View style={styles.timerSmallRow}>
                <Text style={[styles.timerSm, { color: urgency }]}>{String(tl.hours).padStart(2, '0')}</Text>
                <Text style={[styles.timerColon, { color: urgency }]}>:</Text>
                <Text style={[styles.timerSm, { color: urgency }]}>{String(tl.minutes).padStart(2, '0')}</Text>
                <Text style={[styles.timerColon, { color: urgency }]}>:</Text>
                <Text style={[styles.timerSm, { color: urgency }]}>{String(tl.seconds).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.hmsLabel}>hr : min : sec</Text>
            </View>
          );
        })}
      </View>

      {/* ── Manage Audits Modal ── */}
      <Modal visible={showManage} animationType="slide" transparent onRequestClose={() => setShowManage(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Audits</Text>
              <Pressable onPress={() => setShowManage(false)} hitSlop={12}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {editIdx !== null || editLabel !== '' ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Audit Name</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={editLabel}
                  onChangeText={setEditLabel}
                  placeholder="e.g. GFCO Audit"
                  placeholderTextColor={colors.textTertiary}
                />
                <View style={styles.dateInputRow}>
                  <View style={styles.dateField}>
                    <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Month</Text>
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      value={editMonth}
                      onChangeText={setEditMonth}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="MM"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Day</Text>
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      value={editDay}
                      onChangeText={setEditDay}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="DD"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Year</Text>
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      value={editYear}
                      onChangeText={setEditYear}
                      keyboardType="number-pad"
                      maxLength={4}
                      placeholder="YYYY"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setEditIdx(null); setEditLabel(''); }}>
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveEdit}>
                    <Save size={14} color="#fff" />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <ScrollView style={styles.auditList}>
                  {audits.sort((a, b) => a.date.getTime() - b.date.getTime()).map((a, idx) => {
                    const tl = getTimeLeft(a.date);
                    const isPast = tl.total <= 0;
                    const realIdx = audits.indexOf(a);
                    return (
                      <View key={a.label + idx} style={[styles.auditRow, { borderColor: colors.border }]}>
                        <View style={[styles.auditDot, { backgroundColor: a.color }]} />
                        <View style={styles.auditInfo}>
                          <Text style={[styles.auditRowLabel, { color: colors.text }]}>{a.label}</Text>
                          <Text style={[styles.auditRowDate, { color: isPast ? '#EF4444' : colors.textSecondary }]}>
                            {a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {isPast ? ' · PAST' : ` · ${tl.days}d`}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => openEdit(realIdx)} hitSlop={8} style={styles.rowBtn}>
                          <Edit3 size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteAudit(realIdx)} hitSlop={8} style={styles.rowBtn}>
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => openEdit(null)}>
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Add Audit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 2 },
  countText: { fontSize: 11, fontWeight: '700' },
  manageLink: { fontSize: 12, fontWeight: '600' },
  cardRow: { flexDirection: 'row', gap: 8 },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  iconDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  auditLabel: { fontSize: 9, fontWeight: '600', color: colors.text, textAlign: 'center' },
  dateText: { fontSize: 8, color: colors.textTertiary },
  timerCol: { alignItems: 'center' },
  timerBig: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  timerUnitBig: { fontSize: 8, color: colors.textTertiary, fontWeight: '500', marginTop: -3 },
  timerSmallRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 1 },
  timerSm: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerColon: { fontSize: 10, fontWeight: '700', marginTop: -2 },
  hmsLabel: { fontSize: 6, color: colors.textTertiary, fontWeight: '500', letterSpacing: 0.8 },

  goCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  goIconBg: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  goLabel: { fontSize: 9, fontWeight: '500', color: colors.textSecondary },
  goHeadline: { fontSize: 13, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  goSub: { fontSize: 8, color: colors.textSecondary, textAlign: 'center' },
  goDate: { fontSize: 8, color: colors.textTertiary, fontWeight: '600', marginTop: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 32, paddingHorizontal: 20, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },

  auditList: { maxHeight: 350 },
  auditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  auditDot: { width: 10, height: 10, borderRadius: 5 },
  auditInfo: { flex: 1 },
  auditRowLabel: { fontSize: 14, fontWeight: '600' },
  auditRowDate: { fontSize: 12, marginTop: 1 },
  rowBtn: { padding: 6 },

  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  dateInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dateField: { flex: 1, gap: 4 },
  dateFieldLabel: { fontSize: 11, fontWeight: '600' },
  dateInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  editActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
  saveBtn: { flex: 2, height: 42, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  addBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 42, borderRadius: 10, marginTop: 12 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
