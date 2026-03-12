// app/(tabs)/sanitation/corrective-actions.tsx
// Sanitation Corrective Actions — CAPA Management
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
  useSanitationCA,
  SanitationCorrectiveAction,
  VectorSwabPoint,
} from '../../../hooks/useSanitationCA';

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
const ZONE_COLORS: Record<number, string> = {
  1: HUD.red, 2: HUD.amber, 3: HUD.purple, 4: HUD.cyan,
};

const STATUS_CONFIG = {
  open:                 { color: HUD.red,    dim: HUD.redDim,    label: 'OPEN',                icon: 'alert-circle' },
  in_progress:          { color: HUD.amber,  dim: HUD.amberDim,  label: 'IN PROGRESS',         icon: 'time' },
  pending_verification: { color: HUD.cyan,   dim: HUD.cyanDim,   label: 'PENDING VERIFY',      icon: 'eye' },
  closed:               { color: HUD.green,  dim: HUD.greenDim,  label: 'CLOSED',              icon: 'checkmark-circle' },
  voided:               { color: HUD.textDim, dim: HUD.bgCardAlt, label: 'VOIDED',             icon: 'close-circle' },
} as const;

const SEVERITY_CONFIG = {
  critical: { color: HUD.red,    dim: HUD.redDim },
  major:    { color: HUD.amber,  dim: HUD.amberDim },
  minor:    { color: HUD.purple, dim: HUD.purpleDim },
} as const;

const TRIGGER_LABELS: Record<string, string> = {
  atp_fail:         'ATP Fail',
  pathogen_positive:'Pathogen Positive',
  visual_fail:      'Visual Fail',
  audit_finding:    'Audit Finding',
  customer_complaint:'Customer Complaint',
  manual:           'Manual Entry',
};

const ROOMS = ['All', 'PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'];

type CAStatus = keyof typeof STATUS_CONFIG;
type CASeverity = keyof typeof SEVERITY_CONFIG;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: CAStatus }) {
  const { color, dim, label, icon } = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <View style={[s.badge, { backgroundColor: dim, borderColor: color + '66' }]}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={[s.badgeTxt, { color }]}>{label}</Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: CASeverity }) {
  const { color, dim } = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.minor;
  return (
    <View style={[s.badge, { backgroundColor: dim, borderColor: color + '55' }]}>
      <Text style={[s.badgeTxt, { color }]}>{severity.toUpperCase()}</Text>
    </View>
  );
}

function ZoneBadge({ zone }: { zone: number }) {
  const color = ZONE_COLORS[zone] ?? HUD.textSec;
  return (
    <View style={[s.badge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[s.badgeTxt, { color }]}>ZONE {zone}</Text>
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
// CA CARD
// ─────────────────────────────────────────────
function CACard({
  ca, onPress,
}: {
  ca: SanitationCorrectiveAction;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[ca.status as CAStatus] ?? STATUS_CONFIG.open;
  const severity = SEVERITY_CONFIG[ca.severity as CASeverity] ?? SEVERITY_CONFIG.minor;
  const isOpen = ca.status === 'open' || ca.status === 'in_progress';
  const isZ1 = ca.zone_number === 1;

  const daysSinceOpen = ca.opened_date
    ? Math.floor((Date.now() - new Date(ca.opened_date).getTime()) / 86400000)
    : null;

  return (
    <TouchableOpacity
      style={[s.caCard, { borderLeftColor: status.color }, isZ1 && { borderTopWidth: 2, borderTopColor: HUD.red }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Zone 1 critical banner */}
      {isZ1 && isOpen && (
        <View style={s.z1Banner}>
          <Ionicons name="alert-circle" size={12} color={HUD.bg} />
          <Text style={s.z1BannerTxt}>ZONE 1 — PRODUCTION IMPACTED</Text>
        </View>
      )}

      {/* Header row */}
      <View style={s.caCardTop}>
        <Text style={s.caNumber}>{ca.ca_number}</Text>
        <StatusBadge status={ca.status as CAStatus} />
        <SeverityBadge severity={ca.severity as CASeverity} />
        {ca.zone_number ? <ZoneBadge zone={ca.zone_number} /> : null}
      </View>

      {/* Title */}
      <Text style={s.caTitle} numberOfLines={2}>{ca.title}</Text>

      {/* Trigger + room */}
      <View style={s.caMeta}>
        <View style={s.caMetaItem}>
          <Ionicons name="flash-outline" size={11} color={HUD.textDim} />
          <Text style={s.caMetaTxt}>{TRIGGER_LABELS[ca.trigger_type] ?? ca.trigger_type}</Text>
        </View>
        {ca.room ? (
          <View style={s.caMetaItem}>
            <Ionicons name="location-outline" size={11} color={HUD.textDim} />
            <Text style={s.caMetaTxt}>{ca.room}</Text>
          </View>
        ) : null}
        {ca.assigned_to ? (
          <View style={s.caMetaItem}>
            <Ionicons name="person-outline" size={11} color={HUD.textDim} />
            <Text style={s.caMetaTxt}>{ca.assigned_to}</Text>
          </View>
        ) : null}
      </View>

      {/* Footer */}
      <View style={s.caFooter}>
        <View style={s.caDateRow}>
          <Ionicons name="calendar-outline" size={11} color={HUD.textDim} />
          <Text style={s.caDateTxt}>
            Opened: {ca.opened_date ? new Date(ca.opened_date).toLocaleDateString() : '—'}
          </Text>
          {daysSinceOpen !== null && isOpen && (
            <Text style={[s.caAgeTxt, { color: daysSinceOpen > 7 ? HUD.red : daysSinceOpen > 3 ? HUD.amber : HUD.textSec }]}>
              {daysSinceOpen}d open
            </Text>
          )}
        </View>

        {/* Zone 1 verification progress */}
        {isZ1 && ca.status === 'pending_verification' && (
          <View style={s.verifyProgress}>
            <Text style={s.verifyProgressTxt}>
              {ca.consecutive_negatives ?? 0}/{ca.required_negatives ?? 3} neg. required
            </Text>
            <View style={s.verifyDots}>
              {Array.from({ length: ca.required_negatives ?? 3 }).map((_, i) => (
                <View key={i} style={[s.verifyDot, {
                  backgroundColor: i < (ca.consecutive_negatives ?? 0) ? HUD.green : HUD.border,
                }]} />
              ))}
            </View>
          </View>
        )}

        <Ionicons name="chevron-forward" size={16} color={HUD.textDim} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// CA DETAIL MODAL
// ─────────────────────────────────────────────
function CADetailModal({
  ca, vectorPoints, onClose, onUpdateStatus, onAddVectorSwab, onClose_CA,
}: {
  ca: SanitationCorrectiveAction;
  vectorPoints: VectorSwabPoint[];
  onClose: () => void;
  onUpdateStatus: (status: CAStatus, notes: string) => Promise<void>;
  onAddVectorSwab: (data: { pointId?: string; newPointName?: string; room: string }) => Promise<void>;
  onClose_CA: (closedBy: string, notes: string) => Promise<void>;
}) {
  const [statusTab, setStatusTab] = useState<'detail' | 'vector' | 'close'>('detail');
  const [newStatus, setNewStatus] = useState<CAStatus>(ca.status as CAStatus);
  const [statusNotes, setStatusNotes] = useState('');
  const [vectorRoom, setVectorRoom] = useState(ca.room ?? 'PR1');
  const [vectorPointName, setVectorPointName] = useState('');
  const [closedBy, setClosedBy] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = STATUS_CONFIG[ca.status as CAStatus] ?? STATUS_CONFIG.open;
  const isZ1 = ca.zone_number === 1;

  const handleStatusUpdate = async () => {
    if (!statusNotes.trim()) { Alert.alert('Required', 'Status update notes are required.'); return; }
    setSubmitting(true);
    await onUpdateStatus(newStatus, statusNotes.trim());
    setSubmitting(false);
  };

  const handleAddVector = async () => {
    if (!vectorPointName.trim()) { Alert.alert('Required', 'Enter the swab point name/location.'); return; }
    setSubmitting(true);
    await onAddVectorSwab({ newPointName: vectorPointName.trim(), room: vectorRoom });
    setVectorPointName('');
    setSubmitting(false);
  };

  const handleClose = async () => {
    if (!closedBy.trim()) { Alert.alert('Required', 'Closed By is required.'); return; }
    if (!closeNotes.trim()) { Alert.alert('Required', 'Closing notes are required.'); return; }
    setSubmitting(true);
    await onClose_CA(closedBy.trim(), closeNotes.trim());
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={[s.sheetHeader, { borderLeftWidth: 4, borderLeftColor: status.color }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.sheetLabel, { color: status.color }]}>{ca.ca_number}</Text>
          <Text style={s.sheetTitle} numberOfLines={2}>{ca.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <StatusBadge status={ca.status as CAStatus} />
            <SeverityBadge severity={ca.severity as CASeverity} />
            {ca.zone_number ? <ZoneBadge zone={ca.zone_number} /> : null}
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      {/* Sub-tabs */}
      <View style={s.subTabRow}>
        {([
          { k: 'detail', l: 'DETAILS' },
          { k: 'vector', l: 'VECTOR SWABS', show: isZ1 },
          { k: 'close', l: ca.status === 'closed' ? 'CLOSED' : 'CLOSE CA', show: ca.status !== 'voided' },
        ] as const).filter(t => t.show !== false).map(tab => (
          <TouchableOpacity key={tab.k}
            style={[s.subTab, statusTab === tab.k && s.subTabActive]}
            onPress={() => setStatusTab(tab.k)}>
            <Text style={[s.subTabTxt, statusTab === tab.k && s.subTabTxtActive]}>{tab.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>

        {/* ── DETAIL TAB ── */}
        {statusTab === 'detail' && (
          <>
            <View style={s.infoBox}>
              <InfoRow icon="flash" color={HUD.amber} label="Trigger" value={TRIGGER_LABELS[ca.trigger_type] ?? ca.trigger_type} />
              {ca.room ? <InfoRow icon="location" color={HUD.purple} label="Room" value={ca.room} /> : null}
              {ca.assigned_to ? <InfoRow icon="person" color={HUD.cyan} label="Assigned To" value={ca.assigned_to} /> : null}
              <InfoRow icon="calendar" color={HUD.green} label="Opened" value={ca.opened_date ? new Date(ca.opened_date).toLocaleDateString() : '—'} />
              {ca.due_date ? <InfoRow icon="time" color={HUD.amber} label="Due Date" value={new Date(ca.due_date).toLocaleDateString()} /> : null}
              {ca.closed_date ? <InfoRow icon="checkmark-circle" color={HUD.green} label="Closed" value={new Date(ca.closed_date).toLocaleDateString()} /> : null}
            </View>

            {/* Description */}
            {ca.description ? (
              <>
                <Text style={s.sectionLbl}>DESCRIPTION</Text>
                <View style={s.textBox}>
                  <Text style={s.textBoxTxt}>{ca.description}</Text>
                </View>
              </>
            ) : null}

            {/* Root Cause */}
            {ca.root_cause ? (
              <>
                <Text style={s.sectionLbl}>ROOT CAUSE</Text>
                <View style={s.textBox}>
                  <Text style={s.textBoxTxt}>{ca.root_cause}</Text>
                </View>
              </>
            ) : null}

            {/* Corrective Action Taken */}
            {ca.corrective_action_taken ? (
              <>
                <Text style={s.sectionLbl}>CORRECTIVE ACTION TAKEN</Text>
                <View style={s.textBox}>
                  <Text style={s.textBoxTxt}>{ca.corrective_action_taken}</Text>
                </View>
              </>
            ) : null}

            {/* Preventive Action */}
            {ca.preventive_action ? (
              <>
                <Text style={s.sectionLbl}>PREVENTIVE ACTION</Text>
                <View style={s.textBox}>
                  <Text style={s.textBoxTxt}>{ca.preventive_action}</Text>
                </View>
              </>
            ) : null}

            {/* Status update */}
            {ca.status !== 'closed' && ca.status !== 'voided' && (
              <>
                <Text style={s.sectionLbl}>UPDATE STATUS</Text>
                <View style={s.segRow}>
                  {(['open', 'in_progress', 'pending_verification'] as CAStatus[]).map(st => {
                    const { color, dim } = STATUS_CONFIG[st];
                    return (
                      <TouchableOpacity key={st}
                        style={[s.seg, newStatus === st && { backgroundColor: dim, borderColor: color }]}
                        onPress={() => setNewStatus(st)}>
                        <Text style={[s.segTxt, newStatus === st && { color }]}>{STATUS_CONFIG[st].label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <FieldLabel label="UPDATE NOTES" required />
                <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  value={statusNotes} onChangeText={setStatusNotes}
                  placeholder="Describe actions taken or status change reason"
                  placeholderTextColor={HUD.textDim} multiline />
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: HUD.cyan }, submitting && { opacity: 0.5 }]}
                  onPress={handleStatusUpdate} disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator color={HUD.bg} size="small" />
                    : <><Ionicons name="refresh" size={15} color={HUD.bg} /><Text style={s.actionBtnTxt}>UPDATE STATUS</Text></>
                  }
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ── VECTOR SWABS TAB (Zone 1 only) ── */}
        {statusTab === 'vector' && isZ1 && (
          <>
            {/* Progress */}
            <View style={s.verifyCard}>
              <Text style={s.verifyCardTitle}>CONSECUTIVE NEGATIVES REQUIRED</Text>
              <View style={s.verifyDotsLarge}>
                {Array.from({ length: ca.required_negatives ?? 3 }).map((_, i) => (
                  <View key={i} style={[s.verifyDotLarge, {
                    backgroundColor: i < (ca.consecutive_negatives ?? 0) ? HUD.green : HUD.border,
                    borderColor: i < (ca.consecutive_negatives ?? 0) ? HUD.green : HUD.borderBright,
                  }]}>
                    {i < (ca.consecutive_negatives ?? 0)
                      ? <Ionicons name="checkmark" size={16} color={HUD.bg} />
                      : <Text style={s.verifyDotNum}>{i + 1}</Text>}
                  </View>
                ))}
              </View>
              <Text style={s.verifyCardSub}>
                {ca.consecutive_negatives ?? 0} of {ca.required_negatives ?? 3} consecutive negatives obtained.
                {(ca.consecutive_negatives ?? 0) >= (ca.required_negatives ?? 3)
                  ? ' ✅ Ready to close.'
                  : ' Continue vector sampling.'}
              </Text>
            </View>

            {/* Existing vector points */}
            {vectorPoints.length > 0 && (
              <>
                <Text style={s.sectionLbl}>VECTOR SWAB POINTS ({vectorPoints.length})</Text>
                {vectorPoints.map(vp => (
                  <View key={vp.id} style={s.vectorPointCard}>
                    <View style={s.vectorPointTop}>
                      <Text style={s.vectorPointName}>{vp.point_name}</Text>
                      <Text style={s.vectorPointRoom}>{vp.room}</Text>
                    </View>
                    {vp.swab_results && vp.swab_results.length > 0 ? (
                      <View style={s.vectorResultsRow}>
                        {vp.swab_results.slice(-5).map((r, i) => (
                          <View key={i} style={[s.vectorResultDot, {
                            backgroundColor: r.result === 'negative' ? HUD.green : HUD.red,
                          }]}>
                            <Text style={s.vectorResultDotTxt}>
                              {r.result === 'negative' ? '−' : '+'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={s.noResultsTxt}>No results yet — log in ATP Log</Text>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Add vector point */}
            <Text style={s.sectionLbl}>ADD VECTOR SWAB POINT</Text>
            <FieldLabel label="ROOM" required />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
              {ROOMS.filter(r => r !== 'All').map(r => (
                <TouchableOpacity key={r}
                  style={[s.filterChip, vectorRoom === r && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                  onPress={() => setVectorRoom(r)}>
                  <Text style={[s.filterChipTxt, vectorRoom === r && { color: HUD.purple }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FieldLabel label="POINT NAME / LOCATION" required />
            <TextInput style={s.input} value={vectorPointName} onChangeText={setVectorPointName}
              placeholder="e.g. PR1 Conveyor Belt Underside — Zone 1 Vector"
              placeholderTextColor={HUD.textDim} />
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: HUD.purple }, submitting && { opacity: 0.5 }]}
              onPress={handleAddVector} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={HUD.bg} size="small" />
                : <><Ionicons name="add-circle" size={15} color={HUD.bg} /><Text style={s.actionBtnTxt}>ADD VECTOR POINT</Text></>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── CLOSE CA TAB ── */}
        {statusTab === 'close' && ca.status !== 'closed' && ca.status !== 'voided' && (
          <>
            {isZ1 && (ca.consecutive_negatives ?? 0) < (ca.required_negatives ?? 3) && (
              <View style={s.closeWarning}>
                <Ionicons name="warning" size={16} color={HUD.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={s.closeWarningTitle}>ZONE 1 — VERIFICATION INCOMPLETE</Text>
                  <Text style={s.closeWarningTxt}>
                    Only {ca.consecutive_negatives ?? 0} of {ca.required_negatives ?? 3} consecutive negatives obtained.
                    Closing early requires supervisor override.
                  </Text>
                </View>
              </View>
            )}

            <FieldLabel label="CLOSED BY" required />
            <TextInput style={s.input} value={closedBy} onChangeText={setClosedBy}
              placeholder="Name + title (e.g. Jane Smith, Quality Manager)"
              placeholderTextColor={HUD.textDim} />

            <FieldLabel label="CLOSING NOTES / VERIFICATION SUMMARY" required />
            <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]}
              value={closeNotes} onChangeText={setCloseNotes}
              placeholder="Summarize corrective actions taken, verification completed, and root cause resolved"
              placeholderTextColor={HUD.textDim} multiline />

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: HUD.green }, submitting && { opacity: 0.5 }]}
              onPress={handleClose} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={HUD.bg} size="small" />
                : <><Ionicons name="checkmark-circle" size={15} color={HUD.bg} /><Text style={s.actionBtnTxt}>CLOSE CORRECTIVE ACTION</Text></>
              }
            </TouchableOpacity>
          </>
        )}

        {statusTab === 'close' && ca.status === 'closed' && (
          <View style={s.closedBox}>
            <Ionicons name="checkmark-circle" size={40} color={HUD.green} />
            <Text style={s.closedTitle}>CA CLOSED</Text>
            <Text style={s.closedSub}>
              Closed on {ca.closed_date ? new Date(ca.closed_date).toLocaleDateString() : '—'}
              {ca.closed_by ? ` by ${ca.closed_by}` : ''}
            </Text>
            {ca.close_notes ? (
              <View style={[s.textBox, { marginTop: 12, width: '100%' }]}>
                <Text style={s.textBoxTxt}>{ca.close_notes}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: HUD.textSec, width: 80 }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: HUD.text, flex: 1 }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// CREATE CA MODAL
// ─────────────────────────────────────────────
function CreateCAModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    title: string; description: string; triggerType: string;
    severity: CASeverity; room: string; zoneNumber: number | null;
    assignedTo: string; dueDate: string;
    rootCause: string; correctiveActionTaken: string; preventiveAction: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [severity, setSeverity] = useState<CASeverity>('minor');
  const [room, setRoom] = useState('PR1');
  const [zoneNumber, setZoneNumber] = useState<number | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveActionTaken, setCorrectiveActionTaken] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Description is required.'); return; }
    setSubmitting(true);
    await onSubmit({
      title: title.trim(), description: description.trim(),
      triggerType, severity, room, zoneNumber,
      assignedTo: assignedTo.trim(),
      dueDate: dueDate || '',
      rootCause: rootCause.trim(),
      correctiveActionTaken: correctiveActionTaken.trim(),
      preventiveAction: preventiveAction.trim(),
    });
    setSubmitting(false);
  };

  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.sheetLabel}>NEW CORRECTIVE ACTION</Text>
          <Text style={s.sheetTitle}>Create CA</Text>
          <Text style={s.sheetMeta}>CA number auto-generated on save</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={HUD.textSec} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          <FieldLabel label="TITLE" required />
          <TextInput style={s.input} value={title} onChangeText={setTitle}
            placeholder="Brief description of the nonconformance"
            placeholderTextColor={HUD.textDim} />

          <FieldLabel label="DESCRIPTION" required />
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={description} onChangeText={setDescription}
            placeholder="Full description of what was found"
            placeholderTextColor={HUD.textDim} multiline />

          <FieldLabel label="TRIGGER TYPE" required />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8 }}>
            {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
              <TouchableOpacity key={k}
                style={[s.filterChip, triggerType === k && { backgroundColor: HUD.amberDim, borderColor: HUD.amber }]}
                onPress={() => setTriggerType(k)}>
                <Text style={[s.filterChipTxt, triggerType === k && { color: HUD.amber }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FieldLabel label="SEVERITY" required />
          <View style={s.segRow}>
            {(['minor', 'major', 'critical'] as CASeverity[]).map(sv => {
              const { color, dim } = SEVERITY_CONFIG[sv];
              return (
                <TouchableOpacity key={sv}
                  style={[s.seg, severity === sv && { backgroundColor: dim, borderColor: color }]}
                  onPress={() => setSeverity(sv)}>
                  <Text style={[s.segTxt, severity === sv && { color }]}>{sv.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel label="ROOM" required />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8 }}>
            {ROOMS.filter(r => r !== 'All').map(r => (
              <TouchableOpacity key={r}
                style={[s.filterChip, room === r && { backgroundColor: HUD.purpleDim, borderColor: HUD.purple }]}
                onPress={() => setRoom(r)}>
                <Text style={[s.filterChipTxt, room === r && { color: HUD.purple }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FieldLabel label="ZONE (if EMP-related)" />
          <View style={s.segRow}>
            <TouchableOpacity
              style={[s.seg, zoneNumber === null && s.segActive]}
              onPress={() => setZoneNumber(null)}>
              <Text style={[s.segTxt, zoneNumber === null && s.segTxtActive]}>N/A</Text>
            </TouchableOpacity>
            {[1, 2, 3, 4].map(z => {
              const color = ZONE_COLORS[z];
              return (
                <TouchableOpacity key={z}
                  style={[s.seg, zoneNumber === z && { backgroundColor: color + '22', borderColor: color }]}
                  onPress={() => setZoneNumber(z)}>
                  <Text style={[s.segTxt, zoneNumber === z && { color }]}>ZONE {z}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel label="ASSIGNED TO" />
          <TextInput style={s.input} value={assignedTo} onChangeText={setAssignedTo}
            placeholder="Name or team responsible"
            placeholderTextColor={HUD.textDim} />

          <FieldLabel label="DUE DATE (YYYY-MM-DD)" />
          <TextInput style={s.input} value={dueDate} onChangeText={setDueDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={HUD.textDim} />

          <FieldLabel label="ROOT CAUSE" />
          <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
            value={rootCause} onChangeText={setRootCause}
            placeholder="Identified root cause (or 'Under investigation')"
            placeholderTextColor={HUD.textDim} multiline />

          <FieldLabel label="CORRECTIVE ACTION TAKEN" />
          <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
            value={correctiveActionTaken} onChangeText={setCorrectiveActionTaken}
            placeholder="Immediate corrective actions taken"
            placeholderTextColor={HUD.textDim} multiline />

          <FieldLabel label="PREVENTIVE ACTION" />
          <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
            value={preventiveAction} onChangeText={setPreventiveAction}
            placeholder="Long-term preventive measures"
            placeholderTextColor={HUD.textDim} multiline />

          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.5 }]}
            onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={HUD.bg} size="small" />
              : <><Ionicons name="save-outline" size={18} color={HUD.bg} /><Text style={s.submitTxt}>CREATE CORRECTIVE ACTION</Text></>
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
export default function CorrectiveActionsScreen() {
  const {
    correctiveActions, vectorPoints, loading,
    fetchCorrectiveActions, fetchVectorSwabPoints,
    createCorrectiveAction, updateCAStatus, addVectorSwabPoint, closeCorrectiveAction,
    CA_STATUS_COLORS, CA_SEVERITY_COLORS,
  } = useSanitationCA();

  const [viewMode, setViewMode] = useState<'open' | 'all' | 'closed'>('open');
  const [roomFilter, setRoomFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedCA, setSelectedCA] = useState<SanitationCorrectiveAction | null>(null);

  useEffect(() => { loadData(); }, [viewMode, roomFilter]);

  const loadData = useCallback(async () => {
    await fetchCorrectiveActions();
    if (selectedCA) await fetchVectorSwabPoints(selectedCA.id);
  }, [selectedCA]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openDetail = async (ca: SanitationCorrectiveAction) => {
    setSelectedCA(ca);
    await fetchVectorSwabPoints(ca.id);
    setDetailModal(true);
  };

  const handleCreate = async (data: Parameters<typeof createCorrectiveAction>[0]) => {
    try {
      const ca = await createCorrectiveAction({
        title: data.title,
        description: data.description,
        trigger_type: data.triggerType,
        severity: data.severity,
        room: data.room,
        zone_number: data.zoneNumber ?? undefined,
        assigned_to: data.assignedTo || undefined,
        due_date: data.dueDate || undefined,
        root_cause: data.rootCause || undefined,
        corrective_action_taken: data.correctiveActionTaken || undefined,
        preventive_action: data.preventiveAction || undefined,
      });
      if (ca) {
        setCreateModal(false);
        Alert.alert('✅ Created', `CA ${ca.ca_number} created.`);
        await loadData();
      }
    } catch {
      Alert.alert('Error', 'Failed to create corrective action.');
    }
  };

  const handleStatusUpdate = async (status: CAStatus, notes: string) => {
    if (!selectedCA) return;
    try {
      await updateCAStatus({ id: selectedCA.id, status, notes });
      Alert.alert('Updated', `CA updated to ${STATUS_CONFIG[status].label}.`);
      setDetailModal(false);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleAddVector = async (data: { newPointName?: string; room: string }) => {
    if (!selectedCA) return;
    try {
      await addVectorSwabPoint({
        ca_id: selectedCA.id,
        point_name: data.newPointName ?? 'Vector Point',
        room: data.room,
        zone_number: selectedCA.zone_number ?? 1,
      });
      Alert.alert('Added', 'Vector swab point added.');
      await fetchVectorSwabPoints(selectedCA.id);
    } catch {
      Alert.alert('Error', 'Failed to add vector swab point.');
    }
  };

  const handleCloseCA = async (closedBy: string, notes: string) => {
    if (!selectedCA) return;
    try {
      await closeCorrectiveAction({ id: selectedCA.id, closed_by: closedBy, close_notes: notes });
      Alert.alert('✅ Closed', `CA ${selectedCA.ca_number} has been closed.`);
      setDetailModal(false);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to close corrective action.');
    }
  };

  // Filter
  const filteredCAs = useMemo(() => {
    let list = correctiveActions;
    if (roomFilter !== 'All') list = list.filter(ca => ca.room === roomFilter);
    if (viewMode === 'open') list = list.filter(ca => ca.status === 'open' || ca.status === 'in_progress' || ca.status === 'pending_verification');
    if (viewMode === 'closed') list = list.filter(ca => ca.status === 'closed' || ca.status === 'voided');
    return list;
  }, [correctiveActions, roomFilter, viewMode]);

  // Stats
  const stats = useMemo(() => ({
    open: correctiveActions.filter(ca => ca.status === 'open').length,
    inProgress: correctiveActions.filter(ca => ca.status === 'in_progress').length,
    pendingVerify: correctiveActions.filter(ca => ca.status === 'pending_verification').length,
    closed: correctiveActions.filter(ca => ca.status === 'closed').length,
    critical: correctiveActions.filter(ca => ca.severity === 'critical' && ca.status !== 'closed').length,
    z1Open: correctiveActions.filter(ca => ca.zone_number === 1 && (ca.status === 'open' || ca.status === 'in_progress')).length,
  }), [correctiveActions]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={HUD.cyan} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>SANITATION / EMP</Text>
          <Text style={s.headerTitle}>Corrective Actions</Text>
        </View>
        <TouchableOpacity style={s.logBtn} onPress={() => setCreateModal(true)}>
          <Ionicons name="add" size={16} color={HUD.bg} />
          <Text style={s.logBtnTxt}>NEW CA</Text>
        </TouchableOpacity>
      </View>

      {/* ── STAT STRIP ── */}
      <View style={s.statStrip}>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.red }]}>{stats.open}</Text>
          <Text style={s.statLbl}>OPEN</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.amber }]}>{stats.inProgress}</Text>
          <Text style={s.statLbl}>IN PROG</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.cyan }]}>{stats.pendingVerify}</Text>
          <Text style={s.statLbl}>VERIFY</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: HUD.green }]}>{stats.closed}</Text>
          <Text style={s.statLbl}>CLOSED</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: stats.critical > 0 ? HUD.red : HUD.textDim }]}>
            {stats.critical}
          </Text>
          <Text style={s.statLbl}>CRITICAL</Text>
        </View>
      </View>

      {/* Zone 1 alert */}
      {stats.z1Open > 0 && (
        <View style={s.z1AlertStrip}>
          <Ionicons name="alert-circle" size={14} color={HUD.bg} />
          <Text style={s.z1AlertTxt}>
            {stats.z1Open} ZONE 1 CA{stats.z1Open > 1 ? 's' : ''} OPEN — PRODUCTION IMPACT
          </Text>
        </View>
      )}

      {/* ── TABS ── */}
      <View style={s.tabRow}>
        {([
          { k: 'open', l: 'OPEN', icon: 'alert-circle-outline' },
          { k: 'all', l: 'ALL CAs', icon: 'list-outline' },
          { k: 'closed', l: 'CLOSED', icon: 'checkmark-circle-outline' },
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
          <Text style={s.loadingTxt}>LOADING CORRECTIVE ACTIONS...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD.cyan} />}>
          {filteredCAs.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name={viewMode === 'open' ? 'checkmark-circle' : 'list'}
                size={48}
                color={viewMode === 'open' ? HUD.green : HUD.textDim} />
              <Text style={[s.emptyTitle, { color: viewMode === 'open' ? HUD.green : HUD.textDim }]}>
                {viewMode === 'open' ? 'NO OPEN CAs' : 'NO RESULTS'}
              </Text>
              <Text style={s.emptySub}>
                {viewMode === 'open' ? 'No open corrective actions. Great work.' : 'No corrective actions match this filter.'}
              </Text>
            </View>
          ) : (
            filteredCAs.map(ca => (
              <CACard key={ca.id} ca={ca} onPress={() => openDetail(ca)} />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── CREATE MODAL ── */}
      <Modal visible={createModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <CreateCAModal onClose={() => setCreateModal(false)} onSubmit={handleCreate as any} />
        </View>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal visible={detailModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {selectedCA && (
            <CADetailModal
              ca={selectedCA}
              vectorPoints={vectorPoints}
              onClose={() => setDetailModal(false)}
              onUpdateStatus={handleStatusUpdate}
              onAddVectorSwab={handleAddVector}
              onClose_CA={handleCloseCA}
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
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: HUD.red, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  logBtnTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },

  statStrip: { flexDirection: 'row', backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  statLbl: { fontSize: 8, fontWeight: '600', color: HUD.textDim, letterSpacing: 1.5, marginTop: 1 },
  statDiv: { width: 1, backgroundColor: HUD.border, marginVertical: 8 },

  z1AlertStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD.red, paddingHorizontal: 16, paddingVertical: 8 },
  z1AlertTxt: { fontSize: 11, fontWeight: '800', color: HUD.bg, letterSpacing: 0.5 },

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

  // CA Card
  caCard: { backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, borderLeftWidth: 3, marginBottom: 12, overflow: 'hidden' },
  z1Banner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: HUD.red, padding: 7, paddingHorizontal: 12 },
  z1BannerTxt: { fontSize: 10, fontWeight: '800', color: HUD.bg, letterSpacing: 0.5 },
  caCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, paddingBottom: 6, flexWrap: 'wrap' },
  caNumber: { fontSize: 11, fontWeight: '800', color: HUD.cyan, letterSpacing: 1, marginRight: 2 },
  caTitle: { fontSize: 14, fontWeight: '700', color: HUD.text, paddingHorizontal: 12, paddingBottom: 6 },
  caMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  caMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caMetaTxt: { fontSize: 11, color: HUD.textSec },
  caFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: HUD.border, paddingHorizontal: 12, paddingVertical: 8 },
  caDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  caDateTxt: { fontSize: 11, color: HUD.textSec },
  caAgeTxt: { fontSize: 11, fontWeight: '700', marginLeft: 6 },
  verifyProgress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifyProgressTxt: { fontSize: 10, color: HUD.textSec },
  verifyDots: { flexDirection: 'row', gap: 4 },
  verifyDot: { width: 10, height: 10, borderRadius: 5 },

  // Badges
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  zoneBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  zoneBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  emptySub: { fontSize: 13, color: HUD.textSec, textAlign: 'center', paddingHorizontal: 30 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: HUD.borderBright, maxHeight: '94%', flex: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: HUD.border },
  sheetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 4, color: HUD.cyan },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: HUD.text, marginBottom: 4 },
  sheetMeta: { fontSize: 11, color: HUD.textSec },
  closeBtn: { padding: 4, marginLeft: 12 },

  subTabRow: { flexDirection: 'row', backgroundColor: HUD.bgCardAlt, borderBottomWidth: 1, borderBottomColor: HUD.border },
  subTab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: HUD.cyan },
  subTabTxt: { fontSize: 9, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.8 },
  subTabTxtActive: { color: HUD.cyan },

  infoBox: { backgroundColor: HUD.bgCardAlt, borderRadius: 10, borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 16 },
  sectionLbl: { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  textBox: { backgroundColor: HUD.bgCardAlt, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 12 },
  textBoxTxt: { fontSize: 13, color: HUD.text, lineHeight: 20 },

  verifyCard: { backgroundColor: HUD.bgCardAlt, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, padding: 16, alignItems: 'center', gap: 12, marginBottom: 16 },
  verifyCardTitle: { fontSize: 10, fontWeight: '800', color: HUD.textSec, letterSpacing: 2 },
  verifyDotsLarge: { flexDirection: 'row', gap: 12 },
  verifyDotLarge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  verifyDotNum: { fontSize: 16, fontWeight: '800', color: HUD.textDim },
  verifyCardSub: { fontSize: 12, color: HUD.textSec, textAlign: 'center' },

  vectorPointCard: { backgroundColor: HUD.bgCardAlt, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, padding: 12, marginBottom: 8 },
  vectorPointTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  vectorPointName: { fontSize: 13, fontWeight: '700', color: HUD.text, flex: 1 },
  vectorPointRoom: { fontSize: 10, fontWeight: '700', color: HUD.purple },
  vectorResultsRow: { flexDirection: 'row', gap: 6 },
  vectorResultDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  vectorResultDotTxt: { fontSize: 14, fontWeight: '800', color: HUD.bg },
  noResultsTxt: { fontSize: 11, color: HUD.textDim, fontStyle: 'italic' },

  closeWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: HUD.amberDim, borderWidth: 1, borderColor: HUD.amber + '55', borderRadius: 10, padding: 14, marginBottom: 16 },
  closeWarningTitle: { fontSize: 11, fontWeight: '800', color: HUD.amber, letterSpacing: 0.5, marginBottom: 4 },
  closeWarningTxt: { fontSize: 11, color: HUD.amber + 'cc', lineHeight: 16 },
  closedBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  closedTitle: { fontSize: 18, fontWeight: '800', color: HUD.green, letterSpacing: 2 },
  closedSub: { fontSize: 12, color: HUD.textSec },

  // Form
  fieldLabel: { fontSize: 9, fontWeight: '700', color: HUD.textSec, letterSpacing: 1.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: HUD.bgCardAlt, borderWidth: 1, borderColor: HUD.borderBright, borderRadius: 8, padding: 12, color: HUD.text, fontSize: 14 },
  segRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bgCardAlt },
  segActive: { backgroundColor: HUD.cyanDim, borderColor: HUD.cyan },
  segTxt: { fontSize: 11, fontWeight: '700', color: HUD.textDim },
  segTxtActive: { color: HUD.cyan },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, padding: 14, marginTop: 16 },
  actionBtnTxt: { fontSize: 12, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: HUD.green, borderRadius: 10, padding: 16, marginTop: 24 },
  submitTxt: { fontSize: 13, fontWeight: '800', color: HUD.bg, letterSpacing: 1 },
  pathogenWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '55', borderRadius: 10, padding: 14, marginTop: 12 },
  pathogenWarnTitle: { fontSize: 11, fontWeight: '800', color: HUD.red, letterSpacing: 0.5, marginBottom: 4 },
  pathogenWarnTxt: { fontSize: 11, color: HUD.red + 'cc', lineHeight: 16 },
});
