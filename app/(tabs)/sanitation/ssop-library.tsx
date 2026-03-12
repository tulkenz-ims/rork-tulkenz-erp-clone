// app/(tabs)/sanitation/ssop-library.tsx
// SSOP Library — Standard Sanitation Operating Procedures
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
  useSanitationTasks,
  SanitationSSOPFull,
  SanitationSSOPStep,
} from '../../../hooks/useSanitationTasks';

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
const FREQ_LABELS: Record<string, string> = {
  pre_op: 'PRE-OP', daily: 'DAILY', weekly: 'WEEKLY', biweekly: 'BI-WEEKLY',
  monthly: 'MONTHLY', quarterly: 'QUARTERLY', annual: 'ANNUAL', as_needed: 'AS NEEDED',
};
const FREQ_COLORS: Record<string, string> = {
  pre_op: HUD.amber, daily: HUD.green, weekly: HUD.cyan,
  biweekly: '#00bcd4', monthly: HUD.purple, quarterly: '#ec4899',
  annual: '#f59e0b', as_needed: HUD.textSec,
};

const AREAS = ['All', 'PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1', 'General'];
const FREQ_FILTERS = ['All', 'pre_op', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'as_needed'];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function FreqTag({ freq }: { freq: string }) {
  const color = FREQ_COLORS[freq] ?? HUD.textSec;
  return (
    <View style={[s.tag, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[s.tagTxt, { color }]}>{FREQ_LABELS[freq] ?? freq}</Text>
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
// SSOP CARD
// ─────────────────────────────────────────────
function SSOPCard({ ssop, onPress }: { ssop: SanitationSSOPFull; onPress: () => void }) {
  const freqColor = FREQ_COLORS[ssop.frequency] ?? HUD.textSec;

  return (
    <TouchableOpacity style={s.ssopCard} onPress={onPress} activeOpacity={0.75}>
      {/* Left accent bar */}
      <View style={[s.ssopAccent, { backgroundColor: freqColor }]} />

      <View style={s.ssopBody}>
        {/* Top row */}
        <View style={s.ssopTop}>
          <View style={s.ssopIconBox}>
            <Ionicons name="document-text" size={18} color={HUD.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ssopCode}>{ssop.ssop_code ?? 'NO CODE'}</Text>
            <Text style={s.ssopTitle} numberOfLines={2}>{ssop.title}</Text>
          </View>
          <View style={s.ssopRight}>
            <View style={[s.stepsBadge, {
              backgroundColor: (ssop.steps?.length ?? 0) > 0 ? HUD.cyanDim : HUD.bgCardAlt,
            }]}>
              <Text style={[s.stepsBadgeTxt, {
                color: (ssop.steps?.length ?? 0) > 0 ? HUD.cyan : HUD.textDim,
              }]}>
                {ssop.steps?.length ?? 0} STEPS
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={HUD.textDim} />
          </View>
        </View>

        {/* Tags */}
        <View style={s.tagRow}>
          <FreqTag freq={ssop.frequency} />
          {ssop.area ? (
            <View style={[s.tag, { backgroundColor: HUD.purpleDim, borderColor: HUD.purple + '44' }]}>
              <Text style={[s.tagTxt, { color: HUD.purple }]}>{ssop.area}</Text>
            </View>
          ) : null}
          <View style={[s.tag, { backgroundColor: HUD.bgCardAlt, borderColor: HUD.border }]}>
            <Text style={[s.tagTxt, { color: HUD.textDim }]}>v{ssop.version}</Text>
          </View>
          {!ssop.is_active ? (
            <View style={[s.tag, { backgroundColor: HUD.redDim, borderColor: HUD.red + '44' }]}>
              <Text style={[s.tagTxt, { color: HUD.red }]}>INACTIVE</Text>
            </View>
          ) : null}
        </View>

        {/* Chemical + PPE quick view */}
        {(ssop.chemical_name || ssop.ppe_required) ? (
          <View style={s.ssopQuickRow}>
            {ssop.chemical_name ? (
              <View style={s.ssopQuickItem}>
                <Ionicons name="flask-outline" size={11} color={HUD.amber} />
                <Text style={s.ssopQuickTxt}>
                  {ssop.chemical_name}
                  {ssop.chemical_concentration ? ` @ ${ssop.chemical_concentration}` : ''}
                </Text>
              </View>
            ) : null}
            {ssop.contact_time_min && ssop.contact_time_min > 0 ? (
              <View style={s.ssopQuickItem}>
                <Ionicons name="timer-outline" size={11} color={HUD.amber} />
                <Text style={s.ssopQuickTxt}>{ssop.contact_time_min} min contact</Text>
              </View>
            ) : null}
            {ssop.ppe_required && ssop.ppe_required !== 'N/A' ? (
              <View style={s.ssopQuickItem}>
                <Ionicons name="shield-checkmark-outline" size={11} color={HUD.green} />
                <Text style={s.ssopQuickTxt}>{ssop.ppe_required}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Approved by */}
        {ssop.approved_by ? (
          <View style={s.approvedRow}>
            <Ionicons name="checkmark-circle" size={11} color={HUD.green} />
            <Text style={s.approvedTxt}>Approved: {ssop.approved_by}</Text>
            {ssop.approved_date ? <Text style={s.approvedDate}> · {ssop.approved_date}</Text> : null}
          </View>
        ) : (
          <View style={s.approvedRow}>
            <Ionicons name="alert-circle-outline" size={11} color={HUD.amber} />
            <Text style={[s.approvedTxt, { color: HUD.amber }]}>Pending approval</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// SSOP DETAIL MODAL
// ─────────────────────────────────────────────
function SSOPDetailModal({
  ssop, onClose, onEdit,
}: {
  ssop: SanitationSSOPFull;
  onClose: () => void;
  onEdit: () => void;
}) {
  const freqColor = FREQ_COLORS[ssop.frequency] ?? HUD.textSec;

  return (
    <View style={s.sheet}>
      <View style={[s.sheetHeader, { borderLeftWidth: 4, borderLeftColor: freqColor }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.sheetLabel, { color: HUD.cyan }]}>{ssop.ssop_code ?? 'NO CODE'} · v{ssop.version}</Text>
          <Text style={s.sheetTitle}>{ssop.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <FreqTag freq={ssop.frequency} />
            {ssop.area ? (
              <View style={[s.tag, { backgroundColor: HUD.purpleDim, borderColor: HUD.purple + '44' }]}>
                <Text style={[s.tagTxt, { color: HUD.purple }]}>{ssop.area}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={HUD.textSec} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={s.editBtn}>
            <Ionicons name="create-outline" size={16} color={HUD.cyan} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Info block */}
        <View style={s.infoBox}>
          {ssop.chemical_name ? (
            <InfoRow icon="flask" color={HUD.amber} label="Chemical"
              value={`${ssop.chemical_name}${ssop.chemical_concentration ? ` @ ${ssop.chemical_concentration}` : ''}`} />
          ) : null}
          {ssop.contact_time_min && ssop.contact_time_min > 0 ? (
            <InfoRow icon="timer" color={HUD.amber} label="Contact Time" value={`${ssop.contact_time_min} minutes minimum`} />
          ) : null}
          {ssop.rinse_required ? (
            <InfoRow icon="water" color={HUD.cyan} label="Rinse" value="Required after contact time" valueColor={HUD.cyan} />
          ) : null}
          {ssop.ppe_required && ssop.ppe_required !== 'N/A' ? (
            <InfoRow icon="shield-checkmark" color={HUD.green} label="PPE Required" value={ssop.ppe_required} />
          ) : null}
          {ssop.temperature_requirement ? (
            <InfoRow icon="thermometer" color={HUD.red} label="Temperature" value={ssop.temperature_requirement} />
          ) : null}
          {ssop.approved_by ? (
            <InfoRow icon="checkmark-circle" color={HUD.green} label="Approved By"
              value={`${ssop.approved_by}${ssop.approved_date ? ` · ${ssop.approved_date}` : ''}`} />
          ) : null}
          {ssop.review_date ? (
            <InfoRow icon="calendar" color={HUD.amber} label="Review Date" value={ssop.review_date} />
          ) : null}
          {ssop.regulatory_ref ? (
            <InfoRow icon="library" color={HUD.purple} label="Reg. Reference" value={ssop.regulatory_ref} />
          ) : null}
        </View>

        {/* Notes / scope */}
        {ssop.notes ? (
          <>
            <Text style={s.sectionLbl}>SCOPE / NOTES</Text>
            <View style={s.textBox}>
              <Text style={s.textBoxTxt}>{ssop.notes}</Text>
            </View>
          </>
        ) : null}

        {/* Steps */}
        <Text style={s.sectionLbl}>PROCEDURE — {ssop.steps?.length ?? 0} STEPS</Text>
        {ssop.steps && ssop.steps.length > 0 ? (
          ssop.steps.map((step) => (
            <View key={step.id} style={s.stepCard}>
              <View style={s.stepNumBox}>
                <Text style={s.stepNumTxt}>{step.step_number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {step.title ? <Text style={s.stepTitle}>{step.title}</Text> : null}
                <Text style={s.stepInstruction}>{step.instruction}</Text>
                {step.caution ? (
                  <View style={s.cautionBox}>
                    <Ionicons name="warning" size={12} color={HUD.amber} />
                    <Text style={s.cautionTxt}>{step.caution}</Text>
                  </View>
                ) : null}
                {step.critical_control_point ? (
                  <View style={s.ccpBox}>
                    <Ionicons name="alert-circle" size={12} color={HUD.red} />
                    <Text style={s.ccpTxt}>CRITICAL CONTROL POINT</Text>
                  </View>
                ) : null}
                {step.estimated_minutes ? (
                  <View style={s.stepTimRow}>
                    <Ionicons name="timer-outline" size={11} color={HUD.textDim} />
                    <Text style={s.stepTimTxt}>{step.estimated_minutes} min</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={s.noStepsBox}>
            <Ionicons name="document-outline" size={32} color={HUD.textDim} />
            <Text style={s.noStepsTxt}>No steps added yet. Tap the edit button to add procedure steps.</Text>
          </View>
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
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <Ionicons name={icon} size={14} color={color} style={{ marginTop: 1 }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: HUD.textSec, width: 96 }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: valueColor ?? HUD.text, flex: 1, lineHeight: 18 }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// CREATE / EDIT SSOP MODAL
// ─────────────────────────────────────────────
function CreateEditSSOPModal({
  existing,
  onClose,
  onSubmit,
}: {
  existing?: SanitationSSOPFull;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const isEdit = !!existing;

  const [ssopCode, setSsopCode] = useState(existing?.ssop_code ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [area, setArea] = useState(existing?.area ?? '');
  const [frequency, setFrequency] = useState(existing?.frequency ?? 'daily');
  const [version, setVersion] = useState(existing?.version ?? '1.0');
  const [chemicalName, setChemicalName] = useState(existing?.chemical_name ?? '');
  const [chemicalConc, setChemicalConc] = useState(existing?.chemical_concentration ?? '');
  const [contactTime, setContactTime] = useState(existing?.contact_time_min?.toString() ?? '');
  const [rinseRequired, setRinseRequired] = useState(existing?.rinse_required ?? false);
  const [ppe, setPpe] = useState(existing?.ppe_required ?? '');
  const [tempReq, setTempReq] = useState(existing?.temperature_requirement ?? '');
  const [approvedBy, setApprovedBy] = useState(existing?.approved_by ?? '');
  const [approvedDate, setApprovedDate] = useState(existing?.approved_date ?? '');
  const [reviewDate, setReviewDate] = useState(existing?.review_date ?? '');
  const [regulatoryRef, setRegulatoryRef] = useState(existing?.regulatory_ref ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  // Steps
  const [steps, setSteps] = useState<Partial<SanitationSSOPStep>[]>(
    existing?.steps?.length ? existing.steps : [{ step_number: 1, instruction: '', title: '', caution: '' }]
  );

  const [submitting, setSubmitting] = useState(false);

  const addStep = () => setSteps(prev => [
    ...prev,
    { step_number: prev.length + 1, instruction: '', title: '', caution: '' },
  ]);

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((st, i) => ({ ...st, step_number: i + 1 })));
  };

  const updateStep = (idx: number, field: string, value: string | boolean) => {
    setSteps(prev => prev.map((st, i) => i === idx ? { ...st, [field]: value } : st));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    if (steps.some(st => !st.instruction?.trim())) {
      Alert.alert('Required', 'All steps must have instructions.'); return;
    }
    setSubmitting(true);
    await onSubmit({
      ssop_code: ssopCode.trim() || undefined,
      title: title.trim(),
      area: area.trim() || undefined,
      frequency,
      version: version.trim() || '1.0',
      chemical_name: chemicalName.trim() || undefined,
      chemical_concentration: chemicalConc.trim() || undefined,
      contact_time_min: contactTime ? parseInt(contactTime, 10) : undefined,
      rinse_required: rinseRequired,
      ppe_required: ppe.trim() || undefined,
      temperature_requirement: tempReq.trim() || undefined,
      approved_by: approvedBy.trim() || undefined,
      approved_date: approvedDate.trim() || undefined,
      review_date: reviewDate.trim() || undefined,
      regulatory_ref: regulatoryRef.trim() || undefined,
      notes: notes.trim() || undefined,
      steps: steps.map((st, i) => ({
        step_number: i + 1,
        instruction: st.instruction?.trim() ?? '',
        title: st.title?.trim() || undefined,
        caution: st.caution?.trim() || undefined,
        estimated_minutes: st.estimated_minutes,
        critical_control_point: st.critical_control_point ?? false,
      })),
    });
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>{isEdit ? 'EDIT SSOP' : 'NEW SSOP'}</Text>
          <Text style={s.sheetTitle}>{isEdit ? existing?.title : 'Create SSOP'}</Text>
          <Text style={s.sheetMeta}>All fields with * are required</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* Basic Info */}
          <Text style={s.sectionLbl}>BASIC INFORMATION</Text>

          <FieldLabel label="SSOP CODE" />
          <TextInput style={s.input} value={ssopCode} onChangeText={setSsopCode}
            placeholder="e.g. SAN-PR1-001 (auto-generated if blank)"
            placeholderTextColor={HUD.textDim} autoCapitalize="characters" />

          <FieldLabel label="TITLE" required />
          <TextInput style={s.input} value={title} onChangeText={setTitle}
            placeholder="e.g. PR1 Conveyor Belt CIP Procedure"
            placeholderTextColor={HUD.textDim} />

          <FieldLabel label="AREA / LOCATION" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8 }}>
            {AREAS.filter(a => a !== 'All').map(a => (
              <TouchableOpacity key={a}
                style={[s.filterChip, area === a && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                onPress={() => setArea(a)}>
                <Text style={[s.filterChipTxt, area === a && { color: HUD.purple }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FieldLabel label="FREQUENCY" required />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8 }}>
            {FREQ_FILTERS.filter(f => f !== 'All').map(f => {
              const color = FREQ_COLORS[f] ?? HUD.textSec;
              const active = frequency === f;
              return (
                <TouchableOpacity key={f}
                  style={[s.filterChip, active && { backgroundColor: color + '22', borderColor: color + '55' }]}
                  onPress={() => setFrequency(f)}>
                  <Text style={[s.filterChipTxt, active && { color }]}>{FREQ_LABELS[f]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FieldLabel label="VERSION" />
          <TextInput style={s.input} value={version} onChangeText={setVersion}
            placeholder="e.g. 1.0" placeholderTextColor={HUD.textDim} />

          {/* Chemical / Safety */}
          <Text style={[s.sectionLbl, { marginTop: 20 }]}>CHEMICAL & SAFETY</Text>

          <FieldLabel label="CHEMICAL NAME" />
          <TextInput style={s.input} value={chemicalName} onChangeText={setChemicalName}
            placeholder="e.g. Chlorine Solution or N/A" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="CONCENTRATION / DILUTION" />
          <TextInput style={s.input} value={chemicalConc} onChangeText={setChemicalConc}
            placeholder="e.g. 200 ppm or N/A" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="CONTACT TIME (MINUTES)" />
          <TextInput style={s.input} value={contactTime} onChangeText={setContactTime}
            placeholder="e.g. 10" placeholderTextColor={HUD.textDim} keyboardType="numeric" />

          <FieldLabel label="RINSE REQUIRED" />
          <View style={s.segRow}>
            <TouchableOpacity
              style={[s.seg, rinseRequired && { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan }]}
              onPress={() => setRinseRequired(true)}>
              <Text style={[s.segTxt, rinseRequired && { color: HUD.cyan }]}>YES — RINSE REQUIRED</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.seg, !rinseRequired && { backgroundColor: HUD.amberDim, borderColor: HUD.amber }]}
              onPress={() => setRinseRequired(false)}>
              <Text style={[s.segTxt, !rinseRequired && { color: HUD.amber }]}>NO RINSE</Text>
            </TouchableOpacity>
          </View>

          <FieldLabel label="PPE REQUIRED" />
          <TextInput style={s.input} value={ppe} onChangeText={setPpe}
            placeholder="e.g. Gloves, goggles, apron — or N/A" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="TEMPERATURE REQUIREMENT" />
          <TextInput style={s.input} value={tempReq} onChangeText={setTempReq}
            placeholder="e.g. Min 140°F water or N/A" placeholderTextColor={HUD.textDim} />

          {/* Approval */}
          <Text style={[s.sectionLbl, { marginTop: 20 }]}>APPROVAL & COMPLIANCE</Text>

          <FieldLabel label="APPROVED BY" />
          <TextInput style={s.input} value={approvedBy} onChangeText={setApprovedBy}
            placeholder="Name + title" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="APPROVAL DATE (YYYY-MM-DD)" />
          <TextInput style={s.input} value={approvedDate} onChangeText={setApprovedDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="NEXT REVIEW DATE (YYYY-MM-DD)" />
          <TextInput style={s.input} value={reviewDate} onChangeText={setReviewDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="REGULATORY REFERENCE" />
          <TextInput style={s.input} value={regulatoryRef} onChangeText={setRegulatoryRef}
            placeholder="e.g. SQF 11.2.6, FDA 21 CFR 117 or N/A" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="SCOPE / NOTES" />
          <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
            value={notes} onChangeText={setNotes}
            placeholder="Scope, applicability, or general notes" placeholderTextColor={HUD.textDim} multiline />

          {/* Steps */}
          <Text style={[s.sectionLbl, { marginTop: 24 }]}>PROCEDURE STEPS</Text>

          {steps.map((step, idx) => (
            <View key={idx} style={s.stepEditor}>
              {/* Step header */}
              <View style={s.stepEditorHeader}>
                <View style={s.stepEditorNum}>
                  <Text style={s.stepEditorNumTxt}>{idx + 1}</Text>
                </View>
                <Text style={s.stepEditorTitle}>Step {idx + 1}</Text>
                {steps.length > 1 && (
                  <TouchableOpacity onPress={() => removeStep(idx)} style={s.removeStepBtn}>
                    <Ionicons name="trash-outline" size={16} color={HUD.red} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Step title */}
              <TextInput style={[s.input, { marginBottom: 8 }]}
                value={step.title ?? ''}
                onChangeText={v => updateStep(idx, 'title', v)}
                placeholder="Step title (optional, e.g. Pre-rinse)"
                placeholderTextColor={HUD.textDim} />

              {/* Instruction */}
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', marginBottom: 8 }]}
                value={step.instruction ?? ''}
                onChangeText={v => updateStep(idx, 'instruction', v)}
                placeholder="Full instruction text *"
                placeholderTextColor={HUD.textDim} multiline />

              {/* Caution */}
              <TextInput style={[s.input, { marginBottom: 8 }]}
                value={step.caution ?? ''}
                onChangeText={v => updateStep(idx, 'caution', v)}
                placeholder="Caution / warning (optional)"
                placeholderTextColor={HUD.textDim} />

              {/* Est. time + CCP */}
              <View style={s.stepEditorFooter}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={step.estimated_minutes?.toString() ?? ''}
                  onChangeText={v => updateStep(idx, 'estimated_minutes', v ? parseInt(v, 10) : undefined as any)}
                  placeholder="Est. min"
                  placeholderTextColor={HUD.textDim}
                  keyboardType="numeric" />
                <TouchableOpacity
                  style={[s.ccpToggle, step.critical_control_point && { backgroundColor: HUD.redDim, borderColor: HUD.red }]}
                  onPress={() => updateStep(idx, 'critical_control_point', !step.critical_control_point)}>
                  <Ionicons name="alert-circle" size={14} color={step.critical_control_point ? HUD.red : HUD.textDim} />
                  <Text style={[s.ccpToggleTxt, step.critical_control_point && { color: HUD.red }]}>CCP</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add step button */}
          <TouchableOpacity style={s.addStepBtn} onPress={addStep}>
            <Ionicons name="add-circle-outline" size={18} color={HUD.cyan} />
            <Text style={s.addStepTxt}>ADD STEP</Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.5 }]}
            onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={HUD.bg} size="small" />
              : <>
                  <Ionicons name="save-outline" size={18} color={HUD.bg} />
                  <Text style={s.submitTxt}>{isEdit ? 'SAVE CHANGES' : 'CREATE SSOP'}</Text>
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
export default function SSOPLibraryScreen() {
  const {
    ssops, loading,
    fetchSSOPs, createSSOPWithSteps, updateSSOPWithSteps,
  } = useSanitationTasks();

  const [areaFilter, setAreaFilter] = useState('All');
  const [freqFilter, setFreqFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [selectedSSOPId, setSelectedSSOPId] = useState<string | null>(null);

  const selectedSSOPFull = useMemo(
    () => ssops.find(s => s.id === selectedSSOPId) ?? null,
    [ssops, selectedSSOPId]
  );

  useEffect(() => { fetchSSOPs(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSSOPs();
    setRefreshing(false);
  }, []);

  const handleCreate = async (data: any) => {
    try {
      const result = await createSSOPWithSteps(data);
      if (result) {
        setCreateModal(false);
        Alert.alert('✅ Created', `SSOP "${data.title}" created.`);
        await fetchSSOPs();
      }
    } catch {
      Alert.alert('Error', 'Failed to create SSOP.');
    }
  };

  const handleEdit = async (data: any) => {
    if (!selectedSSOPId) return;
    try {
      await updateSSOPWithSteps({ id: selectedSSOPId, ...data });
      setEditModal(false);
      Alert.alert('✅ Updated', 'SSOP updated successfully.');
      await fetchSSOPs();
    } catch {
      Alert.alert('Error', 'Failed to update SSOP.');
    }
  };

  // Filter + search
  const filteredSSOPs = useMemo(() => {
    let list = ssops;
    if (!showInactive) list = list.filter(s => s.is_active !== false);
    if (areaFilter !== 'All') list = list.filter(s => s.area === areaFilter || (!s.area && areaFilter === 'General'));
    if (freqFilter !== 'All') list = list.filter(s => s.frequency === freqFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.ssop_code ?? '').toLowerCase().includes(q) ||
        (s.chemical_name ?? '').toLowerCase().includes(q) ||
        (s.area ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [ssops, areaFilter, freqFilter, searchQuery, showInactive]);

  // Stats
  const stats = useMemo(() => ({
    total: ssops.length,
    active: ssops.filter(s => s.is_active !== false).length,
    approved: ssops.filter(s => s.approved_by).length,
    pendingApproval: ssops.filter(s => !s.approved_by && s.is_active !== false).length,
    withSteps: ssops.filter(s => (s.steps?.length ?? 0) > 0).length,
  }), [ssops]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>SANITATION SYSTEM</Text>
          <Text style={s.headerTitle}>SSOP Library</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => setCreateModal(true)}>
          <Ionicons name="add" size={16} color={HUD.bg} />
          <Text style={s.newBtnTxt}>NEW SSOP</Text>
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
          <Text style={[s.statVal, { color: HUD.green }]}>{stats.active}</Text>
          <Text style={s.statLbl}>ACTIVE</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.green }]}>{stats.approved}</Text>
          <Text style={s.statLbl}>APPROVED</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: stats.pendingApproval > 0 ? HUD.amber : HUD.textDim }]}>
            {stats.pendingApproval}
          </Text>
          <Text style={s.statLbl}>PENDING</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.purple }]}>{stats.withSteps}</Text>
          <Text style={s.statLbl}>WITH STEPS</Text>
        </View>
      </View>

      {/* ── SEARCH ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={HUD.textDim} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by title, code, or chemical..."
            placeholderTextColor={HUD.textDim}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={HUD.textDim} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.inactiveToggle, showInactive && { backgroundColor: HUD.amberDim, borderColor: HUD.amber }]}
          onPress={() => setShowInactive(v => !v)}>
          <Text style={[s.inactiveToggleTxt, showInactive && { color: HUD.amber }]}>
            {showInactive ? 'INCL. INACTIVE' : 'ACTIVE ONLY'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTERS ── */}
      <View style={s.filterBlock}>
        {/* Area filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 6 }}>
          {AREAS.map(a => (
            <TouchableOpacity key={a}
              style={[s.filterChip, areaFilter === a && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
              onPress={() => setAreaFilter(a)}>
              <Text style={[s.filterChipTxt, areaFilter === a && { color: HUD.purple }]}>
                {a === 'All' ? 'ALL AREAS' : a}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Freq filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 6 }}>
          {FREQ_FILTERS.map(f => {
            const color = f === 'All' ? HUD.cyan : FREQ_COLORS[f] ?? HUD.textSec;
            const active = freqFilter === f;
            return (
              <TouchableOpacity key={f}
                style={[s.filterChip, active && { backgroundColor: color + '22', borderColor: color + '55' }]}
                onPress={() => setFreqFilter(f)}>
                <Text style={[s.filterChipTxt, active && { color }]}>
                  {f === 'All' ? 'ALL FREQ' : FREQ_LABELS[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT ── */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator color={HUD.cyan} size="large" />
          <Text style={s.loadingTxt}>LOADING SSOP LIBRARY...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>

          {/* Result count */}
          <View style={s.resultCountRow}>
            <Text style={s.resultCountTxt}>
              {filteredSSOPs.length} SSOP{filteredSSOPs.length !== 1 ? 's' : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </Text>
          </View>

          {filteredSSOPs.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-text" size={48} color={HUD.textDim} />
              <Text style={[s.emptyTitle, { color: HUD.textDim }]}>NO SSOPs</Text>
              <Text style={s.emptySub}>
                {searchQuery
                  ? `No SSOPs match "${searchQuery}". Try clearing the search.`
                  : 'No SSOPs in this filter. Tap NEW SSOP to add one.'}
              </Text>
            </View>
          ) : (
            filteredSSOPs.map(ssop => (
              <SSOPCard key={ssop.id} ssop={ssop} onPress={() => {
                setSelectedSSOPId(ssop.id);
                setDetailModal(true);
              }} />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── DETAIL MODAL ── */}
      <Modal visible={detailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedSSOPFull && (
            <SSOPDetailModal
              ssop={selectedSSOPFull}
              onClose={() => setDetailModal(false)}
              onEdit={() => {
                setDetailModal(false);
                setEditModal(true);
              }}
            />
          )}
        </View>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedSSOPFull && (
            <CreateEditSSOPModal
              existing={selectedSSOPFull}
              onClose={() => setEditModal(false)}
              onSubmit={handleEdit}
            />
          )}
        </View>
      </Modal>

      {/* ── CREATE MODAL ── */}
      <Modal visible={createModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <CreateEditSSOPModal
            onClose={() => setCreateModal(false)}
            onSubmit={handleCreate}
          />
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
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: HUD.cyan, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  newBtnTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },

  statStrip: { flexDirection: 'row', backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  statLbl: { fontSize: 8, fontWeight: '600', color: HUD.textDim, letterSpacing: 1.5, marginTop: 1 },
  statDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 8 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD.bgCardAlt, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, color: HUD.text, fontSize: 13 },
  inactiveToggle: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  inactiveToggleTxt: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },

  filterBlock: { backgroundColor: HUD.bgCard, borderBottomWidth: 1, borderBottomColor: HUD.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  filterChipTxt: { fontSize: 10, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 2 },

  resultCountRow: { marginBottom: 10 },
  resultCountTxt: { fontSize: 10, fontWeight: '700', color: HUD.textDim, letterSpacing: 1 },

  // SSOP card
  ssopCard: { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, marginBottom: 10, flexDirection: 'row', overflow: 'hidden' },
  ssopAccent: { width: 4 },
  ssopBody: { flex: 1, padding: 12, gap: 6 },
  ssopTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ssopIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: HUD.cyanDim, borderWidth: 1, borderColor: HUD.cyan + '33', alignItems: 'center', justifyContent: 'center' },
  ssopCode: { fontSize: 9, fontWeight: '800', color: HUD.cyan, letterSpacing: 1.5, marginBottom: 2 },
  ssopTitle: { fontSize: 13, fontWeight: '700', color: HUD.text, lineHeight: 18 },
  ssopRight: { alignItems: 'center', gap: 4 },
  stepsBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  stepsBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  ssopQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ssopQuickItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ssopQuickTxt: { fontSize: 11, color: HUD.textSec },
  approvedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  approvedTxt: { fontSize: 11, color: HUD.green },
  approvedDate: { fontSize: 11, color: HUD.textDim },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  emptySub: { fontSize: 13, color: HUD.textSec, textAlign: 'center', paddingHorizontal: 30 },

  // Modal / Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: HUD.borderBright, maxHeight: '94%', flex: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: HUD.border },
  sheetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, marginBottom: 4 },
  sheetMeta: { fontSize: 11, color: HUD.textSec },
  closeBtn: { padding: 4, marginLeft: 12 },
  editBtn: { padding: 4, marginLeft: 12, alignItems: 'center' },

  infoBox: { backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 16 },
  sectionLbl: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 8 },
  textBox: { backgroundColor: HUD.bgCardAlt, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 12 },
  textBoxTxt: { fontSize: 13, color: HUD.text, lineHeight: 20 },

  // Step cards (view)
  stepCard: { flexDirection: 'row', gap: 12, marginBottom: 10, backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12 },
  stepNumBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: HUD.cyanDim, borderWidth: 1, borderColor: HUD.cyan + '55', alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { fontSize: 13, fontWeight: '800', color: HUD.cyan },
  stepTitle: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 1, marginBottom: 3 },
  stepInstruction: { fontSize: 13, color: HUD.text, lineHeight: 20 },
  cautionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6, backgroundColor: HUD.amberDim, borderRadius: 6, padding: 8 },
  cautionTxt: { fontSize: 11, color: HUD.amber, flex: 1, lineHeight: 16 },
  ccpBox: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: HUD.redDim, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  ccpTxt: { fontSize: 10, fontWeight: '800', color: HUD.red, letterSpacing: 1 },
  stepTimRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  stepTimTxt: { fontSize: 11, color: HUD.textDim },
  noStepsBox: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  noStepsTxt: { fontSize: 12, color: HUD.textSec, textAlign: 'center' },

  // Step editor
  stepEditor: { backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 10 },
  stepEditorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  stepEditorNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: HUD.cyan + '22', borderWidth: 1, borderColor: HUD.cyan + '55', alignItems: 'center', justifyContent: 'center' },
  stepEditorNumTxt: { fontSize: 12, fontWeight: '800', color: HUD.cyan },
  stepEditorTitle: { flex: 1, fontSize: 11, fontWeight: '700', color: HUD.textSec, letterSpacing: 1 },
  removeStepBtn: { padding: 4 },
  stepEditorFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ccpToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCard },
  ccpToggleTxt: { fontSize: 11, fontWeight: '700', color: HUD.textDim },
  addStepBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: HUD.cyan + '55', borderRadius: 10, padding: 12, marginBottom: 20, borderStyle: 'dashed' },
  addStepTxt: { fontSize: 12, fontWeight: '700', color: HUD.cyan, letterSpacing: 1 },

  // Form
  fieldLabel: { fontSize: 9, fontWeight: '700', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: HUD.bg, borderWidth: 1, borderColor: HUD.borderBright, borderRadius: 8, padding: 12, color: HUD.text, fontSize: 14 },
  segRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCard },
  segTxt: { fontSize: 11, fontWeight: '700', color: HUD.textDim },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: HUD.green, borderRadius: 10, padding: 16, marginTop: 24 },
  submitTxt: { fontSize: 13, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
});
