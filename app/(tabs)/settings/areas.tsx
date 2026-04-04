// app/(tabs)/settings/areas.tsx
// TulKenz OPS — Areas & Locations Settings
// Manage physical location hierarchy: Building 1 Front/Back, Building 2, Grounds

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, ActivityIndicator,
  RefreshControl, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Plus, MapPin, ChevronRight,
  ChevronDown, X, Check, Pencil, Trash2,
  Building2, AlertTriangle, ShieldCheck,
  Package, FlaskConical, Droplets,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── Building options ───────────────────────────────────────────
const BUILDINGS = [
  { value: 'Building 1', label: 'Building 1', sub: 'Production + HQ' },
  { value: 'Building 2', label: 'Building 2', sub: 'Maintenance + Offices' },
  { value: 'Grounds',    label: 'Grounds',    sub: 'External areas'  },
];

const LOCATION_TYPES = [
  { value: 'building', label: 'Building'  },
  { value: 'zone',     label: 'Zone'      },
  { value: 'area',     label: 'Area'      },
  { value: 'room',     label: 'Room'      },
];

const BUILDING_COLORS: Record<string, string> = {
  'Building 1': '#F59E0B',
  'Building 2': '#3B82F6',
  'Grounds':    '#6B7280',
};

const TYPE_COLORS: Record<string, string> = {
  building: '#F59E0B',
  zone:     '#8B5CF6',
  area:     '#10B981',
  room:     '#06B6D4',
};

interface Location {
  id: string;
  organization_id: string;
  location_code: string;
  name: string;
  description: string | null;
  location_type: string;
  building: string | null;
  level: number | null;
  path: string | null;
  parent_location_id: string | null;
  room_code: string | null;
  status: string;
  sort_order: number | null;
  is_production: boolean | null;
  is_storage: boolean | null;
  is_hazardous: boolean | null;
  is_restricted: boolean | null;
  hygiene_log_required: boolean | null;
  color: string | null;
}

interface FormState {
  location_code: string;
  name: string;
  description: string;
  location_type: string;
  building: string;
  parent_location_id: string;
  room_code: string;
  is_production: boolean;
  is_storage: boolean;
  is_hazardous: boolean;
  is_restricted: boolean;
  hygiene_log_required: boolean;
  color: string;
  sort_order: string;
}

const BLANK_FORM: FormState = {
  location_code: '',
  name: '',
  description: '',
  location_type: 'room',
  building: 'Building 1',
  parent_location_id: '',
  room_code: '',
  is_production: false,
  is_storage: false,
  is_hazardous: false,
  is_restricted: false,
  hygiene_log_required: false,
  color: '#6B7280',
  sort_order: '0',
};

export default function AreasScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { organizationId, facilityId } = useOrganization();
  const { userProfile } = useUser();
  const queryClient = useQueryClient();

  const [buildingFilter, setBuildingFilter] = useState<string>('Building 1');
  const [expandedIds, setExpandedIds]       = useState<Set<string>>(new Set());
  const [showModal, setShowModal]           = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form, setForm]                     = useState<FormState>(BLANK_FORM);
  const [saving, setSaving]                 = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showTypePicker, setShowTypePicker]     = useState(false);

  // ── Load all locations ─────────────────────────────────────
  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ['locations-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Location[];
    },
    enabled: !!organizationId,
  });

  // Filter by building
  const filteredLocations = useMemo(() =>
    locations.filter(l => l.building === buildingFilter || (buildingFilter === 'Grounds' && l.building === 'Grounds')),
    [locations, buildingFilter]
  );

  // Build parent options for modal (locations in selected building)
  const parentOptions = useMemo(() =>
    locations.filter(l =>
      l.building === form.building &&
      l.id !== editingLocation?.id &&
      l.status === 'active'
    ),
    [locations, form.building, editingLocation]
  );

  const parentMap = useMemo(() => {
    const map: Record<string, Location> = {};
    locations.forEach(l => { map[l.id] = l; });
    return map;
  }, [locations]);

  // Group by parent for tree display
  const childrenOf = useMemo(() => {
    const map: Record<string, Location[]> = {};
    filteredLocations.forEach(l => {
      const pid = l.parent_location_id || '__root__';
      if (!map[pid]) map[pid] = [];
      map[pid].push(l);
    });
    return map;
  }, [filteredLocations]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Save location ──────────────────────────────────────────
  const saveLocation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No org ID');
      if (!form.location_code.trim()) throw new Error('Location code is required');
      if (!form.name.trim()) throw new Error('Name is required');

      const payload = {
        organization_id:      organizationId,
        facility_id:          facilityId || null,
        location_code:        form.location_code.trim().toUpperCase(),
        name:                 form.name.trim(),
        description:          form.description.trim() || null,
        location_type:        form.location_type,
        building:             form.building || null,
        parent_location_id:   form.parent_location_id || null,
        room_code:            form.room_code.trim().toUpperCase() || null,
        is_production:        form.is_production,
        is_storage:           form.is_storage,
        is_hazardous:         form.is_hazardous,
        is_restricted:        form.is_restricted,
        hygiene_log_required: form.hygiene_log_required,
        color:                form.color || null,
        sort_order:           parseInt(form.sort_order) || 0,
        status:               'active',
        created_by:           `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
        updated_at:           new Date().toISOString(),
      };

      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(payload)
          .eq('id', editingLocation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('locations')
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations-settings'] });
      queryClient.invalidateQueries({ queryKey: ['prod-locations'] });
      queryClient.invalidateQueries({ queryKey: ['room-ids'] });
      closeModal();
    },
    onError: (err: any) => Alert.alert('Error', err.message || 'Failed to save location'),
  });

  // ── Delete location ────────────────────────────────────────
  const deleteLocation = (loc: Location) => {
    const hasChildren = locations.some(l => l.parent_location_id === loc.id);
    if (hasChildren) {
      Alert.alert('Cannot Delete', 'This location has sub-locations. Remove them first.');
      return;
    }
    Alert.alert(
      'Delete Location',
      `Delete "${loc.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('locations').update({ status: 'inactive' }).eq('id', loc.id);
            queryClient.invalidateQueries({ queryKey: ['locations-settings'] });
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }},
      ]
    );
  };

  const openCreate = () => {
    setEditingLocation(null);
    setForm({ ...BLANK_FORM, building: buildingFilter });
    setShowModal(true);
  };

  const openEdit = (loc: Location) => {
    setEditingLocation(loc);
    setForm({
      location_code:        loc.location_code,
      name:                 loc.name,
      description:          loc.description || '',
      location_type:        loc.location_type,
      building:             loc.building || 'Building 1',
      parent_location_id:   loc.parent_location_id || '',
      room_code:            loc.room_code || '',
      is_production:        loc.is_production || false,
      is_storage:           loc.is_storage || false,
      is_hazardous:         loc.is_hazardous || false,
      is_restricted:        loc.is_restricted || false,
      hygiene_log_required: loc.hygiene_log_required || false,
      color:                loc.color || '#6B7280',
      sort_order:           String(loc.sort_order || 0),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setForm(BLANK_FORM);
    setShowParentPicker(false);
    setShowTypePicker(false);
  };

  const updateForm = (key: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ── Recursive tree renderer ────────────────────────────────
  const renderLocation = (loc: Location, depth: number = 0) => {
    const children   = childrenOf[loc.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded  = expandedIds.has(loc.id);
    const typeColor   = TYPE_COLORS[loc.location_type] || colors.textSecondary;
    const indentPx   = depth * 14;

    return (
      <View key={loc.id}>
        <View style={[
          styles.locationRow,
          { borderBottomColor: colors.border, marginLeft: indentPx }
        ]}>
          {/* Expand toggle */}
          <Pressable
            style={styles.expandBtn}
            onPress={() => hasChildren && toggleExpand(loc.id)}
            hitSlop={8}
          >
            {hasChildren
              ? (isExpanded
                  ? <ChevronDown size={14} color={colors.textSecondary} />
                  : <ChevronRight size={14} color={colors.textSecondary} />)
              : <View style={styles.leafDot} />
            }
          </Pressable>

          {/* Color dot */}
          <View style={[styles.locDot, { backgroundColor: loc.color || typeColor }]} />

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={styles.locNameRow}>
              <Text style={[styles.locName, { color: colors.text }]} numberOfLines={1}>
                {loc.name}
              </Text>
              {loc.room_code && (
                <View style={[styles.roomCodeBadge, { borderColor: typeColor + '50', backgroundColor: typeColor + '15' }]}>
                  <Text style={[styles.roomCodeText, { color: typeColor, fontFamily: MONO }]}>
                    {loc.room_code}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.locMetaRow}>
              <Text style={[styles.locCode, { color: colors.textSecondary, fontFamily: MONO }]}>
                {loc.location_code}
              </Text>
              <Text style={[styles.locType, { color: typeColor }]}>
                {loc.location_type}
              </Text>
              {loc.hygiene_log_required && (
                <View style={styles.flagIcon}>
                  <Droplets size={9} color="#06B6D4" />
                </View>
              )}
              {loc.is_production && (
                <View style={styles.flagIcon}>
                  <Building2 size={9} color="#F59E0B" />
                </View>
              )}
              {loc.is_hazardous && (
                <View style={styles.flagIcon}>
                  <AlertTriangle size={9} color="#EF4444" />
                </View>
              )}
              {loc.is_restricted && (
                <View style={styles.flagIcon}>
                  <ShieldCheck size={9} color="#8B5CF6" />
                </View>
              )}
              {loc.is_storage && (
                <View style={styles.flagIcon}>
                  <Package size={9} color="#84CC16" />
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.locActions}>
            <Pressable
              style={[styles.locActionBtn, { backgroundColor: colors.infoBg }]}
              onPress={() => openEdit(loc)}
              hitSlop={4}
            >
              <Pencil size={13} color={colors.primary} />
            </Pressable>
            <Pressable
              style={[styles.locActionBtn, { backgroundColor: colors.errorBg }]}
              onPress={() => deleteLocation(loc)}
              hitSlop={4}
            >
              <Trash2 size={13} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Children */}
        {isExpanded && children.map(child => renderLocation(child, depth + 1))}
      </View>
    );
  };

  // Root locations for current building filter
  const rootLocations = filteredLocations.filter(l => !l.parent_location_id);

  const selectedParent = parentMap[form.parent_location_id];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Areas & Locations</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {locations.length} locations · {buildingFilter}
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openCreate}
        >
          <Plus size={16} color="#000" />
          <Text style={[styles.addBtnText, { color: '#000' }]}>Add</Text>
        </Pressable>
      </View>

      {/* Building filter tabs */}
      <View style={[styles.buildingTabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {BUILDINGS.map(b => {
          const isActive = buildingFilter === b.value;
          const color    = BUILDING_COLORS[b.value] || colors.primary;
          return (
            <Pressable
              key={b.value}
              style={[styles.buildingTab, isActive && { borderBottomColor: color, borderBottomWidth: 2 }]}
              onPress={() => setBuildingFilter(b.value)}
            >
              <Text style={[styles.buildingTabText, { color: isActive ? color : colors.textSecondary }]}>
                {b.label}
              </Text>
              <Text style={[styles.buildingTabSub, { color: isActive ? color + 'AA' : colors.textSecondary + '80' }]}>
                {b.sub}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { icon: Droplets,      color: '#06B6D4', label: 'Hygiene' },
          { icon: Building2,     color: '#F59E0B', label: 'Production' },
          { icon: AlertTriangle, color: '#EF4444', label: 'Hazardous' },
          { icon: ShieldCheck,   color: '#8B5CF6', label: 'Restricted' },
          { icon: Package,       color: '#84CC16', label: 'Storage' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <View key={item.label} style={styles.legendItem}>
              <Icon size={10} color={item.color} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Location tree */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading locations...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.treeContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {rootLocations.length === 0 ? (
            <View style={styles.emptyState}>
              <MapPin size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No locations yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Tap Add to create your first location in {buildingFilter}
              </Text>
            </View>
          ) : (
            <>
              {/* Expand/collapse all */}
              <View style={styles.treeControls}>
                <Pressable onPress={() => setExpandedIds(new Set(locations.map(l => l.id)))}>
                  <Text style={[styles.treeControlText, { color: colors.primary }]}>Expand All</Text>
                </Pressable>
                <Text style={[styles.treeControlDivider, { color: colors.border }]}>|</Text>
                <Pressable onPress={() => setExpandedIds(new Set())}>
                  <Text style={[styles.treeControlText, { color: colors.primary }]}>Collapse All</Text>
                </Pressable>
              </View>
              {rootLocations.map(loc => renderLocation(loc, 0))}
            </>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>

            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingLocation ? 'Edit Location' : 'Add Location'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {editingLocation ? editingLocation.path || '' : buildingFilter}
                </Text>
              </View>
              <Pressable onPress={closeModal} hitSlop={12}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

              {/* Building */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Building *</Text>
                <View style={styles.buildingChips}>
                  {BUILDINGS.map(b => {
                    const isSelected = form.building === b.value;
                    const color      = BUILDING_COLORS[b.value] || colors.primary;
                    return (
                      <Pressable
                        key={b.value}
                        style={[
                          styles.chip,
                          { borderColor: isSelected ? color : colors.border, backgroundColor: isSelected ? color + '20' : 'transparent' }
                        ]}
                        onPress={() => updateForm('building', b.value)}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? color : colors.textSecondary }]}>
                          {b.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Location Type */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type *</Text>
                <Pressable
                  style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setShowTypePicker(!showTypePicker)}
                >
                  <Text style={[styles.pickerText, { color: colors.text }]}>
                    {LOCATION_TYPES.find(t => t.value === form.location_type)?.label || form.location_type}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </Pressable>
                {showTypePicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {LOCATION_TYPES.map(t => (
                      <Pressable
                        key={t.value}
                        style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                        onPress={() => { updateForm('location_type', t.value); setShowTypePicker(false); }}
                      >
                        <Text style={[styles.pickerOptionText, { color: form.location_type === t.value ? colors.primary : colors.text }]}>
                          {t.label}
                        </Text>
                        {form.location_type === t.value && <Check size={14} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Parent location */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Parent Location</Text>
                <Pressable
                  style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setShowParentPicker(!showParentPicker)}
                >
                  <Text style={[styles.pickerText, { color: selectedParent ? colors.text : colors.textSecondary }]}>
                    {selectedParent ? selectedParent.name : 'None (root level)'}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </Pressable>
                {showParentPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Pressable
                      style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                      onPress={() => { updateForm('parent_location_id', ''); setShowParentPicker(false); }}
                    >
                      <Text style={[styles.pickerOptionText, { color: !form.parent_location_id ? colors.primary : colors.textSecondary }]}>
                        None (root level)
                      </Text>
                      {!form.parent_location_id && <Check size={14} color={colors.primary} />}
                    </Pressable>
                    {parentOptions.map(p => (
                      <Pressable
                        key={p.id}
                        style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                        onPress={() => { updateForm('parent_location_id', p.id); setShowParentPicker(false); }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickerOptionText, { color: form.parent_location_id === p.id ? colors.primary : colors.text }]}>
                            {p.name}
                          </Text>
                          <Text style={[styles.pickerOptionSub, { color: colors.textSecondary, fontFamily: MONO }]}>
                            {p.location_code} · {p.location_type}
                          </Text>
                        </View>
                        {form.parent_location_id === p.id && <Check size={14} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Location Code */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location Code *</Text>
                <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                  Unique code for this location (e.g. PR1, B1-HQ, GND-PARK)
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontFamily: MONO }]}
                  placeholder="e.g. PR1"
                  placeholderTextColor={colors.textSecondary}
                  value={form.location_code}
                  onChangeText={v => updateForm('location_code', v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>

              {/* Name */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="e.g. Production Room 1"
                  placeholderTextColor={colors.textSecondary}
                  value={form.name}
                  onChangeText={v => updateForm('name', v)}
                />
              </View>

              {/* Description */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Optional description"
                  placeholderTextColor={colors.textSecondary}
                  value={form.description}
                  onChangeText={v => updateForm('description', v)}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              {/* Room Code (optional) */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Room Code</Text>
                <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                  Short production code if applicable (e.g. PR1, BB1, PO1)
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontFamily: MONO }]}
                  placeholder="e.g. PR1 (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={form.room_code}
                  onChangeText={v => updateForm('room_code', v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>

              {/* Sort Order */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sort Order</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={form.sort_order}
                  onChangeText={v => updateForm('sort_order', v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </View>

              {/* Flags */}
              <View style={[styles.flagsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.flagsTitle, { color: colors.textSecondary }]}>LOCATION FLAGS</Text>
                {[
                  { key: 'hygiene_log_required', label: 'Hygiene Log Required',  sub: 'Room entries logged for SQF compliance',       color: '#06B6D4' },
                  { key: 'is_production',        label: 'Production Area',        sub: 'Part of the production floor',                  color: '#F59E0B' },
                  { key: 'is_storage',           label: 'Storage Area',           sub: 'Used for storing materials or products',        color: '#84CC16' },
                  { key: 'is_hazardous',         label: 'Hazardous Materials',    sub: 'Contains hazardous chemicals or materials',     color: '#EF4444' },
                  { key: 'is_restricted',        label: 'Restricted Access',      sub: 'Limited access — badge or permission required', color: '#8B5CF6' },
                ].map(flag => (
                  <View key={flag.key} style={[styles.flagRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.flagLabel, { color: colors.text }]}>{flag.label}</Text>
                      <Text style={[styles.flagSub, { color: colors.textSecondary }]}>{flag.sub}</Text>
                    </View>
                    <Switch
                      value={form[flag.key as keyof FormState] as boolean}
                      onValueChange={v => updateForm(flag.key as keyof FormState, v)}
                      trackColor={{ false: colors.border, true: flag.color + '60' }}
                      thumbColor={(form[flag.key as keyof FormState] as boolean) ? flag.color : colors.textSecondary}
                    />
                  </View>
                ))}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modal footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={closeModal}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.primary },
                  (!form.location_code.trim() || !form.name.trim()) && { opacity: 0.5 },
                ]}
                onPress={() => saveLocation.mutate()}
                disabled={saveLocation.isPending || !form.location_code.trim() || !form.name.trim()}
              >
                {saveLocation.isPending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.saveBtnText}>
                      {editingLocation ? 'Save Changes' : 'Add Location'}
                    </Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 10 },
  backBtn:     { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub:   { fontSize: 11, marginTop: 2 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText:  { fontSize: 13, fontWeight: '700' },

  buildingTabs:    { flexDirection: 'row', borderBottomWidth: 1 },
  buildingTab:     { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  buildingTabText: { fontSize: 12, fontWeight: '700' },
  buildingTabSub:  { fontSize: 9, marginTop: 1 },

  legend:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendText:  { fontSize: 9, fontWeight: '600' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13 },

  treeContent:    { paddingHorizontal: 12, paddingTop: 8 },
  treeControls:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 4 },
  treeControlText:{ fontSize: 12, fontWeight: '600' },
  treeControlDivider: { fontSize: 12 },

  locationRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  expandBtn:    { width: 20, alignItems: 'center', justifyContent: 'center' },
  leafDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#374151' },
  locDot:       { width: 8, height: 8, borderRadius: 4 },
  locNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  locName:      { fontSize: 13, fontWeight: '600' },
  locMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  locCode:      { fontSize: 10, fontWeight: '700' },
  locType:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  flagIcon:     { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  roomCodeBadge:{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  roomCodeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  locActions:   { flexDirection: 'row', gap: 6 },
  locActionBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  emptyState:   { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:   { fontSize: 16, fontWeight: '600' },
  emptySub:     { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, maxHeight: '92%' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1 },
  modalTitle:   { fontSize: 16, fontWeight: '700' },
  modalSub:     { fontSize: 11, marginTop: 2 },
  modalScroll:  { padding: 16 },

  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  fieldHint:  { fontSize: 10, marginBottom: 6 },
  input:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputMulti: { minHeight: 60, paddingTop: 10 },

  buildingChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText:      { fontSize: 12, fontWeight: '600' },

  picker:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pickerText:      { fontSize: 14 },
  pickerDropdown:  { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  pickerOption:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  pickerOptionText:{ fontSize: 14, fontWeight: '500' },
  pickerOptionSub: { fontSize: 10, marginTop: 2 },

  flagsCard:  { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  flagsTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  flagRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  flagLabel:  { fontSize: 13, fontWeight: '500' },
  flagSub:    { fontSize: 11, marginTop: 2 },

  modalFooter:  { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1 },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText:{ fontSize: 15, fontWeight: '600' },
  saveBtn:      { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  saveBtnText:  { fontSize: 15, fontWeight: '700', color: '#000' },
});
