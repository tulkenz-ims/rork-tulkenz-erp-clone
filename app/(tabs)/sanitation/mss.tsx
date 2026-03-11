// app/(tabs)/sanitation/mss.tsx
// Master Sanitation Schedule — Definitive Screen
// Live data · Full HUD theme · TulKenz OPS

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, RefreshControl, Alert,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useSanitationTasks,
  SanitationTask,
  SanitationSSOPFull,
} from '../../../hooks/useSanitationTasks';
import { reversePostSanitationComplete } from '../../../constants/sanitationTaskFeedTemplates';

// ─────────────────────────────────────────────
// HUD THEME
// ─────────────────────────────────────────────
const HUD = {
  bg: '#020912', bgCard: '#050f1e', bgCardAlt: '#071525',
  cyan: '#00e5ff', cyanDim: '#00e5ff22',
  green: '#00ff88', greenDim: '#00ff8822',
  amber: '#ffb800', amberDim: '#ffb80022',
  red: '#ff2d55', redDim: '#ff2d5522',
  purple: '#7b61ff', purpleDim: '#7b61ff22',
  text: '#e0f4ff', textSec: '#7aa8c8', textDim: '#3a6080',
  border: '#0d2840', borderBright: '#1a4060',
};

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ROOMS = ['All', 'PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'];

const ROOM_LABELS: Record<string, string> = {
  PR1: 'Processing Room 1', PR2: 'Processing Room 2',
  PA1: 'Packing Area 1', PA2: 'Packing Area 2',
  BB1: 'Bulk Blending 1', SB1: 'Staging/Break 1',
};

const FREQ_ORDER = ['pre_op','daily','weekly','biweekly','monthly','quarterly','annual','as_needed'];
const FREQ_LABELS: Record<string, string> = {
  pre_op: 'PRE-OP', daily: 'DAILY', weekly: 'WEEKLY', biweekly: 'BI-WEEKLY',
  monthly: 'MONTHLY', quarterly: 'QUARTERLY', annual: 'ANNUAL', as_needed: 'AS NEEDED',
};
const FREQ_COLORS: Record<string, string> = {
  pre_op: HUD.amber, daily: HUD.green, weekly: HUD.cyan,
  biweekly: '#00bcd4', monthly: HUD.purple, quarterly: '#ec4899',
  annual: '#f59e0b', as_needed: HUD.textSec,
};

const SHIFTS = ['day', 'night', 'weekend', 'pre_op'] as const;
type Shift = typeof SHIFTS[number];

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.tag, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[s.tagTxt, { color }]}>{text}</Text>
    </View>
  );
}

function StatItem({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={s.statItem}>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

function FreqHeader({ freq, count }: { freq: string; count: number }) {
  const color = FREQ_COLORS[freq] ?? HUD.textSec;
  return (
    <View style={s.freqHeader}>
      <View style={[s.freqLine, { backgroundColor: color + '44' }]} />
      <View style={[s.freqPill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[s.freqPillTxt, { color }]}>{FREQ_LABELS[freq]}</Text>
        <View style={[s.freqCount, { backgroundColor: color + '33' }]}>
          <Text style={[s.freqCountTxt, { color }]}>{count}</Text>
        </View>
      </View>
      <View style={[s.freqLine, { backgroundColor: color + '44' }]} />
    </View>
  );
}

function EmptyState({ icon, title, sub, color }: { icon: any; title: string; sub: string; color: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={48} color={color} />
      <Text style={[s.emptyTitle, { color }]}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// TASK CARD
// ─────────────────────────────────────────────
function TaskCard({
  task, isOverdue, isDueToday, onComplete, onViewSSOPFromTask,
}: {
  task: SanitationTask;
  isOverdue: boolean;
  isDueToday: boolean;
  onComplete: () => void;
  onViewSSOPFromTask?: () => void;
}) {
  const urgency = isOverdue ? HUD.red : isDueToday ? HUD.amber : HUD.green;
  const urgencyDim = isOverdue ? HUD.redDim : isDueToday ? HUD.amberDim : HUD.greenDim;
  const freqColor = FREQ_COLORS[task.frequency] ?? HUD.textSec;

  return (
    <View style={[s.taskCard, { borderLeftColor: urgency }]}>
      <View style={s.taskTop}>
        <View style={[s.urgencyDot, { backgroundColor: urgency }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.taskName}>{task.task_name}</Text>
          {task.task_code ? (
            <Text style={s.taskCode}>{task.task_code}</Text>
          ) : null}
          <View style={s.tagRow}>
            <Tag text={task.room} color={HUD.purple} />
            <Tag text={FREQ_LABELS[task.frequency]} color={freqColor} />
            {task.requires_atp_test ? <Tag text="ATP REQUIRED" color={HUD.amber} /> : null}
            {task.requires_preop_signoff ? <Tag text="QC SIGN-OFF" color={HUD.cyan} /> : null}
          </View>
        </View>
      </View>

      {/* Due status bar */}
      <View style={[s.dueBar, { backgroundColor: urgencyDim }]}>
        <Ionicons name="time-outline" size={12} color={urgency} />
        <Text style={[s.dueBarTxt, { color: urgency }]}>
          {isOverdue
            ? `OVERDUE — was due ${task.next_due_date}`
            : isDueToday
            ? 'DUE TODAY'
            : `Next due: ${task.next_due_date}`}
        </Text>
        {task.estimated_minutes ? (
          <Text style={s.dueEst}>· {task.estimated_minutes} min</Text>
        ) : null}
      </View>

      {/* Chemical row */}
      {task.chemical_name ? (
        <View style={s.chemRow}>
          <Ionicons name="flask-outline" size={12} color={HUD.textDim} />
          <Text style={s.chemTxt}>
            {task.chemical_name}
            {task.chemical_concentration ? ` @ ${task.chemical_concentration}` : ''}
            {task.contact_time_min ? ` · ${task.contact_time_min} min contact` : ''}
          </Text>
        </View>
      ) : null}

      {/* Crew / assignment row */}
      {(task.assigned_crew || task.assigned_to) ? (
        <View style={s.crewRow}>
          <Ionicons name="people-outline" size={12} color={HUD.textDim} />
          <Text style={s.crewTxt}>
            {task.assigned_crew ?? task.assigned_to}
          </Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={s.taskBtns}>
        {onViewSSOPFromTask ? (
          <TouchableOpacity style={s.ssopBtn} onPress={onViewSSOPFromTask}>
            <Ionicons name="document-text-outline" size={14} color={HUD.cyan} />
            <Text style={s.ssopBtnTxt}>VIEW SSOP</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[s.completeBtn, isOverdue && { backgroundColor: HUD.red }]}
          onPress={onComplete}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color={HUD.bg} />
          <Text style={s.completeBtnTxt}>
            {isOverdue ? 'COMPLETE OVERDUE' : 'MARK COMPLETE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// SSOP CARD
// ─────────────────────────────────────────────
function SSOPCard({ ssop, onView }: { ssop: SanitationSSOPFull; onView: () => void }) {
  return (
    <TouchableOpacity style={s.ssopCard} onPress={onView} activeOpacity={0.75}>
      <View style={s.ssopIconBox}>
        <Ionicons name="document-text" size={20} color={HUD.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.ssopCode}>{ssop.ssop_code ?? '—'}</Text>
        <Text style={s.ssopTitle}>{ssop.title}</Text>
        <View style={s.tagRow}>
          {ssop.area ? <Tag text={ssop.area} color={HUD.purple} /> : null}
          <Tag text={`v${ssop.version}`} color={HUD.amber} />
          <Tag text={FREQ_LABELS[ssop.frequency] ?? ssop.frequency} color={FREQ_COLORS[ssop.frequency] ?? HUD.textSec} />
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={[s.stepBadge, {
          backgroundColor: (ssop.steps?.length ?? 0) > 0 ? HUD.cyanDim : HUD.bgCardAlt,
        }]}>
          <Text style={[s.stepBadgeTxt, {
            color: (ssop.steps?.length ?? 0) > 0 ? HUD.cyan : HUD.textDim,
          }]}>
            {ssop.steps?.length ?? 0} STEPS
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={HUD.textDim} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// SSOP MODAL CONTENT
// ─────────────────────────────────────────────
function SSOPDetail({ ssop, onClose }: { ssop: SanitationSSOPFull; onClose: () => void }) {
  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>SSOP — {ssop.ssop_code ?? 'NO CODE'}</Text>
          <Text style={s.sheetTitle}>{ssop.title}</Text>
          <Text style={s.sheetMeta}>
            v{ssop.version}
            {ssop.area ? ` · ${ssop.area}` : ''}
            {' · '}{FREQ_LABELS[ssop.frequency] ?? ssop.frequency}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Info block */}
        {(ssop.chemical_name || ssop.ppe_required || ssop.approved_by) ? (
          <View style={s.infoBox}>
            {ssop.chemical_name ? (
              <InfoRow icon="flask" color={HUD.amber} label="Chemical"
                value={`${ssop.chemical_name}${ssop.chemical_concentration ? ` @ ${ssop.chemical_concentration}` : ''}`} />
            ) : null}
            {ssop.contact_time_min && ssop.contact_time_min > 0 ? (
              <InfoRow icon="timer" color={HUD.amber} label="Contact Time" value={`${ssop.contact_time_min} minutes`} />
            ) : null}
            {ssop.rinse_required ? (
              <InfoRow icon="water" color={HUD.cyan} label="Rinse" value="Required" valueColor={HUD.cyan} />
            ) : null}
            {ssop.ppe_required && ssop.ppe_required !== 'N/A' ? (
              <InfoRow icon="shield-checkmark" color={HUD.green} label="PPE" value={ssop.ppe_required} />
            ) : null}
            {ssop.approved_by ? (
              <InfoRow icon="checkmark-circle" color={HUD.green} label="Approved By"
                value={`${ssop.approved_by}${ssop.approved_date ? ` · ${ssop.approved_date}` : ''}`} />
            ) : null}
          </View>
        ) : null}

        <Text style={s.sectionLbl}>PROCEDURE STEPS</Text>
        {ssop.steps && ssop.steps.length > 0 ? (
          ssop.steps.map(step => (
            <View key={step.id} style={s.stepCard}>
              <View style={s.stepNum}>
                <Text style={s.stepNumTxt}>{step.step_number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTxt}>{step.instruction}</Text>
                {step.caution ? (
                  <View style={s.caution}>
                    <Ionicons name="warning" size={12} color={HUD.amber} />
                    <Text style={s.cautionTxt}>{step.caution}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={s.noStepsTxt}>No steps recorded. Add steps in the SSOP editor.</Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, color, label, value, valueColor }: {
  icon: any; color: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: HUD.textSec, width: 90 }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: valueColor ?? HUD.text, flex: 1 }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// COMPLETE TASK MODAL CONTENT
// ─────────────────────────────────────────────
function CompleteTaskModal({
  task, onClose, onSubmit,
}: {
  task: SanitationTask;
  onClose: () => void;
  onSubmit: (data: {
    completedBy: string; shift: Shift; visualPass: boolean;
    preOpSignedBy: string; issuesFound: string;
    result: 'pass' | 'fail' | 'conditional';
  }) => Promise<void>;
}) {
  const [completedBy, setCompletedBy] = useState('');
  const [shift, setShift] = useState<Shift>('day');
  const [visualPass, setVisualPass] = useState<boolean | null>(null);
  const [preOpSignedBy, setPreOpSignedBy] = useState('');
  const [issuesFound, setIssuesFound] = useState('');
  const [result, setResult] = useState<'pass' | 'fail' | 'conditional'>('pass');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!completedBy.trim()) { Alert.alert('Required', 'Completed By is required.'); return; }
    if (visualPass === null) { Alert.alert('Required', 'Visual inspection result is required.'); return; }
    if (task.requires_preop_signoff && !preOpSignedBy.trim()) {
      Alert.alert('Required', 'Pre-Op QC sign-off name is required for this task.'); return;
    }
    setSubmitting(true);
    await onSubmit({ completedBy: completedBy.trim(), shift, visualPass, preOpSignedBy: preOpSignedBy.trim(), issuesFound: issuesFound.trim(), result });
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>MARK COMPLETE</Text>
          <Text style={s.sheetTitle} numberOfLines={2}>{task.task_name}</Text>
          <Text style={s.sheetMeta}>
            {task.room}
            {task.task_code ? ` · ${task.task_code}` : ''}
            {' · '}{FREQ_LABELS[task.frequency]}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* SSOP reminder */}
        {task.ssop ? (
          <View style={s.ssopReminder}>
            <Ionicons name="document-text-outline" size={14} color={HUD.cyan} />
            <Text style={{ fontSize: 11, color: HUD.cyan, flex: 1 }}>
              SSOP: {task.ssop.ssop_code ?? task.ssop.title}
              {task.ssop.chemical_name ? ` · ${task.ssop.chemical_name}` : ''}
              {task.ssop.contact_time_min ? ` · ${task.ssop.contact_time_min} min contact time` : ''}
            </Text>
          </View>
        ) : null}

        {/* Completed By */}
        <FieldLabel label="COMPLETED BY" required />
        <TextInput style={s.input} value={completedBy} onChangeText={setCompletedBy}
          placeholder="Employee name" placeholderTextColor={HUD.textDim} />

        {/* Shift */}
        <FieldLabel label="SHIFT" required />
        <View style={s.segRow}>
          {SHIFTS.map(sh => (
            <TouchableOpacity key={sh}
              style={[s.seg, shift === sh && s.segActive]}
              onPress={() => setShift(sh)}>
              <Text style={[s.segTxt, shift === sh && s.segTxtActive]}>
                {sh.toUpperCase().replace('_', '-')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Visual Inspection */}
        <FieldLabel label="VISUAL INSPECTION" required />
        <View style={s.segRow}>
          <TouchableOpacity
            style={[s.seg, visualPass === true && { backgroundColor: HUD.greenDim, borderColor: HUD.green }]}
            onPress={() => setVisualPass(true)}>
            <Text style={[s.segTxt, visualPass === true && { color: HUD.green }]}>✓ PASS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.seg, visualPass === false && { backgroundColor: HUD.redDim, borderColor: HUD.red }]}
            onPress={() => setVisualPass(false)}>
            <Text style={[s.segTxt, visualPass === false && { color: HUD.red }]}>✗ FAIL</Text>
          </TouchableOpacity>
        </View>

        {/* Pre-Op Sign-Off */}
        {task.requires_preop_signoff ? (
          <>
            <FieldLabel label="PRE-OP QC SIGN-OFF BY" required />
            <TextInput style={s.input} value={preOpSignedBy} onChangeText={setPreOpSignedBy}
              placeholder="Quality Control name" placeholderTextColor={HUD.textDim} />
          </>
        ) : null}

        {/* Issues Found */}
        <FieldLabel label="ISSUES FOUND" />
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          value={issuesFound} onChangeText={setIssuesFound}
          placeholder="Describe any issues, or enter N/A"
          placeholderTextColor={HUD.textDim} multiline />

        {/* Overall Result */}
        <FieldLabel label="OVERALL RESULT" required />
        <View style={s.segRow}>
          {(['pass', 'conditional', 'fail'] as const).map(r => {
            const c = r === 'pass' ? HUD.green : r === 'conditional' ? HUD.amber : HUD.red;
            const cd = r === 'pass' ? HUD.greenDim : r === 'conditional' ? HUD.amberDim : HUD.redDim;
            return (
              <TouchableOpacity key={r}
                style={[s.seg, result === r && { backgroundColor: cd, borderColor: c }]}
                onPress={() => setResult(r)}>
                <Text style={[s.segTxt, result === r && { color: c }]}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting
            ? <ActivityIndicator color={HUD.bg} size="small" />
            : <>
                <Ionicons name="checkmark-circle" size={18} color={HUD.bg} />
                <Text style={s.submitTxt}>MARK COMPLETE + POST TO TASK FEED</Text>
              </>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: 9, fontWeight: '700', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 6, marginTop: 16 }}>
      {label}{required ? <Text style={{ color: HUD.red }}> *</Text> : null}
    </Text>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function MSSScreen() {
  const {
    tasks, ssops, loading, stats,
    fetchTasks, fetchDueTasks, fetchSSOPs,
    completeTask, isTaskOverdue, isTaskDueToday,
  } = useSanitationTasks();

  const [viewMode, setViewMode] = useState<'due' | 'schedule' | 'ssop'>('due');
  const [roomFilter, setRoomFilter] = useState('All');
  const [freqFilter, setFreqFilter] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTask, setSelectedTask] = useState<SanitationTask | null>(null);
  const [selectedSSOPFull, setSelectedSSOPFull] = useState<SanitationSSOPFull | null>(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [ssopModal, setSSopModal] = useState(false);

  useEffect(() => { loadData(); }, [viewMode, roomFilter, freqFilter]);

  const loadData = useCallback(async () => {
    if (viewMode === 'due') await fetchDueTasks();
    else if (viewMode === 'schedule') await fetchTasks(roomFilter === 'All' ? undefined : roomFilter);
    else await fetchSSOPs();
  }, [viewMode, roomFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openComplete = (task: SanitationTask) => {
    setSelectedTask(task);
    setCompleteModal(true);
  };

  const handleCompleteSubmit = async (data: {
    completedBy: string; shift: Shift; visualPass: boolean;
    preOpSignedBy: string; issuesFound: string;
    result: 'pass' | 'fail' | 'conditional';
  }) => {
    if (!selectedTask) return;
    try {
      const completion = await completeTask({
        task_id: selectedTask.id,
        completed_by: data.completedBy,
        shift: data.shift,
        visual_pass: data.visualPass,
        preop_signed_by: data.preOpSignedBy || undefined,
        issues_found: data.issuesFound || undefined,
        result: data.result,
      });
      if (completion) {
        await reversePostSanitationComplete({
          completionId: completion.id,
          taskId: selectedTask.id,
          taskName: selectedTask.task_name,
          taskCode: selectedTask.task_code,
          room: selectedTask.room,
          completedBy: data.completedBy,
          result: data.result,
          visualPass: data.visualPass,
          preOpSignedBy: data.preOpSignedBy || null,
          issuesFound: data.issuesFound || null,
        });
        setCompleteModal(false);
        Alert.alert('✅ Complete', `${selectedTask.task_name} marked complete.\nPosted to Task Feed.`);
        await loadData();
      }
    } catch {
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  // Filter + group tasks for schedule view
  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (roomFilter !== 'All') list = list.filter(t => t.room === roomFilter);
    if (freqFilter !== 'All') list = list.filter(t => t.frequency === freqFilter);
    return list;
  }, [tasks, roomFilter, freqFilter]);

  const tasksByFreq = useMemo(() =>
    FREQ_ORDER.reduce((acc, freq) => {
      const g = filteredTasks.filter(t => t.frequency === freq);
      if (g.length > 0) acc[freq] = g;
      return acc;
    }, {} as Record<string, SanitationTask[]>),
  [filteredTasks]);

  // Summary stats per frequency for schedule view
  const freqStats = useMemo(() =>
    FREQ_ORDER.map(f => ({
      freq: f,
      count: tasks.filter(t => t.frequency === f).length,
    })).filter(x => x.count > 0),
  [tasks]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>SANITATION SYSTEM</Text>
          <Text style={s.headerTitle}>Master Sanitation Schedule</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={s.overdueChip}>
            <Ionicons name="alert-circle" size={11} color={HUD.red} />
            <Text style={s.overdueChipTxt}>{stats.overdue} OVERDUE</Text>
          </View>
        )}
      </View>

      {/* ── STAT STRIP ── */}
      <View style={s.statStrip}>
        <StatItem value={stats.dueToday} label="DUE TODAY" color={HUD.amber} />
        <View style={s.statDiv} />
        <StatItem value={stats.overdue} label="OVERDUE" color={HUD.red} />
        <View style={s.statDiv} />
        <StatItem value={stats.total} label="TOTAL TASKS" color={HUD.cyan} />
        <View style={s.statDiv} />
        <StatItem value={ssops.length} label="SSOPs" color={HUD.green} />
      </View>

      {/* ── VIEW TABS ── */}
      <View style={s.tabRow}>
        {([
          { k: 'due', l: 'DUE NOW', icon: 'alert-circle-outline' },
          { k: 'schedule', l: 'FULL SCHEDULE', icon: 'calendar-outline' },
          { k: 'ssop', l: 'SSOP LIBRARY', icon: 'document-text-outline' },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.k}
            style={[s.tab, viewMode === tab.k && s.tabActive]}
            onPress={() => setViewMode(tab.k)}>
            <Ionicons name={tab.icon} size={14}
              color={viewMode === tab.k ? HUD.cyan : HUD.textDim} />
            <Text style={[s.tabTxt, viewMode === tab.k && s.tabTxtActive]}>{tab.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SCHEDULE FILTERS ── */}
      {viewMode === 'schedule' && (
        <View style={s.filterBlock}>
          {/* Room filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 6 }}>
            {ROOMS.map(r => (
              <TouchableOpacity key={r}
                style={[s.filterChip, roomFilter === r && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                onPress={() => setRoomFilter(r)}>
                <Text style={[s.filterChipTxt, roomFilter === r && { color: HUD.purple }]}>
                  {r === 'All' ? 'ALL ROOMS' : r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Freq filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 6 }}>
            <TouchableOpacity
              style={[s.filterChip, freqFilter === 'All' && { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan }]}
              onPress={() => setFreqFilter('All')}>
              <Text style={[s.filterChipTxt, freqFilter === 'All' && { color: HUD.cyan }]}>ALL FREQ</Text>
            </TouchableOpacity>
            {freqStats.map(({ freq, count }) => {
              const color = FREQ_COLORS[freq] ?? HUD.textSec;
              const active = freqFilter === freq;
              return (
                <TouchableOpacity key={freq}
                  style={[s.filterChip, active && { backgroundColor: color + '22', borderColor: color + '66' }]}
                  onPress={() => setFreqFilter(freq)}>
                  <Text style={[s.filterChipTxt, active && { color }]}>
                    {FREQ_LABELS[freq]} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── CONTENT ── */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={HUD.cyan} size="large" />
          <Text style={s.loadingTxt}>LOADING SCHEDULE...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>

          {/* DUE NOW */}
          {viewMode === 'due' && (
            tasks.length === 0
              ? <EmptyState icon="checkmark-circle" title="ALL CLEAR" sub="No tasks due right now. Pull to refresh." color={HUD.green} />
              : tasks.map(task => (
                <TaskCard key={task.id} task={task}
                  isOverdue={isTaskOverdue(task)} isDueToday={isTaskDueToday(task)}
                  onComplete={() => openComplete(task)}
                  onViewSSOPFromTask={task.ssop ? () => {
                    setSelectedSSOPFull({ ...(task.ssop as any), steps: [] });
                    setSSopModal(true);
                  } : undefined}
                />
              ))
          )}

          {/* FULL SCHEDULE */}
          {viewMode === 'schedule' && (
            filteredTasks.length === 0
              ? <EmptyState icon="calendar" title="NO TASKS" sub="No tasks match this filter." color={HUD.textDim} />
              : Object.entries(tasksByFreq).map(([freq, group]) => (
                <View key={freq}>
                  <FreqHeader freq={freq} count={group.length} />
                  {group.map(task => (
                    <TaskCard key={task.id} task={task}
                      isOverdue={isTaskOverdue(task)} isDueToday={isTaskDueToday(task)}
                      onComplete={() => openComplete(task)}
                      onViewSSOPFromTask={task.ssop ? () => {
                        setSelectedSSOPFull({ ...(task.ssop as any), steps: [] });
                        setSSopModal(true);
                      } : undefined}
                    />
                  ))}
                </View>
              ))
          )}

          {/* SSOP LIBRARY */}
          {viewMode === 'ssop' && (
            ssops.length === 0
              ? <EmptyState icon="document-text" title="NO SSOPs" sub="No SSOPs in library yet." color={HUD.textDim} />
              : ssops.map(ssop => (
                <SSOPCard key={ssop.id} ssop={ssop} onView={() => {
                  setSelectedSSOPFull(ssop);
                  setSSopModal(true);
                }} />
              ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── COMPLETE MODAL ── */}
      <Modal visible={completeModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedTask && (
            <CompleteTaskModal
              task={selectedTask}
              onClose={() => setCompleteModal(false)}
              onSubmit={handleCompleteSubmit}
            />
          )}
        </View>
      </Modal>

      {/* ── SSOP MODAL ── */}
      <Modal visible={ssopModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedSSOPFull && (
            <SSOPDetail ssop={selectedSSOPFull} onClose={() => setSSopModal(false)} />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HUD.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: HUD.border,
    backgroundColor: HUD.bgCard,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerSub: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, letterSpacing: 0.5 },
  overdueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  overdueChipTxt: { fontSize: 10, fontWeight: '700', color: HUD.red, letterSpacing: 1 },

  // Stats
  statStrip: {
    flexDirection: 'row', backgroundColor: HUD.bgCardAlt,
    borderBottomWidth: 1, borderBottomColor: HUD.border,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  statLbl: { fontSize: 8, fontWeight: '600', color: HUD.textDim, letterSpacing: 1.5, marginTop: 1 },
  statDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 8 },

  // Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: HUD.bgCard,
    borderBottomWidth: 1, borderBottomColor: HUD.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, gap: 3 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: HUD.cyan },
  tabTxt: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },
  tabTxtActive: { color: HUD.cyan },

  // Filters
  filterBlock: {
    backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: HUD.border,
    backgroundColor: HUD.bgCardAlt,
  },
  filterChipTxt: { fontSize: 10, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },

  // Loading / center
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 2 },

  // Task card
  taskCard: {
    backgroundColor: HUD.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3,
    marginBottom: 10, overflow: 'hidden',
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  taskName: { fontSize: 14, fontWeight: '700', color: HUD.text, marginBottom: 3 },
  taskCode: { fontSize: 10, color: HUD.textDim, letterSpacing: 1, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  dueBar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dueBarTxt: { fontSize: 11, fontWeight: '700', flex: 1 },
  dueEst: { fontSize: 10, color: HUD.textDim },
  chemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingBottom: 6,
  },
  chemTxt: { fontSize: 11, color: HUD.textSec },
  crewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingBottom: 8,
  },
  crewTxt: { fontSize: 11, color: HUD.textSec },
  taskBtns: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: HUD.border },
  ssopBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 10,
    borderRightWidth: 1, borderRightColor: HUD.border,
  },
  ssopBtnTxt: { fontSize: 10, fontWeight: '700', color: HUD.cyan, letterSpacing: 1 },
  completeBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 10,
    backgroundColor: HUD.green,
  },
  completeBtnTxt: { fontSize: 10, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },

  // SSOP card
  ssopCard: {
    backgroundColor: HUD.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
  },
  ssopIconBox: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: HUD.cyanDim, borderWidth: 1, borderColor: HUD.cyan + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  ssopCode: { fontSize: 10, fontWeight: '800', color: HUD.cyan, letterSpacing: 1.5, marginBottom: 2 },
  ssopTitle: { fontSize: 13, fontWeight: '700', color: HUD.text, marginBottom: 4 },
  stepBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stepBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Freq header
  freqHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: 16, marginBottom: 8,
  },
  freqLine: { flex: 1, height: 1 },
  freqPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  freqPillTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  freqCount: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  freqCountTxt: { fontSize: 10, fontWeight: '800' },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  emptySub: { fontSize: 13, color: HUD.textSec, textAlign: 'center' },

  // Modal overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: HUD.bgCard, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, borderTopWidth: 1,
    borderTopColor: HUD.borderBright, maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: HUD.border,
  },
  sheetLabel: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2, marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  sheetMeta: { fontSize: 11, color: HUD.textSec },
  closeBtn: { padding: 4, marginLeft: 12 },

  // SSOP detail
  infoBox: {
    backgroundColor: HUD.bgCardAlt, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border,
    padding: 12, marginBottom: 16,
  },
  sectionLbl: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 10 },
  stepCard: {
    flexDirection: 'row', gap: 12, marginBottom: 12,
    backgroundColor: HUD.bgCardAlt, borderRadius: 8,
    borderWidth: 1, borderColor: HUD.border, padding: 12,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: HUD.cyanDim, borderWidth: 1, borderColor: HUD.cyan + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumTxt: { fontSize: 12, fontWeight: '800', color: HUD.cyan },
  stepTxt: { fontSize: 13, color: HUD.text, lineHeight: 20 },
  caution: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, backgroundColor: HUD.amberDim,
    borderRadius: 6, padding: 6,
  },
  cautionTxt: { fontSize: 11, color: HUD.amber, flex: 1 },
  noStepsTxt: { fontSize: 12, color: HUD.textSec, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },

  // Form
  ssopReminder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: HUD.cyanDim, borderRadius: 8,
    borderWidth: 1, borderColor: HUD.cyan + '33',
    padding: 10, marginBottom: 4,
  },
  input: {
    backgroundColor: HUD.bgCardAlt, borderWidth: 1,
    borderColor: HUD.borderBright, borderRadius: 8,
    padding: 12, color: HUD.text, fontSize: 14,
  },
  segRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seg: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
    borderColor: HUD.border, backgroundColor: HUD.bgCardAlt,
  },
  segActive: { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan },
  segTxt: { fontSize: 11, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.5 },
  segTxtActive: { color: HUD.cyan },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: HUD.green, borderRadius: 10,
    padding: 16, marginTop: 24,
  },
  submitTxt: { fontSize: 13, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
});
