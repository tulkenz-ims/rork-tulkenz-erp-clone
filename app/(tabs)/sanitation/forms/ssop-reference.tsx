/**
 * app/(tabs)/sanitation/forms/ssop-reference.tsx
 *
 * Sanitation SSOP Reference / Deviation Log — Reactive Form
 *
 * Route params:
 *   postId      — task feed post UUID (pre-linked, locked)
 *   postNumber  — display number
 *   woId        — sanitation work order UUID (optional)
 *   formId      — existing sanitation_ssop_references UUID (view mode)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, CheckCircle, Shield, ChevronDown, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';

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

const ROOMS = ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1', 'All Rooms', 'Other'];
const FOLLOWED_OPTIONS = ['Yes — Followed as Written', 'No — Deviation Occurred', 'Partially — Minor Deviation'];
const SSOP_ADEQUATE_OPTIONS = ['Yes — SSOP is adequate as written', 'No — SSOP requires revision', 'Unsure — Needs quality review'];

interface SSOPRecord { id: string; ssop_code: string; title: string; area: string; }

// ─── Sub-components ───────────────────────────────────────────

function SectionHead({ label, color = HUD.purple }: { label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Shield size={12} color={color} />
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

function ReadOnlyField({ label, value, accentColor = HUD.purple }: { label: string; value: string; accentColor?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 5 }}>{label}</Text>
      <View style={{ borderWidth: 1, borderRadius: 10, padding: 12, borderColor: accentColor + '40', backgroundColor: HUD.bgCardAlt, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Lock size={11} color={HUD.textDim} />
        <Text style={{ fontSize: 13, fontWeight: '500', color: HUD.text, flex: 1 }}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function HUDInput({ label, value, onChangeText, placeholder, required = false, multiline = false, accentColor = HUD.purple, readOnly = false }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; required?: boolean; multiline?: boolean; accentColor?: string; readOnly?: boolean;
}) {
  if (readOnly) return <ReadOnlyField label={label} value={value} accentColor={accentColor} />;
  const isEmpty = required && value.trim() === '';
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 5 }}>
        {label}{required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
      <TextInput style={{ borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: '500', borderColor: isEmpty ? HUD.red + '80' : accentColor + '60', color: HUD.text, backgroundColor: HUD.bgCardAlt, minHeight: multiline ? 72 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
        value={value} onChangeText={onChangeText} placeholder={placeholder || (required ? 'Required' : 'N/A if not applicable')} placeholderTextColor={HUD.textDim} multiline={multiline} />
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>Required</Text>}
    </View>
  );
}

function SelectPicker({ label, value, options, onSelect, required = false, accentColor = HUD.purple, loading = false, readOnly = false }: {
  label: string; value: string; options: string[]; onSelect: (v: string) => void;
  required?: boolean; accentColor?: string; loading?: boolean; readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (readOnly) return <ReadOnlyField label={label} value={value} accentColor={accentColor} />;
  const isEmpty = required && !value;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 5 }}>
        {label}{required && <Text style={{ color: HUD.red }}> *</Text>}
      </Text>
      <TouchableOpacity style={{ borderWidth: 1, borderRadius: 10, padding: 12, borderColor: isEmpty ? HUD.red + '80' : accentColor + '60', backgroundColor: HUD.bgCardAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        onPress={() => !loading && setOpen(!open)} activeOpacity={0.7}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: value ? HUD.text : HUD.textDim, flex: 1 }} numberOfLines={1}>
          {loading ? 'Loading SSOPs...' : value || 'Select...'}
        </Text>
        {loading ? <ActivityIndicator size="small" color={accentColor} /> : <ChevronDown size={16} color={HUD.textSec} />}
      </TouchableOpacity>
      {isEmpty && !loading && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>Required</Text>}
      {open && (
        <View style={{ backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1, borderColor: accentColor + '40', marginTop: 4, overflow: 'hidden' }}>
          {options.length === 0 ? (
            <View style={{ padding: 14 }}><Text style={{ fontSize: 12, color: HUD.textSec }}>No options found.</Text></View>
          ) : options.map(opt => (
            <TouchableOpacity key={opt} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: HUD.border, backgroundColor: value === opt ? accentColor + '15' : 'transparent' }}
              onPress={() => { onSelect(opt); setOpen(false); }} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, color: value === opt ? accentColor : HUD.text, fontWeight: value === opt ? '700' : '400' }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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

function ViewModeBanner({ refNumber, submittedAt }: { refNumber: string; submittedAt: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16, borderColor: HUD.purple + '50', backgroundColor: HUD.purpleDim }}>
      <Lock size={16} color={HUD.purple} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5 }}>SUBMITTED RECORD — READ ONLY</Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: HUD.purple, marginTop: 2 }}>{refNumber}</Text>
        {submittedAt && (
          <Text style={{ fontSize: 11, color: HUD.textSec, marginTop: 2 }}>
            {new Date(submittedAt).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
        )}
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: HUD.purple + '20' }}>
        <Text style={{ fontSize: 10, fontWeight: '900', color: HUD.purple, letterSpacing: 1 }}>SSOP REF</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════ MAIN COMPONENT ═══════════════════

export default function SanitationSSOPReferenceScreen() {
  const { postId, postNumber, woId, formId } = useLocalSearchParams<{
    postId: string; postNumber: string; woId?: string; formId?: string;
  }>();
  const router = useRouter();
  const { organizationId } = useOrganization();
  const linkFormMutation = useLinkFormToPost();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(!!formId);
  const isViewMode = !!formId;

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── SSOP list from DB ─────────────────────────────────────────
  const [ssops, setSsops] = useState<SSOPRecord[]>([]);
  const [ssopsLoading, setSsopsLoading] = useState(!isViewMode);
  const [selectedSSOPId, setSelectedSSOPId] = useState('');
  const [selectedSSOPCode, setSelectedSSOPCode] = useState('');
  const [selectedSSOPTitle, setSelectedSSOPTitle] = useState('');

  useEffect(() => {
    if (isViewMode) return;
    const fetchSSOPs = async () => {
      try {
        const { data, error } = await supabase.from('sanitation_ssops').select('id, ssop_code, title, area').eq('org_id', organizationId).eq('status', 'active').order('ssop_code');
        if (error) throw error;
        setSsops(data || []);
      } catch (err) { console.warn('[SSOPRef] Failed to load SSOPs:', err); }
      finally { setSsopsLoading(false); }
    };
    fetchSSOPs();
  }, [organizationId, isViewMode]);

  const ssopOptions = ssops.map(s => `${s.ssop_code} — ${s.title}`);
  const handleSSOPSelect = (opt: string) => {
    const found = ssops.find(s => `${s.ssop_code} — ${s.title}` === opt);
    if (found) { setSelectedSSOPId(found.id); setSelectedSSOPCode(found.ssop_code); setSelectedSSOPTitle(found.title); }
  };

  // ── Form state ────────────────────────────────────────────────
  const [refNumber, setRefNumber] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [refDate, setRefDate] = useState(today);
  const [refTime, setRefTime] = useState(nowTime);
  const [room, setRoom] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [followedAsWritten, setFollowedAsWritten] = useState('');
  const [deviationDescription, setDeviationDescription] = useState('');
  const [deviationReason, setDeviationReason] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [ssopAdequate, setSsopAdequate] = useState('');
  const [ssopRevisionRecommended, setSsopRevisionRecommended] = useState('');
  const [signature, setSignature] = useState<SignatureVerification | null>(null);
  const [existingSignatureStamp, setExistingSignatureStamp] = useState('');

  // ── Load existing record ──────────────────────────────────────
  useEffect(() => {
    if (!formId) return;
    const load = async () => {
      setIsLoadingRecord(true);
      try {
        const { data, error } = await supabase.from('sanitation_ssop_references').select('*').eq('id', formId).single();
        if (error) throw error;
        setRefNumber(data.ref_number || '');
        setSubmittedAt(data.created_at || '');
        setRefDate(data.ref_date || '');
        setRefTime(data.ref_time || '');
        setRoom(data.room || '');
        setAreaDescription(data.area_description || '');
        setEquipment(data.equipment || '');
        setSelectedSSOPId(data.ssop_id || '');
        setSelectedSSOPCode(data.ssop_code || '');
        setSelectedSSOPTitle(data.ssop_title || '');
        setFollowedAsWritten(data.followed_as_written || '');
        setDeviationDescription(data.deviation_description || '');
        setDeviationReason(data.deviation_reason || '');
        setCorrectiveAction(data.corrective_action || '');
        setSsopAdequate(data.ssop_adequate || '');
        setSsopRevisionRecommended(data.ssop_revision_recommended || '');
        setExistingSignatureStamp(data.tech_signature_stamp || '');
      } catch (err: any) {
        Alert.alert('Error', 'Could not load SSOP reference record.');
      } finally { setIsLoadingRecord(false); }
    };
    load();
  }, [formId]);

  const hasDeviation = followedAsWritten.startsWith('No') || followedAsWritten.startsWith('Partially');
  const ssopNotAdequate = ssopAdequate.startsWith('No');

  // ── Validation ────────────────────────────────────────────────
  const validate = (): string[] => {
    const missing: string[] = [];
    if (!refDate.trim()) missing.push('Date');
    if (!refTime.trim()) missing.push('Time');
    if (!room) missing.push('Room');
    if (!areaDescription.trim()) missing.push('Area / Surface Description');
    if (!selectedSSOPId) missing.push('SSOP Selected');
    if (!followedAsWritten) missing.push('Was SSOP Followed?');
    if (hasDeviation) {
      if (!deviationDescription.trim()) missing.push('Deviation Description');
      if (!deviationReason.trim()) missing.push('Reason for Deviation');
      if (!correctiveAction.trim()) missing.push('Corrective Action');
    }
    if (!ssopAdequate) missing.push('Is SSOP Adequate?');
    if (ssopNotAdequate && !ssopRevisionRecommended.trim()) missing.push('Recommended SSOP Revision');
    if (!isSignatureVerified(signature)) missing.push('Technician Signature (PPN)');
    return missing;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const missing = validate();
    if (missing.length > 0) {
      Alert.alert('All Fields Required', `Every field must be filled in (use "N/A" if not applicable).\n\nMissing:\n• ${missing.join('\n• ')}`);
      return;
    }
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const newRefNumber = `SSOP-REF-${Date.now()}`;
      const { data, error } = await supabase.from('sanitation_ssop_references').insert({
        org_id: organizationId, ref_number: newRefNumber,
        task_feed_post_id: postId || null, task_feed_post_number: postNumber || null,
        sanitation_wo_id: woId || null, ref_date: refDate, ref_time: refTime,
        room, area_description: areaDescription, equipment: equipment || null,
        ssop_id: selectedSSOPId, ssop_code: selectedSSOPCode, ssop_title: selectedSSOPTitle,
        followed_as_written: followedAsWritten,
        deviation_description: hasDeviation ? deviationDescription : null,
        deviation_reason: hasDeviation ? deviationReason : null,
        corrective_action: hasDeviation ? correctiveAction : null,
        ssop_adequate: ssopAdequate,
        ssop_revision_recommended: ssopNotAdequate ? ssopRevisionRecommended : null,
        tech_name: signature!.employeeName, tech_employee_id: signature!.employeeId,
        tech_initials: signature!.employeeInitials, tech_department_code: signature!.departmentCode,
        tech_signature_stamp: signature!.signatureStamp, tech_signed_at: signature!.verifiedAt,
      }).select('id').single();
      if (error) throw error;
      if (postId && postNumber) {
        await linkFormMutation.mutateAsync({
          postId, postNumber, formType: 'sanitation_ssop_reference', formId: data.id,
          formTitle: `SSOP Ref — ${selectedSSOPCode} — ${room}`,
          formNumber: newRefNumber, departmentCode: '1002', departmentName: 'Sanitation',
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('SSOP Reference Logged', `${newRefNumber} filed for ${selectedSSOPCode}.\nLinked to ${postNumber || 'task'}.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit.');
    } finally { setIsSubmitting(false); }
  }, [organizationId, postId, postNumber, woId, refDate, refTime, room, areaDescription, equipment, selectedSSOPId, selectedSSOPCode, selectedSSOPTitle, followedAsWritten, hasDeviation, deviationDescription, deviationReason, correctiveAction, ssopAdequate, ssopNotAdequate, ssopRevisionRecommended, signature, linkFormMutation]);

  if (isLoadingRecord) {
    return (
      <View style={{ flex: 1, backgroundColor: HUD.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color={HUD.purple} size="large" />
        <Text style={{ color: HUD.textSec, fontSize: 13 }}>Loading SSOP reference record...</Text>
      </View>
    );
  }

  const ro = isViewMode;
  const ssopDisplayValue = selectedSSOPId ? `${selectedSSOPCode} — ${selectedSSOPTitle}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: HUD.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: HUD.bgCard }}>
        <View style={[s.header, { borderBottomColor: HUD.purple + '50' }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <X size={18} color={HUD.cyan} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>SANITATION  ·  {ro ? 'SUBMITTED RECORD' : 'REACTIVE FORM'}</Text>
            <Text style={s.title}>SSOP Reference Log</Text>
            <Text style={[s.sub, { color: HUD.purple }]}>Procedure Reference &amp; Deviation</Text>
          </View>
          <View style={[s.typePill, { backgroundColor: ro ? HUD.green + '20' : HUD.purple + '20', borderColor: ro ? HUD.green + '60' : HUD.purple + '60' }]}>
            <Text style={[s.typeTxt, { color: ro ? HUD.green : HUD.purple }]}>{ro ? 'SUBMITTED' : 'REACTIVE'}</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">

          {ro && refNumber && <ViewModeBanner refNumber={refNumber} submittedAt={submittedAt} />}
          {!ro && postNumber && <LinkedPostBanner postNumber={postNumber} />}

          {/* SECTION 1: Reference Info */}
          <View style={s.section}>
            <SectionHead label="REFERENCE DETAILS" color={HUD.purple} />
            <HUDCard color={HUD.purple + '40'}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><HUDInput label="DATE" value={refDate} onChangeText={setRefDate} required placeholder="YYYY-MM-DD" accentColor={HUD.purple} readOnly={ro} /></View>
                <View style={{ flex: 1 }}><HUDInput label="TIME" value={refTime} onChangeText={setRefTime} required placeholder="HH:MM" accentColor={HUD.purple} readOnly={ro} /></View>
              </View>
              <SelectPicker label="ROOM" value={room} options={ROOMS} onSelect={setRoom} required accentColor={HUD.purple} readOnly={ro} />
              <HUDInput label="AREA / SURFACE DESCRIPTION" value={areaDescription} onChangeText={setAreaDescription} required accentColor={HUD.purple} placeholder="e.g. Production floor — conveyor line 2" readOnly={ro} />
              <HUDInput label="EQUIPMENT (if applicable)" value={equipment} onChangeText={setEquipment} accentColor={HUD.purple} placeholder="N/A if not applicable" readOnly={ro} />
            </HUDCard>
          </View>

          {/* SECTION 2: SSOP Selection */}
          <View style={s.section}>
            <SectionHead label="SSOP SELECTED" color={HUD.cyan} />
            <HUDCard color={HUD.cyan + '40'}>
              <SelectPicker
                label="SELECT SSOP" value={ssopDisplayValue}
                options={ssopOptions} onSelect={handleSSOPSelect}
                required accentColor={HUD.cyan} loading={ssopsLoading} readOnly={ro}
              />
              {selectedSSOPId && (
                <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: HUD.cyan + '30', backgroundColor: HUD.cyanDim, marginTop: -4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 1, marginBottom: 2 }}>SELECTED SSOP</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: HUD.cyan }}>{selectedSSOPCode}</Text>
                  <Text style={{ fontSize: 12, color: HUD.textSec, marginTop: 2 }}>{selectedSSOPTitle}</Text>
                </View>
              )}
            </HUDCard>
          </View>

          {/* SECTION 3: Compliance */}
          <View style={s.section}>
            <SectionHead label="SSOP COMPLIANCE" color={HUD.amber} />
            <HUDCard color={HUD.amber + '40'}>
              <SelectPicker label="WAS THE SSOP FOLLOWED AS WRITTEN?" value={followedAsWritten} options={FOLLOWED_OPTIONS} onSelect={setFollowedAsWritten} required accentColor={HUD.amber} readOnly={ro} />
              {hasDeviation && (
                <>
                  {!ro && (
                    <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: HUD.red + '40', backgroundColor: HUD.redDim, marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, color: HUD.red, lineHeight: 17, fontWeight: '600' }}>A deviation was identified. Complete all deviation fields below.</Text>
                    </View>
                  )}
                  <HUDInput label="DESCRIBE THE DEVIATION" value={deviationDescription} onChangeText={setDeviationDescription} required multiline accentColor={HUD.red} readOnly={ro} />
                  <HUDInput label="REASON FOR DEVIATION" value={deviationReason} onChangeText={setDeviationReason} required multiline accentColor={HUD.red} readOnly={ro} />
                  <HUDInput label="CORRECTIVE ACTION TAKEN" value={correctiveAction} onChangeText={setCorrectiveAction} required multiline accentColor={HUD.amber} readOnly={ro} />
                </>
              )}
            </HUDCard>
          </View>

          {/* SECTION 4: SSOP Adequacy */}
          <View style={s.section}>
            <SectionHead label="SSOP ADEQUACY ASSESSMENT" color={HUD.green} />
            <HUDCard color={HUD.green + '40'}>
              {!ro && <Text style={{ fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 12 }}>Based on this event, is the SSOP adequate to prevent recurrence?</Text>}
              <SelectPicker label="IS THE SSOP ADEQUATE AS WRITTEN?" value={ssopAdequate} options={SSOP_ADEQUATE_OPTIONS} onSelect={setSsopAdequate} required accentColor={HUD.green} readOnly={ro} />
              {ssopNotAdequate && (
                <HUDInput label="RECOMMENDED REVISION" value={ssopRevisionRecommended} onChangeText={setSsopRevisionRecommended} required multiline accentColor={HUD.green} readOnly={ro} />
              )}
            </HUDCard>
          </View>

          {/* SECTION 5: Signature */}
          <View style={s.section}>
            <SectionHead label="TECHNICIAN SIGNATURE" color={HUD.cyan} />
            <HUDCard color={HUD.cyan + '40'}>
              {ro ? (
                <>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 8 }}>VERIFIED BY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: HUD.green + '40', backgroundColor: HUD.greenDim }}>
                    <CheckCircle size={16} color={HUD.green} />
                    <Text style={{ fontSize: 12, color: HUD.green, fontStyle: 'italic', flex: 1 }}>{existingSignatureStamp}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 12 }}>By signing, I confirm that this SSOP reference log is accurate and complete.</Text>
                  <PinSignatureCapture onVerified={v => setSignature(v)} onCleared={() => setSignature(null)} formLabel="SSOP Reference Log — Technician Signature" existingVerification={signature} required accentColor={HUD.cyan} />
                </>
              )}
            </HUDCard>
          </View>

          {!ro ? (
            <>
              <TouchableOpacity activeOpacity={0.75} style={[s.submitBtn, { backgroundColor: HUD.purple + '18', borderColor: HUD.purple + '60', opacity: isSubmitting ? 0.6 : 1 }]} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color={HUD.purple} /> : <CheckCircle size={18} color={HUD.purple} />}
                <Text style={[s.submitBtnTxt, { color: HUD.purple }]}>SUBMIT SSOP REFERENCE LOG</Text>
              </TouchableOpacity>
              <Text style={s.submitNote}>All fields marked * are required. Use "N/A" for non-applicable fields.</Text>
            </>
          ) : (
            <TouchableOpacity activeOpacity={0.75} style={[s.submitBtn, { backgroundColor: HUD.cyanDim, borderColor: HUD.cyanMid }]} onPress={() => router.back()}>
              <X size={18} color={HUD.cyan} />
              <Text style={[s.submitBtnTxt, { color: HUD.cyan }]}>CLOSE</Text>
            </TouchableOpacity>
          )}
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
