import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Building2,
  Search,
  Star,
  Phone,
  Mail,
  MapPin,
  Plus,
  X,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Globe,
  FileText,
  Award,
  TrendingUp,
  Truck,
  Edit3,
  Trash2,
  DollarSign,
  Calendar,
  User,

} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_PRICE_AGREEMENTS,
  VENDOR_TYPE_LABELS,
  VENDOR_STATUS_LABELS,
  VENDOR_CATEGORIES,
  PAYMENT_TERMS_LABELS,
  type Vendor,
  type VendorType,
  type VendorStatus,
  type PaymentTerms,
} from '@/constants/vendorsConstants';
import {
  useProcurementVendorsQuery,
  useCreateProcurementVendor,
  useUpdateProcurementVendor,
  useDeleteProcurementVendor,
} from '@/hooks/useSupabaseProcurement';

type ViewMode = 'list' | 'detail' | 'add' | 'edit';

interface NewVendorForm {
  name: string;
  legalName: string;
  type: VendorType;
  status: VendorStatus;
  taxId: string;
  website: string;
  paymentTerms: PaymentTerms;
  creditLimit: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zipCode: string;
  categories: string[];
  notes: string;
}

const INITIAL_FORM: NewVendorForm = {
  name: '',
  legalName: '',
  type: 'supplier',
  status: 'pending_approval',
  taxId: '',
  website: '',
  paymentTerms: 'net_30',
  creditLimit: '',
  contactName: '',
  contactTitle: '',
  contactEmail: '',
  contactPhone: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zipCode: '',
  categories: [],
  notes: '',
};

export default function VendorManagementScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<VendorType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<VendorStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<NewVendorForm>(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState<'info' | 'contacts' | 'performance' | 'agreements'>('info');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const vendorsQuery = useProcurementVendorsQuery({
    vendorType: selectedType !== 'all' ? selectedType : undefined,
    searchText: search || undefined,
  });

  const createVendorMutation = useCreateProcurementVendor({
    onSuccess: () => {
      setShowAddModal(false);
      setFormData(INITIAL_FORM);
      console.log('[VendorManagement] Vendor created successfully');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to create vendor: ${error.message}`);
    },
  });

  const updateVendorMutation = useUpdateProcurementVendor({
    onSuccess: (data) => {
      const updatedVendor = mapSupabaseVendorToLocal(data);
      setSelectedVendor(updatedVendor);
      setViewMode('detail');
      console.log('[VendorManagement] Vendor updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to update vendor: ${error.message}`);
    },
  });

  const deleteVendorMutation = useDeleteProcurementVendor({
    onSuccess: () => {
      setSelectedVendor(null);
      setViewMode('list');
      console.log('[VendorManagement] Vendor deleted successfully');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to delete vendor: ${error.message}`);
    },
  });

  const mapSupabaseVendorToLocal = useCallback((v: any): Vendor => {
    return {
      id: v.id,
      vendorCode: v.vendor_code || `VND-${v.id.slice(0, 6).toUpperCase()}`,
      name: v.name || '',
      legalName: v.legal_name,
      type: (v.vendor_type as VendorType) || 'supplier',
      status: v.active ? 'active' : 'inactive',
      taxId: v.tax_id,
      website: v.website,
      paymentTerms: (v.payment_terms as PaymentTerms) || 'net_30',
      creditLimit: v.credit_limit,
      currency: v.currency || 'USD',
      contacts: v.contact_name ? [{
        id: `contact-${v.id}`,
        name: v.contact_name || '',
        title: v.contact_title || '',
        email: v.contact_email || '',
        phone: v.contact_phone || '',
        isPrimary: true,
      }] : [],
      addresses: v.address_street1 ? [{
        id: `addr-${v.id}`,
        type: 'both' as const,
        street1: v.address_street1 || '',
        street2: v.address_street2,
        city: v.address_city || '',
        state: v.address_state || '',
        zipCode: v.address_zip || '',
        country: v.address_country || 'USA',
        isPrimary: true,
      }] : [],
      certifications: [],
      performance: {
        onTimeDeliveryRate: v.on_time_delivery_rate || 0,
        qualityScore: v.quality_score || 0,
        responseTime: v.response_time || 0,
        totalOrders: v.total_orders || 0,
        returnRate: v.return_rate || 0,
        avgLeadTimeDays: v.avg_lead_time_days || 0,
        lastOrderDate: v.last_order_date,
      },
      categories: v.categories || [],
      departments: v.departments || [],
      notes: v.notes,
      createdAt: v.created_at || new Date().toISOString(),
      updatedAt: v.updated_at || new Date().toISOString(),
      createdBy: v.created_by || 'system',
    };
  }, []);

  const vendors = useMemo(() => {
    const rawVendors = vendorsQuery.data || [];
    let mapped = rawVendors.map(mapSupabaseVendorToLocal);
    
    if (selectedStatus !== 'all') {
      mapped = mapped.filter(v => v.status === selectedStatus);
    }
    
    return mapped;
  }, [vendorsQuery.data, selectedStatus, mapSupabaseVendorToLocal]);

  const refreshing = vendorsQuery.isLoading || vendorsQuery.isFetching;

  const onRefresh = useCallback(() => {
    vendorsQuery.refetch();
    console.log('[VendorManagement] Refreshing vendors');
  }, [vendorsQuery]);

  const filteredVendors = useMemo(() => {
    return vendors;
  }, [vendors]);

  const stats = useMemo(() => ({
    total: vendors.length,
    active: vendors.filter(v => v.status === 'active').length,
    pending: vendors.filter(v => v.status === 'pending_approval').length,
    suppliers: vendors.filter(v => v.type === 'supplier').length,
    services: vendors.filter(v => v.type === 'service').length,
  }), [vendors]);

  const vendorAgreements = useMemo(() => {
    if (!selectedVendor) return [];
    return MOCK_PRICE_AGREEMENTS.filter(pa => pa.vendorId === selectedVendor.id);
  }, [selectedVendor]);

  const getTypeColor = (type: VendorType) => {
    switch (type) {
      case 'supplier': return '#22C55E';
      case 'service': return '#3B82F6';
      case 'contractor': return '#F59E0B';
      case 'distributor': return '#8B5CF6';
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'inactive': return '#6B7280';
      case 'pending_approval': return '#F59E0B';
      case 'suspended': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: VendorStatus) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} color="#22C55E" />;
      case 'inactive': return <Clock size={14} color="#6B7280" />;
      case 'pending_approval': return <Clock size={14} color="#F59E0B" />;
      case 'suspended': return <AlertTriangle size={14} color="#EF4444" />;
      default: return null;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const handleVendorPress = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setActiveTab('info');
    setViewMode('detail');
  };

  const handleAddVendor = () => {
    setFormData(INITIAL_FORM);
    setShowAddModal(true);
  };

  const handleEditVendor = () => {
    if (!selectedVendor) return;
    const primaryContact = selectedVendor.contacts.find(c => c.isPrimary);
    const primaryAddress = selectedVendor.addresses.find(a => a.isPrimary);
    
    setFormData({
      name: selectedVendor.name,
      legalName: selectedVendor.legalName || '',
      type: selectedVendor.type,
      status: selectedVendor.status,
      taxId: selectedVendor.taxId || '',
      website: selectedVendor.website || '',
      paymentTerms: selectedVendor.paymentTerms,
      creditLimit: selectedVendor.creditLimit?.toString() || '',
      contactName: primaryContact?.name || '',
      contactTitle: primaryContact?.title || '',
      contactEmail: primaryContact?.email || '',
      contactPhone: primaryContact?.phone || '',
      street1: primaryAddress?.street1 || '',
      street2: primaryAddress?.street2 || '',
      city: primaryAddress?.city || '',
      state: primaryAddress?.state || '',
      zipCode: primaryAddress?.zipCode || '',
      categories: selectedVendor.categories,
      notes: selectedVendor.notes || '',
    });
    setViewMode('edit');
  };

  const handleDeleteVendor = () => {
    if (!selectedVendor) return;
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete ${selectedVendor.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteVendorMutation.mutate(selectedVendor.id);
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
    if (!formData.contactEmail.trim()) {
      Alert.alert('Error', 'Contact email is required');
      return;
    }

    const vendorData = {
      name: formData.name,
      legal_name: formData.legalName || null,
      vendor_type: formData.type,
      active: formData.status === 'active',
      tax_id: formData.taxId || null,
      website: formData.website || null,
      payment_terms: formData.paymentTerms,
      credit_limit: formData.creditLimit ? parseFloat(formData.creditLimit) : null,
      currency: 'USD',
      contact_name: formData.contactName || null,
      contact_title: formData.contactTitle || null,
      contact_email: formData.contactEmail || null,
      contact_phone: formData.contactPhone || null,
      address_street1: formData.street1 || null,
      address_street2: formData.street2 || null,
      address_city: formData.city || null,
      address_state: formData.state || null,
      address_zip: formData.zipCode || null,
      address_country: 'USA',
      categories: formData.categories,
      notes: formData.notes || null,
    };
    
    if (viewMode === 'edit' && selectedVendor) {
      updateVendorMutation.mutate({
        id: selectedVendor.id,
        updates: vendorData,
      });
    } else {
      createVendorMutation.mutate(vendorData as any);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const renderVendorCard = (vendor: Vendor) => {
    const primaryContact = vendor.contacts.find(c => c.isPrimary);
    const primaryAddress = vendor.addresses.find(a => a.isPrimary);

    return (
      <TouchableOpacity
        key={vendor.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleVendorPress(vendor)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${getTypeColor(vendor.type)}15` }]}>
            <Building2 size={24} color={getTypeColor(vendor.type)} />
          </View>
          <View style={styles.vendorInfo}>
            <Text style={[styles.vendorName, { color: colors.text }]}>{vendor.name}</Text>
            <Text style={[styles.vendorCode, { color: colors.textSecondary }]}>{vendor.vendorCode}</Text>
          </View>
          <View style={styles.badges}>
            <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(vendor.type)}15` }]}>
              <Text style={[styles.typeText, { color: getTypeColor(vendor.type) }]}>
                {VENDOR_TYPE_LABELS[vendor.type]}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(vendor.status)}15` }]}>
              {getStatusIcon(vendor.status)}
              <Text style={[styles.statusText, { color: getStatusColor(vendor.status) }]}>
                {VENDOR_STATUS_LABELS[vendor.status]}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.performanceRow, { borderColor: colors.border }]}>
          <View style={styles.metric}>
            <Star size={14} color="#F59E0B" />
            <Text style={[styles.metricValue, { color: colors.text }]}>{vendor.performance.qualityScore}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Quality</Text>
          </View>
          <View style={styles.metric}>
            <Truck size={14} color="#3B82F6" />
            <Text style={[styles.metricValue, { color: colors.text }]}>{vendor.performance.onTimeDeliveryRate}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>On-Time</Text>
          </View>
          <View style={styles.metric}>
            <FileText size={14} color="#8B5CF6" />
            <Text style={[styles.metricValue, { color: colors.text }]}>{vendor.performance.totalOrders}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Orders</Text>
          </View>
        </View>

        {primaryContact && (
          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <Phone size={14} color={colors.textSecondary} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>{primaryContact.phone}</Text>
            </View>
            <View style={styles.contactItem}>
              <Mail size={14} color={colors.textSecondary} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]} numberOfLines={1}>
                {primaryContact.email}
              </Text>
            </View>
          </View>
        )}

        {primaryAddress && (
          <View style={styles.addressRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
              {primaryAddress.city}, {primaryAddress.state}
            </Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailView = () => {
    if (!selectedVendor) return null;

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.detailContent}
      >
        <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('list')}>
            <ChevronRight size={24} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View style={styles.detailHeaderInfo}>
            <View style={[styles.largeIconContainer, { backgroundColor: `${getTypeColor(selectedVendor.type)}15` }]}>
              <Building2 size={32} color={getTypeColor(selectedVendor.type)} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedVendor.name}</Text>
              <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>{selectedVendor.vendorCode}</Text>
              <View style={styles.detailBadges}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedVendor.status)}15` }]}>
                  {getStatusIcon(selectedVendor.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(selectedVendor.status) }]}>
                    {VENDOR_STATUS_LABELS[selectedVendor.status]}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleEditVendor}
            >
              <Edit3 size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={handleDeleteVendor}
            >
              <Trash2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['info', 'contacts', 'performance', 'agreements'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoCardTitle, { color: colors.text }]}>General Information</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Legal Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{selectedVendor.legalName || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{VENDOR_TYPE_LABELS[selectedVendor.type]}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tax ID</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{selectedVendor.taxId || '-'}</Text>
              </View>
              {selectedVendor.website && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Website</Text>
                  <View style={styles.websiteRow}>
                    <Globe size={14} color={colors.primary} />
                    <Text style={[styles.websiteText, { color: colors.primary }]}>{selectedVendor.website}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoCardTitle, { color: colors.text }]}>Payment Terms</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Terms</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{PAYMENT_TERMS_LABELS[selectedVendor.paymentTerms]}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Credit Limit</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {selectedVendor.creditLimit ? formatCurrency(selectedVendor.creditLimit) : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Currency</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{selectedVendor.currency}</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoCardTitle, { color: colors.text }]}>Categories</Text>
              <View style={styles.categoriesWrap}>
                {selectedVendor.categories.map((cat, idx) => (
                  <View key={idx} style={[styles.categoryChip, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.categoryChipText, { color: colors.primary }]}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>

            {selectedVendor.certifications.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.infoCardTitle, { color: colors.text }]}>Certifications</Text>
                {selectedVendor.certifications.map((cert) => (
                  <View key={cert.id} style={[styles.certRow, { borderColor: colors.border }]}>
                    <Award size={20} color="#F59E0B" />
                    <View style={styles.certInfo}>
                      <Text style={[styles.certName, { color: colors.text }]}>{cert.name}</Text>
                      <Text style={[styles.certDetails, { color: colors.textSecondary }]}>
                        {cert.certNumber} • Expires: {cert.expirationDate}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedVendor.notes && (
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.infoCardTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{selectedVendor.notes}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'contacts' && (
          <View style={styles.tabContent}>
            {selectedVendor.contacts.map((contact) => (
              <View key={contact.id} style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contactCardHeader}>
                  <View style={[styles.contactAvatar, { backgroundColor: `${colors.primary}15` }]}>
                    <User size={24} color={colors.primary} />
                  </View>
                  <View style={styles.contactCardInfo}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                    <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>{contact.title}</Text>
                    {contact.isPrimary && (
                      <View style={[styles.primaryBadge, { backgroundColor: '#22C55E15' }]}>
                        <Text style={styles.primaryBadgeText}>Primary Contact</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.contactCardDetails}>
                  <TouchableOpacity style={styles.contactDetailRow}>
                    <Phone size={16} color={colors.textSecondary} />
                    <Text style={[styles.contactDetailText, { color: colors.text }]}>{contact.phone}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactDetailRow}>
                    <Mail size={16} color={colors.textSecondary} />
                    <Text style={[styles.contactDetailText, { color: colors.text }]}>{contact.email}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {selectedVendor.addresses.map((address) => (
              <View key={address.id} style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.addressCardHeader}>
                  <MapPin size={20} color={colors.primary} />
                  <Text style={[styles.addressType, { color: colors.text }]}>
                    {address.type === 'both' ? 'Billing & Shipping' : address.type.charAt(0).toUpperCase() + address.type.slice(1)} Address
                  </Text>
                  {address.isPrimary && (
                    <View style={[styles.primaryBadge, { backgroundColor: '#22C55E15' }]}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{address.street1}</Text>
                {address.street2 && <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{address.street2}</Text>}
                <Text style={[styles.addressLine, { color: colors.textSecondary }]}>
                  {address.city}, {address.state} {address.zipCode}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'performance' && (
          <View style={styles.tabContent}>
            <View style={[styles.performanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.performanceCardTitle, { color: colors.text }]}>Performance Metrics</Text>
              
              <View style={styles.performanceGrid}>
                <View style={[styles.performanceItem, { backgroundColor: `${colors.primary}08` }]}>
                  <TrendingUp size={24} color="#22C55E" />
                  <Text style={[styles.performanceValue, { color: colors.text }]}>
                    {selectedVendor.performance.qualityScore}%
                  </Text>
                  <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Quality Score</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: `${colors.primary}08` }]}>
                  <Truck size={24} color="#3B82F6" />
                  <Text style={[styles.performanceValue, { color: colors.text }]}>
                    {selectedVendor.performance.onTimeDeliveryRate}%
                  </Text>
                  <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>On-Time Delivery</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: `${colors.primary}08` }]}>
                  <Clock size={24} color="#F59E0B" />
                  <Text style={[styles.performanceValue, { color: colors.text }]}>
                    {selectedVendor.performance.responseTime}h
                  </Text>
                  <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Avg Response</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: `${colors.primary}08` }]}>
                  <Calendar size={24} color="#8B5CF6" />
                  <Text style={[styles.performanceValue, { color: colors.text }]}>
                    {selectedVendor.performance.avgLeadTimeDays}d
                  </Text>
                  <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>Avg Lead Time</Text>
                </View>
              </View>

              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{selectedVendor.performance.totalOrders}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Orders</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: selectedVendor.performance.returnRate > 2 ? '#EF4444' : '#22C55E' }]}>
                    {selectedVendor.performance.returnRate}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Return Rate</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {selectedVendor.performance.lastOrderDate || 'N/A'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last Order</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'agreements' && (
          <View style={styles.tabContent}>
            {vendorAgreements.length > 0 ? (
              vendorAgreements.map((agreement) => (
                <View key={agreement.id} style={[styles.agreementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.agreementHeader}>
                    <DollarSign size={20} color="#22C55E" />
                    <View style={styles.agreementInfo}>
                      <Text style={[styles.agreementName, { color: colors.text }]}>
                        {agreement.materialName || agreement.serviceDescription}
                      </Text>
                      {agreement.materialSku && (
                        <Text style={[styles.agreementSku, { color: colors.textSecondary }]}>SKU: {agreement.materialSku}</Text>
                      )}
                    </View>
                    <Text style={[styles.agreementPrice, { color: '#22C55E' }]}>
                      {formatCurrency(agreement.unitPrice)}
                    </Text>
                  </View>
                  <View style={styles.agreementDetails}>
                    <Text style={[styles.agreementDetail, { color: colors.textSecondary }]}>
                      Effective: {agreement.effectiveDate}
                      {agreement.expirationDate && ` - ${agreement.expirationDate}`}
                    </Text>
                    {agreement.minQuantity && (
                      <Text style={[styles.agreementDetail, { color: colors.textSecondary }]}>
                        Min Qty: {agreement.minQuantity}
                      </Text>
                    )}
                    {agreement.notes && (
                      <Text style={[styles.agreementNote, { color: colors.textTertiary }]}>{agreement.notes}</Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FileText size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Price Agreements</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  This vendor does not have any price agreements yet.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={[styles.formContainer, { backgroundColor: colors.background }]} contentContainerStyle={styles.formContent}>
        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Vendor Details</Text>
          
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vendor Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Company name"
            placeholderTextColor={colors.textTertiary}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Legal Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Legal entity name"
            placeholderTextColor={colors.textTertiary}
            value={formData.legalName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, legalName: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vendor Type</Text>
          <View style={styles.typeSelector}>
            {(['supplier', 'service', 'contractor', 'distributor'] as VendorType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeSelectorItem,
                  {
                    backgroundColor: formData.type === type ? colors.primary : colors.background,
                    borderColor: formData.type === type ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, type }))}
              >
                <Text style={{ color: formData.type === type ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '500' as const }}>
                  {VENDOR_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tax ID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="XX-XXXXXXX"
            placeholderTextColor={colors.textTertiary}
            value={formData.taxId}
            onChangeText={(text) => setFormData(prev => ({ ...prev, taxId: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Website</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="https://example.com"
            placeholderTextColor={colors.textTertiary}
            value={formData.website}
            onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Payment Information</Text>
          
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Payment Terms</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.termsScroll}>
            <View style={styles.termsRow}>
              {(['net_10', 'net_15', 'net_30', 'net_45', 'net_60', 'cod'] as PaymentTerms[]).map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[
                    styles.termButton,
                    {
                      backgroundColor: formData.paymentTerms === term ? colors.primary : colors.background,
                      borderColor: formData.paymentTerms === term ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, paymentTerms: term }))}
                >
                  <Text style={{ color: formData.paymentTerms === term ? '#FFFFFF' : colors.text, fontSize: 12 }}>
                    {PAYMENT_TERMS_LABELS[term]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credit Limit</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            value={formData.creditLimit}
            onChangeText={(text) => setFormData(prev => ({ ...prev, creditLimit: text }))}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Primary Contact *</Text>
          
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Contact name"
            placeholderTextColor={colors.textTertiary}
            value={formData.contactName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contactName: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Job title"
            placeholderTextColor={colors.textTertiary}
            value={formData.contactTitle}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contactTitle: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="email@example.com"
            placeholderTextColor={colors.textTertiary}
            value={formData.contactEmail}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contactEmail: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textTertiary}
            value={formData.contactPhone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contactPhone: text }))}
            keyboardType="phone-pad"
          />
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Address</Text>
          
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Street Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="123 Main St"
            placeholderTextColor={colors.textTertiary}
            value={formData.street1}
            onChangeText={(text) => setFormData(prev => ({ ...prev, street1: text }))}
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Suite, Unit, etc."
            placeholderTextColor={colors.textTertiary}
            value={formData.street2}
            onChangeText={(text) => setFormData(prev => ({ ...prev, street2: text }))}
          />

          <View style={styles.inputRow}>
            <View style={{ flex: 2 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>City</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="City"
                placeholderTextColor={colors.textTertiary}
                value={formData.city}
                onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>State</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="TX"
                placeholderTextColor={colors.textTertiary}
                value={formData.state}
                onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ZIP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="12345"
                placeholderTextColor={colors.textTertiary}
                value={formData.zipCode}
                onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.formSectionHeader}>
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Categories</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(true)}>
              <Text style={[styles.addCategoryText, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.categoriesWrap}>
            {formData.categories.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.categoryChip, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[styles.categoryChipText, { color: colors.primary }]}>{cat}</Text>
                <X size={14} color={colors.primary} />
              </TouchableOpacity>
            ))}
            {formData.categories.length === 0 && (
              <Text style={[styles.noCategoriesText, { color: colors.textTertiary }]}>No categories selected</Text>
            )}
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Additional notes..."
            placeholderTextColor={colors.textTertiary}
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={() => {
              if (viewMode === 'edit') {
                setViewMode('detail');
              } else {
                setShowAddModal(false);
              }
              setFormData(INITIAL_FORM);
            }}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveVendor}>
            <Text style={styles.saveButtonText}>{viewMode === 'edit' ? 'Update Vendor' : 'Create Vendor'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (viewMode === 'detail') {
    return renderDetailView();
  }

  if (viewMode === 'edit') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.formHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setViewMode('detail')}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.formHeaderTitle, { color: colors.text }]}>Edit Vendor</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderForm()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.suppliers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Suppliers</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.services}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Services</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search vendors..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {(['all', 'supplier', 'service', 'contractor', 'distributor'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedType === type ? colors.primary : colors.surface,
                  borderColor: selectedType === type ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.filterText, { color: selectedType === type ? '#FFFFFF' : colors.text }]}>
                {type === 'all' ? 'All Types' : VENDOR_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {(['all', 'active', 'pending_approval', 'inactive', 'suspended'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedStatus === status ? getStatusColor(status as VendorStatus) : colors.surface,
                  borderColor: selectedStatus === status ? getStatusColor(status as VendorStatus) : colors.border,
                },
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[styles.filterText, { color: selectedStatus === status ? '#FFFFFF' : colors.text }]}>
                {status === 'all' ? 'All Status' : VENDOR_STATUS_LABELS[status as VendorStatus]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Vendors ({filteredVendors.length})</Text>
        {filteredVendors.map(renderVendorCard)}

        {filteredVendors.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Vendors Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try adjusting your filters or add a new vendor.
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={handleAddVendor}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.formHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.formHeaderTitle, { color: colors.text }]}>New Vendor</Text>
            <View style={{ width: 24 }} />
          </View>
          {renderForm()}
        </View>
      </Modal>

      <Modal visible={showCategoryPicker} animationType="fade" transparent>
        <View style={styles.categoryPickerOverlay}>
          <View style={[styles.categoryPickerContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.categoryPickerHeader, { borderColor: colors.border }]}>
              <Text style={[styles.categoryPickerTitle, { color: colors.text }]}>Select Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryPickerList}>
              {VENDOR_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPickerItem, { borderColor: colors.border }]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.categoryPickerItemText, { color: colors.text }]}>{cat}</Text>
                  {formData.categories.includes(cat) && <CheckCircle size={20} color="#22C55E" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.categoryPickerDone, { backgroundColor: colors.primary }]}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.categoryPickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statBox: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 11, marginTop: 2 },
  searchBar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  filterScroll: { marginBottom: 12 },
  filterRow: { gap: 8 },
  filterButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, marginBottom: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 16, fontWeight: '600' as const },
  vendorCode: { fontSize: 13, marginTop: 2 },
  badges: { gap: 4 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 11, fontWeight: '600' as const },
  statusBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  performanceRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 12 },
  metric: { alignItems: 'center' as const, gap: 2 },
  metricValue: { fontSize: 15, fontWeight: '600' as const },
  metricLabel: { fontSize: 11 },
  contactRow: { flexDirection: 'row' as const, gap: 16, marginBottom: 8 },
  contactItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, flex: 1 },
  contactText: { fontSize: 12, flex: 1 },
  addressRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  addressText: { fontSize: 12, flex: 1 },
  fab: { position: 'absolute' as const, right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, alignItems: 'center' as const, justifyContent: 'center' as const, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  detailContent: { paddingBottom: 32 },
  detailHeader: { padding: 16, borderBottomWidth: 1 },
  backButton: { marginBottom: 12 },
  detailHeaderInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16 },
  largeIconContainer: { width: 64, height: 64, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerTextContainer: { flex: 1 },
  detailTitle: { fontSize: 22, fontWeight: '700' as const },
  detailSubtitle: { fontSize: 14, marginTop: 2 },
  detailBadges: { flexDirection: 'row' as const, marginTop: 8, gap: 8 },
  actionButtons: { flexDirection: 'row' as const, gap: 8, marginTop: 16 },
  actionButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const },
  tabBar: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' as const },
  tabText: { fontSize: 14, fontWeight: '500' as const },
  tabContent: { padding: 16 },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  infoCardTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12 },
  infoRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' as const },
  websiteRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  websiteText: { fontSize: 14 },
  categoriesWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  categoryChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  categoryChipText: { fontSize: 13, fontWeight: '500' as const },
  certRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  certInfo: { flex: 1 },
  certName: { fontSize: 14, fontWeight: '500' as const },
  certDetails: { fontSize: 12, marginTop: 2 },
  notesText: { fontSize: 14, lineHeight: 20 },
  contactCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  contactCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center' as const, justifyContent: 'center' as const },
  contactCardInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600' as const },
  contactTitle: { fontSize: 13, marginTop: 2 },
  primaryBadge: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  primaryBadgeText: { fontSize: 11, fontWeight: '600' as const, color: '#22C55E' },
  contactCardDetails: { marginTop: 12, gap: 8 },
  contactDetailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  contactDetailText: { fontSize: 14 },
  addressCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  addressCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  addressType: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  addressLine: { fontSize: 14, lineHeight: 20, marginLeft: 28 },
  performanceCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  performanceCardTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 16 },
  performanceGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  performanceItem: { width: '47%' as const, padding: 16, borderRadius: 12, alignItems: 'center' as const, gap: 8 },
  performanceValue: { fontSize: 24, fontWeight: '700' as const },
  performanceLabel: { fontSize: 12, textAlign: 'center' as const },
  statsRow2: { flexDirection: 'row' as const, marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' as const },
  agreementCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  agreementHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  agreementInfo: { flex: 1 },
  agreementName: { fontSize: 15, fontWeight: '600' as const },
  agreementSku: { fontSize: 12, marginTop: 2 },
  agreementPrice: { fontSize: 18, fontWeight: '700' as const },
  agreementDetails: { marginTop: 8, marginLeft: 32 },
  agreementDetail: { fontSize: 13 },
  agreementNote: { fontSize: 12, fontStyle: 'italic' as const, marginTop: 4 },
  emptyState: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center' as const, marginTop: 4 },
  modalContainer: { flex: 1 },
  formHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 16, borderBottomWidth: 1 },
  formHeaderTitle: { fontSize: 18, fontWeight: '600' as const },
  formContainer: { flex: 1 },
  formContent: { padding: 16, paddingBottom: 32 },
  formSection: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  formSectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  formSectionTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12 },
  inputLabel: { fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 100 },
  inputRow: { flexDirection: 'row' as const, gap: 12 },
  typeSelector: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  typeSelectorItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  termsScroll: { marginTop: 4 },
  termsRow: { flexDirection: 'row' as const, gap: 8 },
  termButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  addCategoryText: { fontSize: 14, fontWeight: '500' as const },
  noCategoriesText: { fontSize: 13, fontStyle: 'italic' as const },
  formActions: { flexDirection: 'row' as const, gap: 12 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  cancelButtonText: { fontSize: 16, fontWeight: '600' as const },
  saveButton: { flex: 2, padding: 16, borderRadius: 10, alignItems: 'center' as const },
  saveButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#FFFFFF' },
  categoryPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, padding: 24 },
  categoryPickerContainer: { borderRadius: 16, maxHeight: '80%' },
  categoryPickerHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  categoryPickerTitle: { fontSize: 18, fontWeight: '600' as const },
  categoryPickerList: { maxHeight: 400 },
  categoryPickerItem: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  categoryPickerItemText: { fontSize: 15 },
  categoryPickerDone: { margin: 16, padding: 16, borderRadius: 10, alignItems: 'center' as const },
  categoryPickerDoneText: { fontSize: 16, fontWeight: '600' as const, color: '#FFFFFF' },
});
