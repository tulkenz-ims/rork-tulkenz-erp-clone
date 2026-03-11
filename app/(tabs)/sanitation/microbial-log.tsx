// app/(tabs)/sanitation/microbial-log.tsx
// Microbial Test Results Log — Lab Results Entry & History
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
  MicrobialTestResult,
} from '../../../hooks/useEMPSwabs';
import { reversePostPathogenPositive } from '../../../constants/sanitationTaskFeedTemplates';

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

const ZONE_COLORS: Record<number, string> = {
  1: HUD.red, 2: HUD.amber, 3: HUD.purple, 4: HUD.cyan,
};

const TEST_TYPES = [
  'Listeria spp.',
  'Listeria monocytogenes',
  'Salmonella spp.',
  'E. coli O157:H7',
  'E. coli (generic)',
  'Staphylococcus aureus',
  'Yeast & Mold',
  'Total Plate Count (TPC)',
  'Coliform',
  'Enterobacteriaceae',
  'Cronobacter spp.',
  'Other',
] as const;

const TEST_METHODS = [
  'PCR / qPCR',
  'ELISA',
  'Culture',
  'Lateral Flow Assay',
  'Enrichment + Culture',
  'Petrifilm',
  'Other',
] as const;

const LAB_NAMES = [
  'In-House Lab',
  'Eurofins',
  'Mérieux NutriSciences',
  'SGS',
  'IEH Laboratories',
  'NSF International',
  'Covance / Labcorp',
  'Other',
] as const;

type MicroResult = 'negative' | 'positive' | 'inconclusive' | 'pending';
const RESULT_OPTIONS: MicroResult[] = ['negative', 'positive', 'inconclusive', 'pending'];
const RESULT_COLORS: Record<MicroResult, { color: string; dim: string }> = {
  negative: { color: HUD.green, dim: HUD.greenDim },
  positive: { color: HUD.red, dim: HUD.redDim },
  inconclusive: { color: HUD.amber, dim: HUD.amberDim },
  pending: { color: HUD.textSec, dim: HUD.bgCardAlt },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function ResultBadge({ result }: { result: MicroResult }) {
  const { color, dim } = RESULT_COLORS[result];
  return (
    <View style={[s.resultBadge, { backgroundColor: dim, borderColor: color + '66' }]}>
      {result === 'positive' && <Ionicons name="alert-circle" size={10} color={color} />}
      {result === 'negative' && <Ionicons name="checkmark-circle" size={10} color={color} />}
      {result === 'pending' && <Ionicons name="time" size={10} color={color} />}
      {result === 'inconclusive' && <Ionicons name="help-circle" size={10} color={color} />}
      <Text style={[s.resultBadgeTxt, { color }]}>{result.toUpperCase()}</Text>
    </View>
  );
}

function ZoneBadge({ zone }: { zone: number }) {
  const color = ZONE_COLORS[zone] ?? HUD.textSec;
  return (
    <View style={[s.zoneBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[s.zoneBadgeTxt, { color }]}>ZONE {zone}</Text>
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
// RESULT CARD
// ─────────────────────────────────────────────
function MicrobialResultCard({
  result,
  onUpdateResult,
}: {
  result: MicrobialTestResult;
  onUpdateResult: () => void;
}) {
  const { color } = RESULT_COLORS[result.result as MicroResult] ?? RESULT_COLORS.pending;
  const isPending = result.result === 'pending';
  const isPositive = result.result === 'positive';
  const isPathogen = result.is_pathogen_positive;

  return (
    <View style={[s.resultCard, { borderLeftColor: isPathogen ? HUD.red : color }]}>
      {/* Critical pathogen banner */}
      {isPathogen && (
        <View style={s.pathogenBanner}>
          <Ionicons name="alert-circle" size={14} color={HUD.bg} />
          <Text style={s.pathogenBannerTxt}>PATHOGEN POSITIVE — CRITICAL ACTION REQUIRED</Text>
        </View>
      )}

      <View style={s.resultCardTop}>
        <ZoneBadge zone={result.zone_number} />
        <Text style={s.resultPointCode}>{result.point_code}</Text>
        <ResultBadge result={result.result as MicroResult} />
        {result.corrective_action_id ? (
          <View style={s.caTag}>
            <Ionicons name="alert-circle" size={10} color={HUD.red} />
            <Text style={s.caTagTxt}>CA OPEN</Text>
          </View>
        ) : null}
      </View>

      <Text style={s.resultPointName}>{result.point_name}</Text>

      {/* Test info row */}
      <View style={s.testInfoRow}>
        <View style={s.testInfoItem}>
          <Ionicons name="flask-outline" size={11} color={HUD.textDim} />
          <Text style={s.testInfoTxt}>{result.test_type}</Text>
        </View>
        {result.test_method ? (
          <View style={s.testInfoItem}>
            <Ionicons name="beaker-outline" size={11} color={HUD.textDim} />
            <Text style={s.testInfoTxt}>{result.test_method}</Text>
          </View>
        ) : null}
        {result.lab_name ? (
          <View style={s.testInfoItem}>
            <Ionicons name="business-outline" size={11} color={HUD.textDim} />
            <Text style={s.testInfoTxt}>{result.lab_name}</Text>
          </View>
        ) : null}
      </View>

      {/* Quantitative result */}
      {result.cfu_value !== null && result.cfu_value !== undefined ? (
        <View style={[s.cfuRow, { backgroundColor: isPositive ? HUD.redDim : HUD.greenDim }]}>
          <Text style={[s.cfuVal, { color: isPositive ? HUD.red : HUD.green }]}>
            {result.cfu_value} {result.cfu_unit ?? 'CFU/cm²'}
          </Text>
          {result.action_limit ? (
            <Text style={s.cfuLimit}>Action limit: {result.action_limit} {result.cfu_unit ?? 'CFU/cm²'}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Dates */}
      <View style={s.datesRow}>
        <View style={s.dateItem}>
          <Ionicons name="send-outline" size={11} color={HUD.textDim} />
          <Text style={s.dateTxt}>Sent: {result.sample_sent_date ? new Date(result.sample_sent_date).toLocaleDateString() : '—'}</Text>
        </View>
        <View style={s.dateItem}>
          <Ionicons name="flask-outline" size={11} color={HUD.textDim} />
          <Text style={s.dateTxt}>Sampled: {result.sampled_date ? new Date(result.sampled_date).toLocaleDateString() : '—'}</Text>
        </View>
        {result.result_received_date ? (
          <View style={s.dateItem}>
            <Ionicons name="checkmark-outline" size={11} color={HUD.textDim} />
            <Text style={s.dateTxt}>Received: {new Date(result.result_received_date).toLocaleDateString()}</Text>
          </View>
        ) : null}
      </View>

      {/* Sampled by */}
      <View style={s.sampledRow}>
        <Ionicons name="person-outline" size={11} color={HUD.textDim} />
        <Text style={s.sampledTxt}>Sampled by: {result.sampled_by}</Text>
        {result.lab_sample_id ? (
          <Text style={s.labIdTxt}>Lab ID: {result.lab_sample_id}</Text>
        ) : null}
      </View>

      {/* Notes */}
      {result.notes ? (
        <View style={s.notesRow}>
          <Ionicons name="chatbubble-outline" size={11} color={HUD.textDim} />
          <Text style={s.notesTxt}>{result.notes}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      {(isPending || isPositive) ? (
        <View style={s.cardActions}>
          {isPending && (
            <TouchableOpacity style={s.updateBtn} onPress={onUpdateResult}>
              <Ionicons name="create-outline" size={13} color={HUD.bg} />
              <Text style={s.updateBtnTxt}>ENTER RESULT</Text>
            </TouchableOpacity>
          )}
          {isPositive && !result.corrective_action_id && (
            <TouchableOpacity
              style={[s.updateBtn, { backgroundColor: HUD.red }]}
              onPress={() => router.push('/(tabs)/sanitation/corrective-actions')}>
              <Ionicons name="alert-circle-outline" size={13} color={HUD.bg} />
              <Text style={s.updateBtnTxt}>OPEN CA</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// LOG SAMPLE MODAL
// ─────────────────────────────────────────────
function LogSampleModal({
  swabPoints,
  onClose,
  onSubmit,
}: {
  swabPoints: EMPSwabPoint[];
  onClose: () => void;
  onSubmit: (data: {
    swabPointId: string;
    testType: string;
    testMethod: string;
    labName: string;
    labSampleId: string;
    sampledBy: string;
    sampledDate: string;
    sampleSentDate: string;
    result: MicroResult;
    cfuValue: string;
    cfuUnit: string;
    actionLimit: string;
    resultReceivedDate: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [selectedPointId, setSelectedPointId] = useState('');
  const [testType, setTestType] = useState(TEST_TYPES[0]);
  const [customTestType, setCustomTestType] = useState('');
  const [testMethod, setTestMethod] = useState(TEST_METHODS[0]);
  const [labName, setLabName] = useState(LAB_NAMES[0]);
  const [labSampleId, setLabSampleId] = useState('');
  const [sampledBy, setSampledBy] = useState('');
  const [sampledDate, setSampledDate] = useState(new Date().toISOString().split('T')[0]);
  const [sampleSentDate, setSampleSentDate] = useState('');
  const [result, setResult] = useState<MicroResult>('pending');
  const [cfuValue, setCfuValue] = useState('');
  const [cfuUnit, setCfuUnit] = useState('CFU/cm²');
  const [actionLimit, setActionLimit] = useState('');
  const [resultReceivedDate, setResultReceivedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [roomFilter, setRoomFilter] = useState('All');

  const filteredPoints = useMemo(() => {
    let pts = swabPoints.filter(p => p.micro_frequency && p.micro_frequency !== 'none');
    if (roomFilter !== 'All') pts = pts.filter(p => p.room === roomFilter);
    return pts;
  }, [swabPoints, roomFilter]);

  const selectedPoint = swabPoints.find(p => p.id === selectedPointId);

  const handleSubmit = async () => {
    if (!selectedPointId) { Alert.alert('Required', 'Select a swab point.'); return; }
    if (!sampledBy.trim()) { Alert.alert('Required', 'Sampled By is required.'); return; }
    if (!sampledDate) { Alert.alert('Required', 'Sample date is required.'); return; }
    const finalTestType = testType === 'Other' ? customTestType.trim() : testType;
    if (!finalTestType) { Alert.alert('Required', 'Test type is required.'); return; }

    setSubmitting(true);
    await onSubmit({
      swabPointId: selectedPointId,
      testType: finalTestType,
      testMethod,
      labName,
      labSampleId: labSampleId.trim(),
      sampledBy: sampledBy.trim(),
      sampledDate,
      sampleSentDate: sampleSentDate || sampledDate,
      result,
      cfuValue: cfuValue.trim(),
      cfuUnit: cfuUnit.trim() || 'CFU/cm²',
      actionLimit: actionLimit.trim(),
      resultReceivedDate: resultReceivedDate || '',
      notes: notes.trim(),
    });
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>MICROBIAL LOG</Text>
          <Text style={s.sheetTitle}>Log New Sample</Text>
          <Text style={s.sheetMeta}>Environmental swab · Lab submission or in-house</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* Swab Point */}
          <FieldLabel label="SWAB POINT" required />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
            contentContainerStyle={{ gap: 8 }}>
            {(['All', ...ROOMS.filter(r => r !== 'All')] as const).map(r => (
              <TouchableOpacity key={r}
                style={[s.filterChip, roomFilter === r && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                onPress={() => setRoomFilter(r)}>
                <Text style={[s.filterChipTxt, roomFilter === r && { color: HUD.purple }]}>
                  {r === 'All' ? 'ALL' : r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={{ maxHeight: 180, marginBottom: 4 }} nestedScrollEnabled>
            {filteredPoints.length === 0 ? (
              <Text style={{ fontSize: 12, color: HUD.textDim, padding: 10 }}>No micro-eligible points found.</Text>
            ) : filteredPoints.map(pt => {
              const color = ZONE_COLORS[pt.zone_number] ?? HUD.textSec;
              const selected = selectedPointId === pt.id;
              return (
                <TouchableOpacity key={pt.id}
                  style={[s.ptSelectRow, selected && { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan }]}
                  onPress={() => setSelectedPointId(pt.id)}>
                  <View style={[s.ptZoneDot, { backgroundColor: color }]}>
                    <Text style={s.ptZoneDotTxt}>{pt.zone_number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.ptCode, selected && { color: HUD.cyan }]}>{pt.point_code} · {pt.room}</Text>
                    <Text style={s.ptName}>{pt.point_name}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={HUD.cyan} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Test Type */}
          <FieldLabel label="TEST TYPE / TARGET ORGANISM" required />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
            {TEST_TYPES.map(tt => (
              <TouchableOpacity key={tt}
                style={[s.filterChip, testType === tt && { backgroundColor: HUD.amberDim, borderColor: HUD.amber }]}
                onPress={() => setTestType(tt)}>
                <Text style={[s.filterChipTxt, testType === tt && { color: HUD.amber }]}>{tt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {testType === 'Other' && (
            <TextInput style={[s.input, { marginBottom: 4 }]} value={customTestType}
              onChangeText={setCustomTestType}
              placeholder="Specify organism / test type"
              placeholderTextColor={HUD.textDim} />
          )}

          {/* Test Method */}
          <FieldLabel label="TEST METHOD" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
            {TEST_METHODS.map(m => (
              <TouchableOpacity key={m}
                style={[s.filterChip, testMethod === m && { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan }]}
                onPress={() => setTestMethod(m)}>
                <Text style={[s.filterChipTxt, testMethod === m && { color: HUD.cyan }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lab */}
          <FieldLabel label="LABORATORY" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
            {LAB_NAMES.map(l => (
              <TouchableOpacity key={l}
                style={[s.filterChip, labName === l && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                onPress={() => setLabName(l)}>
                <Text style={[s.filterChipTxt, labName === l && { color: HUD.purple }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lab Sample ID */}
          <FieldLabel label="LAB SAMPLE ID / COC #" />
          <TextInput style={s.input} value={labSampleId} onChangeText={setLabSampleId}
            placeholder="Lab sample ID, COC number, or N/A"
            placeholderTextColor={HUD.textDim} />

          {/* Sampled By */}
          <FieldLabel label="SAMPLED BY" required />
          <TextInput style={s.input} value={sampledBy} onChangeText={setSampledBy}
            placeholder="Employee name" placeholderTextColor={HUD.textDim} />

          {/* Sampled Date */}
          <FieldLabel label="SAMPLE DATE (YYYY-MM-DD)" required />
          <TextInput style={s.input} value={sampledDate} onChangeText={setSampledDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={HUD.textDim} />

          {/* Sent Date */}
          <FieldLabel label="SENT TO LAB DATE (YYYY-MM-DD)" />
          <TextInput style={s.input} value={sampleSentDate} onChangeText={setSampleSentDate}
            placeholder="YYYY-MM-DD (leave blank = same as sample date)"
            placeholderTextColor={HUD.textDim} />

          {/* Result */}
          <FieldLabel label="RESULT" required />
          <View style={s.segRow}>
            {RESULT_OPTIONS.map(r => {
              const { color, dim } = RESULT_COLORS[r];
              return (
                <TouchableOpacity key={r}
                  style={[s.seg, result === r && { backgroundColor: dim, borderColor: color }]}
                  onPress={() => setResult(r)}>
                  <Text style={[s.segTxt, result === r && { color }]}>{r.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quantitative */}
          {result !== 'pending' && result !== 'negative' && (
            <>
              <FieldLabel label="CFU VALUE (quantitative, if applicable)" />
              <View style={s.cfuInputRow}>
                <TextInput style={[s.input, { flex: 2 }]} value={cfuValue} onChangeText={setCfuValue}
                  placeholder="e.g. 250" placeholderTextColor={HUD.textDim} keyboardType="numeric" />
                <TextInput style={[s.input, { flex: 1 }]} value={cfuUnit} onChangeText={setCfuUnit}
                  placeholder="CFU/cm²" placeholderTextColor={HUD.textDim} />
              </View>
              <FieldLabel label="ACTION LIMIT" />
              <TextInput style={s.input} value={actionLimit} onChangeText={setActionLimit}
                placeholder="e.g. 100 CFU/cm² or N/A" placeholderTextColor={HUD.textDim} />
            </>
          )}

          {/* Result received */}
          {result !== 'pending' && (
            <>
              <FieldLabel label="RESULT RECEIVED DATE (YYYY-MM-DD)" />
              <TextInput style={s.input} value={resultReceivedDate} onChangeText={setResultReceivedDate}
                placeholder="YYYY-MM-DD" placeholderTextColor={HUD.textDim} />
            </>
          )}

          {/* Positive warning */}
          {result === 'positive' && selectedPoint && selectedPoint.zone_number === 1 && (
            <View style={s.pathogenWarn}>
              <Ionicons name="alert-circle" size={16} color={HUD.red} />
              <View style={{ flex: 1 }}>
                <Text style={s.pathogenWarnTitle}>ZONE 1 POSITIVE — CRITICAL ALERT</Text>
                <Text style={s.pathogenWarnTxt}>
                  A positive result in Zone 1 will trigger a Critical task feed post, corrective action, and production halt notification.
                </Text>
              </View>
            </View>
          )}

          {/* Notes */}
          <FieldLabel label="NOTES" />
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes} onChangeText={setNotes}
            placeholder="Any additional context or observations (or N/A)"
            placeholderTextColor={HUD.textDim} multiline />

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={HUD.bg} size="small" />
              : <>
                  <Ionicons name="save-outline" size={18} color={HUD.bg} />
                  <Text style={s.submitTxt}>LOG MICROBIAL SAMPLE</Text>
                </>
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────
// UPDATE RESULT MODAL
// ─────────────────────────────────────────────
function UpdateResultModal({
  record,
  onClose,
  onSubmit,
}: {
  record: MicrobialTestResult;
  onClose: () => void;
  onSubmit: (data: {
    result: MicroResult;
    cfuValue: string;
    cfuUnit: string;
    actionLimit: string;
    resultReceivedDate: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [result, setResult] = useState<MicroResult>(record.result as MicroResult ?? 'pending');
  const [cfuValue, setCfuValue] = useState(record.cfu_value?.toString() ?? '');
  const [cfuUnit, setCfuUnit] = useState(record.cfu_unit ?? 'CFU/cm²');
  const [actionLimit, setActionLimit] = useState(record.action_limit?.toString() ?? '');
  const [resultReceivedDate, setResultReceivedDate] = useState(
    record.result_received_date ? record.result_received_date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(record.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({ result, cfuValue, cfuUnit, actionLimit, resultReceivedDate, notes });
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>ENTER LAB RESULT</Text>
          <Text style={s.sheetTitle}>{record.point_code} — {record.test_type}</Text>
          <Text style={s.sheetMeta}>{record.lab_name ?? 'Lab'} · Sample: {record.sampled_date ? new Date(record.sampled_date).toLocaleDateString() : '—'}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <FieldLabel label="RESULT" required />
          <View style={s.segRow}>
            {RESULT_OPTIONS.map(r => {
              const { color, dim } = RESULT_COLORS[r];
              return (
                <TouchableOpacity key={r}
                  style={[s.seg, result === r && { backgroundColor: dim, borderColor: color }]}
                  onPress={() => setResult(r)}>
                  <Text style={[s.segTxt, result === r && { color }]}>{r.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {result !== 'pending' && result !== 'negative' && (
            <>
              <FieldLabel label="CFU VALUE (quantitative, if applicable)" />
              <View style={s.cfuInputRow}>
                <TextInput style={[s.input, { flex: 2 }]} value={cfuValue} onChangeText={setCfuValue}
                  placeholder="e.g. 250" placeholderTextColor={HUD.textDim} keyboardType="numeric" />
                <TextInput style={[s.input, { flex: 1 }]} value={cfuUnit} onChangeText={setCfuUnit}
                  placeholder="CFU/cm²" placeholderTextColor={HUD.textDim} />
              </View>
              <FieldLabel label="ACTION LIMIT" />
              <TextInput style={s.input} value={actionLimit} onChangeText={setActionLimit}
                placeholder="e.g. 100 CFU/cm² or N/A" placeholderTextColor={HUD.textDim} />
            </>
          )}

          <FieldLabel label="RESULT RECEIVED DATE (YYYY-MM-DD)" required />
          <TextInput style={s.input} value={resultReceivedDate} onChangeText={setResultReceivedDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={HUD.textDim} />

          {result === 'positive' && record.zone_number === 1 && (
            <View style={s.pathogenWarn}>
              <Ionicons name="alert-circle" size={16} color={HUD.red} />
              <View style={{ flex: 1 }}>
                <Text style={s.pathogenWarnTitle}>ZONE 1 POSITIVE — CRITICAL ALERT</Text>
                <Text style={s.pathogenWarnTxt}>
                  Saving this result will trigger a critical task feed post and corrective action.
                </Text>
              </View>
            </View>
          )}

          <FieldLabel label="NOTES" />
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={notes} onChangeText={setNotes}
            placeholder="Lab notes, chain of custody comments, etc."
            placeholderTextColor={HUD.textDim} multiline />

          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={HUD.bg} size="small" />
              : <>
                  <Ionicons name="save-outline" size={18} color={HUD.bg} />
                  <Text style={s.submitTxt}>SAVE LAB RESULT</Text>
                </>
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function MicrobialLogScreen() {
  const {
    swabPoints, microbialResults, loading,
    fetchSwabPoints, fetchMicrobialResults, updateMicrobialResult,
    createMicrobialSample,
  } = useEMPSwabs();

  const [viewMode, setViewMode] = useState<'pending' | 'all' | 'positives'>('pending');
  const [roomFilter, setRoomFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MicrobialTestResult | null>(null);

  useEffect(() => { loadData(); }, [viewMode, roomFilter]);

  const loadData = useCallback(async () => {
    await Promise.all([fetchSwabPoints(), fetchMicrobialResults()]);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogSubmit = async (data: Parameters<typeof createMicrobialSample>[0] extends undefined ? never : any) => {
    try {
      const record = await createMicrobialSample({
        swab_point_id: data.swabPointId,
        test_type: data.testType,
        test_method: data.testMethod,
        lab_name: data.labName,
        lab_sample_id: data.labSampleId || undefined,
        sampled_by: data.sampledBy,
        sampled_date: data.sampledDate,
        sample_sent_date: data.sampleSentDate || data.sampledDate,
        result: data.result,
        cfu_value: data.cfuValue ? parseFloat(data.cfuValue) : undefined,
        cfu_unit: data.cfuUnit || undefined,
        action_limit: data.actionLimit ? parseFloat(data.actionLimit) : undefined,
        result_received_date: data.resultReceivedDate || undefined,
        notes: data.notes || undefined,
      });

      if (record) {
        // If positive + Zone 1, post critical alert
        if (data.result === 'positive' && record.zone_number === 1) {
          await reversePostPathogenPositive({
            resultId: record.id,
            swabPointId: data.swabPointId,
            pointCode: record.point_code,
            pointName: record.point_name,
            room: record.room,
            zoneNumber: record.zone_number,
            testType: data.testType,
            testedBy: data.sampledBy,
            caCreated: !!record.corrective_action_id,
          });
          Alert.alert(
            '🚨 PATHOGEN POSITIVE — CRITICAL',
            `${data.testType} POSITIVE at ${record.point_code}.\n\nA Critical task feed post has been created. Open a Corrective Action immediately.`,
            [
              { text: 'OPEN CA', onPress: () => router.push('/(tabs)/sanitation/corrective-actions') },
              { text: 'OK', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('✅ Logged', `Sample logged for ${record.point_code}.\nResult: ${data.result.toUpperCase()}`);
        }
        setLogModal(false);
        await loadData();
      }
    } catch {
      Alert.alert('Error', 'Failed to log sample.');
    }
  };

  const handleUpdateSubmit = async (data: {
    result: MicroResult; cfuValue: string; cfuUnit: string;
    actionLimit: string; resultReceivedDate: string; notes: string;
  }) => {
    if (!selectedRecord) return;
    try {
      await updateMicrobialResult({
        id: selectedRecord.id,
        result: data.result,
        cfu_value: data.cfuValue ? parseFloat(data.cfuValue) : undefined,
        cfu_unit: data.cfuUnit || undefined,
        action_limit: data.actionLimit ? parseFloat(data.actionLimit) : undefined,
        result_received_date: data.resultReceivedDate || undefined,
        notes: data.notes || undefined,
      });

      if (data.result === 'positive' && selectedRecord.zone_number === 1) {
        await reversePostPathogenPositive({
          resultId: selectedRecord.id,
          swabPointId: selectedRecord.swab_point_id,
          pointCode: selectedRecord.point_code,
          pointName: selectedRecord.point_name,
          room: selectedRecord.room,
          zoneNumber: selectedRecord.zone_number,
          testType: selectedRecord.test_type,
          testedBy: selectedRecord.sampled_by,
          caCreated: false,
        });
        Alert.alert('🚨 POSITIVE LOGGED', 'Critical task feed post created.');
      } else {
        Alert.alert('✅ Updated', `Result updated: ${data.result.toUpperCase()}`);
      }
      setUpdateModal(false);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update result.');
    }
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    let list = microbialResults;
    if (roomFilter !== 'All') list = list.filter(r => r.room === roomFilter);
    if (viewMode === 'pending') list = list.filter(r => r.result === 'pending');
    if (viewMode === 'positives') list = list.filter(r => r.result === 'positive');
    return list;
  }, [microbialResults, roomFilter, viewMode]);

  // Stats
  const stats = useMemo(() => {
    const pending = microbialResults.filter(r => r.result === 'pending').length;
    const positive = microbialResults.filter(r => r.result === 'positive').length;
    const negative = microbialResults.filter(r => r.result === 'negative').length;
    const z1Positive = microbialResults.filter(r => r.result === 'positive' && r.zone_number === 1).length;
    return { total: microbialResults.length, pending, positive, negative, z1Positive };
  }, [microbialResults]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>EMP / SANITATION</Text>
          <Text style={s.headerTitle}>Microbial Test Log</Text>
        </View>
        <TouchableOpacity style={s.logBtn} onPress={() => setLogModal(true)}>
          <Ionicons name="add" size={16} color={HUD.bg} />
          <Text style={s.logBtnTxt}>LOG SAMPLE</Text>
        </TouchableOpacity>
      </View>

      {/* ── STAT STRIP ── */}
      <View style={s.statStrip}>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.cyan }]}>{stats.total}</Text>
          <Text style={s.statLbl}>TOTAL</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.amber }]}>{stats.pending}</Text>
          <Text style={s.statLbl}>PENDING</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.green }]}>{stats.negative}</Text>
          <Text style={s.statLbl}>NEGATIVE</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.red }]}>{stats.positive}</Text>
          <Text style={s.statLbl}>POSITIVE</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: stats.z1Positive > 0 ? HUD.red : HUD.textDim }]}>
            {stats.z1Positive}
          </Text>
          <Text style={s.statLbl}>Z1 POS</Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabRow}>
        {([
          { k: 'pending', l: 'PENDING', icon: 'time-outline' },
          { k: 'all', l: 'ALL RESULTS', icon: 'list-outline' },
          { k: 'positives', l: 'POSITIVES', icon: 'alert-circle-outline' },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.k}
            style={[s.tab, viewMode === tab.k && s.tabActive]}
            onPress={() => setViewMode(tab.k)}>
            <Ionicons name={tab.icon} size={14} color={viewMode === tab.k ? HUD.cyan : HUD.textDim} />
            <Text style={[s.tabTxt, viewMode === tab.k && s.tabTxtActive]}>{tab.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ROOM FILTER ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filterRow}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
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

      {/* ── CONTENT ── */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={HUD.cyan} size="large" />
          <Text style={s.loadingTxt}>LOADING MICROBIAL DATA...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>

          {filteredResults.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name={viewMode === 'positives' ? 'checkmark-circle' : viewMode === 'pending' ? 'time' : 'flask'}
                size={48}
                color={viewMode === 'positives' ? HUD.green : HUD.textDim} />
              <Text style={[s.emptyTitle, { color: viewMode === 'positives' ? HUD.green : HUD.textDim }]}>
                {viewMode === 'positives' ? 'NO POSITIVES' : viewMode === 'pending' ? 'NO PENDING' : 'NO RESULTS'}
              </Text>
              <Text style={s.emptySub}>
                {viewMode === 'positives'
                  ? 'No positive results on record. Keep it that way.'
                  : viewMode === 'pending'
                  ? 'No samples awaiting lab results.'
                  : 'No microbial results logged yet. Tap LOG SAMPLE to start.'}
              </Text>
            </View>
          ) : (
            filteredResults.map(r => (
              <MicrobialResultCard
                key={r.id}
                result={r}
                onUpdateResult={() => {
                  setSelectedRecord(r);
                  setUpdateModal(true);
                }}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── LOG MODAL ── */}
      <Modal visible={logModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <LogSampleModal
            swabPoints={swabPoints}
            onClose={() => setLogModal(false)}
            onSubmit={handleLogSubmit}
          />
        </View>
      </Modal>

      {/* ── UPDATE MODAL ── */}
      <Modal visible={updateModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedRecord && (
            <UpdateResultModal
              record={selectedRecord}
              onClose={() => setUpdateModal(false)}
              onSubmit={handleUpdateSubmit}
            />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: HUD.border, backgroundColor: HUD.bgCard },
  backBtn: { padding: 4, marginRight: 8 },
  headerSub: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD.text },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: HUD.cyan, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
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

  filterRow: { backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  filterChipTxt: { fontSize: 10, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 2 },

  // Result card
  resultCard: { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3, marginBottom: 12, overflow: 'hidden' },
  pathogenBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD.red, padding: 10, paddingHorizontal: 14 },
  pathogenBannerTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg, letterSpacing: 0.5 },
  resultCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 4 },
  resultPointCode: { fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 1, flex: 1 },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  resultBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  caTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '55', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  caTagTxt: { fontSize: 9, fontWeight: '800', color: HUD.red, letterSpacing: 1 },
  resultPointName: { fontSize: 14, fontWeight: '700', color: HUD.text, paddingHorizontal: 12, paddingBottom: 8 },
  testInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  testInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  testInfoTxt: { fontSize: 11, color: HUD.textSec },
  cfuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  cfuVal: { fontSize: 16, fontWeight: '800' },
  cfuLimit: { fontSize: 11, color: HUD.textSec },
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: HUD.border },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontSize: 11, color: HUD.textSec },
  sampledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  sampledTxt: { fontSize: 11, color: HUD.textSec, flex: 1 },
  labIdTxt: { fontSize: 10, color: HUD.textDim },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: HUD.bgCardAlt, padding: 10, paddingHorizontal: 12 },
  notesTxt: { fontSize: 11, color: HUD.textSec, flex: 1 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: HUD.border },
  updateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: HUD.cyan, paddingVertical: 10 },
  updateBtnTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },

  // Zone badge
  zoneBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  zoneBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Point selector
  ptSelectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: HUD.bgCardAlt, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, padding: 10, marginBottom: 6 },
  ptZoneDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ptZoneDotTxt: { fontSize: 10, fontWeight: '800', color: HUD.bg },
  ptCode: { fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 1 },
  ptName: { fontSize: 12, color: HUD.text, marginTop: 1 },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  emptySub: { fontSize: 13, color: HUD.textSec, textAlign: 'center', paddingHorizontal: 30 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: HUD.borderBright, maxHeight: '94%', flex: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: HUD.border },
  sheetLabel: { fontSize: 9, fontWeight: '700', color: HUD.cyan, letterSpacing: 2, marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, marginBottom: 2 },
  sheetMeta: { fontSize: 11, color: HUD.textSec },
  closeBtn: { padding: 4, marginLeft: 12 },

  // Pathogen warning
  pathogenWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '55', borderRadius: 10, padding: 14, marginTop: 12 },
  pathogenWarnTitle: { fontSize: 11, fontWeight: '800', color: HUD.red, letterSpacing: 0.5, marginBottom: 4 },
  pathogenWarnTxt: { fontSize: 11, color: HUD.red + 'cc', lineHeight: 16 },

  // Form
  fieldLabel: { fontSize: 9, fontWeight: '700', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: HUD.bgCardAlt, borderWidth: 1, borderColor: HUD.borderBright, borderRadius: 8, padding: 12, color: HUD.text, fontSize: 14 },
  cfuInputRow: { flexDirection: 'row', gap: 8 },
  segRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seg: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  segTxt: { fontSize: 11, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.5 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: HUD.green, borderRadius: 10, padding: 16, marginTop: 24 },
  submitTxt: { fontSize: 13, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
});
