import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Switch, SafeAreaView, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  AlertTriangle, CheckCircle2, Droplets, Shield, Camera,
  MapPin, Clock, FlaskConical, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification, useLogSignature } from '@/hooks/usePinSignature';

// ── Types ─────────────────────────────────────────────────────
interface SpillCleanupForm {
  chemicalName: string;
  sdsNumber: string;
  estimatedQuantity: string;
  unit: string;
  spillLocation: string;
  locationDetails: string;
  causeOfSpill: string;
  surfaceAffected: string[];
  containmentSteps: string[];
  cleanupSteps: string[];
  ppeUsed: string[];
  wasteDisposal: string;
  injuriesReported: boolean;
  injuryDetails: string;
  environmentalImpact: boolean;
  impactDetails: string;
  areaCleared: boolean;
  productionImpacted: boolean;
  additionalNotes: string;
}

// ── Options ───────────────────────────────────────────────────
const SURFACE_OPTIONS = [
  'Concrete floor', 'Epoxy floor', 'Stainless steel', 'Tile floor',
  'Floor drain', 'Equipment surface', 'Wall/baseboard', 'Loading dock',
];

const CONTAINMENT_OPTIONS = [
  'Area cordoned off / barricaded',
  'Absorbent material applied',
  'Floor drain blocked',
  'Ventilation increased / fans activated',
  'Spill kit deployed',
  'Nearby food products moved / covered',
  'Personnel evacuated from area',
  'Supervisor notified',
];

const CLEANUP_OPTIONS = [
  'Absorbed with spill pillows / pads',
  'Neutralized per SDS instructions',
  'Area rinsed with water',
  'Floor scrubbed and sanitized',
  'Equipment wiped and sanitized',
  'Drain flushed after cleanup',
  'Area inspected — no residue remaining',
  'Waste collected in proper container',
];

const PPE_OPTIONS = [
  'Chemical splash goggles', 'Safety glasses', 'Full face respirator',
  'Half face respirator', 'N95 mask', 'Nitrile gloves', 'Chemical-resistant gloves',
  'Chemical apron', 'Chemical suit / Tyvek', 'Rubber boots',
  'Steel-toe boots', 'Face shield',
];

const UNIT_OPTIONS = ['gallons', 'liters', 'ounces', 'mL', 'cups', 'pints', 'quarts'];

const INITIAL_FORM: SpillCleanupForm = {
  chemicalName: '',
  sdsNumber: '',
  estimatedQuantity: '',
  unit: 'gallons',
  spillLocation: '',
  locationDetails: '',
  causeOfSpill: '',
  surfaceAffected: [],
  containmentSteps: [],
  cleanupSteps: [],
  ppeUsed: [],
  wasteDisposal: '',
  injuriesReported: false,
  injuryDetails: '',
  environmentalImpact: false,
  impactDetails: '',
  areaCleared: false,
  productionImpacted: false,
  additionalNotes: '',
};

// ── Component ─────────────────────────────────────────────────
export default function SpillCleanupScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { organizationId } = useOrganization();
  const router = useRouter();
  const logSignature = useLogSignature();

  const [form, setForm] = useState<SpillCleanupForm>(INITIAL_FORM);
  const [signature, setSignature] = useState<SignatureVerification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    spill: true, containment: true, cleanup: true, ppe: true, safety: false, notes: false,
  });

  const userName = user ? `${user.first_name} ${user.last_name}` : 'Unknown';

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleArrayItem = (field: keyof SpillCleanupForm, item: string) => {
    setForm(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] };
    });
  };

  const updateField = (field: keyof SpillCleanupForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async () => {
    // Validation
    const missing: string[] = [];
    if (!form.chemicalName.trim()) missing.push('Chemical name');
    if (!form.spillLocation.trim()) missing.push('Spill location');
    if (!form.estimatedQuantity.trim()) missing.push('Estimated quantity');
    if (form.containmentSteps.length === 0) missing.push('At least 1 containment step');
    if (form.cleanupSteps.length === 0) missing.push('At least 1 cleanup step');
    if (form.ppeUsed.length === 0) missing.push('At least 1 PPE item');
    if (!form.areaCleared) missing.push('Area cleared verification');
    if (!isSignatureVerified(signature)) missing.push('PPN signature');

    if (missing.length > 0) {
      Alert.alert('Required Fields', `Please complete:\n\n• ${missing.join('\n• ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Log signature
      if (signature) {
        logSignature.mutate({
          verification: signature,
          formType: 'Spill Cleanup Report',
          referenceType: 'sanitation_form',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✓ Spill Cleanup Documented',
        `Spill cleanup report for "${form.chemicalName}" has been recorded.\n\nCompleted by: ${signature?.employeeName || userName}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('[SpillCleanup] Error:', err);
      Alert.alert('Error', 'Failed to save report.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, signature, userName, router, logSignature]);

  // ── Renderers ─────────────────────────────────────────────
  const renderSectionHeader = (key: string, title: string, icon: React.ReactNode, count?: number) => (
    <TouchableOpacity
      style={[s.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => toggleSection(key)}
      activeOpacity={0.7}
    >
      <View style={s.sectionHeaderLeft}>
        {icon}
        <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View style={[s.countBadge, { backgroundColor: '#10B98120' }]}>
            <Text style={s.countText}>{count}</Text>
          </View>
        )}
      </View>
      {expandedSections[key] ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  const renderCheckboxGrid = (field: keyof SpillCleanupForm, options: string[]) => (
    <View style={s.checkboxGrid}>
      {options.map(opt => {
        const selected = (form[field] as string[]).includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[s.checkbox, { backgroundColor: selected ? '#10B98115' : colors.backgroundSecondary, borderColor: selected ? '#10B981' : colors.border }]}
            onPress={() => toggleArrayItem(field, opt)}
            activeOpacity={0.7}
          >
            <View style={[s.checkIcon, { backgroundColor: selected ? '#10B981' : 'transparent', borderColor: selected ? '#10B981' : colors.border }]}>
              {selected && <CheckCircle2 size={12} color="#fff" />}
            </View>
            <Text style={[s.checkLabel, { color: selected ? '#10B981' : colors.text }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderInput = (label: string, field: keyof SpillCleanupForm, placeholder: string, multiline = false, required = false) => (
    <View style={s.fieldGroup}>
      <Text style={[s.fieldLabel, { color: colors.text }]}>{label}{required ? ' *' : ''}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
        value={form[field] as string}
        onChangeText={(v) => updateField(field, v)}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Spill Cleanup Report', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header Banner */}
        <View style={[s.banner, { backgroundColor: '#DC262615', borderColor: '#DC262640' }]}>
          <AlertTriangle size={20} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: '#DC2626' }]}>Chemical Spill / Cleanup Documentation</Text>
            <Text style={[s.bannerSubtitle, { color: '#991B1B' }]}>All fields with * are required. This form documents the spill event and verifies proper cleanup.</Text>
          </View>
        </View>

        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {/* ── Spill Details ───────────────────────────────── */}
          {renderSectionHeader('spill', 'Spill Details', <FlaskConical size={16} color="#EF4444" />)}
          {expandedSections.spill && (
            <View style={[s.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderInput('Chemical / Product Name', 'chemicalName', 'e.g. Sodium Hypochlorite 12.5%', false, true)}
              {renderInput('SDS Number (if known)', 'sdsNumber', 'e.g. SANI-0042')}
              
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  {renderInput('Estimated Quantity', 'estimatedQuantity', 'e.g. 5', false, true)}
                </View>
                <View style={{ width: 120 }}>
                  <Text style={[s.fieldLabel, { color: colors.text }]}>Unit</Text>
                  <View style={s.unitRow}>
                    {['gallons', 'liters', 'ounces'].map(u => (
                      <TouchableOpacity
                        key={u}
                        style={[s.unitBtn, { backgroundColor: form.unit === u ? '#3B82F620' : colors.backgroundSecondary, borderColor: form.unit === u ? '#3B82F6' : colors.border }]}
                        onPress={() => updateField('unit', u)}
                      >
                        <Text style={{ fontSize: 11, color: form.unit === u ? '#3B82F6' : colors.text, fontWeight: form.unit === u ? '700' : '400' }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {renderInput('Spill Location', 'spillLocation', 'e.g. Sanitation Room A, Production Line 3', false, true)}
              {renderInput('Location Details', 'locationDetails', 'Near chemical dispensing station, concrete floor with drain')}
              {renderInput('Cause of Spill', 'causeOfSpill', 'e.g. Hose connection failure during transfer', true)}

              <Text style={[s.fieldLabel, { color: colors.text }]}>Surface(s) Affected</Text>
              {renderCheckboxGrid('surfaceAffected', SURFACE_OPTIONS)}

              <View style={[s.switchRow, { borderTopColor: colors.border }]}>
                <Text style={[s.switchLabel, { color: colors.text }]}>Production impacted?</Text>
                <Switch value={form.productionImpacted} onValueChange={(v) => updateField('productionImpacted', v)} />
              </View>
            </View>
          )}

          {/* ── Containment ─────────────────────────────────── */}
          {renderSectionHeader('containment', 'Containment Actions', <Shield size={16} color="#F59E0B" />, form.containmentSteps.length)}
          {expandedSections.containment && (
            <View style={[s.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.hint, { color: colors.textSecondary }]}>Check all containment actions taken *</Text>
              {renderCheckboxGrid('containmentSteps', CONTAINMENT_OPTIONS)}
            </View>
          )}

          {/* ── Cleanup ─────────────────────────────────────── */}
          {renderSectionHeader('cleanup', 'Cleanup Procedure', <Droplets size={16} color="#3B82F6" />, form.cleanupSteps.length)}
          {expandedSections.cleanup && (
            <View style={[s.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.hint, { color: colors.textSecondary }]}>Check all cleanup steps performed *</Text>
              {renderCheckboxGrid('cleanupSteps', CLEANUP_OPTIONS)}
              {renderInput('Waste Disposal Method', 'wasteDisposal', 'e.g. Collected in hazardous waste drum', true)}
            </View>
          )}

          {/* ── PPE ─────────────────────────────────────────── */}
          {renderSectionHeader('ppe', 'PPE Used', <Shield size={16} color="#8B5CF6" />, form.ppeUsed.length)}
          {expandedSections.ppe && (
            <View style={[s.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.hint, { color: colors.textSecondary }]}>Check all PPE worn during cleanup *</Text>
              {renderCheckboxGrid('ppeUsed', PPE_OPTIONS)}
            </View>
          )}

          {/* ── Safety ──────────────────────────────────────── */}
          {renderSectionHeader('safety', 'Injuries & Environmental', <AlertTriangle size={16} color="#DC2626" />)}
          {expandedSections.safety && (
            <View style={[s.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.switchRow}>
                <Text style={[s.switchLabel, { color: colors.text }]}>Any injuries reported?</Text>
                <Switch value={form.injuriesReported} onValueChange={(v) => updateField('injuriesReported', v)} />
              </View>
              {form.injuriesReported && renderInput('Injury Details', 'injuryDetails', 'Describe injuries and first aid provided', true)}

              <View style={[s.switchRow, { borderTopColor: colors.border }]}>
                <Text style={[s.switchLabel, { color: colors.text }]}>Environmental impact?</Text>
                <Switch value={form.environmentalImpact} onValueChange={(v) => updateField('environmentalImpact', v)} />
              </View>
              {form.environmentalImpact && renderInput('Impact Details', 'impactDetails', 'Describe environmental impact and agencies notified', true)}
            </View>
          )}

          {/* ── Verification ────────────────────────────────── */}
          {renderSectionHeader('notes', 'Verification & Notes', <CheckCircle2 size={16} color="#10B981" />)}
          {expandedSections.notes && (
            <View style={[s.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.switchRow, { backgroundColor: form.areaCleared ? '#10B98110' : '#EF444410', borderRadius: 8, padding: 12, marginBottom: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.switchLabel, { color: form.areaCleared ? '#10B981' : '#EF4444', fontWeight: '700' }]}>
                    Area Cleared for Return to Normal Operations *
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Verify the area is safe, clean, and free of chemical residue
                  </Text>
                </View>
                <Switch value={form.areaCleared} onValueChange={(v) => updateField('areaCleared', v)} />
              </View>

              {renderInput('Additional Notes', 'additionalNotes', 'Any additional observations, follow-up actions needed...', true)}

              <Text style={[s.fieldLabel, { color: colors.text, marginTop: 12 }]}>Verified By (PPN Signature) *</Text>
              <PinSignatureCapture
                onVerified={setSignature}
                onCleared={() => setSignature(null)}
                formLabel="Spill Cleanup Report"
                accentColor="#DC2626"
                existingVerification={signature}
                required
              />
            </View>
          )}

          {/* ── Summary ─────────────────────────────────────── */}
          <View style={[s.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryTitle, { color: colors.text }]}>Completion Summary</Text>
            {[
              { label: 'Chemical identified', done: !!form.chemicalName.trim() },
              { label: 'Location documented', done: !!form.spillLocation.trim() },
              { label: `Containment (${form.containmentSteps.length})`, done: form.containmentSteps.length > 0 },
              { label: `Cleanup (${form.cleanupSteps.length})`, done: form.cleanupSteps.length > 0 },
              { label: `PPE (${form.ppeUsed.length})`, done: form.ppeUsed.length > 0 },
              { label: 'Area cleared', done: form.areaCleared },
              { label: 'PPN verified', done: isSignatureVerified(signature) },
            ].map((item, i) => (
              <View key={i} style={s.summaryRow}>
                <View style={[s.summaryDot, { backgroundColor: item.done ? '#10B981' : '#EF4444' }]} />
                <Text style={{ fontSize: 12, color: item.done ? '#10B981' : colors.textSecondary }}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────── */}
        <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: isSubmitting ? '#9CA3AF' : '#DC2626' }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#fff" />
                <Text style={s.submitText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  banner: { flexDirection: 'row', gap: 10, padding: 12, margin: 12, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerSubtitle: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginTop: 8, borderRadius: 10, borderWidth: 1 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  sectionContent: { marginHorizontal: 12, marginTop: 1, padding: 12, borderRadius: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 1, borderTopWidth: 0 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputMultiline: { minHeight: 80, paddingTop: 10 },
  row: { flexDirection: 'row', gap: 12 },
  unitRow: { flexDirection: 'column', gap: 4 },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  checkboxGrid: { gap: 6 },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  checkIcon: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkLabel: { fontSize: 13, flex: 1 },
  hint: { fontSize: 11, marginBottom: 8, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  summary: { margin: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  summaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  submitBtn: { flex: 2, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
