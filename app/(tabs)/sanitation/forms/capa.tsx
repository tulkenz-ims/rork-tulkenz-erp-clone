/**
 * app/(tabs)/sanitation/forms/capa.tsx
 *
 * Sanitation CAPA — Corrective & Preventive Action
 * Reactive form — filed when a sanitation failure, contamination,
 * ATP failure, or deviation requires root cause investigation.
 *
 * Receives route params:
 *   postId       — task feed post UUID (pre-linked, locked)
 *   postNumber   — display number e.g. TF-240301-001
 *   woId         — sanitation work order UUID (optional)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, CheckCircle, AlertTriangle, Zap, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';

// ─── HUD Theme (matches SanitationWorkOrderDetail) ────────────
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

const HOW_DETECTED_OPTIONS = [
  'ATP Swab Failure',
  'Visual Inspection',
  'Quality Hold / Production Stop',
  'Pre-Op Inspection Failure',
  'Supervisor Observation',
  'Employee Report',
  'Customer Complaint',
  'Internal Audit',
  'Other',
];

// ─── Sub-components ───────────────────────────────────────────

function SectionHead({ label, color = HUD.red }: { label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Zap size={12} color={color} />
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
  editable = true, multiline = false, keyboardType = 'default', accentColor = HUD.cyan,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; required?: boolean; editable?: boolean;
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
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || (required ? 'Required — cannot be left blank' : 'N/A if not applicable')}
        placeholderTextColor={HUD.textDim}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>This field is required</Text>}
    </View>
  );
}

function SelectPicker({
  label, value, options, onSelect, required = false, accentColor = HUD.cyan,
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
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>This field is required</Text>}
      {open && (
        <View style={{
          backgroundColor: HUD.bgCard, borderRadius: 10, borderWidth: 1,
          borderColor: accentColor + '40', marginTop: 4, overflow: 'hidden',
        }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={{
                padding: 12, borderBottomWidth: 1, borderBottomColor: HUD.border,
                backgroundColor: value === opt ? accentColor + '15' : 'transparent',
              }}
              onPress={() => { onSelect(opt); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, color: value === opt ? accentColor : HUD.text, fontWeight: value === opt ? '700' : '400' }}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function YesNoToggle({
  label, value, onSelect, required = false,
}: { label: string; value: boolean | null; onSelect: (v: boolean) => void; required?: boolean }) {
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
              borderColor: value === v ? (v ? HUD.red : HUD.green) : HUD.borderBright,
              backgroundColor: value === v ? (v ? HUD.redDim : HUD.greenDim) : HUD.bgCardAlt,
            }}
            onPress={() => onSelect(v)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: value === v ? (v ? HUD.red : HUD.green) : HUD.textSec }}>
              {v ? 'YES' : 'NO'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isEmpty && <Text style={{ fontSize: 9, color: HUD.red, marginTop: 3 }}>This field is required</Text>}
    </View>
  );
}

// ─── Linked Post Banner (locked, pre-populated) ───────────────
function LinkedPostBanner({ postId, postNumber }: { postId: string; postNumber: string }) {
  return (
    <View style={[lpS.banner, { borderColor: HUD.cyan + '50', backgroundColor: HUD.cyanDim }]}>
      <View style={[lpS.dot, { backgroundColor: HUD.cyan }]} />
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
const lpS = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ═══════════════════════════ MAIN COMPONENT ═══════════════════

export default function SanitationCAPAScreen() {
  const { postId, postNumber, woId } = useLocalSearchParams<{
    postId: string; postNumber: string; woId?: string;
  }>();
  const router = useRouter();
  const { user } = useUser();
  const { organizationId } = useOrganization();
  const linkFormMutation = useLinkFormToPost();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Form state ────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [detectedDate, setDetectedDate] = useState(today);
  const [detectedTime, setDetectedTime] = useState(nowTime);
  const [room, setRoom] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [howDetected, setHowDetected] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [productOnHold, setProductOnHold] = useState<boolean | null>(null);
  const [affectedProduct, setAffectedProduct] = useState('');
  const [immediateContainment, setImmediateContainment] = useState('');

  // 5 Whys
  const [why1, setWhy1] = useState('');
  const [why2, setWhy2] = useState('');
  const [why3, setWhy3] = useState('');
  const [why4, setWhy4] = useState('');
  const [why5, setWhy5] = useState('');
  const [rootCauseSummary, setRootCauseSummary] = useState('');

  // Actions
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [ssopRevisionRequired, setSsopRevisionRequired] = useState<boolean | null>(null);
  const [ssopRevisedNote, setSsopRevisedNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');

  // Signature
  const [signature, setSignature] = useState<SignatureVerification | null>(null);

  // ── Validation ────────────────────────────────────────────────
  const validate = (): string[] => {
    const missing: string[] = [];
    if (!detectedDate.trim()) missing.push('Date Detected');
    if (!detectedTime.trim()) missing.push('Time Detected');
    if (!room) missing.push('Room');
    if (!areaDescription.trim()) missing.push('Area / Surface Description');
    if (!howDetected) missing.push('How Detected');
    if (!incidentDescription.trim()) missing.push('Incident Description');
    if (productOnHold === null) missing.push('Product on Hold (Yes/No)');
    if (productOnHold && !affectedProduct.trim()) missing.push('Affected Product');
    if (!immediateContainment.trim()) missing.push('Immediate Containment Action');
    if (!why1.trim()) missing.push('Why #1 (Root Cause — Step 1)');
    if (!why2.trim()) missing.push('Why #2 (Root Cause — Step 2)');
    if (!why3.trim()) missing.push('Why #3 (Root Cause — Step 3)');
    if (!rootCauseSummary.trim()) missing.push('Root Cause Summary');
    if (!correctiveAction.trim()) missing.push('Corrective Action');
    if (!preventiveAction.trim()) missing.push('Preventive Action');
    if (ssopRevisionRequired === null) missing.push('SSOP Revision Required (Yes/No)');
    if (ssopRevisionRequired && !ssopRevisedNote.trim()) missing.push('Which SSOP to Revise');
    if (!followUpDate.trim()) missing.push('Follow-Up Verification Date');
    if (!responsiblePerson.trim()) missing.push('Person Responsible');
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
      const capaNumber = `CAPA-SAN-${Date.now()}`;

      const { data, error } = await supabase
        .from('sanitation_capa')
        .insert({
          org_id: organizationId,
          capa_number: capaNumber,
          task_feed_post_id: postId || null,
          task_feed_post_number: postNumber || null,
          sanitation_wo_id: woId || null,
          detected_date: detectedDate,
          detected_time: detectedTime,
          room,
          area_description: areaDescription,
          how_detected: howDetected,
          incident_description: incidentDescription,
          product_on_hold: productOnHold,
          affected_product: affectedProduct || null,
          immediate_containment: immediateContainment,
          why_1: why1,
          why_2: why2,
          why_3: why3,
          why_4: why4 || null,
          why_5: why5 || null,
          root_cause_summary: rootCauseSummary,
          corrective_action: correctiveAction,
          preventive_action: preventiveAction,
          ssop_revision_required: ssopRevisionRequired,
          ssop_revised_code: ssopRevisionRequired ? ssopRevisedNote : null,
          follow_up_date: followUpDate,
          responsible_person: responsiblePerson,
          tech_name: signature!.employeeName,
          tech_employee_id: signature!.employeeId,
          tech_initials: signature!.employeeInitials,
          tech_department_code: signature!.departmentCode,
          tech_signature_stamp: signature!.signatureStamp,
          tech_signed_at: signature!.verifiedAt,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Link to task feed post
      if (postId && postNumber) {
        await linkFormMutation.mutateAsync({
          postId,
          postNumber,
          formType: 'sanitation_capa',
          formId: data.id,
          formTitle: `Sanitation CAPA — ${room} — ${howDetected}`,
          formNumber: capaNumber,
          departmentCode: '1002',
          departmentName: 'Sanitation',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'CAPA Submitted',
        `Sanitation CAPA ${capaNumber} has been filed and linked to ${postNumber || 'the task'}.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      console.error('[SanitationCAPA] Submit error:', err);
      Alert.alert('Submission Error', err?.message || 'Failed to submit CAPA. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    organizationId, postId, postNumber, woId,
    detectedDate, detectedTime, room, areaDescription, howDetected,
    incidentDescription, productOnHold, affectedProduct, immediateContainment,
    why1, why2, why3, why4, why5, rootCauseSummary,
    correctiveAction, preventiveAction, ssopRevisionRequired, ssopRevisedNote,
    followUpDate, responsiblePerson, signature, linkFormMutation,
  ]);

  // ─────────────────────────────────── RENDER ──────────────────
  return (
    <View style={{ flex: 1, backgroundColor: HUD.bg }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: HUD.bgCard }}>
        <View style={[s.header, { borderBottomColor: HUD.red + '50' }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <X size={18} color={HUD.cyan} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>SANITATION  ·  REACTIVE FORM</Text>
            <Text style={s.title}>CAPA Report</Text>
            <Text style={[s.sub, { color: HUD.red }]}>Corrective &amp; Preventive Action</Text>
          </View>
          <View style={[s.typePill, { backgroundColor: HUD.red + '20', borderColor: HUD.red + '60' }]}>
            <Text style={[s.typeTxt, { color: HUD.red }]}>REACTIVE</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Linked Post */}
          {postId && postNumber && (
            <LinkedPostBanner postId={postId} postNumber={postNumber} />
          )}

          {/* SECTION 1: Incident Details */}
          <View style={s.section}>
            <SectionHead label="INCIDENT DETAILS" color={HUD.red} />
            <HUDCard color={HUD.red + '40'}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <HUDInput label="DATE DETECTED" value={detectedDate} onChangeText={setDetectedDate} required placeholder="YYYY-MM-DD" />
                </View>
                <View style={{ flex: 1 }}>
                  <HUDInput label="TIME DETECTED" value={detectedTime} onChangeText={setDetectedTime} required placeholder="HH:MM" />
                </View>
              </View>
              <SelectPicker label="ROOM" value={room} options={ROOMS} onSelect={setRoom} required accentColor={HUD.red} />
              <HUDInput label="AREA / SURFACE DESCRIPTION" value={areaDescription} onChangeText={setAreaDescription} required placeholder="e.g. Conveyor belt surface, floor drain near mixer" />
              <SelectPicker label="HOW DETECTED" value={howDetected} options={HOW_DETECTED_OPTIONS} onSelect={setHowDetected} required accentColor={HUD.red} />
              <HUDInput label="INCIDENT DESCRIPTION" value={incidentDescription} onChangeText={setIncidentDescription} required multiline placeholder="Describe what was found, observed, or reported in detail" />
            </HUDCard>
          </View>

          {/* SECTION 2: Containment */}
          <View style={s.section}>
            <SectionHead label="IMMEDIATE CONTAINMENT" color={HUD.amber} />
            <HUDCard color={HUD.amber + '40'}>
              <YesNoToggle label="WAS PRODUCT PLACED ON HOLD?" value={productOnHold} onSelect={setProductOnHold} required />
              {productOnHold && (
                <HUDInput label="AFFECTED PRODUCT / LOT" value={affectedProduct} onChangeText={setAffectedProduct} required accentColor={HUD.amber} placeholder="Product name, lot number, quantity" />
              )}
              <HUDInput label="IMMEDIATE CONTAINMENT ACTION TAKEN" value={immediateContainment} onChangeText={setImmediateContainment} required multiline accentColor={HUD.amber} placeholder="What was done immediately to contain the issue? (re-clean, quarantine, stop production, etc.)" />
            </HUDCard>
          </View>

          {/* SECTION 3: Root Cause — 5 Whys */}
          <View style={s.section}>
            <SectionHead label="ROOT CAUSE ANALYSIS — 5 WHYS" color={HUD.purple} />
            <View style={[s.whyNote, { borderColor: HUD.purple + '40', backgroundColor: HUD.purpleDim }]}>
              <Text style={{ fontSize: 11, color: HUD.textSec, lineHeight: 17 }}>
                Start with the problem and ask "Why?" repeatedly until you reach the true root cause. Whys 1–3 are required. Add 4–5 if needed to reach the actual cause.
              </Text>
            </View>
            <HUDCard color={HUD.purple + '40'}>
              <HUDInput label="WHY #1 — Why did this happen?" value={why1} onChangeText={setWhy1} required multiline accentColor={HUD.purple} placeholder="e.g. Surface was not properly sanitized during last cleaning cycle" />
              <HUDInput label="WHY #2 — Why did that happen?" value={why2} onChangeText={setWhy2} required multiline accentColor={HUD.purple} placeholder="e.g. Tech did not follow the correct dwell time for the sanitizer" />
              <HUDInput label="WHY #3 — Why did that happen?" value={why3} onChangeText={setWhy3} required multiline accentColor={HUD.purple} placeholder="e.g. SSOP dwell time requirement was unclear / not posted at station" />
              <HUDInput label="WHY #4 (if needed)" value={why4} onChangeText={setWhy4} multiline accentColor={HUD.purple} placeholder="Continue if root cause not yet reached" />
              <HUDInput label="WHY #5 (if needed)" value={why5} onChangeText={setWhy5} multiline accentColor={HUD.purple} placeholder="Continue if root cause not yet reached" />
              <HUDInput label="ROOT CAUSE SUMMARY" value={rootCauseSummary} onChangeText={setRootCauseSummary} required multiline accentColor={HUD.purple} placeholder="Summarize the true root cause identified through the 5 Whys analysis" />
            </HUDCard>
          </View>

          {/* SECTION 4: Corrective & Preventive Actions */}
          <View style={s.section}>
            <SectionHead label="CORRECTIVE & PREVENTIVE ACTIONS" color={HUD.green} />
            <HUDCard color={HUD.green + '40'}>
              <HUDInput
                label="CORRECTIVE ACTION — What was done to fix this now?"
                value={correctiveAction}
                onChangeText={setCorrectiveAction}
                required multiline accentColor={HUD.green}
                placeholder="e.g. Full re-clean of affected area per SSOP-PR1-FLOOR-D, ATP reswab performed and passed"
              />
              <HUDInput
                label="PREVENTIVE ACTION — What will prevent recurrence?"
                value={preventiveAction}
                onChangeText={setPreventiveAction}
                required multiline accentColor={HUD.green}
                placeholder="e.g. Post dwell time requirements at each sanitation station, add to pre-shift briefing checklist"
              />
              <YesNoToggle label="IS AN SSOP REVISION REQUIRED?" value={ssopRevisionRequired} onSelect={setSsopRevisionRequired} required />
              {ssopRevisionRequired && (
                <HUDInput
                  label="WHICH SSOP REQUIRES REVISION?"
                  value={ssopRevisedNote}
                  onChangeText={setSsopRevisedNote}
                  required accentColor={HUD.green}
                  placeholder="SSOP code or title (e.g. SSOP-PR1-FLOOR-D)"
                />
              )}
              <HUDInput label="FOLLOW-UP VERIFICATION DATE" value={followUpDate} onChangeText={setFollowUpDate} required placeholder="YYYY-MM-DD" />
              <HUDInput label="PERSON RESPONSIBLE FOR FOLLOW-UP" value={responsiblePerson} onChangeText={setResponsiblePerson} required placeholder="Name and title" />
            </HUDCard>
          </View>

          {/* SECTION 5: Signature */}
          <View style={s.section}>
            <SectionHead label="TECHNICIAN SIGNATURE" color={HUD.cyan} />
            <HUDCard color={HUD.cyan + '40'}>
              <Text style={{ fontSize: 11, color: HUD.textSec, lineHeight: 17, marginBottom: 12 }}>
                By signing, I confirm that the information in this CAPA is accurate and complete, and that the corrective actions described have been or will be implemented.
              </Text>
              <PinSignatureCapture
                onVerified={(v) => setSignature(v)}
                onCleared={() => setSignature(null)}
                formLabel="Sanitation CAPA — Technician Signature"
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
              backgroundColor: HUD.red + '18',
              borderColor: HUD.red + '60',
              opacity: isSubmitting ? 0.6 : 1,
            }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color={HUD.red} />
              : <CheckCircle size={18} color={HUD.red} />}
            <Text style={[s.submitBtnTxt, { color: HUD.red }]}>SUBMIT SANITATION CAPA</Text>
          </TouchableOpacity>

          <Text style={s.submitNote}>
            All fields marked * are required. Use "N/A" for non-applicable fields.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 2, gap: 10, backgroundColor: HUD.bgCard,
  },
  backBtn: { padding: 8, backgroundColor: HUD.cyanDim, borderRadius: 10, borderWidth: 1, borderColor: HUD.cyanMid },
  eyebrow: { fontSize: 8, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '900', color: HUD.text, letterSpacing: 0.5 },
  sub: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },
  typePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  typeTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  section: { marginBottom: 16 },
  whyNote: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8,
  },
  submitBtnTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  submitNote: { fontSize: 10, color: HUD.textDim, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});
