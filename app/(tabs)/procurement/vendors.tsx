import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Building2,
  CheckCircle,
  XCircle,
  Filter,
  User,
  CreditCard,
  ChevronRight,
  Star,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { PaymentTerms, PAYMENT_TERMS_LABELS } from '@/types/procurement';
import {
  useProcurementVendorsQuery,
  useCreateProcurementVendor,
  useUpdateProcurementVendor,
} from '@/hooks/useSupabaseProcurement';
import { Tables } from '@/lib/supabase';

type ProcurementVendor = Tables['procurement_vendors'];

type FilterStatus = 'all' | 'active' | 'inactive';

interface VendorFormData {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  payment_terms: PaymentTerms;
  notes: string;
  active: boolean;
}

const INITIAL_FORM_DATA: VendorFormData = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  payment_terms: 'net_30',
  notes: '',
  active: true,
};

export default function VendorsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ProcurementVendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>(INITIAL_FORM_DATA);
  const [showPaymentTermsPicker, setShowPaymentTermsPicker] = useState(false);

  const vendorsQuery = useProcurementVendorsQuery({
    searchText: searchQuery || undefined,
  });

  const createVendorMutation = useCreateProcurementVendor({
    onSuccess: () => {
      console.log('[VendorsScreen] Vendor created successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setFormData(INITIAL_FORM_DATA);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to create vendor: ${error.message}`);
    },
  });

  const updateVendorMutation = useUpdateProcurementVendor({
    onSuccess: () => {
      console.log('[VendorsScreen] Vendor updated successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setFormData(INITIAL_FORM_DATA);
      setEditingVendor(null);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to update vendor: ${error.message}`);
    },
  });

  const vendors = vendorsQuery.data || [];
  const refreshing = vendorsQuery.isLoading || vendorsQuery.isFetching;

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && vendor.active) ||
        (filterStatus === 'inactive' && !vendor.active);
      
      return matchesStatus;
    });
  }, [vendors, filterStatus]);

  const activeCount = useMemo(() => vendors.filter(v => v.active).length, [vendors]);
  const inactiveCount = useMemo(() => vendors.filter(v => !v.active).length, [vendors]);

  const onRefresh = useCallback(() => {
    console.log('[VendorsScreen] Refreshing vendors');
    vendorsQuery.refetch();
  }, [vendorsQuery]);

  const handleAddVendor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingVendor(null);
    setFormData(INITIAL_FORM_DATA);
    setModalVisible(true);
  };

  const handleEditVendor = (vendor: ProcurementVendor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      contact_name: vendor.contact_name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      payment_terms: (vendor.payment_terms as PaymentTerms) || 'net_30',
      notes: vendor.notes || '',
      active: vendor.active ?? true,
    });
    setModalVisible(true);
  };

  const handleToggleStatus = (vendor: ProcurementVendor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStatus = !vendor.active;
    Alert.alert(
      newStatus ? 'Activate Vendor' : 'Deactivate Vendor',
      `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${vendor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Activate' : 'Deactivate',
          style: newStatus ? 'default' : 'destructive',
          onPress: () => {
            updateVendorMutation.mutate({
              id: vendor.id,
              updates: { active: newStatus },
            });
          },
        },
      ]
    );
  };

  const handleSaveVendor = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Vendor name is required');
      return;
    }
    if (!formData.contact_name.trim()) {
      Alert.alert('Error', 'Contact name is required');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    const vendorData = {
      name: formData.name.trim(),
      contact_name: formData.contact_name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      zip_code: formData.zip_code.trim() || null,
      payment_terms: formData.payment_terms,
      notes: formData.notes.trim() || null,
      active: formData.active,
    };

    if (editingVendor) {
      updateVendorMutation.mutate({
        id: editingVendor.id,
        updates: vendorData,
      });
    } else {
      createVendorMutation.mutate(vendorData as any);
    }
  };

  const handleCallVendor = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailVendor = (email: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${email}`);
  };

  const renderFilterChip = (status: FilterStatus, label: string, count: number) => {
    const isSelected = filterStatus === status;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setFilterStatus(status);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: isSelected ? '#fff' : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.filterChipBadge,
            {
              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${colors.primary}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.filterChipCount,
              { color: isSelected ? '#fff' : colors.primary },
            ]}
          >
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleViewVendor = (vendor: ProcurementVendor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/procurement/vendordetail',
      params: { vendorId: vendor.id },
    });
  };

  const renderVendorCard = (vendor: ProcurementVendor) => {
    const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.zip_code]
      .filter(Boolean)
      .join(', ');
    const isActive = vendor.active ?? true;

    return (
      <TouchableOpacity
        key={vendor.id}
        style={[
          styles.vendorCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isActive ? 1 : 0.7,
          },
        ]}
        onPress={() => handleViewVendor(vendor)}
        activeOpacity={0.7}
      >
        <View style={styles.vendorHeader}>
          <View style={styles.vendorTitleRow}>
            <View
              style={[
                styles.vendorIcon,
                { backgroundColor: isActive ? '#3B82F615' : '#6B728015' },
              ]}
            >
              <Building2 size={20} color={isActive ? '#3B82F6' : '#6B7280'} />
            </View>
            <View style={styles.vendorTitleContent}>
              <Text style={[styles.vendorName, { color: colors.text }]} numberOfLines={1}>
                {vendor.name || 'Unnamed Vendor'}
              </Text>
              <View style={styles.vendorContactRow}>
                <User size={12} color={colors.textSecondary} />
                <Text style={[styles.vendorContactName, { color: colors.textSecondary }]}>
                  {vendor.contact_name || 'No contact'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.statusBadge,
              {
                backgroundColor: isActive ? '#10B98115' : '#EF444415',
              },
            ]}
            onPress={() => handleToggleStatus(vendor)}
            activeOpacity={0.7}
            disabled={updateVendorMutation.isPending}
          >
            {isActive ? (
              <CheckCircle size={14} color="#10B981" />
            ) : (
              <XCircle size={14} color="#EF4444" />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isActive ? '#10B981' : '#EF4444' },
              ]}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vendorDetails}>
          {vendor.phone && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => handleCallVendor(vendor.phone!)}
              activeOpacity={0.7}
            >
              <Phone size={14} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.text }]}>{vendor.phone}</Text>
            </TouchableOpacity>
          )}

          {vendor.email && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => handleEmailVendor(vendor.email!)}
              activeOpacity={0.7}
            >
              <Mail size={14} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                {vendor.email}
              </Text>
            </TouchableOpacity>
          )}

          {fullAddress && (
            <View style={styles.detailRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text
                style={[styles.detailText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {fullAddress}
              </Text>
            </View>
          )}

          {vendor.payment_terms && (
            <View style={styles.detailRow}>
              <CreditCard size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {PAYMENT_TERMS_LABELS[vendor.payment_terms as PaymentTerms] || vendor.payment_terms}
              </Text>
            </View>
          )}
        </View>

        {vendor.notes && (
          <View style={[styles.notesSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
              {vendor.notes}
            </Text>
          </View>
        )}

        <View style={[styles.vendorActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
            onPress={(e) => {
              e.stopPropagation();
              handleEditVendor(vendor);
            }}
            activeOpacity={0.7}
          >
            <Edit2 size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF615' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleViewVendor(vendor);
            }}
            activeOpacity={0.7}
          >
            <FileText size={16} color="#8B5CF6" />
            <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Docs</Text>
          </TouchableOpacity>
          {vendor.phone && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10B98115' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleCallVendor(vendor.phone!);
              }}
              activeOpacity={0.7}
            >
              <Phone size={16} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPaymentTermsOption = (terms: PaymentTerms) => {
    const isSelected = formData.payment_terms === terms;
    return (
      <TouchableOpacity
        key={terms}
        style={[
          styles.paymentTermOption,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          setFormData(prev => ({ ...prev, payment_terms: terms }));
          setShowPaymentTermsPicker(false);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.paymentTermText, { color: isSelected ? '#fff' : colors.text }]}>
          {PAYMENT_TERMS_LABELS[terms]}
        </Text>
        {isSelected && <CheckCircle size={16} color="#fff" />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Vendors' }} />

      <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search vendors..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Filter size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          {renderFilterChip('all', 'All', vendors.length)}
          {renderFilterChip('active', 'Active', activeCount)}
          {renderFilterChip('inactive', 'Inactive', inactiveCount)}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {vendorsQuery.isLoading && vendors.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading vendors...</Text>
          </View>
        ) : filteredVendors.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Vendors Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'Add a vendor to get started'}
            </Text>
          </View>
        ) : (
          filteredVendors.map(renderVendorCard)
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddVendor}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
            </Text>
            <TouchableOpacity 
              onPress={handleSaveVendor}
              disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
            >
              {(createVendorMutation.isPending || updateVendorMutation.isPending) ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Basic Information</Text>
              
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Vendor Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter vendor name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Contact Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter contact name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.contact_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, contact_name: text }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Phone *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="(555) 123-4567"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.phone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Email *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="vendor@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Address</Text>
              
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Street Address</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="123 Main St"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.address}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 2, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>City</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.city}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                  />
                </View>
                <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>State</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="TX"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.state}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>ZIP</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="77001"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.zip_code}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, zip_code: text }))}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Payment & Status</Text>
              
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Payment Terms</Text>
                <TouchableOpacity
                  style={[styles.formInput, styles.selectInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowPaymentTermsPicker(!showPaymentTermsPicker)}
                >
                  <Text style={{ color: colors.text }}>{PAYMENT_TERMS_LABELS[formData.payment_terms]}</Text>
                </TouchableOpacity>
                {showPaymentTermsPicker && (
                  <View style={[styles.paymentTermsDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {(Object.keys(PAYMENT_TERMS_LABELS) as PaymentTerms[]).map(renderPaymentTermsOption)}
                  </View>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={styles.statusToggle}>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleOption,
                      {
                        backgroundColor: formData.active ? '#10B981' : colors.surface,
                        borderColor: formData.active ? '#10B981' : colors.border,
                      },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, active: true }))}
                  >
                    <CheckCircle size={16} color={formData.active ? '#fff' : colors.textSecondary} />
                    <Text style={{ color: formData.active ? '#fff' : colors.textSecondary, marginLeft: 6, fontWeight: '500' as const }}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleOption,
                      {
                        backgroundColor: !formData.active ? '#EF4444' : colors.surface,
                        borderColor: !formData.active ? '#EF4444' : colors.border,
                      },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, active: false }))}
                  >
                    <XCircle size={16} color={!formData.active ? '#fff' : colors.textSecondary} />
                    <Text style={{ color: !formData.active ? '#fff' : colors.textSecondary, marginLeft: 6, fontWeight: '500' as const }}>
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[styles.formInput, styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Add notes about this vendor..."
                placeholderTextColor={colors.textSecondary}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  filterChipCount: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  vendorCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
  },
  vendorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  vendorIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vendorTitleContent: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  vendorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorContactName: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  vendorDetails: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  notesSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  notesText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  vendorActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  loadingState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  bottomPadding: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  formField: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500' as const,
  },
  formInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  selectInput: {
    justifyContent: 'center',
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  paymentTermsDropdown: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  paymentTermOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  paymentTermText: {
    fontSize: 14,
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  statusToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBottomPadding: {
    height: 40,
  },
});
