/**
 * app/(tabs)/sanitation/forms/atp-swab.tsx
 *
 * Sanitation ATP Swab Log — Reactive / Standalone
 * Filed after an incident, CAPA, or before line release.
 * Separate from the scheduled WO ATP field — this is for
 * reactive/extra swabs triggered by a task feed event.
 *
 * Route params:
 *   postId      — task feed post UUID (pre-linked, locked)
 *   postNumber  — display number
 *   woId        — sanitation work order UUID (optional)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, CheckCircle, AlertTriangle, FlaskConical, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';

// ─── HUD Theme ────────────────────────────────────────────────
const HUD = {
  bg: '#020912', bgCard: '#050f1e', bgCardAlt: '#071525',
  cyan: '#00e5ff', cyanDim: '#00e5ff22', cyanMid: '#00e5ff55',
  green: '#00ff88', greenDim: '#00ff8822',
  amber: '#ffb800', amberDim: '#ffb80022',
  red: '#ff2d55', redDim: '#ff2d5522',
  purple: '#7b61ff',
  text: '#e0f4ff', textSec: '#7aa8c8', textDim: '#3a6080',
  border: '#0d2840', borderBright: '#1a4060',
};

const ROOMS = ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1', 'All Rooms', 'Other'];

const SURFACE_TYPES = [
  'Food Contact — Direct',
  'Food Contact — Indirect',
  'Non-Food Contact',
  'Equipment Surface',
  'Floor / Drain',
  'Wall / Ceiling',
  'Other',
];

const REASONS_FOR_SWAB = [
  'Post-CAPA Verification',
  'Pre-Op Line Release',
  'Post Spill / Contamination Event',
  'Routine Environmental Monitoring',
  'Re-swab After Failed Scheduled Swab',
  'Quality Hold Investigation',
  'Regulatory / Audit Requirement',
  'Other',
];

const ATP_PASS_THRESHOLD = 250;

// ─── Sub-components ───────────────────────────────────────────

function SectionHead({ label, color = HUD.amber }: { label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <FlaskConical size={12} color={color} />
      <Text style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 2 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color + '30' }} />
    </View>
  );
}

function HUDCard({ children, color = HUD.borderBright }: { children: React.ReactNode; color?: string }) {
  return (
    <View style={[hC.card, { borderColor: color }]}>
      <View style={[hC.cTL, { borderColor: color }]} />
      <View style={[hC.cBR, { borderColor: color }]} />
      {children}
    </View>
  );
}
const hC = StyleSheet.create({
  card: { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, padding: 14, position: 'relative', overflow: 'hidden', marginBottom: 14 },
  cTL: { position: 'absolute', top: 4, left: 4, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRadius: 1 },
  cBR: { position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderRadius: 1 },
});

function HUDInput({
  label, value, onChangeText, placeholder, required = false,
  multiline = false, keyboardType = 'default', accentColor = HUD.amber,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; required?: boolean;
  multiline?: boolean; keyboardType?: any; accentColor?: string;
}) {
  const isEmpty = required && value.trim() === '';
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 5 }}>
        {label}{required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
      <TextInput
        style={{
          borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: '500',
          borderColor: isEmpty ? HUD.red + '80' : accentColor + '60',
          color: HUD.text, backgroundColor: HUD.bgCardAlt,
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || (required ? 'Required' : 'N/A if not applicable')}
        placeholderTextColor={HUD.textDim}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>Required</Text>}
    </View>
  );
}

function SelectPicker({
  label, value, options, onSelect, required = false, accentColor = HUD.amber,
}: {
  label: string; value: string; options: string[];
  onSelect: (v: string) => void; required?: boolean; accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const isEmpty = required && !value;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 5 }}>
        {label}{required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
      <TouchableOpacity
        style={{
          borderWidth: 1, borderRadius: 10, padding: 12,
          borderColor: isEmpty ? HUD.red + '80' : accentColor + '60',
          backgroundColor: HUD.bgCardAlt,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 13, fontWeight: '500', color: value ? HUD.text : HUD.textDim }}>
          {value || 'Select...'}
        </Text>
        <ChevronDown size={16} color={HUD.textSec} />
      </TouchableOpacity>
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>Required</Text>}
      {open && (
        <View style={{ backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: accentColor + '40', marginTop: 4, overflow: 'hidden' }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: HUD.border, backgroundColor: value === opt ? accentColor + '15' : 'transparent' }}
              onPress={() => { onSelect(opt); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, color: value === opt ? accentColor : HUD.text, fontWeight: value === opt ? '700' : '400' }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function YesNoToggle({ label, value, onSelect, required = false }: {
  label: string; value: boolean | null; onSelect: (v: boolean) => void; required?: boolean;
}) {
  const isEmpty = required && value === null;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 8 }}>
        {label}{required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[true, false].map(v => (
          <TouchableOpacity
            key={String(v)}
            style={{
              flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center',
              borderColor: value === v ? (v ? HUD.green : HUD.red) : HUD.borderBright,
              backgroundColor: value === v ? (v ? HUD.greenDim : HUD.redDim) : HUD.bgCardAlt,
            }}
            onPress={() => onSelect(v)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: value === v ? (v ? HUD.green : HUD.red) : HUD.textSec }}>
              {v ? 'YES' : 'NO'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>Required</Text>}
    </View>
  );
}

function LinkedPostBanner({ postNumber }: { postNumber: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: HUD.cyan + '50', backgroundColor: HUD.cyanDim, marginBottom: 16 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: HUD.cyan }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5 }}>LINKED TASK FEED POST</Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: HUD.cyan, marginTop: 2 }}>{postNumber}</Text>
      </View>
      <View style={{ backgroundColor: HUD.cyan + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
        <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.cyan, letterSpacing: 1 }}>AUTO-LINKED</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════ MAIN COMPONENT ═══════════════════

export default function SanitationATPSwabScreen() {
  const { postId, postNumber, woId } = useLocalSearchParams<{
    postId: string; postNumber: string; woId?: string;
  }>();
  const router = useRouter();
  const { organizationId } = useOrganization();
  const linkFormMutation = useLinkFormToPost();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Form state ────────────────────────────────────────────────
  const [swabDate, setSwabDate] = useState(today);
  const [swabTime, setSwabTime] = useState(nowTime);
  const [room, setRoom] = useState('');
  const [surfaceLocation, setSurfaceLocation] = useState('');
  const [surfaceType, setSurfaceType] = useState('');
  const [reasonForSwab, setReasonForSwab] = useState('');
  const [chemicalUsed, setChemicalUsed] = useState('');
  const [rluReading, setRluReading] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [recleanPerformed, setRecleanPerformed] = useState<boolean | null>(null);
  const [reswabRlu, setReswabRlu] = useState('');
  const [signature, setSignature] = useState<SignatureVerification | null>(null);

  // ── Computed ATP result ───────────────────────────────────────
  const rluVal = parseFloat(rluReading);
  const atpResult = !isNaN(rluVal) ? (rluVal <= ATP_PASS_THRESHOLD ? 'pass' : 'fail') : null;

  const reswabVal = parseFloat(reswabRlu);
  const reswabResult = !isNaN(reswabVal) ? (reswabVal <= ATP_PASS_THRESHOLD ? 'pass' : 'fail') : null;

  const isFail = atpResult === 'fail';

  // ── Validation ────────────────────────────────────────────────
  const validate = (): string[] => {
    const missing: string[] = [];
    if (!swabDate.trim()) missing.push('Swab Date');
    if (!swabTime.trim()) missing.push('Swab Time');
    if (!room) missing.push('Room');
    if (!surfaceLocation.trim()) missing.push('Surface Location');
    if (!surfaceType) missing.push('Surface Type');
    if (!reasonForSwab) missing.push('Reason for Swab');
    if (!rluReading.trim()) missing.push('RLU Reading');
    if (isFail && !correctiveAction.trim()) missing.push('Corrective Action (required on fail)');
    if (isFail && recleanPerformed === null) missing.push('Re-Clean Performed (Yes/No)');
    if (isFail && recleanPerformed && !reswabRlu.trim()) missing.push('Re-Swab RLU Reading');
    if (!isSignatureVerified(signature)) missing.push('Technician Signature (PPN)');
    return missing;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const missing = validate();
    if (missing.length > 0) {
      Alert.alert(
        'All Fields Required',
        `Every field must be filled in (use "N/A" if not applicable).\n\nMissing:\n• ${missing.join('\n• ')}`,
      );
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const logNumber = `ATP-SAN-${Date.now()}`;

      const { data, error } = await supabase
        .from('sanitation_atp_logs')
        .insert({
          org_id: organizationId,
          log_number: logNumber,
          task_feed_post_id: postId || null,
          task_feed_post_number: postNumber || null,
          sanitation_wo_id: woId || null,
          swab_date: swabDate,
          swab_time: swabTime,
          room,
          surface_location: surfaceLocation,
          surface_type: surfaceType,
          reason_for_swab: reasonForSwab,
          chemical_used: chemicalUsed || null,
          rlu_reading: isNaN(rluVal) ? null : rluVal,
          pass_threshold: ATP_PASS_THRESHOLD,
          atp_result: atpResult,
          corrective_action: correctiveAction || null,
          reclean_performed: recleanPerformed ?? false,
          reswab_rlu: reswabRlu ? reswabVal : null,
          reswab_result: reswabResult,
          tech_name: signature!.employeeName,
          tech_employee_id: signature!.employeeId,
          tech_initials: signature!.employeeInitials,
          tech_department_code: signature!.departmentCode,
          tech_signature_stamp: signature!.signatureStamp,
          tech_signed_at: signature!.verifiedAt,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (postId && postNumber) {
        await linkFormMutation.mutateAsync({
          postId,
          postNumber,
          formType: 'sanitation_atp_log',
          formId: data.id,
          formTitle: `ATP Swab — ${room} — ${surfaceLocation} — ${atpResult?.toUpperCase()}`,
          formNumber: logNumber,
          departmentCode: '1002',
          departmentName: 'Sanitation',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        atpResult === 'pass' ? 'ATP Swab — PASS ✓' : 'ATP Swab — FAIL ✗',
        `${logNumber} recorded.\nResult: ${rluVal} RLU — ${atpResult?.toUpperCase()} (threshold ≤${ATP_PASS_THRESHOLD})\nLinked to ${postNumber || 'task'}.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      console.error('[ATPSwab] Submit error:', err);
      Alert.alert('Submission Error', err?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    organizationId, postId, postNumber, woId,
    swabDate, swabTime, room, surfaceLocation, surfaceType,
    reasonForSwab, chemicalUsed, rluVal, atpResult,
    correctiveAction, recleanPerformed, reswabVal, reswabResult,
    signature, linkFormMutation,
  ]);

  // ─────────────────────────────────── RENDER ──────────────────
  return (
    <View style={{ flex: 1, backgroundColor: HUD.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: HUD.bgCard }}>
        <View style={[s.header, { borderBottomColor: HUD.amber + '50' }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <X size={18} color={HUD.cyan} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>SANITATION  ·  REACTIVE FORM</Text>
            <Text style={s.title}>ATP Swab Log</Text>
            <Text style={[s.sub, { color: HUD.amber }]}>Environmental Surface Testing</Text>
          </View>
          <View style={[s.typePill, { backgroundColor: HUD.amber + '20', borderColor: HUD.amber + '60' }]}>
            <Text style={[s.typeTxt, { color: HUD.amber }]}>REACTIVE</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">

          {postNumber && <LinkedPostBanner postNumber={postNumber} />}

          {/* Threshold info banner */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: HUD.amber + '40', backgroundColor: HUD.amberDim, marginBottom: 16 }}>
            <FlaskConical size={16} color={HUD.amber} />
            <Text style={{ fontSize: 12, color: HUD.textSec, flex: 1, lineHeight: 18 }}>
              Pass threshold: <Text style={{ color: HUD.amber, fontWeight: '800' }}>≤ {ATP_PASS_THRESHOLD} RLU</Text>. Results above this require corrective action and re-swab.
            </Text>
          </View>

          {/* SECTION 1: Swab Details */}
          <View style={s.section}>
            <SectionHead label="SWAB DETAILS" color={HUD.amber} />
            <HUDCard color={HUD.amber + '40'}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <HUDInput label="DATE" value={swabDate} onChangeText={setSwabDate} required placeholder="YYYY-MM-DD" />
                </View>
                <View style={{ flex: 1 }}>
                  <HUDInput label="TIME" value={swabTime} onChangeText={setSwabTime} required placeholder="HH:MM" />
                </View>
              </View>
              <SelectPicker label="ROOM" value={room} options={ROOMS} onSelect={setRoom} required accentColor={HUD.amber} />
              <HUDInput label="SURFACE / LOCATION SWABBED" value={surfaceLocation} onChangeText={setSurfaceLocation} required placeholder="e.g. Conveyor belt surface — near belt joint, floor drain #3" />
              <SelectPicker label="SURFACE TYPE" value={surfaceType} options={SURFACE_TYPES} onSelect={setSurfaceType} required accentColor={HUD.amber} />
              <SelectPicker label="REASON FOR SWAB" value={reasonForSwab} options={REASONS_FOR_SWAB} onSelect={setReasonForSwab} required accentColor={HUD.amber} />
              <HUDInput label="CHEMICAL USED FOR CLEANING (if applicable)" value={chemicalUsed} onChangeText={setChemicalUsed} placeholder="N/A if not applicable" />
            </HUDCard>
          </View>

          {/* SECTION 2: ATP Result */}
          <View style={s.section}>
            <SectionHead label="ATP READING" color={HUD.cyan} />
            <HUDCard color={atpResult === 'pass' ? HUD.green + '50' : atpResult === 'fail' ? HUD.red + '50' : HUD.cyan + '40'}>
              <HUDInput
                label="RLU READING"
                value={rluReading}
                onChangeText={setRluReading}
                required
                keyboardType="numeric"
                accentColor={HUD.cyan}
                placeholder="Enter RLU value from ATP meter"
              />
              {atpResult && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 4,
                  backgroundColor: atpResult === 'pass' ? HUD.greenDim : HUD.redDim,
                  borderColor: atpResult === 'pass' ? HUD.green + '50' : HUD.red + '50',
                }}>
                  {atpResult === 'pass'
                    ? <CheckCircle size={20} color={HUD.green} />
                    : <AlertTriangle size={20} color={HUD.red} />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: atpResult === 'pass' ? HUD.green : HUD.red, letterSpacing: 1 }}>
                      {atpResult === 'pass' ? 'PASS' : 'FAIL'}
                    </Text>
                    <Text style={{ fontSize: 11, color: HUD.textSec, marginTop: 2 }}>
                      {rluVal} RLU — threshold ≤ {ATP_PASS_THRESHOLD} RLU
                    </Text>
                  </View>
                </View>
              )}
            </HUDCard>
          </View>

          {/* SECTION 3: Corrective Action (shown when fail) */}
          {isFail && (
            <View style={s.section}>
              <SectionHead label="CORRECTIVE ACTION (REQUIRED — FAIL)" color={HUD.red} />
              <HUDCard color={HUD.red + '40'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: HUD.red + '40', backgroundColor: HUD.redDim, marginBottom: 12 }}>
                  <AlertTriangle size={14} color={HUD.red} />
                  <Text style={{ fontSize: 11, color: HUD.red, flex: 1, lineHeight: 17, fontWeight: '600' }}>
                    ATP failure requires immediate corrective action. Re-clean the surface and perform a re-swab.
                  </Text>
                </View>
                <HUDInput
                  label="CORRECTIVE ACTION TAKEN"
                  value={correctiveAction}
                  onChangeText={setCorrectiveAction}
                  required
                  multiline
                  accentColor={HUD.red}
                  placeholder="e.g. Surface re-cleaned with Kay-5 at 200ppm, 5-minute dwell time, rinsed and wiped dry"
                />
                <YesNoToggle label="RE-CLEAN PERFORMED?" value={recleanPerformed} onSelect={setRecleanPerformed} required />
                {recleanPerformed && (
                  <>
                    <HUDInput
                      label="RE-SWAB RLU READING"
                      value={reswabRlu}
                      onChangeText={setReswabRlu}
                      required
                      keyboardType="numeric"
                      accentColor={HUD.red}
                      placeholder="RLU value after re-clean"
                    />
                    {reswabResult && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                        borderRadius: 10, borderWidth: 1,
                        backgroundColor: reswabResult === 'pass' ? HUD.greenDim : HUD.redDim,
                        borderColor: reswabResult === 'pass' ? HUD.green + '50' : HUD.red + '50',
                      }}>
                        {reswabResult === 'pass'
                          ? <CheckCircle size={16} color={HUD.green} />
                          : <AlertTriangle size={16} color={HUD.red} />}
                        <Text style={{ fontSize: 14, fontWeight: '900', color: reswabResult === 'pass' ? HUD.green : HUD.red }}>
                          RE-SWAB: {reswabResult === 'pass' ? 'PASS' : 'FAIL'} — {reswabVal} RLU
                        </Text>
                      </View>
                    )}
                    {reswabResult === 'fail' && (
                      <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: HUD.red + '40', backgroundColor: HUD.redDim, marginTop: 8 }}>
                        <Text style={{ fontSize: 11, color: HUD.red, lineHeight: 17, fontWeight: '600' }}>
                          Re-swab still failing. File a Sanitation CAPA and notify Quality (dept 1004) before releasing this area for production.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </HUDCard>
            </View>
          )}

          {/* SECTION 4: Signature */}
          <View style={s.section}>
            <SectionHead label="TECHNICIAN SIGNATURE" color={HUD.cyan} />
            <HUDCard color={HUD.cyan + '40'}>
              <Text style={{ fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 12 }}>
                By signing, I confirm that the ATP swab was performed as described and the results recorded are accurate.
              </Text>
              <PinSignatureCapture
                onVerified={(v) => setSignature(v)}
                onCleared={() => setSignature(null)}
                formLabel="ATP Swab Log — Technician Signature"
                existingVerification={signature}
                required
                accentColor={HUD.cyan}
              />
            </HUDCard>
          </View>

          {/* Submit */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[s.submitBtn, {
              backgroundColor: HUD.amber + '18',
              borderColor: HUD.amber + '60',
              opacity: isSubmitting ? 0.6 : 1,
            }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color={HUD.amber} />
              : <CheckCircle size={18} color={HUD.amber} />}
            <Text style={[s.submitBtnTxt, { color: HUD.amber }]}>SUBMIT ATP SWAB LOG</Text>
          </TouchableOpacity>
          <Text style={s.submitNote}>All fields marked * are required. Use "N/A" for non-applicable fields.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 2, gap: 10, backgroundColor: HUD.bgCard },
  backBtn: { padding: 8, backgroundColor: HUD.cyanDim, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyanMid },
  eyebrow: { fontSize: 8, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '900', color: HUD.text, letterSpacing: 0.5 },
  sub: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },
  typePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  typeTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  section: { marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  submitBtnTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  submitNote: { fontSize: 10, color: HUD.textDim, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});
