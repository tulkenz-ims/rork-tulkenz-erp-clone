import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SectionList,
} from 'react-native';
import {
  X,
  Search,
  FileText,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  Shield,
  Droplets,
  Wrench,
  Thermometer,
  Bug,
  FlaskConical,
  Eye,
  Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { getDepartmentColor } from '@/constants/organizationCodes';
import * as Haptics from 'expo-haptics';

// ── Form definitions per department ────────────────────────────
interface FormDef {
  id: string;
  label: string;
  route: string;
  category: string;
  icon?: any;
  description?: string;
  keywords?: string[];
}

const QUALITY_FORMS: FormDef[] = [
  // Non-Conformance & Investigation
  { id: 'ncr', label: 'Non-Conformance Report (NCR)', route: '/(tabs)/quality/ncr', category: 'Non-Conformance & CAPA', icon: AlertTriangle, description: 'Document non-conforming product or process', keywords: ['ncr', 'non-conformance', 'reject', 'defect'] },
  { id: 'capa', label: 'CAPA Report', route: '/(tabs)/quality/capa', category: 'Non-Conformance & CAPA', icon: ClipboardList, description: 'Corrective and preventive action', keywords: ['capa', 'corrective', 'preventive', 'root cause'] },
  { id: 'deviation', label: 'Deviation Report', route: '/(tabs)/quality/deviation', category: 'Non-Conformance & CAPA', icon: AlertTriangle, description: 'Process or product deviation from standard', keywords: ['deviation', 'out of spec', 'variance'] },
  { id: 'disposition', label: 'Disposition Form', route: '/(tabs)/quality/disposition', category: 'Non-Conformance & CAPA', icon: ClipboardList, description: 'Determine fate of non-conforming product', keywords: ['disposition', 'hold', 'release', 'rework', 'scrap'] },
  { id: 'rootcause', label: 'Root Cause Analysis', route: '/(tabs)/quality/rootcauseanalysis', category: 'Non-Conformance & CAPA', icon: Eye, description: '5 Whys / Fishbone analysis', keywords: ['root cause', '5 whys', 'fishbone', 'investigation'] },
  { id: 'foreignmaterial', label: 'Foreign Material Investigation', route: '/(tabs)/quality/foreignmaterial', category: 'Non-Conformance & CAPA', icon: Bug, description: 'Investigate foreign material found in product', keywords: ['foreign', 'material', 'contamination', 'glass', 'metal', 'glove', 'plastic'] },
  // Daily Monitoring
  { id: 'productionlinecheck', label: 'Production Line Check', route: '/(tabs)/quality/productionlinecheck', category: 'Daily Monitoring', icon: Eye, description: 'Hourly line inspection', keywords: ['line check', 'production', 'hourly', 'inspection'] },
  { id: 'temperaturelog', label: 'Temperature Log', route: '/(tabs)/quality/temperaturelog', category: 'Daily Monitoring', icon: Thermometer, description: 'CCP temperature monitoring', keywords: ['temperature', 'temp', 'ccp', 'cold', 'hot'] },
  { id: 'ccplog', label: 'CCP Monitoring Log', route: '/(tabs)/quality/ccplog', category: 'Daily Monitoring', icon: Thermometer, description: 'Critical control point monitoring', keywords: ['ccp', 'critical control', 'haccp'] },
  { id: 'metaldetectorlog', label: 'Metal Detector Log', route: '/(tabs)/quality/metaldetectorlog', category: 'Daily Monitoring', icon: Shield, description: 'Metal detector checks and rejects', keywords: ['metal', 'detector', 'reject', 'hit', 'x-ray'] },
  { id: 'preopinspection', label: 'Pre-Op Inspection', route: '/(tabs)/quality/preopinspection', category: 'Daily Monitoring', icon: Eye, description: 'Pre-operational sanitation inspection', keywords: ['pre-op', 'sanitation', 'inspection', 'startup'] },
  { id: 'cookingtemplog', label: 'Cooking Temp Log', route: '/(tabs)/quality/cookingtemplog', category: 'Daily Monitoring', icon: Thermometer, keywords: ['cooking', 'temperature', 'oven'] },
  { id: 'coolingtemplog', label: 'Cooling Temp Log', route: '/(tabs)/quality/coolingtemplog', category: 'Daily Monitoring', icon: Thermometer, keywords: ['cooling', 'temperature', 'chill'] },
  // Customer & Supplier
  { id: 'customercomplaint', label: 'Customer Complaint', route: '/(tabs)/quality/customercomplaint', category: 'Customer & Supplier', icon: AlertTriangle, description: 'Log and investigate customer complaint', keywords: ['customer', 'complaint', 'consumer'] },
  { id: 'consumerinvestigation', label: 'Consumer Investigation', route: '/(tabs)/quality/consumerinvestigation', category: 'Customer & Supplier', icon: Eye, keywords: ['consumer', 'investigation'] },
  // Environmental
  { id: 'atplog', label: 'ATP Swab Log', route: '/(tabs)/quality/atplog', category: 'Environmental Monitoring', icon: FlaskConical, description: 'ATP surface testing results', keywords: ['atp', 'swab', 'surface', 'test'] },
  { id: 'envswablog', label: 'Environmental Swab Log', route: '/(tabs)/quality/envswablog', category: 'Environmental Monitoring', icon: FlaskConical, keywords: ['environmental', 'swab', 'listeria'] },
  // Hygiene & Allergen
  { id: 'employeehygiene', label: 'Employee Hygiene Check', route: '/(tabs)/quality/employeehygiene', category: 'Hygiene & Allergen', icon: Eye, keywords: ['hygiene', 'employee', 'gmp'] },
  { id: 'allergenchangeover', label: 'Allergen Changeover', route: '/(tabs)/quality/allergenchangeover', category: 'Hygiene & Allergen', icon: AlertTriangle, keywords: ['allergen', 'changeover', 'cleaning'] },
  // Traceability
  { id: 'holdrelease', label: 'Hold & Release', route: '/(tabs)/quality/holdrelease', category: 'Hold & Traceability', icon: Shield, description: 'Place product on hold or release', keywords: ['hold', 'release', 'quarantine'] },
  { id: 'batchlotrecord', label: 'Batch/Lot Record', route: '/(tabs)/quality/batchlotrecord', category: 'Hold & Traceability', icon: ClipboardList, keywords: ['batch', 'lot', 'traceability'] },
];

const SAFETY_FORMS: FormDef[] = [
  { id: 'accidentinvestigation', label: 'Accident Investigation', route: '/(tabs)/safety/accidentinvestigation', category: 'Incident & Investigation', icon: AlertTriangle, description: 'Full accident investigation report', keywords: ['accident', 'injury', 'investigation', 'cut', 'fall'] },
  { id: 'firstaid', label: 'First Aid Log', route: '/(tabs)/safety/firstaid', category: 'Incident & Investigation', icon: Shield, description: 'First aid administered', keywords: ['first aid', 'bandage', 'injury', 'cut', 'burn'] },
  { id: 'nearmiss', label: 'Near Miss Report', route: '/(tabs)/safety/nearmiss', category: 'Incident & Investigation', icon: AlertTriangle, description: 'Close call that could have caused injury', keywords: ['near miss', 'close call', 'hazard'] },
  { id: 'incidentreport', label: 'Incident Report', route: '/(tabs)/safety/incidentreport', category: 'Incident & Investigation', icon: AlertTriangle, description: 'General incident documentation', keywords: ['incident', 'event', 'report'] },
  { id: 'injuryillness', label: 'Injury/Illness Log', route: '/(tabs)/safety/injuryillnesslog', category: 'Incident & Investigation', icon: AlertTriangle, keywords: ['injury', 'illness', 'osha', 'recordable'] },
  { id: 'hazardid', label: 'Hazard Identification', route: '/(tabs)/safety/hazardid', category: 'Hazard Management', icon: Eye, description: 'Identify and report hazards', keywords: ['hazard', 'identify', 'risk'] },
  { id: 'jsa', label: 'Job Safety Analysis', route: '/(tabs)/safety/jsa', category: 'Hazard Management', icon: ClipboardList, description: 'Analyze job for safety risks', keywords: ['jsa', 'job safety', 'analysis', 'task'] },
  { id: 'loto', label: 'LOTO Procedure', route: '/(tabs)/safety/loto', category: 'Equipment Safety', icon: Shield, description: 'Lockout/Tagout procedure', keywords: ['loto', 'lockout', 'tagout', 'energy'] },
  { id: 'confinedspace', label: 'Confined Space Permit', route: '/(tabs)/safety/confinedspace', category: 'Equipment Safety', icon: Shield, keywords: ['confined', 'space', 'permit', 'entry'] },
  { id: 'hotwork', label: 'Hot Work Permit', route: '/(tabs)/safety/hotwork', category: 'Equipment Safety', icon: Shield, keywords: ['hot work', 'welding', 'cutting', 'permit'] },
  { id: 'ppeinspection', label: 'PPE Inspection', route: '/(tabs)/safety/ppeinspection', category: 'PPE & Training', icon: Eye, keywords: ['ppe', 'inspection', 'gloves', 'goggles'] },
  { id: 'safetytraining', label: 'Safety Training Record', route: '/(tabs)/safety/safetytraining', category: 'PPE & Training', icon: ClipboardList, keywords: ['training', 'record', 'certification'] },
];

const SANITATION_FORMS: FormDef[] = [
  { id: 'dailytasks', label: 'Daily Sanitation Tasks', route: '/(tabs)/sanitation/dailytasks', category: 'Daily Operations', icon: ClipboardList, description: 'Daily cleaning checklist', keywords: ['daily', 'cleaning', 'checklist'] },
  { id: 'deepclean', label: 'Deep Clean Report', route: '/(tabs)/sanitation/deepclean', category: 'Daily Operations', icon: Droplets, description: 'Deep cleaning documentation', keywords: ['deep clean', 'intensive', 'teardown'] },
  { id: 'preopverification', label: 'Pre-Op Verification', route: '/(tabs)/sanitation/preopverification', category: 'Daily Operations', icon: Eye, keywords: ['pre-op', 'verification', 'startup'] },
  { id: 'equipmentcleaning', label: 'Equipment Cleaning Log', route: '/(tabs)/sanitation/equipmentcleaning', category: 'Equipment', icon: Wrench, description: 'Equipment-specific cleaning log', keywords: ['equipment', 'cleaning', 'machine'] },
  { id: 'cipcleaning', label: 'CIP Cleaning Record', route: '/(tabs)/sanitation/cipcleaning', category: 'Equipment', icon: Droplets, description: 'Clean-in-Place documentation', keywords: ['cip', 'clean in place', 'rinse'] },
  { id: 'chemicals', label: 'Chemical Usage Log', route: '/(tabs)/sanitation/chemicals', category: 'Chemicals', icon: FlaskConical, description: 'Chemical mixing and application', keywords: ['chemical', 'mixing', 'concentration', 'dilution'] },
  { id: 'spillcleanup', label: 'Spill Cleanup Report', route: '/(tabs)/sanitation/spillcleanup', category: 'Incident', icon: AlertTriangle, description: 'Document spill and cleanup', keywords: ['spill', 'cleanup', 'contamination'] },
  { id: 'wastemgmt', label: 'Waste Management Log', route: '/(tabs)/sanitation/wastemgmt', category: 'Waste', icon: ClipboardList, keywords: ['waste', 'trash', 'disposal'] },
  { id: 'restroom', label: 'Restroom Cleaning Log', route: '/(tabs)/sanitation/restroom', category: 'Facility', icon: ClipboardList, keywords: ['restroom', 'bathroom', 'cleaning'] },
  { id: 'floorinspection', label: 'Floor Inspection', route: '/(tabs)/sanitation/floorinspection', category: 'Facility', icon: Eye, keywords: ['floor', 'inspection', 'drain'] },
];

const MAINTENANCE_FORMS: FormDef[] = [
  { id: 'emergencywo', label: 'Emergency Work Order', route: '/(tabs)/cmms/emergencywo', category: 'Work Orders', icon: AlertTriangle, description: 'Create emergency work order', keywords: ['emergency', 'work order', 'urgent', 'breakdown'] },
  { id: 'correctivemo', label: 'Corrective Maintenance', route: '/(tabs)/cmms/correctivemo', category: 'Work Orders', icon: Wrench, description: 'Corrective maintenance order', keywords: ['corrective', 'repair', 'fix'] },
  { id: 'downtime', label: 'Downtime Report', route: '/(tabs)/cmms/downtime', category: 'Reporting', icon: AlertTriangle, description: 'Equipment downtime documentation', keywords: ['downtime', 'breakdown', 'stopped'] },
  { id: 'conditionmonitoring', label: 'Condition Monitoring', route: '/(tabs)/cmms/conditionmonitoring', category: 'Monitoring', icon: Eye, description: 'Equipment condition assessment', keywords: ['condition', 'monitoring', 'vibration', 'noise'] },
  { id: 'failurereport', label: 'Failure Report', route: '/(tabs)/cmms/failurereport', category: 'Reporting', icon: AlertTriangle, description: 'Equipment failure analysis', keywords: ['failure', 'analysis', 'breakdown', 'root cause'] },
];

const DEPARTMENT_FORM_MAP: Record<string, FormDef[]> = {
  '1001': MAINTENANCE_FORMS,
  '1002': SANITATION_FORMS,
  '1003': QUALITY_FORMS, // Production uses quality forms for their checks
  '1004': QUALITY_FORMS,
  '1005': SAFETY_FORMS,
};

// ── Component ──────────────────────────────────────────────────
interface FormPickerModalProps {
  visible: boolean;
  onClose: () => void;
  departmentCode: string;
  departmentName: string;
  taskPostNumber?: string;
  templateName?: string;
  onFormSelected: (form: { id: string; label: string; route: string }) => void;
}

export default function FormPickerModal({
  visible,
  onClose,
  departmentCode,
  departmentName,
  taskPostNumber,
  templateName,
  onFormSelected,
}: FormPickerModalProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const deptColor = getDepartmentColor(departmentCode) || '#6B7280';

  const forms = useMemo(() => DEPARTMENT_FORM_MAP[departmentCode] || QUALITY_FORMS, [departmentCode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return forms;
    const q = search.toLowerCase();
    return forms.filter(f =>
      f.label.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q) ||
      f.keywords?.some(k => k.includes(q))
    );
  }, [forms, search]);

  // Group into sections
  const sections = useMemo(() => {
    const grouped = new Map<string, FormDef[]>();
    for (const form of filtered) {
      const existing = grouped.get(form.category) || [];
      existing.push(form);
      grouped.set(form.category, existing);
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
  }, [filtered]);

  // Smart suggestion based on template name
  const suggestedForms = useMemo(() => {
    if (!templateName) return [];
    const t = templateName.toLowerCase();
    return forms.filter(f => {
      if (t.includes('glove') || t.includes('foreign')) {
        return ['foreignmaterial', 'ncr', 'deviation', 'holdrelease'].includes(f.id);
      }
      if (t.includes('cut') || t.includes('injury') || t.includes('blood')) {
        return ['accidentinvestigation', 'firstaid', 'incidentreport'].includes(f.id);
      }
      if (t.includes('metal') || t.includes('detector')) {
        return ['metaldetectorlog', 'foreignmaterial', 'ncr'].includes(f.id);
      }
      if (t.includes('spill') || t.includes('chemical')) {
        return ['spillcleanup', 'chemicals', 'hazardid'].includes(f.id);
      }
      if (t.includes('temperature') || t.includes('temp')) {
        return ['temperaturelog', 'ccplog', 'deviation'].includes(f.id);
      }
      return false;
    }).slice(0, 3);
  }, [templateName, forms]);

  const handleSelect = (form: FormDef) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearch('');
    onFormSelected({ id: form.id, label: form.label, route: form.route });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <FileText size={18} color={deptColor} />
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Select Form</Text>
                {taskPostNumber && (
                  <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                    for {taskPostNumber}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Department badge */}
          <View style={styles.deptRow}>
            <View style={[styles.deptBadge, { backgroundColor: deptColor + '20', borderColor: deptColor }]}>
              <Text style={[styles.deptBadgeText, { color: deptColor }]}>{departmentName}</Text>
            </View>
            <Text style={[styles.formCount, { color: colors.textSecondary }]}>
              {forms.length} forms available
            </Text>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search forms..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Suggested forms */}
          {suggestedForms.length > 0 && !search && (
            <View style={styles.suggestedSection}>
              <View style={styles.suggestedHeader}>
                <Star size={14} color="#F59E0B" />
                <Text style={[styles.suggestedTitle, { color: '#F59E0B' }]}>Suggested for this issue</Text>
              </View>
              {suggestedForms.map(form => {
                const Icon = form.icon || FileText;
                return (
                  <TouchableOpacity
                    key={`suggested-${form.id}`}
                    style={[styles.suggestedItem, { backgroundColor: '#F59E0B' + '10', borderColor: '#F59E0B' + '40' }]}
                    onPress={() => handleSelect(form)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.formIcon, { backgroundColor: '#F59E0B' + '25' }]}>
                      <Icon size={14} color="#F59E0B" />
                    </View>
                    <View style={styles.formInfo}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>{form.label}</Text>
                      {form.description && (
                        <Text style={[styles.formDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                          {form.description}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color="#F59E0B" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Form list */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {sections.length === 0 ? (
              <View style={styles.emptyState}>
                <Search size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No forms match "{search}"
                </Text>
              </View>
            ) : (
              sections.map(section => (
                <View key={section.title} style={styles.sectionContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {section.title.toUpperCase()}
                  </Text>
                  {section.data.map(form => {
                    const Icon = form.icon || FileText;
                    return (
                      <TouchableOpacity
                        key={form.id}
                        style={[styles.formItem, { borderBottomColor: colors.border }]}
                        onPress={() => handleSelect(form)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.formIcon, { backgroundColor: deptColor + '15' }]}>
                          <Icon size={14} color={deptColor} />
                        </View>
                        <View style={styles.formInfo}>
                          <Text style={[styles.formLabel, { color: colors.text }]}>{form.label}</Text>
                          {form.description && (
                            <Text style={[styles.formDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                              {form.description}
                            </Text>
                          )}
                        </View>
                        <ChevronRight size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Skip option */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>
                Complete without form
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Exports for external use ──────────────────────────────────
export { QUALITY_FORMS, SAFETY_FORMS, SANITATION_FORMS, MAINTENANCE_FORMS, DEPARTMENT_FORM_MAP };
export type { FormDef };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  deptBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  deptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formCount: {
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  suggestedSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  suggestedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  formIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formInfo: {
    flex: 1,
    gap: 2,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  formDesc: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
