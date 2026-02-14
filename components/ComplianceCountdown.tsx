import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { ShieldCheck, CalendarClock, Rocket, Star, X, Save, Edit3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AuditDate {
  label: string;
  date: Date;
  color: string;
  editable?: boolean;
}

interface ComplianceCountdownProps {
  audits?: AuditDate[];
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
  { text: "All Ducks in a Row", sub: "Prepared. Confident. Let's go." },
  { text: "Bring It On!", sub: "Every checklist complete." },
];

const INITIAL_AUDITS: AuditDate[] = [
  { label: 'SQF Audit', date: new Date(2026, 1, 15, 9, 0, 0), color: '#3B82F6', editable: true },
  { label: 'FSMA Inspection', date: new Date(2026, 8, 1, 9, 0, 0), color: '#8B5CF6', editable: false },
  { label: 'OSHA Inspection', date: new Date(2026, 10, 1, 9, 0, 0), color: '#F59E0B', editable: false },
];

export default function ComplianceCountdown({ audits: propAudits }: ComplianceCountdownProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [now, setNow] = useState(Date.now());
  const [audits, setAudits] = useState<AuditDate[]>(propAudits || INITIAL_AUDITS);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editMonth, setEditMonth] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editYear, setEditYear] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openEdit = (idx: number) => {
    const d = audits[idx].date;
    setEditMonth(String(d.getMonth() + 1));
    setEditDay(String(d.getDate()));
    setEditYear(String(d.getFullYear()));
    setEditIdx(idx);
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    const m = parseInt(editMonth) - 1;
    const d = parseInt(editDay);
    const y = parseInt(editYear);
    if (isNaN(m) || isNaN(d) || isNaN(y) || m < 0 || m > 11 || d < 1 || d > 31 || y < 2024) return;
    const newAudits = [...audits];
    newAudits[editIdx] = { ...newAudits[editIdx], date: new Date(y, m, d, 9, 0, 0) };
    setAudits(newAudits);
    setEditIdx(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ShieldCheck size={14} color="#10B981" />
          <Text style={styles.title}>Compliance</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        {audits.map((audit, idx) => {
          const tl = getTimeLeft(audit.date);
          const urgency = getUrgencyColor(tl.days, tl.total);
          const isGoTime = tl.days <= 1 && tl.total > 0;
          const isPast = tl.total <= 0;
          const isTomorrow = tl.days === 1 || (tl.days === 0 && tl.hours > 0);
          const msg = GO_MESSAGES[idx % GO_MESSAGES.length];

          if (isPast || isGoTime) {
            return (
              <View key={idx} style={[styles.goCard, { borderColor: audit.color + '40' }]}>
                <View style={[styles.goIconBg, { backgroundColor: audit.color + '20' }]}>
                  <Rocket size={16} color={audit.color} />
                </View>
                <Text style={styles.goLabel}>{audit.label}</Text>
                <Text style={[styles.goHeadline, { color: audit.color }]}>
                  {isPast ? 'Complete!' : msg.text}
                </Text>
                <Text style={styles.goSub} numberOfLines={2}>
                  {isPast ? 'Audit passed.' : msg.sub}
                </Text>
                <Text style={styles.goDate}>
                  {audit.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {isTomorrow && !isPast ? ' · TMW' : isPast ? '' : ' · TODAY'}
                </Text>
                {audit.editable && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(idx)} hitSlop={8}>
                    <Edit3 size={10} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          return (
            <View key={idx} style={[styles.card, { borderColor: colors.border }]}>
              {audit.editable && (
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(idx)} hitSlop={8}>
                  <Edit3 size={10} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              <View style={[styles.iconDot, { backgroundColor: audit.color + '20' }]}>
                <CalendarClock size={12} color={audit.color} />
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

      {/* Edit Modal */}
      <Modal visible={editIdx !== null} transparent animationType="fade" onRequestClose={() => setEditIdx(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Set {editIdx !== null ? audits[editIdx].label : ''} Date
              </Text>
              <Pressable onPress={() => setEditIdx(null)} hitSlop={12}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>
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
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveEdit}>
              <Save size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save Date</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // ── Normal countdown card ──
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  iconDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  timerCol: {
    alignItems: 'center',
  },
  timerBig: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  timerUnitBig: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '500',
    marginTop: -3,
  },
  timerSmallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginTop: 2,
  },
  timerSm: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerColon: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -2,
  },
  hmsLabel: {
    fontSize: 7,
    color: colors.textTertiary,
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: -1,
  },
  editBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Go time card ──
  goCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },
  goIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  goHeadline: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  goSub: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  goDate: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  // ── Edit Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
