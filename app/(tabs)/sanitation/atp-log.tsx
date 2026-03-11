// app/(tabs)/sanitation/atp-log.tsx
// ATP Swab Results Log — Quick Entry + History
// Full HUD theme · TulKenz OPS

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, RefreshControl, Alert,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useEMPSwabs,
  EMPSwabPoint,
  ATPSwabResult,
} from '../../../hooks/useEMPSwabs';
import { reversePostATPResult } from '../../../constants/sanitationTaskFeedTemplates';

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
const ZONES = ['All', '1', '2', '3', '4'];

const ZONE_COLORS: Record<string, string> = {
  '1': HUD.red, '2': HUD.amber, '3': HUD.purple, '4': HUD.cyan,
};
const ZONE_LABELS: Record<string, string> = {
  '1': 'Zone 1 — Food Contact',
  '2': 'Zone 2 — Near Food',
  '3': 'Zone 3 — Non-Food Contact',
  '4': 'Zone 4 — General Facility',
};

const ATP_PASS = 100;
const ATP_WARN = 200;

function getATPStatus(rlu: number): { label: string; color: string; dim: string } {
  if (rlu <= ATP_PASS) return { label: 'PASS', color: HUD.green, dim: HUD.greenDim };
  if (rlu <= ATP_WARN) return { label: 'WARNING', color: HUD.amber, dim: HUD.amberDim };
  return { label: 'FAIL', color: HUD.red, dim: HUD.redDim };
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
function ZoneBadge({ zone }: { zone: string }) {
  const color = ZONE_COLORS[zone] ?? HUD.textSec;
  return (
    <View style={[s.zoneBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[s.zoneBadgeTxt, { color }]}>ZONE {zone}</Text>
    </View>
  );
}

function RLUBar({ rlu }: { rlu: number }) {
  const pct = Math.min(rlu / 300, 1);
  const status = getATPStatus(rlu);
  return (
    <View style={s.rluBar}>
      <View style={s.rluTrack}>
        {/* Pass zone */}
        <View style={[s.rluZone, { flex: ATP_PASS / 300, backgroundColor: HUD.green + '33' }]} />
        {/* Warn zone */}
        <View style={[s.rluZone, { flex: (ATP_WARN - ATP_PASS) / 300, backgroundColor: HUD.amber + '33' }]} />
        {/* Fail zone */}
        <View style={[s.rluZone, { flex: (300 - ATP_WARN) / 300, backgroundColor: HUD.red + '33' }]} />
        {/* Fill */}
        <View style={[s.rluFill, { width: `${pct * 100}%`, backgroundColor: status.color }]} />
      </View>
      <Text style={[s.rluValue, { color: status.color }]}>{rlu} RLU</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// SWAB POINT SELECTOR CARD
// ─────────────────────────────────────────────
function SwabPointCard({
  point, selected, onSelect,
}: {
  point: EMPSwabPoint;
  selected: boolean;
  onSelect: () => void;
}) {
  const zoneColor = ZONE_COLORS[String(point.zone_number)] ?? HUD.textSec;
  const lastStatus = point.last_atp_result ? getATPStatus(point.last_atp_result) : null;

  return (
    <TouchableOpacity
      style={[s.swabPointCard, selected && { borderColor: HUD.cyan, backgroundColor: HUD.cyanDim }]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View style={[s.swabPointZoneLine, { backgroundColor: zoneColor }]} />
      <View style={s.swabPointBody}>
        <View style={s.swabPointTop}>
          <ZoneBadge zone={String(point.zone_number)} />
          <Text style={s.swabPointCode}>{point.point_code}</Text>
          {selected && (
            <View style={s.selectedMark}>
              <Ionicons name="checkmark-circle" size={18} color={HUD.cyan} />
            </View>
          )}
        </View>
        <Text style={s.swabPointName}>{point.point_name}</Text>
        <View style={s.swabPointMeta}>
          <View style={s.metaItem}>
            <Ionicons name="location-outline" size={11} color={HUD.textDim} />
            <Text style={s.metaItemTxt}>{point.room} · {point.location_description}</Text>
          </View>
        </View>
        {lastStatus && point.last_atp_result !== null ? (
          <View style={[s.lastResultRow, { backgroundColor: lastStatus.dim }]}>
            <Text style={[s.lastResultTxt, { color: lastStatus.color }]}>
              Last: {point.last_atp_result} RLU — {lastStatus.label}
            </Text>
          </View>
        ) : (
          <View style={[s.lastResultRow, { backgroundColor: HUD.bgCardAlt }]}>
            <Text style={s.noLastTxt}>No prior result</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// RESULT HISTORY CARD
// ─────────────────────────────────────────────
function ResultCard({ result }: { result: ATPSwabResult }) {
  const status = getATPStatus(result.rlu_value);
  const zoneColor = ZONE_COLORS[String(result.zone_number)] ?? HUD.textSec;

  return (
    <View style={[s.resultCard, { borderLeftColor: status.color }]}>
      <View style={s.resultTop}>
        <ZoneBadge zone={String(result.zone_number)} />
        <Text style={s.resultPointCode}>{result.point_code}</Text>
        <View style={[s.statusChip, { backgroundColor: status.dim, borderColor: status.color + '66' }]}>
          <Text style={[s.statusChipTxt, { color: status.color }]}>{status.label}</Text>
        </View>
        {result.corrective_action_id ? (
          <View style={[s.caTag, { backgroundColor: HUD.redDim, borderColor: HUD.red + '55' }]}>
            <Ionicons name="alert-circle" size={10} color={HUD.red} />
            <Text style={[s.caTagTxt, { color: HUD.red }]}>CA</Text>
          </View>
        ) : null}
      </View>

      <Text style={s.resultPointName}>{result.point_name}</Text>

      <RLUBar rlu={result.rlu_value} />

      <View style={s.resultMeta}>
        <View style={s.metaItem}>
          <Ionicons name="location-outline" size={11} color={HUD.textDim} />
          <Text style={s.metaItemTxt}>{result.room}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="person-outline" size={11} color={HUD.textDim} />
          <Text style={s.metaItemTxt}>{result.tested_by}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={11} color={HUD.textDim} />
          <Text style={s.metaItemTxt}>
            {new Date(result.tested_at).toLocaleDateString()} {new Date(result.tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      {result.notes ? (
        <View style={s.resultNotes}>
          <Ionicons name="chatbubble-outline" size={11} color={HUD.textDim} />
          <Text style={s.resultNotesTxt}>{result.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// LOG ATP MODAL
// ─────────────────────────────────────────────
function LogATPModal({
  swabPoints,
  onClose,
  onSubmit,
}: {
  swabPoints: EMPSwabPoint[];
  onClose: () => void;
  onSubmit: (data: {
    swabPointId: string;
    rluValue: number;
    testedBy: string;
    instrumentId: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<'select' | 'enter'>('select');
  const [selectedPoint, setSelectedPoint] = useState<EMPSwabPoint | null>(null);
  const [rluInput, setRluInput] = useState('');
  const [testedBy, setTestedBy] = useState('');
  const [instrumentId, setInstrumentId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [roomFilter, setRoomFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');

  const rluNum = parseInt(rluInput, 10);
  const rluValid = !isNaN(rluNum) && rluNum >= 0;
  const rluStatus = rluValid ? getATPStatus(rluNum) : null;

  const filteredPoints = useMemo(() => {
    let pts = swabPoints.filter(p => p.atp_frequency !== 'none');
    if (roomFilter !== 'All') pts = pts.filter(p => p.room === roomFilter);
    if (zoneFilter !== 'All') pts = pts.filter(p => String(p.zone_number) === zoneFilter);
    return pts;
  }, [swabPoints, roomFilter, zoneFilter]);

  const handleSubmit = async () => {
    if (!selectedPoint) return;
    if (!rluValid) { Alert.alert('Required', 'Enter a valid RLU value (0 or greater).'); return; }
    if (!testedBy.trim()) { Alert.alert('Required', 'Tested By is required.'); return; }
    setSubmitting(true);
    await onSubmit({
      swabPointId: selectedPoint.id,
      rluValue: rluNum,
      testedBy: testedBy.trim(),
      instrumentId: instrumentId.trim(),
      notes: notes.trim(),
    });
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>ATP SWAB LOG</Text>
          <Text style={s.sheetTitle}>
            {step === 'select' ? 'Select Swab Point' : `Log Result — ${selectedPoint?.point_code}`}
          </Text>
          {step === 'enter' && selectedPoint ? (
            <Text style={s.sheetMeta}>
              {selectedPoint.room} · {selectedPoint.point_name} · {ZONE_LABELS[String(selectedPoint.zone_number)]}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={s.stepStrip}>
        <View style={[s.stepDot, step === 'select' ? s.stepDotActive : s.stepDotDone]}>
          {step === 'enter'
            ? <Ionicons name="checkmark" size={12} color={HUD.bg} />
            : <Text style={s.stepDotTxt}>1</Text>}
        </View>
        <View style={[s.stepLine, step === 'enter' && { backgroundColor: HUD.cyan }]} />
        <View style={[s.stepDot, step === 'enter' && s.stepDotActive]}>
          <Text style={s.stepDotTxt}>2</Text>
        </View>
        <Text style={{ fontSize: 10, color: HUD.textDim, marginLeft: 8 }}>
          {step === 'select' ? 'SELECT POINT' : 'ENTER RESULT'}
        </Text>
      </View>

      {step === 'select' ? (
        <>
          {/* Filters */}
          <View style={s.filterBlock}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 6 }}>
              {ZONES.map(z => {
                const color = ZONE_COLORS[z] ?? HUD.textSec;
                const active = zoneFilter === z;
                return (
                  <TouchableOpacity key={z}
                    style={[s.filterChip, active && { backgroundColor: color + '22', borderColor: color + '55' }]}
                    onPress={() => setZoneFilter(z)}>
                    <Text style={[s.filterChipTxt, active && { color }]}>
                      {z === 'All' ? 'ALL ZONES' : `Z${z}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
            {filteredPoints.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="search" size={36} color={HUD.textDim} />
                <Text style={s.emptyTitle}>NO POINTS</Text>
                <Text style={s.emptySub}>No ATP swab points match this filter.</Text>
              </View>
            ) : filteredPoints.map(pt => (
              <SwabPointCard
                key={pt.id} point={pt}
                selected={selectedPoint?.id === pt.id}
                onSelect={() => setSelectedPoint(pt)}
              />
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
          <View style={s.sheetFooter}>
            <TouchableOpacity
              style={[s.nextBtn, !selectedPoint && { opacity: 0.4 }]}
              onPress={() => selectedPoint && setStep('enter')}
              disabled={!selectedPoint}>
              <Text style={s.nextBtnTxt}>NEXT: ENTER RESULT</Text>
              <Ionicons name="arrow-forward" size={16} color={HUD.bg} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}>

            {/* Selected point summary */}
            {selectedPoint ? (
              <View style={s.selectedPointSummary}>
                <ZoneBadge zone={String(selectedPoint.zone_number)} />
                <View style={{ flex: 1 }}>
                  <Text style={s.selPointCode}>{selectedPoint.point_code}</Text>
                  <Text style={s.selPointName}>{selectedPoint.point_name}</Text>
                  <Text style={s.selPointRoom}>{selectedPoint.room} · {selectedPoint.location_description}</Text>
                </View>
                <TouchableOpacity onPress={() => setStep('select')} style={s.changeBtn}>
                  <Text style={s.changeBtnTxt}>CHANGE</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* RLU Entry */}
            <FieldLabel label="RLU VALUE" required />
            <TextInput
              style={[s.rluInput, rluValid && { borderColor: rluStatus?.color ?? HUD.borderBright }]}
              value={rluInput}
              onChangeText={setRluInput}
              placeholder="Enter RLU reading"
              placeholderTextColor={HUD.textDim}
              keyboardType="numeric"
            />
            {rluValid && rluStatus ? (
              <View style={[s.rluResultBanner, { backgroundColor: rluStatus.dim, borderColor: rluStatus.color + '55' }]}>
                <View style={[s.rluResultDot, { backgroundColor: rluStatus.color }]} />
                <Text style={[s.rluResultTxt, { color: rluStatus.color }]}>
                  {rluNum} RLU — {rluStatus.label}
                  {rluStatus.label === 'PASS' ? ' (≤100)' : rluStatus.label === 'WARNING' ? ' (101–200)' : ' (>200 — Corrective Action Required)'}
                </Text>
              </View>
            ) : null}

            {/* Thresholds reminder */}
            <View style={s.thresholdRow}>
              <View style={s.thresholdItem}>
                <View style={[s.thresholdDot, { backgroundColor: HUD.green }]} />
                <Text style={s.thresholdTxt}>Pass ≤100</Text>
              </View>
              <View style={s.thresholdItem}>
                <View style={[s.thresholdDot, { backgroundColor: HUD.amber }]} />
                <Text style={s.thresholdTxt}>Warn 101–200</Text>
              </View>
              <View style={s.thresholdItem}>
                <View style={[s.thresholdDot, { backgroundColor: HUD.red }]} />
                <Text style={s.thresholdTxt}>Fail {'>'} 200</Text>
              </View>
            </View>

            {/* Tested By */}
            <FieldLabel label="TESTED BY" required />
            <TextInput style={s.input} value={testedBy} onChangeText={setTestedBy}
              placeholder="Employee name" placeholderTextColor={HUD.textDim} />

            {/* Instrument ID */}
            <FieldLabel label="INSTRUMENT ID / SERIAL" />
            <TextInput style={s.input} value={instrumentId} onChangeText={setInstrumentId}
              placeholder="EnSURE Touch serial or instrument ID (or N/A)"
              placeholderTextColor={HUD.textDim} />

            {/* Notes */}
            <FieldLabel label="NOTES" />
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes}
              placeholder="Any observations or context (or N/A)"
              placeholderTextColor={HUD.textDim} multiline />

            {/* Zone 1 fail warning */}
            {rluValid && rluNum > ATP_WARN && selectedPoint && selectedPoint.zone_number === 1 ? (
              <View style={s.zone1Warning}>
                <Ionicons name="alert-circle" size={16} color={HUD.red} />
                <View style={{ flex: 1 }}>
                  <Text style={s.zone1WarningTitle}>ZONE 1 FAIL — PRODUCTION HOLD REQUIRED</Text>
                  <Text style={s.zone1WarningTxt}>
                    A Zone 1 ATP fail triggers a Corrective Action and production halt.
                    A CA record will be created automatically on submit.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={HUD.bg} size="small" />
                : <>
                    <Ionicons name="save-outline" size={18} color={HUD.bg} />
                    <Text style={s.submitTxt}>LOG ATP RESULT</Text>
                  </>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={s.fieldLabel}>
      {label}{required ? <Text style={{ color: HUD.red }}> *</Text> : null}
    </Text>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function ATPLogScreen() {
  const {
    swabPoints, atpResults, loading, stats,
    fetchSwabPoints, fetchATPResults, logATPResult,
  } = useEMPSwabs();

  const [viewMode, setViewMode] = useState<'log' | 'history'>('log');
  const [roomFilter, setRoomFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState<'All' | 'pass' | 'warning' | 'fail'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [logModal, setLogModal] = useState(false);

  useEffect(() => { loadData(); }, [viewMode, roomFilter, zoneFilter]);

  const loadData = useCallback(async () => {
    await fetchSwabPoints();
    if (viewMode === 'history') await fetchATPResults();
  }, [viewMode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogSubmit = async (data: {
    swabPointId: string; rluValue: number;
    testedBy: string; instrumentId: string; notes: string;
  }) => {
    try {
      const result = await logATPResult({
        swab_point_id: data.swabPointId,
        rlu_value: data.rluValue,
        tested_by: data.testedBy,
        instrument_id: data.instrumentId || undefined,
        notes: data.notes || undefined,
      });

      if (result) {
        const status = getATPStatus(data.rluValue);
        // Post to task feed
        await reversePostATPResult({
          resultId: result.id,
          swabPointId: data.swabPointId,
          pointCode: result.point_code,
          pointName: result.point_name,
          room: result.room,
          zoneNumber: result.zone_number,
          rluValue: data.rluValue,
          status: status.label.toLowerCase() as 'pass' | 'warning' | 'fail',
          testedBy: data.testedBy,
          caCreated: !!result.corrective_action_id,
        });

        setLogModal(false);
        await loadData();

        if (data.rluValue > ATP_WARN) {
          Alert.alert(
            '⚠️ ATP FAIL — Action Required',
            `${result.point_code} returned ${data.rluValue} RLU.\n\nA Corrective Action has been created automatically.\n\nCheck the Corrective Actions screen for next steps.`,
            [{ text: 'VIEW CA', onPress: () => router.push('/(tabs)/sanitation/corrective-actions') },
             { text: 'OK', style: 'cancel' }]
          );
        } else if (data.rluValue > ATP_PASS) {
          Alert.alert('⚠️ Warning', `${result.point_code} — ${data.rluValue} RLU.\nResult is in warning range. Re-clean and re-test.`);
        } else {
          Alert.alert('✅ Pass', `${result.point_code} — ${data.rluValue} RLU. Result logged.`);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to log ATP result.');
    }
  };

  // Filtered history
  const filteredResults = useMemo(() => {
    let list = atpResults;
    if (roomFilter !== 'All') list = list.filter(r => r.room === roomFilter);
    if (zoneFilter !== 'All') list = list.filter(r => String(r.zone_number) === zoneFilter);
    if (resultFilter !== 'All') {
      list = list.filter(r => {
        const st = getATPStatus(r.rlu_value);
        return st.label.toLowerCase() === resultFilter;
      });
    }
    return list;
  }, [atpResults, roomFilter, zoneFilter, resultFilter]);

  // Stats for today
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayResults = atpResults.filter(r => new Date(r.tested_at).toDateString() === today);
    return {
      today: todayResults.length,
      pass: todayResults.filter(r => r.rlu_value <= ATP_PASS).length,
      warning: todayResults.filter(r => r.rlu_value > ATP_PASS && r.rlu_value <= ATP_WARN).length,
      fail: todayResults.filter(r => r.rlu_value > ATP_WARN).length,
      passRate: todayResults.length > 0
        ? Math.round((todayResults.filter(r => r.rlu_value <= ATP_PASS).length / todayResults.length) * 100)
        : null,
    };
  }, [atpResults]);

  // Swab points with due today / overdue markers for log view
  const duePoints = useMemo(() =>
    swabPoints.filter(p => p.atp_frequency !== 'none' && p.is_due_today),
  [swabPoints]);

  const overduePoints = useMemo(() =>
    swabPoints.filter(p => p.atp_frequency !== 'none' && p.is_overdue),
  [swabPoints]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>EMP / SANITATION</Text>
          <Text style={s.headerTitle}>ATP Swab Log</Text>
        </View>
        <TouchableOpacity style={s.logBtn} onPress={() => setLogModal(true)}>
          <Ionicons name="add" size={16} color={HUD.bg} />
          <Text style={s.logBtnTxt}>LOG RESULT</Text>
        </TouchableOpacity>
      </View>

      {/* ── STAT STRIP ── */}
      <View style={s.statStrip}>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.cyan }]}>{todayStats.today}</Text>
          <Text style={s.statLbl}>TODAY</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.green }]}>{todayStats.pass}</Text>
          <Text style={s.statLbl}>PASS</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.amber }]}>{todayStats.warning}</Text>
          <Text style={s.statLbl}>WARNING</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.red }]}>{todayStats.fail}</Text>
          <Text style={s.statLbl}>FAIL</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: todayStats.passRate !== null && todayStats.passRate < 80 ? HUD.red : HUD.green }]}>
            {todayStats.passRate !== null ? `${todayStats.passRate}%` : '—'}
          </Text>
          <Text style={s.statLbl}>PASS RATE</Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabRow}>
        {([
          { k: 'log', l: 'DUE / OVERDUE', icon: 'flask-outline' },
          { k: 'history', l: 'RESULT HISTORY', icon: 'time-outline' },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.k}
            style={[s.tab, viewMode === tab.k && s.tabActive]}
            onPress={() => setViewMode(tab.k)}>
            <Ionicons name={tab.icon} size={14} color={viewMode === tab.k ? HUD.cyan : HUD.textDim} />
            <Text style={[s.tabTxt, viewMode === tab.k && s.tabTxtActive]}>{tab.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── HISTORY FILTERS ── */}
      {viewMode === 'history' && (
        <View style={s.filterBlock}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 6 }}>
            {(['All', 'pass', 'warning', 'fail'] as const).map(f => {
              const color = f === 'pass' ? HUD.green : f === 'warning' ? HUD.amber : f === 'fail' ? HUD.red : HUD.cyan;
              const active = resultFilter === f;
              return (
                <TouchableOpacity key={f}
                  style={[s.filterChip, active && { backgroundColor: color + '22', borderColor: color + '55' }]}
                  onPress={() => setResultFilter(f)}>
                  <Text style={[s.filterChipTxt, active && { color }]}>
                    {f === 'All' ? 'ALL RESULTS' : f.toUpperCase()}
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
          <Text style={s.loadingTxt}>LOADING ATP DATA...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>

          {/* DUE / OVERDUE TAB */}
          {viewMode === 'log' && (
            <>
              {/* Overdue */}
              {overduePoints.length > 0 && (
                <>
                  <SectionHeader label="OVERDUE SWABS" color={HUD.red} count={overduePoints.length} />
                  {overduePoints.map(pt => (
                    <SwabPointCard key={pt.id} point={pt} selected={false}
                      onSelect={() => setLogModal(true)} />
                  ))}
                </>
              )}

              {/* Due today */}
              {duePoints.length > 0 && (
                <>
                  <SectionHeader label="DUE TODAY" color={HUD.amber} count={duePoints.length} />
                  {duePoints.map(pt => (
                    <SwabPointCard key={pt.id} point={pt} selected={false}
                      onSelect={() => setLogModal(true)} />
                  ))}
                </>
              )}

              {overduePoints.length === 0 && duePoints.length === 0 && (
                <View style={s.empty}>
                  <Ionicons name="checkmark-circle" size={48} color={HUD.green} />
                  <Text style={[s.emptyTitle, { color: HUD.green }]}>ALL CLEAR</Text>
                  <Text style={s.emptySub}>No ATP swabs due or overdue right now.</Text>
                </View>
              )}

              {/* All points summary */}
              <SectionHeader label="ALL SWAB POINTS" color={HUD.cyan} count={swabPoints.filter(p => p.atp_frequency !== 'none').length} />
              {swabPoints.filter(p => p.atp_frequency !== 'none').map(pt => (
                <SwabPointCard key={pt.id} point={pt} selected={false}
                  onSelect={() => setLogModal(true)} />
              ))}
            </>
          )}

          {/* HISTORY TAB */}
          {viewMode === 'history' && (
            filteredResults.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="time" size={48} color={HUD.textDim} />
                <Text style={[s.emptyTitle, { color: HUD.textDim }]}>NO RESULTS</Text>
                <Text style={s.emptySub}>No ATP results match this filter.</Text>
              </View>
            ) : filteredResults.map(r => (
              <ResultCard key={r.id} result={r} />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── LOG ATP MODAL ── */}
      <Modal visible={logModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <LogATPModal
            swabPoints={swabPoints}
            onClose={() => setLogModal(false)}
            onSubmit={handleLogSubmit}
          />
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <View style={[s.sectionHeader, { borderLeftColor: color }]}>
      <Text style={[s.sectionHeaderTxt, { color }]}>{label}</Text>
      <View style={[s.sectionCount, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Text style={[s.sectionCountTxt, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HUD.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: HUD.border,
    backgroundColor: HUD.bgCard,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerSub: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD.text },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: HUD.cyan, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  logBtnTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },

  statStrip: { flexDirection: 'row', backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  statLbl: { fontSize: 8, fontWeight: '600', color: HUD.textDim, letterSpacing: 1.5, marginTop: 1 },
  statDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 8 },

  tabRow: { flexDirection: 'row', backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, gap: 3 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: HUD.cyan },
  tabTxt: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },
  tabTxtActive: { color: HUD.cyan },

  filterBlock: { backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  filterChipTxt: { fontSize: 10, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 2 },

  // Zone badge
  zoneBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  zoneBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // RLU bar
  rluBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  rluTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', backgroundColor: HUD.bgCardAlt },
  rluZone: { height: '100%' },
  rluFill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3 },
  rluValue: { fontSize: 12, fontWeight: '800', width: 70, textAlign: 'right' },

  // Swab point card
  swabPointCard: {
    backgroundColor: HUD.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border,
    marginBottom: 8, flexDirection: 'row', overflow: 'hidden',
  },
  swabPointZoneLine: { width: 3 },
  swabPointBody: { flex: 1, padding: 12 },
  swabPointTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  swabPointCode: { fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 1, flex: 1 },
  selectedMark: { marginLeft: 'auto' },
  swabPointName: { fontSize: 13, fontWeight: '700', color: HUD.text, marginBottom: 4 },
  swabPointMeta: { marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItemTxt: { fontSize: 11, color: HUD.textSec },
  lastResultRow: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  lastResultTxt: { fontSize: 10, fontWeight: '700' },
  noLastTxt: { fontSize: 10, color: HUD.textDim },

  // Result card
  resultCard: {
    backgroundColor: HUD.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3,
    marginBottom: 10, padding: 12,
  },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  resultPointCode: { fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 1, flex: 1 },
  statusChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  caTag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  caTagTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  resultPointName: { fontSize: 13, fontWeight: '700', color: HUD.text, marginBottom: 6 },
  resultMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  resultNotes: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6, backgroundColor: HUD.bgCardAlt, borderRadius: 6, padding: 8 },
  resultNotesTxt: { fontSize: 11, color: HUD.textSec, flex: 1 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, paddingLeft: 10,
    marginTop: 16, marginBottom: 8,
  },
  sectionHeaderTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 2, flex: 1 },
  sectionCount: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionCountTxt: { fontSize: 10, fontWeight: '800' },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  emptySub: { fontSize: 13, color: HUD.textSec, textAlign: 'center' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: HUD.borderBright, maxHeight: '94%', flex: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: HUD.border },
  sheetLabel: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2, marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  sheetMeta: { fontSize: 11, color: HUD.textSec },
  closeBtn: { padding: 4, marginLeft: 12 },
  sheetFooter: { padding: 16, borderTopWidth: 1, borderTopColor: HUD.border },

  // Step indicator
  stepStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  stepDotActive: { backgroundColor: HUD.cyan, borderColor: HUD.cyan },
  stepDotDone: { backgroundColor: HUD.green, borderColor: HUD.green },
  stepDotTxt: { fontSize: 11, fontWeight: '800', color: HUD.textDim },
  stepLine: { width: 24, height: 2, backgroundColor: HUD.border, marginHorizontal: 6 },

  // Selected point summary
  selectedPointSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.borderBright, padding: 12, marginBottom: 4 },
  selPointCode: { fontSize: 10, fontWeight: '800', color: HUD.cyan, letterSpacing: 1.5 },
  selPointName: { fontSize: 13, fontWeight: '700', color: HUD.text },
  selPointRoom: { fontSize: 11, color: HUD.textSec },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: HUD.cyan },
  changeBtnTxt: { fontSize: 10, fontWeight: '700', color: HUD.cyan, letterSpacing: 1 },

  // RLU input
  rluInput: { backgroundColor: HUD.bgCardAlt, borderWidth: 2, borderColor: HUD.borderBright, borderRadius: 8, padding: 16, color: HUD.text, fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginBottom: 8 },
  rluResultBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 4 },
  rluResultDot: { width: 10, height: 10, borderRadius: 5 },
  rluResultTxt: { fontSize: 12, fontWeight: '700', flex: 1 },
  thresholdRow: { flexDirection: 'row', gap: 16, marginBottom: 4, paddingHorizontal: 4 },
  thresholdItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  thresholdDot: { width: 8, height: 8, borderRadius: 4 },
  thresholdTxt: { fontSize: 10, color: HUD.textSec },

  // Zone 1 warning
  zone1Warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '55', borderRadius: 10, padding: 14, marginTop: 8 },
  zone1WarningTitle: { fontSize: 11, fontWeight: '800', color: HUD.red, letterSpacing: 0.5, marginBottom: 4 },
  zone1WarningTxt: { fontSize: 11, color: HUD.red + 'cc', lineHeight: 16 },

  // Form
  fieldLabel: { fontSize: 9, fontWeight: '700', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: HUD.bgCardAlt, borderWidth: 1, borderColor: HUD.borderBright, borderRadius: 8, padding: 12, color: HUD.text, fontSize: 14 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: HUD.cyan, borderRadius: 10, padding: 14 },
  nextBtnTxt: { fontSize: 13, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: HUD.green, borderRadius: 10, padding: 16, marginTop: 24 },
  submitTxt: { fontSize: 13, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
});
