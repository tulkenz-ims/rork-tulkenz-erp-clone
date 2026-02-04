import React, { useState, useCallback, useEffect } from 'react';
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
  Building,
  Plus,
  ChevronRight,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Phone,
  Globe,
  Clock,
  Power,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useFacilities,
  useCreateFacility,
  useUpdateFacility,
  useDeleteFacility,
  useToggleFacilityStatus,
  useNextFacilityNumber,
} from '@/hooks/useFacilities';
import type { Facility, FacilityFormData } from '@/types/facility';

const TIMEZONES = [
  { label: 'Eastern (ET)', value: 'America/New_York' },
  { label: 'Central (CT)', value: 'America/Chicago' },
  { label: 'Mountain (MT)', value: 'America/Denver' },
  { label: 'Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'Alaska (AKT)', value: 'America/Anchorage' },
  { label: 'Hawaii (HT)', value: 'Pacific/Honolulu' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface FacilityModalProps {
  visible: boolean;
  onClose: () => void;
  facility?: Facility | null;
  nextFacilityNumber: number;
}

function FacilityModal({ visible, onClose, facility, nextFacilityNumber }: FacilityModalProps) {
  const { colors } = useTheme();
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const isEditing = !!facility;

  const getInitialFormData = useCallback((): FacilityFormData => ({
    name: facility?.name || '',
    facility_code: facility?.facility_code || '',
    facility_number: facility?.facility_number || nextFacilityNumber,
    address: facility?.address || '',
    city: facility?.city || '',
    state: facility?.state || '',
    zip_code: facility?.zip_code || '',
    country: facility?.country || 'USA',
    phone: facility?.phone || '',
    timezone: facility?.timezone || 'America/Chicago',
    active: facility?.active ?? true,
  }), [facility, nextFacilityNumber]);

  const [formData, setFormData] = useState<FacilityFormData>(getInitialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setFormData(getInitialFormData());
      setErrors({});
    }
  }, [visible, getInitialFormData]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Facility name is required';
    }
    
    if (!formData.facility_code.trim()) {
      newErrors.facility_code = 'Facility code is required';
    } else if (!/^[A-Z0-9-]+$/i.test(formData.facility_code)) {
      newErrors.facility_code = 'Code can only contain letters, numbers, and hyphens';
    }
    
    if (!formData.facility_number || formData.facility_number < 1) {
      newErrors.facility_number = 'Valid facility number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      if (isEditing && facility) {
        await updateFacility.mutateAsync({
          id: facility.id,
          ...formData,
          facility_code: formData.facility_code.toUpperCase(),
        });
      } else {
        await createFacility.mutateAsync({
          ...formData,
          facility_code: formData.facility_code.toUpperCase(),
        });
      }
      onClose();
    } catch (error) {
      console.error('[FacilityModal] Error saving facility:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save facility');
    }
  }, [validate, isEditing, facility, formData, updateFacility, createFacility, onClose]);

  const isLoading = createFacility.isPending || updateFacility.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? 'Edit Facility' : 'Add Facility'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Facility Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: errors.name ? colors.error : colors.border, color: colors.text },
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                placeholder="e.g., Main Headquarters"
                placeholderTextColor={colors.textTertiary}
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Facility Code *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: errors.facility_code ? colors.error : colors.border, color: colors.text },
                  ]}
                  value={formData.facility_code}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, facility_code: text.toUpperCase() }))}
                  placeholder="e.g., HQ-01"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />
                {errors.facility_code && <Text style={[styles.errorText, { color: colors.error }]}>{errors.facility_code}</Text>}
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Facility # *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: errors.facility_number ? colors.error : colors.border, color: colors.text },
                  ]}
                  value={String(formData.facility_number)}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, facility_number: parseInt(text) || 0 }))}
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
                {errors.facility_number && <Text style={[styles.errorText, { color: colors.error }]}>{errors.facility_number}</Text>}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Street Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.address || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
                placeholder="123 Main Street"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.city || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>State</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.state || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, state: text.toUpperCase().slice(0, 2) }))}
                  placeholder="TX"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>ZIP Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.zip_code || ''}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, zip_code: text }))}
                  placeholder="12345"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Country</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={formData.country || 'USA'}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, country: text }))}
                  placeholder="USA"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={formData.phone || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Timezone</Text>
              <View style={styles.timezoneGrid}>
                {TIMEZONES.map((tz) => (
                  <Pressable
                    key={tz.value}
                    style={[
                      styles.timezoneOption,
                      {
                        backgroundColor: formData.timezone === tz.value ? colors.primary + '20' : colors.surface,
                        borderColor: formData.timezone === tz.value ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, timezone: tz.value }))}
                  >
                    <Text
                      style={[
                        styles.timezoneText,
                        { color: formData.timezone === tz.value ? colors.primary : colors.text },
                      ]}
                    >
                      {tz.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.activeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
            >
              <View style={styles.activeToggleContent}>
                <Power size={20} color={formData.active ? colors.success : colors.textTertiary} />
                <Text style={[styles.activeToggleLabel, { color: colors.text }]}>Active</Text>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: formData.active ? colors.success : colors.backgroundSecondary },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: colors.background,
                      transform: [{ translateX: formData.active ? 20 : 0 }],
                    },
                  ]}
                />
              </View>
            </Pressable>
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

export default function FacilitiesScreen() {
  const { colors } = useTheme();
  const { facilities: userFacilities } = useUser();
  const { data: facilities, isLoading, refetch, isRefetching } = useFacilities();
  const { data: nextNumber = 1 } = useNextFacilityNumber();
  const deleteFacility = useDeleteFacility();
  const toggleStatus = useToggleFacilityStatus();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const currentFacility = userFacilities?.[0];

  const handleAddFacility = useCallback(() => {
    setSelectedFacility(null);
    setModalVisible(true);
  }, []);

  const handleEditFacility = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    setModalVisible(true);
  }, []);

  const handleDeleteFacility = useCallback((facility: Facility) => {
    Alert.alert(
      'Delete Facility',
      `Are you sure you want to delete "${facility.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFacility.mutateAsync(facility.id);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete facility');
            }
          },
        },
      ]
    );
  }, [deleteFacility]);

  const handleToggleStatus = useCallback(async (facility: Facility) => {
    try {
      await toggleStatus.mutateAsync({ id: facility.id, active: !facility.active });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update facility status');
    }
  }, [toggleStatus]);

  const formatAddress = (facility: Facility) => {
    const parts = [facility.address, facility.city, facility.state, facility.zip_code].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address set';
  };

  const getTimezoneLabel = (tz: string) => {
    const found = TIMEZONES.find((t) => t.value === tz);
    return found?.label || tz;
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
        {currentFacility && (
          <View style={styles.currentFacilitySection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Current Facility</Text>
            <View style={[styles.currentFacilityCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <View style={[styles.facilityIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Building size={24} color={colors.primary} />
              </View>
              <View style={styles.facilityInfo}>
                <Text style={[styles.facilityName, { color: colors.text }]}>
                  {currentFacility.name}
                </Text>
                <Text style={[styles.facilityCode, { color: colors.textSecondary }]}>
                  Code: {currentFacility.facility_code}
                </Text>
              </View>
              <View style={[styles.activeBadge, { backgroundColor: colors.success + '20' }]}>
                <CheckCircle size={14} color={colors.success} />
                <Text style={[styles.activeBadgeText, { color: colors.success }]}>Active</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              All Facilities {facilities?.length ? `(${facilities.length})` : ''}
            </Text>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary + '20' }]}
              onPress={handleAddFacility}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading facilities...</Text>
            </View>
          ) : facilities && facilities.length > 0 ? (
            facilities.map((facility) => (
              <Pressable
                key={facility.id}
                style={[
                  styles.facilityItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: facility.active ? colors.border : colors.textTertiary,
                    opacity: facility.active ? 1 : 0.7,
                  },
                ]}
                onPress={() => handleEditFacility(facility)}
              >
                <View
                  style={[
                    styles.facilityItemIcon,
                    { backgroundColor: facility.active ? colors.infoBg : colors.backgroundSecondary },
                  ]}
                >
                  <MapPin size={20} color={facility.active ? colors.primary : colors.textTertiary} />
                </View>
                <View style={styles.facilityItemContent}>
                  <View style={styles.facilityItemHeader}>
                    <Text style={[styles.facilityItemName, { color: colors.text }]}>{facility.name}</Text>
                    <View style={[styles.facilityNumberBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.facilityNumberText, { color: colors.primary }]}>
                        #{facility.facility_number}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.facilityItemCode, { color: colors.textSecondary }]}>
                    {facility.facility_code}
                  </Text>
                  <Text style={[styles.facilityItemAddress, { color: colors.textTertiary }]} numberOfLines={1}>
                    {formatAddress(facility)}
                  </Text>
                  <View style={styles.facilityMeta}>
                    {facility.phone && (
                      <View style={styles.metaItem}>
                        <Phone size={12} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>{facility.phone}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Clock size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                        {getTimezoneLabel(facility.timezone)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.facilityItemActions}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => handleToggleStatus(facility)}
                    hitSlop={8}
                  >
                    <Power size={16} color={facility.active ? colors.success : colors.textTertiary} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => handleEditFacility(facility)}
                    hitSlop={8}
                  >
                    <Edit2 size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                    onPress={() => handleDeleteFacility(facility)}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AlertCircle size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Facilities</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Add your first facility to get started with multi-location management.
              </Text>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={handleAddFacility}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Facility</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Facility Management</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Each facility has a unique number for material numbering
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Materials use format: [Facility#]-[DeptCode]-[Sequence]
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Same base materials share codes across facilities
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Stock levels are tracked per facility
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <FacilityModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedFacility(null);
        }}
        facility={selectedFacility}
        nextFacilityNumber={nextNumber}
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
  currentFacilitySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  currentFacilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  facilityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  facilityCode: {
    fontSize: 13,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
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
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  facilityItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityItemContent: {
    flex: 1,
  },
  facilityItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  facilityItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  facilityNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  facilityNumberText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  facilityItemCode: {
    fontSize: 12,
    marginBottom: 2,
  },
  facilityItemAddress: {
    fontSize: 12,
    marginBottom: 4,
  },
  facilityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  facilityItemActions: {
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
    textAlign: 'center',
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
  row: {
    flexDirection: 'row',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  timezoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timezoneOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timezoneText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  activeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeToggleLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
