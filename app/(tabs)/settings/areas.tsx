import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Plus,
  X,
  Edit2,
  Trash2,
  Power,
  AlertCircle,
  Building2,
  Layers,
  DoorOpen,
  Square,
  Activity,
  Grid3x3,
  Monitor,
  Package,
  Truck,
  TreePine,
  CircleDot,
  ChevronDown,
  ChevronRight,
  Thermometer,
  Shield,
  Users,
  LayoutGrid,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFacilities } from '@/hooks/useFacilities';
import { useDepartments, useCreateDepartment } from '@/hooks/useDepartments';
import { DEPARTMENT_CODES, getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useToggleLocationStatus,
  useNextLocationCode,
} from '@/hooks/useLocations';
import type { 
  Location, 
  LocationFormData, 
  LocationType, 
  LocationStatus,
  LocationWithFacility,
  LOCATION_TYPE_LABELS,
} from '@/types/location';

const LOCATION_TYPES: { value: LocationType; label: string; icon: typeof MapPin }[] = [
  { value: 'building', label: 'Building', icon: Building2 },
  { value: 'floor', label: 'Floor', icon: Layers },
  { value: 'wing', label: 'Wing', icon: LayoutGrid },
  { value: 'room', label: 'Room', icon: DoorOpen },
  { value: 'area', label: 'Area', icon: Square },
  { value: 'zone', label: 'Zone', icon: MapPin },
  { value: 'line', label: 'Production Line', icon: Activity },
  { value: 'cell', label: 'Work Cell', icon: Grid3x3 },
  { value: 'workstation', label: 'Workstation', icon: Monitor },
  { value: 'storage', label: 'Storage Area', icon: Package },
  { value: 'dock', label: 'Dock', icon: Truck },
  { value: 'yard', label: 'Yard', icon: TreePine },
  { value: 'other', label: 'Other', icon: CircleDot },
];

const LOCATION_STATUSES: { value: LocationStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'inactive', label: 'Inactive', color: '#6B7280' },
  { value: 'under_construction', label: 'Under Construction', color: '#F59E0B' },
  { value: 'maintenance', label: 'Maintenance', color: '#3B82F6' },
  { value: 'restricted', label: 'Restricted', color: '#EF4444' },
  { value: 'archived', label: 'Archived', color: '#9CA3AF' },
];

const getLocationTypeIcon = (type: LocationType) => {
  const found = LOCATION_TYPES.find((t) => t.value === type);
  return found?.icon || MapPin;
};

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  location?: LocationWithFacility | null;
  facilities: Array<{ id: string; name: string; facility_code: string }>;
  departments: Array<{ id: string; name: string; department_code: string; facility_id: string | null }>;
  locations: LocationWithFacility[];
  nextCode: string;
  prefillFacilityId?: string;
  prefillDepartmentId?: string;
}

function LocationModal({ 
  visible, 
  onClose, 
  location, 
  facilities, 
  departments, 
  locations,
  nextCode,
  prefillFacilityId,
  prefillDepartmentId,
}: LocationModalProps) {
  const { colors } = useTheme();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const isEditing = !!location;

  const buildHierarchyPath = useCallback((facilityId: string | null, parentLocationId: string | null): string[] => {
    const path: string[] = [];
    
    const facility = facilities.find(f => f.id === facilityId);
    if (facility) {
      path.push(facility.name);
    }
    
    if (parentLocationId) {
      const getParentChain = (locId: string): string[] => {
        const loc = locations.find(l => l.id === locId);
        if (!loc) return [];
        
        const chain: string[] = [];
        if (loc.parent_location_id) {
          chain.push(...getParentChain(loc.parent_location_id));
        }
        chain.push(loc.name);
        return chain;
      };
      
      path.push(...getParentChain(parentLocationId));
    }
    
    return path;
  }, [facilities, locations]);

  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    location_code: location?.location_code || nextCode,
    facility_id: location?.facility_id || prefillFacilityId || (facilities[0]?.id || ''),
    department_id: location?.department_id || prefillDepartmentId || null,
    description: location?.description || '',
    location_type: location?.location_type || 'room',
    parent_location_id: location?.parent_location_id || null,
    building: location?.building || '',
    floor_number: location?.floor_number || '',
    room_number: location?.room_number || '',
    area_name: location?.area_name || '',
    square_footage: location?.square_footage || null,
    status: location?.status || 'active',
    is_storage: location?.is_storage || false,
    is_production: location?.is_production || false,
    is_hazardous: location?.is_hazardous || false,
    is_climate_controlled: location?.is_climate_controlled || false,
    is_restricted: location?.is_restricted || false,
    max_occupancy: location?.max_occupancy || null,
    color: location?.color || '#6B7280',
    notes: location?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  // Departments are org-level, show all active ones regardless of facility
  const filteredDepartments = useMemo(() => {
    return departments.filter((d: any) => d.status === 'active' || !d.status);
  }, [departments]);

  const filteredParentLocations = useMemo(() => {
    if (!formData.facility_id) return [];
    return locations.filter((l) => 
      l.facility_id === formData.facility_id && 
      (!formData.department_id || l.department_id === formData.department_id) &&
      l.id !== location?.id
    );
  }, [locations, formData.facility_id, formData.department_id, location]);

  const selectedFacility = facilities.find((f) => f.id === formData.facility_id);
  const selectedDepartment = filteredDepartments.find((d) => d.id === formData.department_id);
  const selectedType = LOCATION_TYPES.find((t) => t.value === formData.location_type);
  const selectedStatus = LOCATION_STATUSES.find((s) => s.value === formData.status);
  const selectedParent = locations.find((l) => l.id === formData.parent_location_id);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required';
    }
    
    if (!formData.location_code.trim()) {
      newErrors.location_code = 'Location code is required';
    }

    if (!formData.facility_id) {
      newErrors.facility_id = 'Facility is required';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      if (isEditing && location) {
        await updateLocation.mutateAsync({
          id: location.id,
          ...formData,
          location_code: formData.location_code.toUpperCase(),
        });
      } else {
        await createLocation.mutateAsync({
          ...formData,
          location_code: formData.location_code.toUpperCase(),
        });
      }
      onClose();
    } catch (error) {
      console.error('[LocationModal] Error saving location:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save location');
    }
  }, [validate, isEditing, location, formData, updateLocation, createLocation, onClose]);

  const isLoading = createLocation.isPending || updateLocation.isPending;

  const ToggleButton = ({ 
    label, 
    value, 
    onToggle, 
    icon: Icon 
  }: { 
    label: string; 
    value: boolean; 
    onToggle: () => void;
    icon: typeof MapPin;
  }) => (
    <Pressable
      style={[
        styles.toggleOption,
        { 
          backgroundColor: value ? colors.primary + '15' : colors.surface, 
          borderColor: value ? colors.primary : colors.border 
        },
      ]}
      onPress={onToggle}
    >
      <Icon size={16} color={value ? colors.primary : colors.textTertiary} />
      <Text style={[styles.toggleLabel, { color: value ? colors.primary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? 'Edit Area/Location' : 'Add Area/Location'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {(formData.facility_id || formData.parent_location_id) && (
              <View style={[styles.hierarchyBreadcrumb, { backgroundColor: colors.infoBg, borderColor: colors.info + '30' }]}>
                <Text style={[styles.hierarchyLabel, { color: colors.textSecondary }]}>Creating location in:</Text>
                <View style={styles.hierarchyPath}>
                  {buildHierarchyPath(formData.facility_id, formData.parent_location_id).map((item, index, arr) => (
                    <View key={index} style={styles.hierarchyItem}>
                      <Text style={[styles.hierarchyText, { color: colors.primary }]}>{item}</Text>
                      {index < arr.length - 1 && (
                        <Text style={[styles.hierarchySeparator, { color: colors.textTertiary }]}> › </Text>
                      )}
                    </View>
                  ))}
                  {buildHierarchyPath(formData.facility_id, formData.parent_location_id).length > 0 && (
                    <Text style={[styles.hierarchySeparator, { color: colors.textTertiary }]}> › </Text>
                  )}
                  <Text style={[styles.hierarchyNewItem, { color: colors.success }]}>
                    {formData.name || 'New Location'}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Name <Text style={{ color: colors.error }}>*</Text></Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: errors.name ? colors.error : colors.border, color: colors.text },
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                placeholder="e.g., Production Floor A"
                placeholderTextColor={colors.textTertiary}
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Code <Text style={{ color: colors.error }}>*</Text></Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: errors.location_code ? colors.error : colors.border, color: colors.text },
                  ]}
                  value={formData.location_code}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, location_code: text.toUpperCase() }))}
                  placeholder="LOC-001"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Type</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowTypePicker(!showTypePicker)}
                >
                  {selectedType && <selectedType.icon size={16} color={colors.primary} />}
                  <Text style={[styles.pickerText, { color: colors.text }]} numberOfLines={1}>
                    {selectedType?.label || 'Select'}
                  </Text>
                  <ChevronDown size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            </View>

            {showTypePicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {LOCATION_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.pickerItem,
                      formData.location_type === type.value && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, location_type: type.value }));
                      setShowTypePicker(false);
                    }}
                  >
                    <type.icon size={16} color={formData.location_type === type.value ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{type.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Facility <Text style={{ color: colors.error }}>*</Text></Text>
              <Pressable
                style={[
                  styles.pickerButton, 
                  { backgroundColor: colors.surface, borderColor: errors.facility_id ? colors.error : colors.border }
                ]}
                onPress={() => setShowFacilityPicker(!showFacilityPicker)}
              >
                <Building2 size={16} color={colors.primary} />
                <Text style={[styles.pickerText, { color: colors.text }]} numberOfLines={1}>
                  {selectedFacility ? `${selectedFacility.name} (${selectedFacility.facility_code})` : 'Select Facility'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </Pressable>
              {errors.facility_id && <Text style={[styles.errorText, { color: colors.error }]}>{errors.facility_id}</Text>}
            </View>

            {showFacilityPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {facilities.map((facility) => (
                  <Pressable
                    key={facility.id}
                    style={[
                      styles.pickerItem,
                      formData.facility_id === facility.id && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({ 
                        ...prev, 
                        facility_id: facility.id,
                        parent_location_id: null,
                        department_id: null,
                      }));
                      setShowFacilityPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>
                      {facility.name} ({facility.facility_code})
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Department <Text style={{ color: colors.error }}>*</Text></Text>
              <Pressable
                style={[
                  styles.pickerButton, 
                  { backgroundColor: colors.surface, borderColor: errors.department_id ? colors.error : colors.border }
                ]}
                onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
              >
                {selectedDepartment && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getDepartmentColor((selectedDepartment as any).department_code) || '#6B7280' }} />
                )}
                <Text style={[styles.pickerText, { color: selectedDepartment ? colors.text : colors.textTertiary }]} numberOfLines={1}>
                  {selectedDepartment ? `${selectedDepartment.name} (${(selectedDepartment as any).department_code})` : 'Select Department'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </Pressable>
              {errors.department_id && <Text style={[styles.errorText, { color: colors.error }]}>{errors.department_id}</Text>}
            </View>

            {showDepartmentPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 280 }]}>
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                {filteredDepartments.map((dept) => {
                  const dColor = getDepartmentColor((dept as any).department_code) || '#6B7280';
                  return (
                    <Pressable
                      key={dept.id}
                      style={[
                        styles.pickerItem,
                        formData.department_id === dept.id && { backgroundColor: dColor + '15' },
                      ]}
                      onPress={() => {
                        setFormData((prev) => ({ ...prev, department_id: dept.id, parent_location_id: null }));
                        setShowDepartmentPicker(false);
                      }}
                    >
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dColor }} />
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>
                        {dept.name} ({(dept as any).department_code})
                      </Text>
                    </Pressable>
                  );
                })}
                </ScrollView>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Parent Location</Text>
              <Pressable
                style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowParentPicker(!showParentPicker)}
              >
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={[styles.pickerText, { color: selectedParent ? colors.text : colors.textTertiary }]} numberOfLines={1}>
                  {selectedParent ? `${selectedParent.name} (${selectedParent.location_code})` : 'None (Top Level)'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </Pressable>
            </View>

            {showParentPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 250 }]}>
                <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                <Pressable
                  style={[
                    styles.pickerItem,
                    !formData.parent_location_id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, parent_location_id: null }));
                    setShowParentPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>None (Top Level)</Text>
                </Pressable>
                {filteredParentLocations.map((loc) => (
                  <Pressable
                    key={loc.id}
                    style={[
                      styles.pickerItem,
                      formData.parent_location_id === loc.id && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, parent_location_id: loc.id }));
                      setShowParentPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>
                      {loc.name} ({loc.location_code})
                    </Text>
                  </Pressable>
                ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Status</Text>
              <Pressable
                style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowStatusPicker(!showStatusPicker)}
              >
                <View style={[styles.statusDot, { backgroundColor: selectedStatus?.color || colors.textTertiary }]} />
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {selectedStatus?.label || 'Select'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </Pressable>
            </View>

            {showStatusPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {LOCATION_STATUSES.map((status) => (
                  <Pressable
                    key={status.value}
                    style={[
                      styles.pickerItem,
                      formData.status === status.value && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, status: status.value }));
                      setShowStatusPicker(false);
                    }}
                  >
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{status.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={formData.description || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                placeholder="Description of this area/location..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Building</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.building || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, building: text }))}
                  placeholder="Building A"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Floor</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.floor_number || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, floor_number: text }))}
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Room #</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.room_number || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, room_number: text }))}
                  placeholder="101"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Sq Ft</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.square_footage?.toString() || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, square_footage: text ? parseFloat(text) : null }))}
                  placeholder="1000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Max Occupancy</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.max_occupancy?.toString() || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, max_occupancy: text ? parseInt(text, 10) : null }))}
                placeholder="50"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Attributes</Text>
              <View style={styles.toggleGrid}>
                <ToggleButton
                  label="Production"
                  value={formData.is_production || false}
                  onToggle={() => setFormData((prev) => ({ ...prev, is_production: !prev.is_production }))}
                  icon={Activity}
                />
                <ToggleButton
                  label="Storage"
                  value={formData.is_storage || false}
                  onToggle={() => setFormData((prev) => ({ ...prev, is_storage: !prev.is_storage }))}
                  icon={Package}
                />
                <ToggleButton
                  label="Climate Ctrl"
                  value={formData.is_climate_controlled || false}
                  onToggle={() => setFormData((prev) => ({ ...prev, is_climate_controlled: !prev.is_climate_controlled }))}
                  icon={Thermometer}
                />
                <ToggleButton
                  label="Hazardous"
                  value={formData.is_hazardous || false}
                  onToggle={() => setFormData((prev) => ({ ...prev, is_hazardous: !prev.is_hazardous }))}
                  icon={AlertCircle}
                />
                <ToggleButton
                  label="Restricted"
                  value={formData.is_restricted || false}
                  onToggle={() => setFormData((prev) => ({ ...prev, is_restricted: !prev.is_restricted }))}
                  icon={Shield}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={formData.notes || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{isEditing ? 'Update' : 'Create'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AreasScreen() {
  const { colors } = useTheme();
  const { data: facilities = [] } = useFacilities();
  const { data: departments = [] } = useDepartments();
  const createDepartment = useCreateDepartment();
  const { data: locations, isLoading, refetch, isRefetching } = useLocations();
  const deleteLocation = useDeleteLocation();
  const toggleStatus = useToggleLocationStatus();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithFacility | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [collapsedFacs, setCollapsedFacs] = useState<Record<string, boolean>>({});
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [filterFacility, setFilterFacility] = useState<string | null>(null);
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const { data: nextCode = 'LOC-001' } = useNextLocationCode(filterFacility || facilities[0]?.id || null);

  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    const base = !filterFacility ? locations : locations.filter((l) => l.facility_id === filterFacility);
    
    // Build tree-ordered list with depth
    const buildTree = (parentId: string | null, depth: number): Array<LocationWithFacility & { _depth: number }> => {
      const children = base.filter(l => (l.parent_location_id || null) === parentId);
      children.sort((a, b) => a.name.localeCompare(b.name));
      const result: Array<LocationWithFacility & { _depth: number }> = [];
      for (const child of children) {
        result.push({ ...child, _depth: depth });
        result.push(...buildTree(child.id, depth + 1));
      }
      return result;
    };
    
    return buildTree(null, 0);
  }, [locations, filterFacility]);

  const selectedFilterFacility = facilities.find((f) => f.id === filterFacility);

  // Check if a location has children in the current list
  const childrenMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (locations || []).forEach(l => {
      if (l.parent_location_id) {
        if (!map[l.parent_location_id]) map[l.parent_location_id] = [];
        map[l.parent_location_id].push(l.id);
      }
    });
    return map;
  }, [locations]);

  // Check if any ancestor is collapsed
  const isHiddenByCollapse = useCallback((location: LocationWithFacility) => {
    let pid = location.parent_location_id;
    while (pid) {
      if (collapsedNodes[pid]) return true;
      const parent = (locations || []).find(l => l.id === pid);
      pid = parent?.parent_location_id || null;
    }
    return false;
  }, [collapsedNodes, locations]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Group locations by facility → department ──
  // Departments are ORG-LEVEL (not per-facility), so show all under every facility
  // Locations ARE facility-specific
  const facilityTree = useMemo(() => {
    const activeFacs = facilities.filter(f => (f as any).active !== false);
    const allDepts = departments.filter(d => d.status === 'active');
    return activeFacs.map(fac => {
      const deptEntries = Object.entries(DEPARTMENT_CODES).map(([code, info]) => {
        const dbDept = allDepts.find(d => d.department_code === code);
        const locs = dbDept ? (locations || []).filter(l => l.facility_id === fac.id && l.department_id === dbDept.id) : [];
        return { code, name: info.name, color: info.color, dbDept, locs };
      });
      const facLocs = (locations || []).filter(l => l.facility_id === fac.id);
      return { facility: fac, deptEntries, totalLocs: facLocs.length };
    });
  }, [facilities, departments, locations]);

  // ── Auto-create missing department records (org-level, not per-facility) ──
  const syncingRef = useRef(false);
  useEffect(() => {
    if (syncingRef.current || facilities.length === 0) return;
    // Departments are org-level with unique constraint on (org_id, dept_code)
    // Only create codes that don't exist at all
    const existingCodes = new Set(departments.map(d => d.department_code));
    const missing: Array<{ code: string; name: string; color: string }> = [];
    for (const [code, info] of Object.entries(DEPARTMENT_CODES)) {
      if (!existingCodes.has(code)) {
        missing.push({ code, name: info.name, color: info.color });
      }
    }
    if (missing.length === 0) return;
    syncingRef.current = true;
    (async () => {
      for (const m of missing) {
        try {
          const deptInfo = DEPARTMENT_CODES[m.code];
          await createDepartment.mutateAsync({
            name: m.name,
            department_code: m.code,
            facility_id: facilities[0]?.id || null,
            color: m.color,
            gl_account: deptInfo?.glAccountPrefix ? deptInfo.glAccountPrefix + '-001' : '',
            cost_center: deptInfo?.costCenterPrefix ? deptInfo.costCenterPrefix + '-001' : '',
            status: 'active',
            is_production: ['1003'].includes(m.code),
            is_support: ['1000', '1006', '1009'].includes(m.code),
          } as any);
        } catch (e: any) {
          if (!e.message?.includes('duplicate') && !e.message?.includes('23505')) {
            console.warn('[Areas] Failed to auto-create dept', m.code, e.message);
          }
        }
      }
      syncingRef.current = false;
    })();
  }, [facilities, departments, createDepartment]);

  // Pre-fill state for new locations added from tree
  const [preFill, setPreFill] = useState<{ facilityId?: string; departmentId?: string } | null>(null);

  const handleAddLocation = useCallback((prefillFacilityId?: string, prefillDeptId?: string) => {
    setPreFill(prefillFacilityId ? { facilityId: prefillFacilityId, departmentId: prefillDeptId } : null);
    setSelectedLocation(null);
    setModalVisible(true);
  }, []);

  const handleEditLocation = useCallback((location: LocationWithFacility) => {
    setSelectedLocation(location);
    setModalVisible(true);
  }, []);

  const handleDeleteLocation = useCallback((location: LocationWithFacility) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocation.mutateAsync(location.id);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete location');
            }
          },
        },
      ]
    );
  }, [deleteLocation]);

  const handleToggleStatus = useCallback(async (location: LocationWithFacility) => {
    const newStatus: LocationStatus = location.status === 'active' ? 'inactive' : 'active';
    try {
      await toggleStatus.mutateAsync({ id: location.id, status: newStatus });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update location status');
    }
  }, [toggleStatus]);

  const getStatusColor = (status: LocationStatus) => {
    const found = LOCATION_STATUSES.find((s) => s.value === status);
    return found?.color || colors.textTertiary;
  };

  const getStatusLabel = (status: LocationStatus) => {
    const found = LOCATION_STATUSES.find((s) => s.value === status);
    return found?.label || status;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Filter by Facility</Text>
          <Pressable
            style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowFilterPicker(!showFilterPicker)}
          >
            <Building2 size={16} color={colors.primary} />
            <Text style={[styles.filterText, { color: colors.text }]} numberOfLines={1}>
              {selectedFilterFacility ? selectedFilterFacility.name : 'All Facilities'}
            </Text>
            <ChevronDown size={16} color={colors.textTertiary} />
          </Pressable>

          {showFilterPicker && (
            <View style={[styles.filterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                style={[styles.filterItem, !filterFacility && { backgroundColor: colors.primary + '15' }]}
                onPress={() => {
                  setFilterFacility(null);
                  setShowFilterPicker(false);
                }}
              >
                <Text style={[styles.filterItemText, { color: colors.text }]}>All Facilities</Text>
              </Pressable>
              {facilities.map((facility) => (
                <Pressable
                  key={facility.id}
                  style={[
                    styles.filterItem,
                    filterFacility === facility.id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    setFilterFacility(facility.id);
                    setShowFilterPicker(false);
                  }}
                >
                  <Text style={[styles.filterItemText, { color: colors.text }]}>
                    {facility.name} ({facility.facility_code})
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Areas/Locations {filteredLocations?.length ? `(${filteredLocations.length})` : ''}
            </Text>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => handleAddLocation()}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading areas...</Text>
            </View>
          ) : facilityTree.length > 0 ? (
            facilityTree
              .filter(ft => !filterFacility || ft.facility.id === filterFacility)
              .map(({ facility, deptEntries, totalLocs }) => {
              const facCollapsed = collapsedFacs[facility.id];
              return (
                <View key={facility.id} style={{ marginBottom: 10 }}>
                  {/* ── Facility Header ── */}
                  <Pressable
                    onPress={() => setCollapsedFacs(p => ({ ...p, [facility.id]: !p[facility.id] }))}
                    style={[styles.locationItem, {
                      backgroundColor: colors.primary + '08',
                      borderColor: colors.primary + '30',
                      borderWidth: 1.5,
                      paddingVertical: 10,
                    }]}
                  >
                    <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginRight: -4 }}>
                      {facCollapsed
                        ? <ChevronRight size={18} color={colors.primary} />
                        : <ChevronDown size={18} color={colors.primary} />}
                    </View>
                    <View style={[styles.locationItemIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Building2 size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{facility.name}</Text>
                      <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                        {(facility as any).facility_code} • {deptEntries.length} depts • {totalLocs} location{totalLocs !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </Pressable>

                  {/* ── Departments under this facility ── */}
                  {!facCollapsed && deptEntries.map(de => {
                    const dKey = `${facility.id}-${de.code}`;
                    const deptCollapsed = collapsedDepts[dKey];
                    const deptColor = de.color || '#6B7280';

                    // Build tree-ordered locations for this dept
                    const buildDeptTree = (parentId: string | null, depth: number): Array<LocationWithFacility & { _depth: number }> => {
                      const kids = de.locs
                        .filter(l => (l.parent_location_id || null) === parentId)
                        .sort((a, b) => a.name.localeCompare(b.name));
                      const result: Array<LocationWithFacility & { _depth: number }> = [];
                      for (const kid of kids) {
                        result.push({ ...kid, _depth: depth });
                        result.push(...buildDeptTree(kid.id, depth + 1));
                      }
                      return result;
                    };
                    const treeLocations = buildDeptTree(null, 0);

                    return (
                      <View key={dKey}>
                        {/* Department Row */}
                        <Pressable
                          onPress={() => setCollapsedDepts(p => ({ ...p, [dKey]: !p[dKey] }))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            marginLeft: 24,
                            marginTop: 2,
                            borderRadius: 8,
                            backgroundColor: deptColor + '08',
                            borderWidth: 1,
                            borderColor: deptColor + '25',
                          }}
                        >
                          <View style={{ width: 22, alignItems: 'center' }}>
                            {deptCollapsed
                              ? <ChevronRight size={16} color={deptColor} />
                              : <ChevronDown size={16} color={deptColor} />}
                          </View>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: deptColor }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{de.name}</Text>
                            <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                              {de.code} • {de.locs.length} location{de.locs.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </Pressable>

                        {/* Locations under this department */}
                        {!deptCollapsed && de.dbDept && treeLocations.map((location) => {
                          const TypeIcon = getLocationTypeIcon(location.location_type);
                          const depth = location._depth || 0;
                          const hasChildren = !!(childrenMap[location.id] && childrenMap[location.id].length > 0);
                          const isCollapsed = collapsedNodes[location.id];
                          const childCount = childrenMap[location.id]?.length || 0;

                          if (isHiddenByCollapse(location)) return null;

                          return (
                            <Pressable
                              key={location.id}
                              style={[
                                styles.locationItem,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: location.status === 'active' ? colors.border : colors.textTertiary,
                                  opacity: location.status === 'active' ? 1 : 0.7,
                                  marginLeft: 48 + depth * 24,
                                },
                              ]}
                              onPress={() => handleEditLocation(location)}
                            >
                              {hasChildren ? (
                                <Pressable
                                  onPress={(e) => { e.stopPropagation?.(); toggleCollapse(location.id); }}
                                  hitSlop={10}
                                  style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginRight: -4 }}
                                >
                                  {isCollapsed
                                    ? <ChevronRight size={18} color={colors.textSecondary} />
                                    : <ChevronDown size={18} color={colors.textSecondary} />}
                                </Pressable>
                              ) : (
                                <View style={{ width: 28, marginRight: -4 }} />
                              )}
                              <View
                                style={[
                                  styles.locationItemIcon,
                                  { backgroundColor: location.status === 'active' ? deptColor + '18' : colors.backgroundSecondary },
                                ]}
                              >
                                <TypeIcon size={20} color={location.status === 'active' ? deptColor : colors.textTertiary} />
                              </View>
                              <View style={styles.locationItemContent}>
                                <View style={styles.locationItemHeader}>
                                  <Text style={[styles.locationItemName, { color: colors.text }]}>{location.name}</Text>
                                  {hasChildren && isCollapsed && (
                                    <View style={{ backgroundColor: deptColor + '20', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 }}>
                                      <Text style={{ fontSize: 10, color: deptColor, fontWeight: '600' }}>{childCount}</Text>
                                    </View>
                                  )}
                                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(location.status) + '20' }]}>
                                    <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(location.status) }]} />
                                    <Text style={[styles.statusText, { color: getStatusColor(location.status) }]}>
                                      {getStatusLabel(location.status)}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.locationItemCode, { color: colors.textSecondary }]}>
                                  {location.location_code} • {LOCATION_TYPES.find((t) => t.value === location.location_type)?.label}
                                </Text>
                                <View style={styles.attributeTags}>
                                  {location.is_production && (
                                    <View style={[styles.attributeTag, { backgroundColor: colors.primary + '15' }]}>
                                      <Activity size={10} color={colors.primary} />
                                      <Text style={[styles.attributeTagText, { color: colors.primary }]}>Production</Text>
                                    </View>
                                  )}
                                  {location.is_storage && (
                                    <View style={[styles.attributeTag, { backgroundColor: colors.info + '15' }]}>
                                      <Package size={10} color={colors.info} />
                                      <Text style={[styles.attributeTagText, { color: colors.info }]}>Storage</Text>
                                    </View>
                                  )}
                                  {location.is_hazardous && (
                                    <View style={[styles.attributeTag, { backgroundColor: colors.error + '15' }]}>
                                      <AlertCircle size={10} color={colors.error} />
                                      <Text style={[styles.attributeTagText, { color: colors.error }]}>Hazardous</Text>
                                    </View>
                                  )}
                                  {location.is_restricted && (
                                    <View style={[styles.attributeTag, { backgroundColor: colors.warning + '15' }]}>
                                      <Shield size={10} color={colors.warning} />
                                      <Text style={[styles.attributeTagText, { color: colors.warning }]}>Restricted</Text>
                                    </View>
                                  )}
                                  {location.max_occupancy && (
                                    <View style={[styles.attributeTag, { backgroundColor: colors.backgroundSecondary }]}>
                                      <Users size={10} color={colors.textSecondary} />
                                      <Text style={[styles.attributeTagText, { color: colors.textSecondary }]}>
                                        Max {location.max_occupancy}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              <View style={styles.locationItemActions}>
                                <Pressable
                                  style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                                  onPress={() => handleToggleStatus(location)}
                                  hitSlop={8}
                                >
                                  <Power size={16} color={location.status === 'active' ? colors.success : colors.textTertiary} />
                                </Pressable>
                                <Pressable
                                  style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                                  onPress={() => handleEditLocation(location)}
                                  hitSlop={8}
                                >
                                  <Edit2 size={16} color={colors.primary} />
                                </Pressable>
                                <Pressable
                                  style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                                  onPress={() => handleDeleteLocation(location)}
                                  hitSlop={8}
                                >
                                  <Trash2 size={16} color={colors.error} />
                                </Pressable>
                              </View>
                            </Pressable>
                          );
                        })}

                        {/* Empty dept placeholder */}
                        {!deptCollapsed && de.dbDept && de.locs.length === 0 && (
                          <Pressable
                            onPress={() => handleAddLocation(facility.id, de.dbDept?.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginLeft: 48, marginVertical: 4, paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
                          >
                            <Plus size={13} color={colors.textTertiary} />
                            <Text style={{ fontSize: 11, color: colors.textTertiary }}>Add location to {de.name}</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MapPin size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Facilities Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Create facilities in Settings → Facilities, then add departments and locations here.
              </Text>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAddLocation()}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Area/Location</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Area & Location Management</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Define physical spaces: rooms, floors, production lines, zones
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Create hierarchies with parent/child relationships
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Track attributes: production, storage, hazardous, climate-controlled
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Assign equipment and materials to specific locations
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <LocationModal
        key={selectedLocation?.id || `new-${preFill?.facilityId}-${preFill?.departmentId}`}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedLocation(null);
          setPreFill(null);
        }}
        location={selectedLocation}
        facilities={facilities}
        departments={departments}
        locations={locations || []}
        nextCode={nextCode}
        prefillFacilityId={preFill?.facilityId}
        prefillDepartmentId={preFill?.departmentId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 6,
    paddingLeft: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filterDropdown: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterItem: {
    padding: 12,
  },
  filterItemText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  locationItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationItemContent: {
    flex: 1,
  },
  locationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  locationItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  locationItemCode: {
    fontSize: 12,
    marginBottom: 2,
  },
  locationItemFacility: {
    fontSize: 11,
    marginBottom: 6,
  },
  attributeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attributeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributeTagText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  locationItemActions: {
    flexDirection: 'column',
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  hierarchyBreadcrumb: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  hierarchyLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  hierarchyPath: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  hierarchyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hierarchyText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  hierarchySeparator: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  hierarchyNewItem: {
    fontSize: 13,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top' as const,
  },
  row: {
    flexDirection: 'row',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
  },
  pickerDropdown: {
    marginTop: -12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 280,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  pickerItemText: {
    fontSize: 14,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
