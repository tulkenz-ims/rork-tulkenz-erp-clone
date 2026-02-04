import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProcurementVendorsQuery, useCreateProcurementVendor, useUpdateProcurementVendor, useDeleteProcurementVendor } from '@/hooks/useSupabaseProcurement';
import { Building2, Search, Plus, Filter, Star, Phone, Mail, MapPin, ChevronRight, X, Edit2, Trash2, CheckCircle, XCircle, Globe, CreditCard } from 'lucide-react-native';

const VENDOR_TYPES = [
  { key: 'supplier', label: 'Supplier', color: '#3B82F6' },
  { key: 'service', label: 'Service', color: '#8B5CF6' },
  { key: 'contractor', label: 'Contractor', color: '#F59E0B' },
  { key: 'distributor', label: 'Distributor', color: '#10B981' },
];

const PAYMENT_TERMS = [
  { key: 'net_10', label: 'Net 10' },
  { key: 'net_15', label: 'Net 15' },
  { key: 'net_30', label: 'Net 30' },
  { key: 'net_45', label: 'Net 45' },
  { key: 'net_60', label: 'Net 60' },
  { key: 'net_90', label: 'Net 90' },
  { key: 'cod', label: 'COD' },
  { key: 'prepaid', label: 'Prepaid' },
];

export default function VendorMasterScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);

  const { data: vendors = [], isLoading, refetch } = useProcurementVendorsQuery();
  const createVendor = useCreateProcurementVendor({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Vendor created successfully');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateVendor = useUpdateProcurementVendor({
    onSuccess: () => {
      setEditingVendor(null);
      Alert.alert('Success', 'Vendor updated');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const deleteVendor = useDeleteProcurementVendor({
    onSuccess: () => Alert.alert('Success', 'Vendor deleted'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredVendors = useMemo(() => {
    let filtered = vendors;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.vendor_code.toLowerCase().includes(query) ||
          (v.contact_name || '').toLowerCase().includes(query)
      );
    }

    if (filterType) {
      filtered = filtered.filter((v) => v.vendor_type === filterType);
    }

    if (filterActive !== null) {
      filtered = filtered.filter((v) => v.active === filterActive);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors, searchQuery, filterType, filterActive]);

  const stats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.active).length;
    const suppliers = vendors.filter((v) => v.vendor_type === 'supplier').length;
    const services = vendors.filter((v) => v.vendor_type === 'service').length;

    return { total, active, suppliers, services };
  }, [vendors]);

  const handleDelete = (vendor: any) => {
    Alert.alert('Delete Vendor', `Are you sure you want to delete "${vendor.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteVendor.mutate(vendor.id) },
    ]);
  };

  const handleToggleActive = (vendor: any) => {
    updateVendor.mutate({
      id: vendor.id,
      updates: { active: !vendor.active },
    });
  };

  const getTypeConfig = (type: string) => {
    return VENDOR_TYPES.find((t) => t.key === type) || VENDOR_TYPES[0];
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    titleIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#3B82F615',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3B82F6',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 8,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
      fontSize: 14,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      marginLeft: 8,
      color: colors.text,
      fontSize: 15,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    filterChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    vendorCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    vendorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    vendorIcon: {
      width: 52,
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vendorInitial: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    vendorInfo: {
      flex: 1,
    },
    vendorName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    vendorCode: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    vendorMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    vendorContact: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    contactText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    vendorActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 6,
    },
    actionButtonBorder: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    typeOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
    },
    typeOptionSelected: {
      borderColor: '#3B82F6',
      backgroundColor: '#3B82F610',
    },
    typeOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    typeOptionTextSelected: {
      color: '#3B82F6',
      fontWeight: '500' as const,
    },
    paymentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    paymentOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    paymentOptionSelected: {
      backgroundColor: '#3B82F615',
      borderColor: '#3B82F6',
    },
    paymentOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    paymentOptionTextSelected: {
      color: '#3B82F6',
      fontWeight: '500' as const,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: '#3B82F6',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const VendorFormModal = ({ visible, onClose, vendor }: { visible: boolean; onClose: () => void; vendor?: any }) => {
    const [vendorCode, setVendorCode] = useState(vendor?.vendor_code || '');
    const [name, setName] = useState(vendor?.name || '');
    const [vendorType, setVendorType] = useState(vendor?.vendor_type || 'supplier');
    const [contactName, setContactName] = useState(vendor?.contact_name || '');
    const [phone, setPhone] = useState(vendor?.phone || '');
    const [email, setEmail] = useState(vendor?.email || '');
    const [address, setAddress] = useState(vendor?.address || '');
    const [city, setCity] = useState(vendor?.city || '');
    const [state, setState] = useState(vendor?.state || '');
    const [zipCode, setZipCode] = useState(vendor?.zip_code || '');
    const [paymentTerms, setPaymentTerms] = useState(vendor?.payment_terms || 'net_30');
    const [website, setWebsite] = useState(vendor?.website || '');
    const [taxId, setTaxId] = useState(vendor?.tax_id || '');

    const handleSubmit = () => {
      if (!vendorCode.trim() || !name.trim()) {
        Alert.alert('Error', 'Please fill in required fields');
        return;
      }

      const vendorData = {
        vendor_code: vendorCode,
        name,
        vendor_type: vendorType,
        contact_name: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        country: 'USA',
        payment_terms: paymentTerms,
        website: website || null,
        tax_id: taxId || null,
        active: true,
        categories: [],
        certifications: [],
        insurance: {},
        performance: { onTimeDeliveryRate: 0, qualityScore: 0, responseTime: 0, totalOrders: 0 },
        notes: null,
      };

      if (vendor) {
        updateVendor.mutate({ id: vendor.id, updates: vendorData });
      } else {
        createVendor.mutate(vendorData as any);
      }
    };

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{vendor ? 'Edit Vendor' : 'New Vendor'}</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor Code *</Text>
                <TextInput
                  style={styles.formInput}
                  value={vendorCode}
                  onChangeText={setVendorCode}
                  placeholder="e.g., VND-001"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter vendor name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vendor Type</Text>
                <View style={styles.typeGrid}>
                  {VENDOR_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.typeOption, vendorType === type.key && styles.typeOptionSelected]}
                      onPress={() => setVendorType(type.key)}
                    >
                      <Building2 size={20} color={vendorType === type.key ? type.color : colors.textSecondary} />
                      <Text style={[styles.typeOptionText, vendorType === type.key && styles.typeOptionTextSelected]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Primary contact"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="vendor@email.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Address</Text>
                <TextInput
                  style={styles.formInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street address"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 2 }]}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={state}
                    onChangeText={setState}
                    placeholder="State"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={zipCode}
                    onChangeText={setZipCode}
                    placeholder="ZIP"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Terms</Text>
                <View style={styles.paymentGrid}>
                  {PAYMENT_TERMS.map((term) => (
                    <TouchableOpacity
                      key={term.key}
                      style={[styles.paymentOption, paymentTerms === term.key && styles.paymentOptionSelected]}
                      onPress={() => setPaymentTerms(term.key)}
                    >
                      <Text style={[styles.paymentOptionText, paymentTerms === term.key && styles.paymentOptionTextSelected]}>
                        {term.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Website</Text>
                <TextInput
                  style={styles.formInput}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://www.vendor.com"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tax ID</Text>
                <TextInput
                  style={styles.formInput}
                  value={taxId}
                  onChangeText={setTaxId}
                  placeholder="XX-XXXXXXX"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={createVendor.isPending || updateVendor.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createVendor.isPending || updateVendor.isPending ? 'Saving...' : 'Save Vendor'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <View style={styles.titleIcon}>
              <Building2 size={24} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.title}>Vendor Master</Text>
              <Text style={styles.subtitle}>Central vendor directory</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search vendors..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterActive === true && styles.filterChipActive]}
            onPress={() => setFilterActive(filterActive === true ? null : true)}
          >
            <Text style={[styles.filterChipText, filterActive === true && styles.filterChipTextActive]}>Active</Text>
          </TouchableOpacity>
          {VENDOR_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.filterChip, filterType === type.key && styles.filterChipActive]}
              onPress={() => setFilterType(filterType === type.key ? null : type.key)}
            >
              <Text style={[styles.filterChipText, filterType === type.key && styles.filterChipTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.suppliers}</Text>
            <Text style={styles.statLabel}>Suppliers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.services}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
        </View>

        {filteredVendors.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Building2 size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Vendors Found</Text>
            <Text style={styles.emptyText}>Add vendors to your master list</Text>
          </View>
        ) : (
          filteredVendors.map((vendor) => {
            const typeConfig = getTypeConfig(vendor.vendor_type);
            return (
              <View key={vendor.id} style={styles.vendorCard}>
                <View style={styles.vendorHeader}>
                  <View style={[styles.vendorIcon, { backgroundColor: typeConfig.color }]}>
                    <Text style={styles.vendorInitial}>{vendor.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{vendor.name}</Text>
                    <Text style={styles.vendorCode}>{vendor.vendor_code}</Text>
                    <View style={styles.vendorMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
                        <Text style={styles.typeBadgeText}>{typeConfig.label}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: vendor.active ? '#10B98115' : '#EF444415' },
                        ]}
                      >
                        {vendor.active ? (
                          <CheckCircle size={12} color="#10B981" />
                        ) : (
                          <XCircle size={12} color="#EF4444" />
                        )}
                        <Text style={[styles.statusText, { color: vendor.active ? '#10B981' : '#EF4444' }]}>
                          {vendor.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </View>

                {(vendor.contact_name || vendor.phone || vendor.email) && (
                  <View style={styles.vendorContact}>
                    {vendor.contact_name && (
                      <View style={styles.contactRow}>
                        <Star size={14} color={colors.textSecondary} />
                        <Text style={styles.contactText}>{vendor.contact_name}</Text>
                      </View>
                    )}
                    {vendor.phone && (
                      <View style={styles.contactRow}>
                        <Phone size={14} color={colors.textSecondary} />
                        <Text style={styles.contactText}>{vendor.phone}</Text>
                      </View>
                    )}
                    {vendor.email && (
                      <View style={styles.contactRow}>
                        <Mail size={14} color={colors.textSecondary} />
                        <Text style={styles.contactText}>{vendor.email}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.vendorActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonBorder]}
                    onPress={() => setEditingVendor(vendor)}
                  >
                    <Edit2 size={16} color="#3B82F6" />
                    <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonBorder]}
                    onPress={() => handleToggleActive(vendor)}
                  >
                    {vendor.active ? (
                      <>
                        <XCircle size={16} color="#F59E0B" />
                        <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Deactivate</Text>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Activate</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(vendor)}>
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <VendorFormModal
        visible={showCreateModal || !!editingVendor}
        onClose={() => {
          setShowCreateModal(false);
          setEditingVendor(null);
        }}
        vendor={editingVendor}
      />
    </View>
  );
}
