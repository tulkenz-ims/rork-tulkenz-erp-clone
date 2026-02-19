import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal,
  Alert, ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin, Plus, X, Edit2, Trash2, Building2, DoorOpen, Square,
  Activity, Grid3x3, Monitor, Package, Truck, CircleDot,
  ChevronDown, ChevronRight, Factory, CheckCircle2, Circle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFacilities } from '@/hooks/useFacilities';
import { useDepartments, useCreateDepartment, useDeleteDepartment } from '@/hooks/useDepartments';
import {
  useLocations, useCreateLocation, useUpdateLocation,
  useDeleteLocation, useNextLocationCode,
} from '@/hooks/useLocations';
import { DEPARTMENT_CODES, getDepartmentColor } from '@/constants/organizationCodes';
import type { LocationWithFacility, LocationType, LocationFormData } from '@/types/location';

// ── The approved departments — these are the ONLY departments allowed ──
const APPROVED_DEPTS = Object.entries(DEPARTMENT_CODES).map(([code, dept]) => ({
  code,
  name: dept.name,
  color: dept.color,
  glPrefix: dept.glAccountPrefix,
  ccPrefix: dept.costCenterPrefix,
}));

// ── Location types ─────────────────────────────────────────────
const LOCATION_TYPES: { value: LocationType; label: string; icon: typeof MapPin }[] = [
  { value: 'room', label: 'Room', icon: DoorOpen },
  { value: 'area', label: 'Area', icon: Square },
  { value: 'zone', label: 'Zone', icon: MapPin },
  { value: 'line', label: 'Production Line', icon: Activity },
  { value: 'cell', label: 'Work Cell', icon: Grid3x3 },
  { value: 'workstation', label: 'Workstation', icon: Monitor },
  { value: 'storage', label: 'Storage', icon: Package },
  { value: 'dock', label: 'Dock', icon: Truck },
  { value: 'other', label: 'Other', icon: CircleDot },
];

const getTypeIcon = (type: string) => LOCATION_TYPES.find(t => t.value === type)?.icon || CircleDot;
const getTypeLabel = (type: string) => LOCATION_TYPES.find(t => t.value === type)?.label || type;

// ══════════════════════════════════════════════════════════════
// ── Location Modal ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function LocationModal({
  visible, onClose, location, facilityId, facilityName,
  departmentId, departmentName, departmentCode,
  parentLocationId, parentLocationName, siblingLocations, nextCode,
}: {
  visible: boolean;
  onClose: () => void;
  location: LocationWithFacility | null;
  facilityId: string;
  facilityName: string;
  departmentId: string | null;
  departmentName: string;
  departmentCode: string;
  parentLocationId: string | null;
  parentLocationName: string | null;
  siblingLocations: LocationWithFacility[];
  nextCode: string;
}) {
  const { colors } = useTheme();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const isEditing = !!location;

  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    location_code: location?.location_code || nextCode,
    facility_id: location?.facility_id || facilityId,
    department_id: location?.department_id || departmentId,
    description: location?.description || '',
    location_type: location?.location_type || 'room',
    parent_location_id: location?.parent_location_id || parentLocationId,
    status: location?.status || 'active',
    is_storage: location?.is_storage || false,
    is_production: location?.is_production || false,
    is_hazardous: location?.is_hazardous || false,
    is_climate_controlled: location?.is_climate_controlled || false,
    is_restricted: location?.is_restricted || false,
    max_occupancy: location?.max_occupancy || null,
    color: location?.color || getDepartmentColor(departmentCode) || '#6B7280',
    notes: location?.notes || '',
  });

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);

  // Tree-ordered parent candidates
  const parentCandidates = useMemo(() => {
    const buildTree = (pid: string | null, depth: number): Array<LocationWithFacility & { _depth: number }> => {
      const children = siblingLocations
        .filter(l => (l.parent_location_id || null) === pid && l.id !== location?.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      const result: Array<LocationWithFacility & { _depth: number }> = [];
      for (const child of children) {
        result.push({ ...child, _depth: depth });
        result.push(...buildTree(child.id, depth + 1));
      }
      return result;
    };
    return buildTree(null, 0);
  }, [siblingLocations, location]);

  const selectedType = LOCATION_TYPES.find(t => t.value === formData.location_type);
  const selectedParent = siblingLocations.find(l => l.id === formData.parent_location_id);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Location name is required.');
      return;
    }
    try {
      if (isEditing && location) {
        await updateLocation.mutateAsync({ id: location.id, ...formData, location_code: formData.location_code.toUpperCase() });
      } else {
        await createLocation.mutateAsync({ ...formData, location_code: formData.location_code.toUpperCase() });
      }
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save.');
    }
  }, [formData, isEditing, location, updateLocation, createLocation, onClose]);

  const deptColor = getDepartmentColor(departmentCode) || '#6B7280';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[st.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12}><X size={22} color={colors.text} /></Pressable>
          <Text style={[st.modalTitle, { color: colors.text }]}>{isEditing ? 'Edit Location' : 'Add Location'}</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Breadcrumb */}
        <View style={[st.contextBanner, { backgroundColor: deptColor + '12', borderBottomColor: deptColor + '30' }]}>
          <Text style={[st.contextText, { color: colors.textSecondary }]}>
            {facilityName} › <Text style={{ color: deptColor, fontWeight: '700' }}>{departmentName}</Text>
            {parentLocationName ? ` › ${parentLocationName}` : ''}
          </Text>
        </View>

        <ScrollView style={st.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View style={st.formGroup}>
            <Text style={[st.label, { color: colors.text }]}>Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={formData.name}
              onChangeText={v => setFormData(p => ({ ...p, name: v }))}
              placeholder="e.g. Lab, Production Room 1, Maintenance Shop"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Code + Type */}
          <View style={st.row}>
            <View style={[st.formGroup, { flex: 1 }]}>
              <Text style={[st.label, { color: colors.text }]}>Code</Text>
              <TextInput
                style={[st.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.location_code}
                onChangeText={v => setFormData(p => ({ ...p, location_code: v.toUpperCase() }))}
                placeholder="LOC-001"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
              />
            </View>
            <View style={[st.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[st.label, { color: colors.text }]}>Type</Text>
              <Pressable
                style={[st.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowTypePicker(!showTypePicker)}
              >
                {selectedType && <selectedType.icon size={14} color={deptColor} />}
                <Text style={[st.pickerText, { color: colors.text }]} numberOfLines={1}>{selectedType?.label || 'Select'}</Text>
                <ChevronDown size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {showTypePicker && (
            <View style={[st.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {LOCATION_TYPES.map(t => (
                <Pressable
                  key={t.value}
                  style={[st.dropdownItem, formData.location_type === t.value && { backgroundColor: deptColor + '15' }]}
                  onPress={() => { setFormData(p => ({ ...p, location_type: t.value })); setShowTypePicker(false); }}
                >
                  <t.icon size={14} color={formData.location_type === t.value ? deptColor : colors.textSecondary} />
                  <Text style={[st.dropdownText, { color: colors.text }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Parent */}
          <View style={st.formGroup}>
            <Text style={[st.label, { color: colors.text }]}>Parent Location</Text>
            <Pressable
              style={[st.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowParentPicker(!showParentPicker)}
            >
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[st.pickerText, { color: selectedParent ? colors.text : colors.textTertiary }]} numberOfLines={1}>
                {selectedParent ? selectedParent.name : `Directly under ${departmentName}`}
              </Text>
              <ChevronDown size={14} color={colors.textTertiary} />
            </Pressable>
          </View>

          {showParentPicker && (
            <View style={[st.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                style={[st.dropdownItem, !formData.parent_location_id && { backgroundColor: deptColor + '15' }]}
                onPress={() => { setFormData(p => ({ ...p, parent_location_id: null })); setShowParentPicker(false); }}
              >
                <Text style={[st.dropdownText, { color: colors.text }]}>Directly under {departmentName}</Text>
              </Pressable>
              {parentCandidates.map(loc => (
                <Pressable
                  key={loc.id}
                  style={[st.dropdownItem, formData.parent_location_id === loc.id && { backgroundColor: deptColor + '15' }, { paddingLeft: 12 + loc._depth * 16 }]}
                  onPress={() => { setFormData(p => ({ ...p, parent_location_id: loc.id })); setShowParentPicker(false); }}
                >
                  <Text style={[st.dropdownText, { color: colors.text }]}>
                    {loc._depth > 0 ? '└ ' : ''}{loc.name} — {getTypeLabel(loc.location_type)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Description */}
          <View style={st.formGroup}>
            <Text style={[st.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[st.input, st.inputMulti, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={formData.description}
              onChangeText={v => setFormData(p => ({ ...p, description: v }))}
              placeholder="Optional..."
              placeholderTextColor={colors.textTertiary}
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </View>

          {/* Attribute Flags */}
          <View style={st.formGroup}>
            <Text style={[st.label, { color: colors.text, marginBottom: 8 }]}>Attributes</Text>
            {[
              { key: 'is_production', label: 'Production Area', c: '#F59E0B' },
              { key: 'is_storage', label: 'Storage Area', c: '#3B82F6' },
              { key: 'is_hazardous', label: 'Hazardous', c: '#EF4444' },
              { key: 'is_climate_controlled', label: 'Climate Controlled', c: '#06B6D4' },
              { key: 'is_restricted', label: 'Restricted Access', c: '#8B5CF6' },
            ].map(a => (
              <View key={a.key} style={[st.switchRow, { borderBottomColor: colors.border }]}>
                <View style={[st.attrDot, { backgroundColor: a.c }]} />
                <Text style={[st.switchLabel, { color: colors.text }]}>{a.label}</Text>
                <Switch value={(formData as any)[a.key] || false} onValueChange={v => setFormData(p => ({ ...p, [a.key]: v }))} />
              </View>
            ))}
          </View>

          {/* Max Occupancy */}
          <View style={st.formGroup}>
            <Text style={[st.label, { color: colors.text }]}>Max Occupancy</Text>
            <TextInput
              style={[st.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, width: 120 }]}
              value={formData.max_occupancy?.toString() || ''}
              onChangeText={v => setFormData(p => ({ ...p, max_occupancy: v ? parseInt(v) : null }))}
              placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="numeric"
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[st.modalFooter, { borderTopColor: colors.border }]}>
          <Pressable style={[st.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[st.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[st.saveBtn, { backgroundColor: deptColor }]}
            onPress={handleSubmit}
            disabled={createLocation.isPending || updateLocation.isPending}
          >
            {(createLocation.isPending || updateLocation.isPending)
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={st.saveText}>{isEditing ? 'Update' : 'Create'}</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Recursive Location Tree Node ─────────────────────────────
// ══════════════════════════════════════════════════════════════
function LocNode({ loc, all, depth, onEdit, onDelete, onAdd, colors }: {
  loc: LocationWithFacility; all: LocationWithFacility[]; depth: number;
  onEdit: (l: LocationWithFacility) => void; onDelete: (l: LocationWithFacility) => void;
  onAdd: (pid: string, pname: string) => void; colors: any;
}) {
  const [open, setOpen] = useState(true);
  const kids = all.filter(l => l.parent_location_id === loc.id).sort((a, b) => a.name.localeCompare(b.name));
  const Icon = getTypeIcon(loc.location_type);

  return (
    <View style={{ marginLeft: depth > 0 ? 14 : 0 }}>
      <View style={[st.locItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {kids.length > 0 ? (
          <Pressable onPress={() => setOpen(!open)} hitSlop={8} style={{ width: 20, alignItems: 'center' }}>
            {open ? <ChevronDown size={13} color={colors.textSecondary} /> : <ChevronRight size={13} color={colors.textSecondary} />}
          </Pressable>
        ) : <View style={{ width: 20 }} />}
        <View style={[st.locIcon, { backgroundColor: (loc.color || '#6B7280') + '20' }]}>
          <Icon size={13} color={loc.color || '#6B7280'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.locName, { color: colors.text }]}>{loc.name}</Text>
          <Text style={[st.locMeta, { color: colors.textTertiary }]}>
            {loc.location_code} • {getTypeLabel(loc.location_type)}
            {loc.is_production ? ' • Prod' : ''}{loc.is_storage ? ' • Storage' : ''}{loc.is_hazardous ? ' • ⚠️' : ''}
          </Text>
        </View>
        <Pressable onPress={() => onAdd(loc.id, loc.name)} hitSlop={6} style={[st.miniBtn, { backgroundColor: colors.primary + '15' }]}>
          <Plus size={11} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => onEdit(loc)} hitSlop={6} style={[st.miniBtn, { backgroundColor: colors.backgroundSecondary }]}>
          <Edit2 size={11} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => onDelete(loc)} hitSlop={6} style={[st.miniBtn, { backgroundColor: '#EF444412' }]}>
          <Trash2 size={11} color="#EF4444" />
        </Pressable>
      </View>
      {open && kids.map(k => (
        <LocNode key={k.id} loc={k} all={all} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} colors={colors} />
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Main Screen ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function AreasScreen() {
  const { colors } = useTheme();
  const { data: facilities = [], isLoading: facLoading } = useFacilities();
  const { data: departments = [], isLoading: deptLoading } = useDepartments();
  const { data: locations = [], isLoading: locLoading, refetch, isRefetching } = useLocations();
  const { data: nextCode = 'LOC-001' } = useNextLocationCode();
  const deleteLocation = useDeleteLocation();
  const createDepartment = useCreateDepartment();

  const [expandedFac, setExpandedFac] = useState<Record<string, boolean>>({});
  const [expandedDept, setExpandedDept] = useState<Record<string, boolean>>({});
  const [enablingDept, setEnablingDept] = useState<string | null>(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationWithFacility | null>(null);
  const [modalCtx, setModalCtx] = useState({
    facilityId: '', facilityName: '',
    departmentId: null as string | null, departmentName: '', departmentCode: '',
    parentLocationId: null as string | null, parentLocationName: null as string | null,
  });

  const isLoading = facLoading || deptLoading || locLoading;

  // ── Helpers ──

  // For a facility, get which approved depts exist in DB
  const getDeptStatus = useCallback((facilityId: string) => {
    return APPROVED_DEPTS.map(ad => {
      const dbDept = departments.find(d => d.facility_id === facilityId && d.department_code === ad.code);
      const locCount = dbDept ? locations.filter(l => l.facility_id === facilityId && l.department_id === dbDept.id).length : 0;
      return { ...ad, dbDept, enabled: !!dbDept, locCount };
    });
  }, [departments, locations]);

  const getLocs = useCallback((facilityId: string, deptId: string) => {
    return locations.filter(l => l.facility_id === facilityId && l.department_id === deptId);
  }, [locations]);

  const getTopLocs = useCallback((facilityId: string, deptId: string) => {
    const deptLocs = getLocs(facilityId, deptId);
    return deptLocs
      .filter(l => !l.parent_location_id || !deptLocs.find(dl => dl.id === l.parent_location_id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getLocs]);

  // ── Enable a department for a facility ──
  const handleEnableDept = useCallback(async (facilityId: string, deptInfo: typeof APPROVED_DEPTS[0], facilityNumber?: number) => {
    const key = `${facilityId}-${deptInfo.code}`;
    setEnablingDept(key);
    try {
      const facNum = facilityNumber || 1;
      const baseCode = parseInt(deptInfo.code.slice(-3)) || parseInt(deptInfo.code);
      await createDepartment.mutateAsync({
        name: deptInfo.name,
        department_code: deptInfo.code,
        facility_id: facilityId,
        color: deptInfo.color,
        gl_account: deptInfo.glPrefix + '-001',
        cost_center: deptInfo.ccPrefix + '-001',
        status: 'active',
        base_department_code: baseCode,
        is_production: ['1003'].includes(deptInfo.code),
        is_support: ['1000', '1006', '1009'].includes(deptInfo.code),
      } as any);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('23505')) {
        Alert.alert('Already exists', `${deptInfo.name} is already assigned to this facility.`);
      } else {
        Alert.alert('Error', error.message || 'Failed to enable department.');
      }
    } finally {
      setEnablingDept(null);
    }
  }, [createDepartment]);

  // ── Open modal ──
  const openAddModal = useCallback((facility: any, deptInfo: { id: string; name: string; department_code: string }, parentId?: string | null, parentName?: string | null) => {
    setEditingLoc(null);
    setModalCtx({
      facilityId: facility.id, facilityName: facility.name,
      departmentId: deptInfo.id, departmentName: deptInfo.name, departmentCode: deptInfo.department_code,
      parentLocationId: parentId || null, parentLocationName: parentName || null,
    });
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((loc: LocationWithFacility) => {
    const fac = facilities.find(f => f.id === loc.facility_id);
    const dept = departments.find(d => d.id === loc.department_id);
    setEditingLoc(loc);
    setModalCtx({
      facilityId: loc.facility_id, facilityName: fac?.name || '',
      departmentId: loc.department_id, departmentName: dept?.name || '', departmentCode: dept?.department_code || '',
      parentLocationId: loc.parent_location_id,
      parentLocationName: loc.parent_location_id ? (locations.find(l => l.id === loc.parent_location_id)?.name || null) : null,
    });
    setModalVisible(true);
  }, [facilities, departments, locations]);

  const handleDeleteLoc = useCallback((loc: LocationWithFacility) => {
    const kids = locations.filter(l => l.parent_location_id === loc.id);
    Alert.alert('Delete Location', `Delete "${loc.name}"?${kids.length > 0 ? `\n\n${kids.length} child location(s) will be orphaned.` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLocation.mutateAsync(loc.id).catch(e => Alert.alert('Error', e.message)) },
    ]);
  }, [locations, deleteLocation]);

  if (isLoading) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>Loading hierarchy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Hierarchy Guide */}
        <View style={[st.guide, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={st.guideRow}>
            {['Organization', 'Facility', 'Department', 'Rooms / Areas', 'Equipment'].map((lvl, i, a) => (
              <React.Fragment key={lvl}>
                <Text style={{ fontSize: 11, color: i === 2 || i === 3 ? colors.primary : colors.textTertiary, fontWeight: i === 2 || i === 3 ? '700' : '400' }}>{lvl}</Text>
                {i < a.length - 1 && <Text style={{ fontSize: 11, color: colors.textTertiary }}> › </Text>}
              </React.Fragment>
            ))}
          </View>
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 3 }}>
            Toggle departments per facility, then add rooms/areas underneath. Equipment lives in CMMS.
          </Text>
        </View>

        {/* Facilities */}
        {facilities.length === 0 ? (
          <View style={[st.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Factory size={32} color={colors.textTertiary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>No Facilities</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>Create facilities first in Settings → Facilities.</Text>
          </View>
        ) : (
          facilities.map(facility => {
            const fKey = facility.id;
            const isOpen = expandedFac[fKey] !== false;
            const deptRows = getDeptStatus(facility.id);
            const enabledCount = deptRows.filter(d => d.enabled).length;
            const totalLocs = locations.filter(l => l.facility_id === facility.id).length;

            return (
              <View key={fKey} style={[st.facCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Facility header */}
                <Pressable style={st.facHeader} onPress={() => setExpandedFac(p => ({ ...p, [fKey]: !p[fKey] }))}>
                  <View style={[st.facIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Building2 size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.facName, { color: colors.text }]}>{facility.name}</Text>
                    <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                      {(facility as any).facility_code} • {enabledCount} dept{enabledCount !== 1 ? 's' : ''} enabled • {totalLocs} location{totalLocs !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {isOpen ? <ChevronDown size={18} color={colors.textSecondary} /> : <ChevronRight size={18} color={colors.textSecondary} />}
                </Pressable>

                {/* Departments */}
                {isOpen && (
                  <View style={[st.facBody, { borderTopColor: colors.border }]}>
                    {deptRows.map(dr => {
                      const dKey = `${facility.id}-${dr.code}`;
                      const isDeptOpen = dr.enabled && expandedDept[dKey] !== false;
                      const isEnabling = enablingDept === dKey;

                      return (
                        <View key={dKey}>
                          <View style={[st.deptRow, { borderBottomColor: colors.border, opacity: dr.enabled ? 1 : 0.5 }]}>
                            {/* Enable/disable indicator */}
                            {dr.enabled ? (
                              <CheckCircle2 size={16} color={dr.color} />
                            ) : (
                              <Circle size={16} color={colors.textTertiary} />
                            )}
                            {/* Dept info */}
                            <Pressable
                              style={{ flex: 1 }}
                              onPress={() => dr.enabled ? setExpandedDept(p => ({ ...p, [dKey]: !p[dKey] })) : null}
                            >
                              <Text style={[st.deptName, { color: dr.enabled ? colors.text : colors.textTertiary }]}>{dr.name}</Text>
                              <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                                {dr.code}{dr.enabled ? ` • ${dr.locCount} location${dr.locCount !== 1 ? 's' : ''}` : ' • Not enabled'}
                              </Text>
                            </Pressable>

                            {/* Action button */}
                            {dr.enabled ? (
                              <>
                                <Pressable
                                  onPress={() => dr.dbDept && openAddModal(facility, dr.dbDept)}
                                  hitSlop={8}
                                  style={[st.addBtn, { backgroundColor: dr.color + '20', borderColor: dr.color + '40' }]}
                                >
                                  <Plus size={11} color={dr.color} />
                                  <Text style={{ fontSize: 10, fontWeight: '600', color: dr.color }}>Add</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => dr.enabled ? setExpandedDept(p => ({ ...p, [dKey]: !p[dKey] })) : null}
                                  hitSlop={8}
                                >
                                  {isDeptOpen ? <ChevronDown size={15} color={colors.textSecondary} /> : <ChevronRight size={15} color={colors.textSecondary} />}
                                </Pressable>
                              </>
                            ) : (
                              <Pressable
                                onPress={() => handleEnableDept(facility.id, dr, (facility as any).facility_number)}
                                disabled={isEnabling}
                                style={[st.enableBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                              >
                                {isEnabling ? (
                                  <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Enable</Text>
                                )}
                              </Pressable>
                            )}
                          </View>

                          {/* Locations tree */}
                          {isDeptOpen && dr.dbDept && dr.locCount > 0 && (
                            <View style={st.locWrap}>
                              {getTopLocs(facility.id, dr.dbDept.id).map(loc => (
                                <LocNode
                                  key={loc.id}
                                  loc={loc}
                                  all={getLocs(facility.id, dr.dbDept!.id)}
                                  depth={0}
                                  onEdit={openEditModal}
                                  onDelete={handleDeleteLoc}
                                  onAdd={(pid, pname) => openAddModal(facility, dr.dbDept!, pid, pname)}
                                  colors={colors}
                                />
                              ))}
                            </View>
                          )}

                          {isDeptOpen && dr.dbDept && dr.locCount === 0 && (
                            <Pressable
                              style={[st.emptyDeptBtn, { borderColor: colors.border }]}
                              onPress={() => dr.dbDept && openAddModal(facility, dr.dbDept)}
                            >
                              <Plus size={13} color={colors.textTertiary} />
                              <Text style={{ fontSize: 11, color: colors.textTertiary }}>Add first location to {dr.name}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Location Modal */}
      {modalVisible && (
        <LocationModal
          key={editingLoc?.id || `new-${modalCtx.departmentId}-${modalCtx.parentLocationId}`}
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setEditingLoc(null); }}
          location={editingLoc}
          facilityId={modalCtx.facilityId}
          facilityName={modalCtx.facilityName}
          departmentId={modalCtx.departmentId}
          departmentName={modalCtx.departmentName}
          departmentCode={modalCtx.departmentCode}
          parentLocationId={modalCtx.parentLocationId}
          parentLocationName={modalCtx.parentLocationName}
          siblingLocations={locations.filter(l => l.facility_id === modalCtx.facilityId && l.department_id === modalCtx.departmentId)}
          nextCode={nextCode}
        />
      )}
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 12 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  guide: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  guideRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },

  empty: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },

  facCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  facHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  facIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  facName: { fontSize: 16, fontWeight: '700' },
  facBody: { borderTopWidth: 1 },

  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5 },
  deptName: { fontSize: 13, fontWeight: '600' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1, marginRight: 2 },
  enableBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },

  locWrap: { paddingLeft: 28, paddingRight: 8, paddingVertical: 6 },
  locItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 5, borderRadius: 7, borderWidth: 0.5, marginBottom: 2 },
  locIcon: { width: 22, height: 22, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  locName: { fontSize: 12, fontWeight: '600' },
  locMeta: { fontSize: 9 },
  miniBtn: { width: 24, height: 24, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },

  emptyDeptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginHorizontal: 28, marginVertical: 4, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed' },

  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalScroll: { flex: 1, padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
  contextBanner: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  contextText: { fontSize: 12, fontWeight: '500' },

  formGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputMulti: { minHeight: 72, paddingTop: 10 },
  row: { flexDirection: 'row' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  pickerText: { flex: 1, fontSize: 14 },
  dropdown: { borderWidth: 1, borderRadius: 8, marginBottom: 12, maxHeight: 240 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownText: { fontSize: 13 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5 },
  switchLabel: { flex: 1, fontSize: 13, marginLeft: 8 },
  attrDot: { width: 8, height: 8, borderRadius: 4 },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
