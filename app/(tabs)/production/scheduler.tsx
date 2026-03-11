// app/(tabs)/production/scheduler.tsx
// TulKenz OPS — Department Scheduler
// Week view + Day view toggle. Production = primary layer. Everything else fits around it.

import React, {
  useState, useMemo, useCallback, useRef, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Calendar, Clock, ChevronLeft,
  ChevronRight, AlertTriangle, Zap, X, Check,
  Users, Wrench, ClipboardCheck, Shield, Activity,
  Factory, RefreshCw, Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmployees } from '@/hooks/useSupabaseEmployees';
import {
  useScheduleBlocks, usePMSuggestions, useBreakTemplates,
  type ScheduleBlock, type BlockType, type PMClearanceType,
  type CreateScheduleBlockInput, BLOCK_TYPE_CONFIG, DISRUPTION_LABELS,
  parseConflictError,
} from '@/hooks/useScheduleBlocks';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOMS = ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5am–10pm
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 60; // px per hour in day view
const DAY_COL_W = (SCREEN_W - 52) / 7; // week view column width

const BLOCK_ICONS: Record<BlockType, any> = {
  production:    Factory,
  training:      Users,
  pm:            Wrench,
  preop:         ClipboardCheck,
  quality_check: Activity,
  safety_check:  Shield,
};

const CLEARANCE_OPTIONS: { value: PMClearanceType; label: string; desc: string }[] = [
  { value: 'none',        label: 'No clearance needed', desc: 'Tech never contacts product — can work alongside running line' },
  { value: 'people_out',  label: 'People out, product ok', desc: 'Room must be clear of people during break — product stays' },
  { value: 'full_clear',  label: 'Full clear required',  desc: 'Room fully empty — wet clean needed. Pre/post shift only.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const label = h >= 12 ? 'pm' : 'am';
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${hr}${label}` : `${hr}:${String(m).padStart(2, '0')}${label}`;
}

function blockDurationMins(block: ScheduleBlock): number {
  return (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60000;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BlockPill({
  block, onPress, compact = false, colors,
}: {
  block: ScheduleBlock;
  onPress: () => void;
  compact?: boolean;
  colors: any;
}) {
  const cfg = BLOCK_TYPE_CONFIG[block.block_type];
  const Icon = BLOCK_ICONS[block.block_type];
  const mins = blockDurationMins(block);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.blockPill,
        {
          backgroundColor: cfg.lightColor,
          borderLeftColor: cfg.color,
          borderLeftWidth: 3,
        },
        block.has_conflict && { borderColor: '#ff2d55', borderWidth: 1 },
      ]}
    >
      <View style={styles.blockPillRow}>
        <Icon size={compact ? 9 : 11} color={cfg.color} />
        {block.has_conflict && <AlertTriangle size={9} color="#ff2d55" />}
      </View>
      {!compact && (
        <Text style={[styles.blockPillTitle, { color: cfg.color }]} numberOfLines={1}>
          {block.title}
        </Text>
      )}
      {!compact && mins >= 60 && (
        <Text style={[styles.blockPillTime, { color: cfg.color + 'aa' }]}>
          {formatTime(block.start_time)}–{formatTime(block.end_time)}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SchedulerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [showPMSuggest, setShowPMSuggest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { blocks, isLoading, refetch, createBlock, isCreating, cancelBlock } =
    useScheduleBlocks(weekStart);
  const { breakTemplates } = useBreakTemplates();
  const { employees: allEmployees } = useEmployees();

  // ── Derived: blocks grouped by day ───────────────────────────────────────
  const blocksByDay = useMemo(() => {
    const map: Record<string, ScheduleBlock[]> = {};
    blocks.forEach(b => {
      const key = new Date(b.start_time).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [blocks]);

  const dayBlocks = useMemo(() => {
    const key = selectedDay.toDateString();
    return (blocksByDay[key] || []).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }, [blocksByDay, selectedDay]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    setViewMode('day');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openBlock = (block: ScheduleBlock) => {
    setSelectedBlock(block);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─── Week View ─────────────────────────────────────────────────────────────

  const WeekView = () => (
    <ScrollView
      style={styles.weekScroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Day column headers */}
      <View style={[styles.weekHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.weekHeaderSpacer} />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, new Date());
          const hasBlocks = !!blocksByDay[day.toDateString()]?.length;
          return (
            <Pressable
              key={i}
              style={styles.weekDayHeader}
              onPress={() => selectDay(day)}
            >
              <Text style={[styles.weekDayLabel, { color: colors.textSecondary }]}>
                {DAY_LABELS[day.getDay()]}
              </Text>
              <View style={[
                styles.weekDayNum,
                isToday && { backgroundColor: '#00e5ff' },
              ]}>
                <Text style={[
                  styles.weekDayNumText,
                  { color: isToday ? '#020912' : colors.text },
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              {hasBlocks && (
                <View style={[styles.weekDayDot, { backgroundColor: '#00e5ff' }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Room rows */}
      {ROOMS.map(room => {
        return (
          <View key={room} style={[styles.weekRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.weekRowLabel, { borderRightColor: colors.border }]}>
              <Text style={[styles.weekRowLabelText, { color: colors.textSecondary }]}>
                {room}
              </Text>
            </View>
            {weekDays.map((day, i) => {
              const dayKey = day.toDateString();
              const roomBlocks = (blocksByDay[dayKey] || []).filter(
                b => b.room_id === room
              );
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.weekCell,
                    { borderRightColor: colors.border },
                    isSameDay(day, new Date()) && { backgroundColor: '#00e5ff08' },
                  ]}
                  onPress={() => selectDay(day)}
                >
                  {roomBlocks.slice(0, 3).map(b => (
                    <BlockPill
                      key={b.id}
                      block={b}
                      onPress={() => openBlock(b)}
                      compact={roomBlocks.length > 1}
                      colors={colors}
                    />
                  ))}
                  {roomBlocks.length > 3 && (
                    <Text style={[styles.moreLabel, { color: colors.textTertiary }]}>
                      +{roomBlocks.length - 3}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}

      {/* Non-room blocks (training, etc.) */}
      <View style={[styles.weekRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.weekRowLabel, { borderRightColor: colors.border }]}>
          <Text style={[styles.weekRowLabelText, { color: colors.textSecondary }]}>
            People
          </Text>
        </View>
        {weekDays.map((day, i) => {
          const dayKey = day.toDateString();
          const nonRoomBlocks = (blocksByDay[dayKey] || []).filter(
            b => !b.room_id && b.block_type === 'training'
          );
          return (
            <Pressable
              key={i}
              style={[
                styles.weekCell,
                { borderRightColor: colors.border },
                isSameDay(day, new Date()) && { backgroundColor: '#00e5ff08' },
              ]}
              onPress={() => selectDay(day)}
            >
              {nonRoomBlocks.slice(0, 2).map(b => (
                <BlockPill
                  key={b.id}
                  block={b}
                  onPress={() => openBlock(b)}
                  compact
                  colors={colors}
                />
              ))}
              {nonRoomBlocks.length > 2 && (
                <Text style={[styles.moreLabel, { color: colors.textTertiary }]}>
                  +{nonRoomBlocks.length - 2}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );

  // ─── Day View ──────────────────────────────────────────────────────────────

  const DayView = () => {
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
      // Scroll to 6am on load
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: HOUR_HEIGHT * 1, animated: false });
      }, 100);
    }, []);

    return (
      <ScrollView
        ref={scrollRef}
        style={styles.dayScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayTimeline}>
          {/* Hour rows */}
          {HOURS.map(h => (
            <View
              key={h}
              style={[
                styles.hourRow,
                { borderTopColor: colors.border, height: HOUR_HEIGHT },
              ]}
            >
              <Text style={[styles.hourLabel, { color: colors.textTertiary }]}>
                {formatHour(h)}
              </Text>
              <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
            </View>
          ))}

          {/* Blocks overlaid */}
          {dayBlocks.map(block => {
            const start = new Date(block.start_time);
            const end = new Date(block.end_time);
            const startH = start.getHours() + start.getMinutes() / 60;
            const endH = end.getHours() + end.getMinutes() / 60;
            const topOffset = (startH - HOURS[0]) * HOUR_HEIGHT;
            const height = Math.max((endH - startH) * HOUR_HEIGHT, 28);
            const cfg = BLOCK_TYPE_CONFIG[block.block_type];
            const Icon = BLOCK_ICONS[block.block_type];

            return (
              <Pressable
                key={block.id}
                onPress={() => openBlock(block)}
                style={[
                  styles.dayBlock,
                  {
                    top: topOffset,
                    height,
                    backgroundColor: cfg.lightColor,
                    borderLeftColor: cfg.color,
                    left: 52,
                    right: 8,
                  },
                  block.has_conflict && { borderColor: '#ff2d55', borderWidth: 1 },
                ]}
              >
                <View style={styles.dayBlockHeader}>
                  <Icon size={11} color={cfg.color} />
                  <Text style={[styles.dayBlockType, { color: cfg.color }]}>
                    {BLOCK_TYPE_CONFIG[block.block_type].label}
                  </Text>
                  {block.room_id && (
                    <View style={[styles.roomBadge, { backgroundColor: cfg.color + '33' }]}>
                      <Text style={[styles.roomBadgeText, { color: cfg.color }]}>
                        {block.room_id}
                      </Text>
                    </View>
                  )}
                  {block.has_conflict && (
                    <AlertTriangle size={10} color="#ff2d55" />
                  )}
                </View>
                {height > 44 && (
                  <Text style={[styles.dayBlockTitle, { color: colors.text }]} numberOfLines={1}>
                    {block.title}
                  </Text>
                )}
                {height > 60 && (
                  <Text style={[styles.dayBlockTime, { color: colors.textSecondary }]}>
                    {formatTime(block.start_time)} – {formatTime(block.end_time)}
                    {block.employee_name ? `  ·  ${block.employee_name}` : ''}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {/* Break overlays (from templates, relative to first production block) */}
          {(() => {
            const prodBlock = dayBlocks.find(b => b.block_type === 'production');
            if (!prodBlock || !breakTemplates.length) return null;
            const prodStart = new Date(prodBlock.start_time);

            return breakTemplates.map(bt => {
              const breakStart = new Date(prodStart.getTime() + bt.offset_minutes * 60000);
              const breakEnd = new Date(breakStart.getTime() + bt.duration_minutes * 60000);
              const startH = breakStart.getHours() + breakStart.getMinutes() / 60;
              const endH = breakEnd.getHours() + breakEnd.getMinutes() / 60;
              const topOffset = (startH - HOURS[0]) * HOUR_HEIGHT;
              const height = (endH - startH) * HOUR_HEIGHT;

              return (
                <View
                  key={bt.id}
                  style={[
                    styles.breakOverlay,
                    { top: topOffset, height, left: 52, right: 8 },
                  ]}
                >
                  <Text style={styles.breakOverlayText}>
                    {bt.break_name} ({bt.duration_minutes}min)
                  </Text>
                </View>
              );
            });
          })()}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    );
  };

  // ─── Create Modal ──────────────────────────────────────────────────────────

  const CreateModal = () => {
    const [blockType, setBlockType] = useState<BlockType>('production');
    const [title, setTitle] = useState('');
    const [room, setRoom] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [date, setDate] = useState(toDateStr(selectedDay));
    const [startTime, setStartTime] = useState('06:00');
    const [endTime, setEndTime] = useState('14:45');
    const [productName, setProductName] = useState('');
    const [crewSize, setCrewSize] = useState('');
    const [notes, setNotes] = useState('');
    const [pmClearance, setPMClearance] = useState<PMClearanceType>('none');
    const [pmDuration, setPMDuration] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const pmSuggestParams = useMemo(() => {
      if (blockType !== 'pm' || !room || !date || !pmDuration) return null;
      return {
        roomId: room,
        targetDate: date,
        durationMinutes: parseInt(pmDuration) || 30,
        clearanceType: pmClearance,
        employeeId: employeeId || undefined,
      };
    }, [blockType, room, date, pmDuration, pmClearance, employeeId]);

    const { data: pmSuggestions = [], isLoading: loadingSuggestions } =
      usePMSuggestions(showSuggestions ? pmSuggestParams : null);

    const applySuggestion = (s: any) => {
      const ss = new Date(s.suggested_shift_start);
      const se = new Date(s.suggested_shift_end);
      setStartTime(`${String(ss.getHours()).padStart(2,'0')}:${String(ss.getMinutes()).padStart(2,'0')}`);
      setEndTime(`${String(se.getHours()).padStart(2,'0')}:${String(se.getMinutes()).padStart(2,'0')}`);
      setShowSuggestions(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleSave = async () => {
      if (!title.trim()) { Alert.alert('Required', 'Block title is required.'); return; }
      if (!date) { Alert.alert('Required', 'Date is required.'); return; }

      const startISO = `${date}T${startTime}:00`;
      const endISO   = `${date}T${endTime}:00`;

      const payload: CreateScheduleBlockInput = {
        block_type: blockType,
        title:      title.trim(),
        start_time: startISO,
        end_time:   endISO,
        notes:      notes.trim() || undefined,
        room_id:    room || undefined,
        room_name:  room || undefined,
        employee_id:   employeeId || undefined,
        employee_name: employeeName || undefined,
        product_name:  productName || undefined,
        crew_size:     crewSize ? parseInt(crewSize) : undefined,
        pm_clearance_type:  blockType === 'pm' ? pmClearance : undefined,
        pm_duration_minutes: blockType === 'pm' && pmDuration ? parseInt(pmDuration) : undefined,
      };

      try {
        await createBlock(payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCreateModal(false);
      } catch (err) {
        const conflicts = parseConflictError(err);
        if (conflicts) {
          Alert.alert(
            '⚠️ Schedule Conflict',
            conflicts.join('\n\n') + '\n\nResolve the conflict before saving.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Failed to save block. Try again.');
        }
      }
    };

    return (
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCreateModal(false)} style={styles.modalClose}>
              <X size={20} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Schedule Block</Text>
            <Pressable
              onPress={handleSave}
              disabled={isCreating}
              style={[styles.modalSave, { backgroundColor: '#00e5ff' }]}
            >
              {isCreating
                ? <ActivityIndicator size="small" color="#020912" />
                : <Text style={styles.modalSaveText}>Save</Text>
              }
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

            {/* Block type selector */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Block Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {(Object.keys(BLOCK_TYPE_CONFIG) as BlockType[]).map(type => {
                const cfg = BLOCK_TYPE_CONFIG[type];
                const active = blockType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setBlockType(type)}
                    style={[
                      styles.typeChip,
                      { borderColor: active ? cfg.color : colors.border },
                      active && { backgroundColor: cfg.lightColor },
                    ]}
                  >
                    <Text style={[
                      styles.typeChipText,
                      { color: active ? cfg.color : colors.textSecondary },
                    ]}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Production note */}
            {blockType === 'production' && (
              <View style={[styles.infoBox, { backgroundColor: '#00e5ff11', borderColor: '#00e5ff33' }]}>
                <Zap size={13} color="#00e5ff" />
                <Text style={[styles.infoBoxText, { color: '#00e5ff' }]}>
                  Production blocks are the primary layer. All other blocks schedule around this.
                </Text>
              </View>
            )}

            {/* Title */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder={blockType === 'production' ? 'e.g. Chike Run — PA1' : 'e.g. Annual Forklift Safety Training'}
              placeholderTextColor={colors.textTertiary}
            />

            {/* Date + times row */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date & Time *</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.inputSm, styles.inputDate, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.inputSm, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="06:00"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.timeSep, { color: colors.textTertiary }]}>–</Text>
              <TextInput
                style={[styles.inputSm, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="14:45"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Room (not required for training) */}
            {blockType !== 'training' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Room</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                  {ROOMS.map(r => (
                    <Pressable
                      key={r}
                      onPress={() => setRoom(room === r ? '' : r)}
                      style={[
                        styles.typeChip,
                        { borderColor: room === r ? '#00e5ff' : colors.border },
                        room === r && { backgroundColor: '#00e5ff22' },
                      ]}
                    >
                      <Text style={[styles.typeChipText, { color: room === r ? '#00e5ff' : colors.textSecondary }]}>
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Production-specific fields */}
            {blockType === 'production' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Product Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="e.g. Chike Protein Coffee Original"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Crew Size</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={crewSize}
                  onChangeText={setCrewSize}
                  keyboardType="numeric"
                  placeholder="e.g. 4"
                  placeholderTextColor={colors.textTertiary}
                />
              </>
            )}

            {/* PM-specific fields */}
            {blockType === 'pm' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Estimated Duration (minutes)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={pmDuration}
                  onChangeText={setPMDuration}
                  keyboardType="numeric"
                  placeholder="e.g. 45"
                  placeholderTextColor={colors.textTertiary}
                />

                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Room Clearance Required</Text>
                {CLEARANCE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPMClearance(opt.value)}
                    style={[
                      styles.clearanceOption,
                      { borderColor: pmClearance === opt.value ? '#ffb800' : colors.border },
                      pmClearance === opt.value && { backgroundColor: '#ffb80011' },
                    ]}
                  >
                    <View style={styles.clearanceOptionRow}>
                      <View style={[
                        styles.radioOuter,
                        { borderColor: pmClearance === opt.value ? '#ffb800' : colors.border },
                      ]}>
                        {pmClearance === opt.value && (
                          <View style={[styles.radioInner, { backgroundColor: '#ffb800' }]} />
                        )}
                      </View>
                      <View style={styles.clearanceOptionText}>
                        <Text style={[styles.clearanceLabel, { color: colors.text }]}>{opt.label}</Text>
                        <Text style={[styles.clearanceDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}

                {/* PM Optimizer button */}
                {room && date && pmDuration ? (
                  <Pressable
                    onPress={() => setShowSuggestions(!showSuggestions)}
                    style={[styles.suggestBtn, { backgroundColor: '#ffb80022', borderColor: '#ffb80055' }]}
                  >
                    <Zap size={14} color="#ffb800" />
                    <Text style={[styles.suggestBtnText, { color: '#ffb800' }]}>
                      {showSuggestions ? 'Hide suggestions' : '✨ Find optimal windows'}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={[styles.infoBox, { backgroundColor: '#ffb80011', borderColor: '#ffb80033' }]}>
                    <Info size={12} color="#ffb800" />
                    <Text style={[styles.infoBoxText, { color: '#ffb800' }]}>
                      Fill in room, date, and duration to get optimal scheduling suggestions.
                    </Text>
                  </View>
                )}

                {/* PM Suggestions */}
                {showSuggestions && (
                  <View style={styles.suggestionsBlock}>
                    {loadingSuggestions ? (
                      <ActivityIndicator color="#ffb800" style={{ marginVertical: 12 }} />
                    ) : pmSuggestions.length === 0 ? (
                      <Text style={[styles.noSuggestText, { color: colors.textSecondary }]}>
                        No suggestions found. Try adjusting room or date.
                      </Text>
                    ) : (
                      pmSuggestions.map((s, i) => (
                        <Pressable
                          key={i}
                          onPress={() => applySuggestion(s)}
                          style={[styles.suggestionCard, {
                            backgroundColor: colors.surface,
                            borderColor: s.disruption_score === 0 ? '#00ff88' :
                              s.disruption_score === 1 ? '#ffb800' : colors.border,
                          }]}
                        >
                          <View style={styles.suggestionCardHeader}>
                            <Text style={[styles.suggestionRank, { color: '#00e5ff' }]}>
                              #{s.suggestion_rank}
                            </Text>
                            <Text style={[styles.suggestionLabel, { color: colors.text }]}>
                              {s.window_label}
                            </Text>
                            <View style={[styles.disruptionBadge, {
                              backgroundColor: s.disruption_score === 0 ? '#00ff8822' :
                                s.disruption_score === 1 ? '#ffb80022' : '#ff2d5522',
                            }]}>
                              <Text style={[styles.disruptionText, {
                                color: s.disruption_score === 0 ? '#00ff88' :
                                  s.disruption_score === 1 ? '#ffb800' : '#ff2d55',
                              }]}>
                                {DISRUPTION_LABELS[s.disruption_score] || 'Unknown'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.suggestionShift, { color: colors.textSecondary }]}>
                            Tech shift: {formatTime(s.suggested_shift_start)} – {formatTime(s.suggested_shift_end)}
                          </Text>
                          <Text style={[styles.suggestionNotes, { color: colors.textTertiary }]}>
                            {s.notes}
                          </Text>
                          <Text style={[styles.suggestionApply, { color: '#00e5ff' }]}>
                            Tap to apply these times →
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </>
            )}

            {/* Assigned person (all types except production which uses crew) */}
            {blockType !== 'production' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={employeeName}
                  onChangeText={setEmployeeName}
                  placeholder="Employee name"
                  placeholderTextColor={colors.textTertiary}
                />
              </>
            )}

            {/* Notes */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.inputMulti, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Optional notes..."
              placeholderTextColor={colors.textTertiary}
            />

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // ─── Detail Modal ──────────────────────────────────────────────────────────

  const DetailModal = () => {
    if (!selectedBlock) return null;
    const cfg = BLOCK_TYPE_CONFIG[selectedBlock.block_type];
    const Icon = BLOCK_ICONS[selectedBlock.block_type];
    const mins = blockDurationMins(selectedBlock);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationLabel = hours > 0
      ? `${hours}h${remMins > 0 ? ` ${remMins}m` : ''}`
      : `${mins}m`;

    const handleCancel = () => {
      Alert.alert(
        'Cancel Block',
        `Cancel "${selectedBlock.title}"? This cannot be undone.`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Block', style: 'destructive',
            onPress: async () => {
              await cancelBlock(selectedBlock.id);
              setShowDetailModal(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
    };

    return (
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)} style={styles.modalClose}>
              <X size={20} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Block Detail</Text>
            <Pressable onPress={handleCancel} style={styles.cancelBlockBtn}>
              <Text style={styles.cancelBlockBtnText}>Cancel Block</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Type banner */}
            <View style={[styles.detailBanner, { backgroundColor: cfg.lightColor, borderColor: cfg.color }]}>
              <Icon size={28} color={cfg.color} />
              <View style={styles.detailBannerText}>
                <Text style={[styles.detailType, { color: cfg.color }]}>{cfg.label}</Text>
                <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedBlock.title}</Text>
              </View>
              {selectedBlock.has_conflict && (
                <View style={styles.conflictBadge}>
                  <AlertTriangle size={14} color="#ff2d55" />
                  <Text style={styles.conflictBadgeText}>Conflict</Text>
                </View>
              )}
            </View>

            {selectedBlock.has_conflict && selectedBlock.conflict_reason && (
              <View style={[styles.conflictBox, { backgroundColor: '#ff2d5511', borderColor: '#ff2d5555' }]}>
                <AlertTriangle size={13} color="#ff2d55" />
                <Text style={[styles.conflictBoxText, { color: '#ff2d55' }]}>
                  {selectedBlock.conflict_reason}
                </Text>
              </View>
            )}

            {/* Detail rows */}
            {[
              { label: 'Date', value: new Date(selectedBlock.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) },
              { label: 'Time', value: `${formatTime(selectedBlock.start_time)} – ${formatTime(selectedBlock.end_time)} (${durationLabel})` },
              selectedBlock.room_id ? { label: 'Room', value: selectedBlock.room_id } : null,
              selectedBlock.employee_name ? { label: 'Assigned To', value: selectedBlock.employee_name } : null,
              selectedBlock.department_name ? { label: 'Department', value: selectedBlock.department_name } : null,
              selectedBlock.product_name ? { label: 'Product', value: selectedBlock.product_name } : null,
              selectedBlock.crew_size ? { label: 'Crew Size', value: String(selectedBlock.crew_size) } : null,
              selectedBlock.equipment_name ? { label: 'Equipment', value: selectedBlock.equipment_name } : null,
              selectedBlock.pm_clearance_type ? { label: 'PM Clearance', value: CLEARANCE_OPTIONS.find(o => o.value === selectedBlock.pm_clearance_type)?.label || selectedBlock.pm_clearance_type } : null,
              selectedBlock.notes ? { label: 'Notes', value: selectedBlock.notes } : null,
              { label: 'Status', value: selectedBlock.status.charAt(0).toUpperCase() + selectedBlock.status.slice(1) },
              { label: 'Created By', value: selectedBlock.created_by_name || 'Unknown' },
            ].filter(Boolean).map((row: any, i) => (
              <View key={i} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailRowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.detailRowValue, { color: colors.text }]}>{row.value}</Text>
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scheduler</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {viewMode === 'week'
              ? `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            }
          </Text>
        </View>

        {/* View toggle */}
        <View style={[styles.viewToggle, { backgroundColor: colors.backgroundSecondary }]}>
          <Pressable
            onPress={() => setViewMode('week')}
            style={[styles.viewToggleBtn, viewMode === 'week' && { backgroundColor: colors.surface }]}
          >
            <Calendar size={15} color={viewMode === 'week' ? '#00e5ff' : colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setViewMode('day')}
            style={[styles.viewToggleBtn, viewMode === 'day' && { backgroundColor: colors.surface }]}
          >
            <Clock size={15} color={viewMode === 'day' ? '#00e5ff' : colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Nav bar */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={viewMode === 'week' ? prevWeek : () => setSelectedDay(d => addDays(d, -1))} style={styles.navBtn}>
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>

        {viewMode === 'day' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
            {weekDays.map((day, i) => {
              const active = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelectedDay(day)}
                  style={[
                    styles.dayPickerBtn,
                    active && { backgroundColor: '#00e5ff22', borderColor: '#00e5ff' },
                    !active && { borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[styles.dayPickerDay, { color: active ? '#00e5ff' : colors.textSecondary }]}>
                    {DAY_LABELS[day.getDay()]}
                  </Text>
                  <Text style={[
                    styles.dayPickerNum,
                    { color: active ? '#00e5ff' : isToday ? colors.primary : colors.text },
                    isToday && !active && styles.todayUnderline,
                  ]}>
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {viewMode === 'week' && (
          <Pressable onPress={() => setWeekStart(getWeekStart(new Date()))} style={styles.todayBtn}>
            <Text style={[styles.todayBtnText, { color: '#00e5ff' }]}>Today</Text>
          </Pressable>
        )}

        <Pressable onPress={viewMode === 'week' ? nextWeek : () => setSelectedDay(d => addDays(d, 1))} style={styles.navBtn}>
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.legend, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.legendContent}
      >
        {(Object.keys(BLOCK_TYPE_CONFIG) as BlockType[]).map(type => {
          const cfg = BLOCK_TYPE_CONFIG[type];
          return (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{cfg.label}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Main content */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#00e5ff" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading schedule…</Text>
        </View>
      ) : (
        viewMode === 'week' ? <WeekView /> : <DayView />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          setShowCreateModal(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        style={styles.fab}
      >
        <Plus size={24} color="#020912" />
      </Pressable>

      <CreateModal />
      <DetailModal />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:            { flex: 1 },

  // Header
  header:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  backBtn:              { padding: 4 },
  headerCenter:         { flex: 1 },
  headerTitle:          { fontSize: 17, fontWeight: '700' },
  headerSub:            { fontSize: 11, marginTop: 1 },
  viewToggle:           { flexDirection: 'row', borderRadius: 8, padding: 2 },
  viewToggleBtn:        { padding: 6, borderRadius: 6 },

  // Nav bar
  navBar:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, borderBottomWidth: 1 },
  navBtn:               { padding: 8 },
  todayBtn:             { flex: 1, alignItems: 'center' },
  todayBtnText:         { fontSize: 13, fontWeight: '600' },
  dayPicker:            { flex: 1 },
  dayPickerBtn:         { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginHorizontal: 2 },
  dayPickerDay:         { fontSize: 10, fontWeight: '600' },
  dayPickerNum:         { fontSize: 15, fontWeight: '700', marginTop: 1 },
  todayUnderline:       { textDecorationLine: 'underline' },

  // Legend
  legend:               { maxHeight: 32, borderBottomWidth: 1 },
  legendContent:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12, paddingVertical: 6 },
  legendItem:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:            { width: 8, height: 8, borderRadius: 4 },
  legendText:           { fontSize: 10 },

  // Week view
  weekScroll:           { flex: 1 },
  weekHeader:           { flexDirection: 'row', borderBottomWidth: 1 },
  weekHeaderSpacer:     { width: 44 },
  weekDayHeader:        { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekDayLabel:         { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  weekDayNum:           { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  weekDayNumText:       { fontSize: 12, fontWeight: '700' },
  weekDayDot:           { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  weekRow:              { flexDirection: 'row', minHeight: 56, borderBottomWidth: 1 },
  weekRowLabel:         { width: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, paddingVertical: 4 },
  weekRowLabelText:     { fontSize: 9, fontWeight: '700' },
  weekCell:             { flex: 1, borderRightWidth: 1, padding: 2, gap: 2 },
  moreLabel:            { fontSize: 9, textAlign: 'center' },

  // Block pill (week view)
  blockPill:            { borderRadius: 4, padding: 3, marginBottom: 1 },
  blockPillRow:         { flexDirection: 'row', gap: 2, alignItems: 'center' },
  blockPillTitle:       { fontSize: 9, fontWeight: '600', marginTop: 1 },
  blockPillTime:        { fontSize: 8, marginTop: 1 },

  // Day view
  dayScroll:            { flex: 1 },
  dayTimeline:          { position: 'relative', paddingBottom: 20 },
  hourRow:              { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1 },
  hourLabel:            { width: 44, fontSize: 10, textAlign: 'right', paddingRight: 6, paddingTop: 2 },
  hourLine:             { flex: 1, height: 1, marginTop: 10 },
  dayBlock:             { position: 'absolute', borderRadius: 6, borderLeftWidth: 3, padding: 5, overflow: 'hidden' },
  dayBlockHeader:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  dayBlockType:         { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  roomBadge:            { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  roomBadgeText:        { fontSize: 9, fontWeight: '700' },
  dayBlockTitle:        { fontSize: 12, fontWeight: '600', marginTop: 2 },
  dayBlockTime:         { fontSize: 10, marginTop: 1 },
  breakOverlay:         { position: 'absolute', backgroundColor: '#ffffff08', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ffffff15', alignItems: 'center', justifyContent: 'center' },
  breakOverlayText:     { fontSize: 9, color: '#ffffff44', fontStyle: 'italic' },

  // Modal
  modalContainer:       { flex: 1 },
  modalHeader:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalClose:           { padding: 4, marginRight: 8 },
  modalTitle:           { flex: 1, fontSize: 17, fontWeight: '700' },
  modalSave:            { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  modalSaveText:        { fontSize: 14, fontWeight: '700', color: '#020912' },
  modalScroll:          { padding: 16 },
  cancelBlockBtn:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#ff2d5522' },
  cancelBlockBtnText:   { fontSize: 12, color: '#ff2d55', fontWeight: '600' },

  // Form fields
  fieldLabel:           { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  input:                { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  inputMulti:           { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  inputSm:              { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, flex: 1 },
  inputDate:            { flex: 1.5 },
  timeRow:              { flexDirection: 'row', gap: 8, alignItems: 'center' },
  timeSep:              { fontSize: 16, fontWeight: '300' },
  typeRow:              { flexDirection: 'row', marginBottom: 4 },
  typeChip:             { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  typeChipText:         { fontSize: 12, fontWeight: '600' },

  // PM clearance
  clearanceOption:      { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  clearanceOptionRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  clearanceOptionText:  { flex: 1 },
  clearanceLabel:       { fontSize: 13, fontWeight: '600' },
  clearanceDesc:        { fontSize: 11, marginTop: 2, lineHeight: 16 },
  radioOuter:           { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioInner:           { width: 8, height: 8, borderRadius: 4 },

  // PM suggestions
  suggestBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  suggestBtnText:       { fontSize: 13, fontWeight: '600' },
  suggestionsBlock:     { marginTop: 12, gap: 8 },
  noSuggestText:        { fontSize: 13, textAlign: 'center', marginVertical: 12 },
  suggestionCard:       { borderWidth: 1, borderRadius: 12, padding: 12 },
  suggestionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  suggestionRank:       { fontSize: 12, fontWeight: '700', width: 22 },
  suggestionLabel:      { flex: 1, fontSize: 13, fontWeight: '600' },
  disruptionBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  disruptionText:       { fontSize: 10, fontWeight: '700' },
  suggestionShift:      { fontSize: 12, marginBottom: 4 },
  suggestionNotes:      { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  suggestionApply:      { fontSize: 11, fontWeight: '600', textAlign: 'right' },

  // Detail modal
  detailBanner:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, margin: 16, marginBottom: 8 },
  detailBannerText:     { flex: 1 },
  detailType:           { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailTitle:          { fontSize: 16, fontWeight: '700', marginTop: 2 },
  conflictBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ff2d5522', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  conflictBadgeText:    { fontSize: 10, color: '#ff2d55', fontWeight: '700' },
  conflictBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  conflictBoxText:      { fontSize: 12, flex: 1, lineHeight: 17 },
  detailRow:            { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  detailRowLabel:       { width: 110, fontSize: 13 },
  detailRowValue:       { flex: 1, fontSize: 13, fontWeight: '500' },

  // Info box
  infoBox:              { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  infoBoxText:          { fontSize: 11, flex: 1, lineHeight: 16 },

  // Loading
  loadingCenter:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:          { fontSize: 13 },

  // FAB
  fab:                  { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#00e5ff', alignItems: 'center', justifyContent: 'center', shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
