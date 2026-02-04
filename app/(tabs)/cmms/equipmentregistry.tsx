import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Cog,
  MapPin,
  Tag,
  Calendar,
  FileText,
  Save,
  X,
  ChevronDown,
  Shield,
  Building2,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  useCreateEquipment, 
  useEquipmentCategories,
  EquipmentStatus,
  EquipmentCriticality,
} from '@/hooks/useSupabaseEquipment';
import { useFacilities } from '@/hooks/useFacilities';
import { useLocationsByFacility } from '@/hooks/useLocations';
import * as Haptics from 'expo-haptics';

const CRITICALITY_OPTIONS: EquipmentCriticality[] = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS: EquipmentStatus[] = ['operational', 'needs_maintenance', 'down', 'retired'];
const DEFAULT_CATEGORIES = ['CNC Machine', 'Conveyor', 'Compressor', 'HVAC', 'Forklift', 'Generator', 'Pump', 'Press', 'Robot', 'Packaging', 'Grinder', 'Mixer', 'Tank', 'Valve', 'Motor'];

export default function EquipmentRegistryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { organizationId, isLoading: orgLoading } = useOrganization();
  const createEquipmentMutation = useCreateEquipment();
  const { data: dbCategories = [] } = useEquipmentCategories();
  const { data: facilities = [], isLoading: facilitiesLoading } = useFacilities();
  
  const categories = dbCategories.length > 0 ? [...new Set([...dbCategories, ...DEFAULT_CATEGORIES])] : DEFAULT_CATEGORIES;

  const [formData, setFormData] = useState({
    name: '',
    equipment_tag: '',
    category: '',
    status: 'operational' as EquipmentStatus,
    location: '',
    facility_id: '',
    location_id: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    criticality: 'medium' as EquipmentCriticality,
    warranty_expiry: '',
    install_date: '',
  });

  const { data: locations = [], isLoading: locationsLoading } = useLocationsByFacility(formData.facility_id || undefined);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCriticalityPicker, setShowCriticalityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const selectedFacility = useMemo(() => 
    facilities.find(f => f.id === formData.facility_id),
    [facilities, formData.facility_id]
  );

  const selectedLocation = useMemo(() => 
    locations.find(l => l.id === formData.location_id),
    [locations, formData.location_id]
  );

  const activeLocations = useMemo(() => 
    locations.filter(l => l.status === 'active'),
    [locations]
  );

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'facility_id' && value !== prev.facility_id) {
        updated.location_id = '';
      }
      return updated;
    });
  }, []);

  const validateForm = useCallback(() => {
    if (!organizationId) {
      Alert.alert('Error', 'Please select an organization in Settings first');
      return false;
    }
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Equipment name is required');
      return false;
    }
    if (!formData.equipment_tag.trim()) {
      Alert.alert('Validation Error', 'Equipment tag is required');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Category is required');
      return false;
    }
    if (!formData.facility_id) {
      Alert.alert('Validation Error', 'Facility is required');
      return false;
    }
    return true;
  }, [formData, organizationId]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      const newEquipment = {
        name: formData.name.trim(),
        equipment_tag: formData.equipment_tag.trim().toUpperCase(),
        category: formData.category,
        status: formData.status,
        location: formData.location.trim() || selectedLocation?.name || '',
        facility_id: formData.facility_id,
        location_id: formData.location_id || null,
        criticality: formData.criticality,
        serial_number: formData.serial_number.trim() || null,
        manufacturer: formData.manufacturer.trim() || null,
        model: formData.model.trim() || null,
        warranty_expiry: formData.warranty_expiry || null,
        install_date: formData.install_date || null,
        last_pm_date: null,
        next_pm_date: null,
      };

      const created = await createEquipmentMutation.mutateAsync(newEquipment);
      console.log('[EquipmentRegistry] Equipment created:', created.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Success', 'Equipment has been registered successfully', [
        { text: 'View Equipment', onPress: () => router.replace(`/cmms/equipmentdetail?id=${created.id}`) },
        { text: 'Add Another', onPress: () => setFormData({
          name: '',
          equipment_tag: '',
          category: '',
          status: 'operational',
          location: '',
          facility_id: formData.facility_id,
          location_id: '',
          serial_number: '',
          manufacturer: '',
          model: '',
          criticality: 'medium',
          warranty_expiry: '',
          install_date: '',
        })},
      ]);
    } catch (error) {
      console.error('[EquipmentRegistry] Create error:', error);
      Alert.alert('Error', 'Failed to create equipment');
    }
  }, [formData, validateForm, createEquipmentMutation, router, selectedLocation]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const renderPicker = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { value: string; label: string; subtitle?: string }[],
    selected: string,
    onSelect: (value: string) => void,
    isLoading?: boolean
  ) => {
    if (!visible) return null;
    return (
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <View style={[styles.pickerContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
          {isLoading ? (
            <View style={styles.pickerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.pickerLoadingText, { color: colors.textSecondary }]}>Loading...</Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Text style={[styles.pickerEmptyText, { color: colors.textSecondary }]}>
                No options available
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.pickerScroll}>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    selected === option.value && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <View style={styles.pickerOptionContent}>
                    <Text style={[
                      styles.pickerOptionText,
                      { color: selected === option.value ? colors.primary : colors.text },
                    ]}>
                      {option.label}
                    </Text>
                    {option.subtitle && (
                      <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                        {option.subtitle}
                      </Text>
                    )}
                  </View>
                  {selected === option.value && (
                    <Check size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Register Equipment',
          headerRight: () => (
            <Pressable 
              onPress={handleSave} 
              style={styles.headerButton}
              disabled={createEquipmentMutation.isPending}
            >
              {createEquipmentMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Save size={22} color={colors.primary} />
              )}
            </Pressable>
          ),
        }} 
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {!organizationId && !orgLoading && (
          <Pressable 
            style={[styles.warningBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
            onPress={() => router.push('/settings')}
          >
            <Shield size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: colors.warning }]}>No Organization Selected</Text>
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>Tap here to select an organization in Settings</Text>
            </View>
          </Pressable>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location Assignment</Text>
          
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Facility *</Text>
            <Pressable 
              style={[styles.selectContainer, { borderColor: colors.border }]}
              onPress={() => setShowFacilityPicker(true)}
            >
              <Building2 size={18} color={colors.textSecondary} />
              <Text style={[
                styles.selectText, 
                { color: selectedFacility ? colors.text : colors.textSecondary }
              ]}>
                {selectedFacility ? `${selectedFacility.name} (${selectedFacility.facility_code})` : 'Select facility'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Area/Location</Text>
            <Pressable 
              style={[
                styles.selectContainer, 
                { 
                  borderColor: colors.border,
                  opacity: formData.facility_id ? 1 : 0.5,
                }
              ]}
              onPress={() => formData.facility_id && setShowLocationPicker(true)}
              disabled={!formData.facility_id}
            >
              <MapPin size={18} color={colors.textSecondary} />
              <Text style={[
                styles.selectText, 
                { color: selectedLocation ? colors.text : colors.textSecondary }
              ]}>
                {selectedLocation 
                  ? `${selectedLocation.name} (${selectedLocation.location_code})` 
                  : formData.facility_id 
                    ? 'Select area/location (optional)' 
                    : 'Select facility first'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
            {formData.facility_id && activeLocations.length === 0 && !locationsLoading && (
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                No areas defined for this facility. Add areas in Settings → Areas.
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Location Description</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <MapPin size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.location}
                onChangeText={(text) => updateField('location', text)}
                placeholder="e.g., Near loading dock, Bay 3"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Additional location details or description
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Equipment Name *</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Cog size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
                placeholder="Enter equipment name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Equipment Tag *</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Tag size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.equipment_tag}
                onChangeText={(text) => updateField('equipment_tag', text.toUpperCase())}
                placeholder="e.g., CNC-001, FLK-003"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
            <Pressable 
              style={[styles.selectContainer, { borderColor: colors.border }]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Cog size={18} color={colors.textSecondary} />
              <Text style={[
                styles.selectText, 
                { color: formData.category ? colors.text : colors.textSecondary }
              ]}>
                {formData.category || 'Select category'}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Status</Text>
              <Pressable 
                style={[styles.selectContainer, { borderColor: colors.border }]}
                onPress={() => setShowStatusPicker(true)}
              >
                <Text style={[styles.selectText, { color: colors.text }]}>
                  {formData.status.charAt(0).toUpperCase() + formData.status.slice(1).replace('_', ' ')}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Criticality</Text>
              <Pressable 
                style={[styles.selectContainer, { borderColor: colors.border }]}
                onPress={() => setShowCriticalityPicker(true)}
              >
                <Shield size={18} color={colors.textSecondary} />
                <Text style={[styles.selectText, { color: colors.text }]}>
                  {formData.criticality.charAt(0).toUpperCase() + formData.criticality.slice(1)}
                </Text>
                <ChevronDown size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Details</Text>
          
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Serial Number</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <FileText size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.serial_number}
                onChangeText={(text) => updateField('serial_number', text)}
                placeholder="Enter serial number"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Manufacturer</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.manufacturer}
                  onChangeText={(text) => updateField('manufacturer', text)}
                  placeholder="Manufacturer"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Model</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.model}
                  onChangeText={(text) => updateField('model', text)}
                  placeholder="Model"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dates</Text>
          
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Install Date</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Calendar size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.install_date}
                onChangeText={(text) => updateField('install_date', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Warranty Expiry</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Shield size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.warranty_expiry}
                onChangeText={(text) => updateField('warranty_expiry', text)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={[styles.cancelButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={handleCancel}
          >
            <X size={18} color={colors.text} />
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.saveButton, 
              { 
                backgroundColor: colors.primary,
                opacity: createEquipmentMutation.isPending ? 0.7 : 1,
              }
            ]}
            onPress={handleSave}
            disabled={createEquipmentMutation.isPending}
          >
            {createEquipmentMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Register Equipment</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderPicker(
        showFacilityPicker,
        () => setShowFacilityPicker(false),
        'Select Facility',
        facilities.map(f => ({ 
          value: f.id, 
          label: f.name,
          subtitle: f.facility_code,
        })),
        formData.facility_id,
        (value) => updateField('facility_id', value),
        facilitiesLoading
      )}

      {renderPicker(
        showLocationPicker,
        () => setShowLocationPicker(false),
        'Select Area/Location',
        [
          { value: '', label: 'None', subtitle: 'No specific area' },
          ...activeLocations.map(l => ({ 
            value: l.id, 
            label: l.name,
            subtitle: `${l.location_code} • ${l.location_type.charAt(0).toUpperCase() + l.location_type.slice(1)}`,
          })),
        ],
        formData.location_id,
        (value) => updateField('location_id', value),
        locationsLoading
      )}

      {renderPicker(
        showCategoryPicker,
        () => setShowCategoryPicker(false),
        'Select Category',
        categories.map(cat => ({ value: cat, label: cat })),
        formData.category,
        (value) => updateField('category', value)
      )}

      {renderPicker(
        showCriticalityPicker,
        () => setShowCriticalityPicker(false),
        'Select Criticality',
        CRITICALITY_OPTIONS.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
        formData.criticality,
        (value) => updateField('criticality', value)
      )}

      {renderPicker(
        showStatusPicker,
        () => setShowStatusPicker(false),
        'Select Status',
        STATUS_OPTIONS.map(s => ({ 
          value: s, 
          label: s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') 
        })),
        formData.status,
        (value) => updateField('status', value)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerButton: {
    padding: 4,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContent: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  pickerScroll: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerOptionContent: {
    flex: 1,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  pickerOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  pickerLoadingText: {
    fontSize: 14,
  },
  pickerEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  pickerEmptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
