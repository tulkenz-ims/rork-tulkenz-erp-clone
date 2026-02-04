import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useVendorsQuery,
  useActiveVendors,
  usePreferredVendors,
} from '@/hooks/useCMMSVendors';
import { Vendor, VendorStatus, VendorType, VENDOR_STATUSES, VENDOR_TYPES } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Building2,
  Users,
  Phone,
  Mail,
  Globe,
  Star,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  ArrowUpDown,
  Check,
  Briefcase,
  Wrench,
  Settings,
  Package,
  Award,
  Shield,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<VendorStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  inactive: { label: 'Inactive', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: Clock },
  pending_approval: { label: 'Pending', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: Clock },
  suspended: { label: 'Suspended', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
  blacklisted: { label: 'Blacklisted', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)', icon: XCircle },
};

const TYPE_CONFIG: Record<VendorType, { label: string; icon: React.ElementType }> = {
  parts_supplier: { label: 'Parts Supplier', icon: Package },
  contractor: { label: 'Contractor', icon: Briefcase },
  service_provider: { label: 'Service Provider', icon: Settings },
  equipment_vendor: { label: 'Equipment Vendor', icon: Wrench },
  other: { label: 'Other', icon: Building2 },
};

type StatusFilter = 'all' | VendorStatus;
type TypeFilter = 'all' | VendorType;
type SortField = 'name' | 'type' | 'status' | 'rating' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function VendorListScreen() {
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const { data: vendors = [], isLoading, refetch } = useVendorsQuery();
  const { data: preferredVendors = [] } = usePreferredVendors();

  const filteredVendors = useMemo(() => {
    let filtered = [...vendors];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(v => v.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.vendorNumber.toLowerCase().includes(query) ||
        v.primaryContact?.name?.toLowerCase().includes(query) ||
        v.primaryContact?.email?.toLowerCase().includes(query) ||
        v.categories.some(c => c.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [vendors, statusFilter, typeFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter(v => v.status === 'active').length;
    const preferred = preferredVendors.length;
    const pending = vendors.filter(v => v.status === 'pending_approval').length;
    
    return { total, active, preferred, pending };
  }, [vendors, preferredVendors]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleVendorPress = useCallback((vendor: Vendor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVendor(vendor);
    setShowDetailModal(true);
  }, []);

  const handleStatusFilterSelect = useCallback((status: StatusFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(status);
    setShowFilterModal(false);
  }, []);

  const handleTypeFilterSelect = useCallback((type: TypeFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTypeFilter(type);
  }, []);

  const handleSortSelect = useCallback((field: SortField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortModal(false);
  }, [sortField]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderRating = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            color={star <= rating ? '#F59E0B' : colors.border}
            fill={star <= rating ? '#F59E0B' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const renderVendorCard = (vendor: Vendor) => {
    const statusConfig = STATUS_CONFIG[vendor.status];
    const typeConfig = TYPE_CONFIG[vendor.type];
    const StatusIcon = statusConfig.icon;
    const TypeIcon = typeConfig.icon;

    return (
      <TouchableOpacity
        key={vendor.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleVendorPress(vendor)}
        activeOpacity={0.7}
        testID={`vendor-card-${vendor.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.typeIndicator, { backgroundColor: colors.backgroundSecondary }]}>
              <TypeIcon size={18} color={colors.primary} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.vendorNumber, { color: colors.primary }]}>
                {vendor.vendorNumber}
              </Text>
              <Text style={[styles.vendorName, { color: colors.text }]} numberOfLines={1}>
                {vendor.name}
              </Text>
            </View>
          </View>
          {vendor.isPreferredVendor && (
            <View style={[styles.preferredBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
            </View>
          )}
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Briefcase size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {typeConfig.label}
            </Text>
          </View>
          {vendor.primaryContact && (
            <View style={styles.infoRow}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {vendor.primaryContact.name} • {vendor.primaryContact.email}
              </Text>
            </View>
          )}
          {vendor.website && (
            <View style={styles.infoRow}>
              <Globe size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {vendor.website}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerLeft}>
            {renderRating(vendor.rating)}
            {vendor.performanceScore !== undefined && (
              <View style={styles.scoreContainer}>
                <TrendingUp size={12} color={colors.textSecondary} />
                <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
                  {vendor.performanceScore}%
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedVendor) return null;

    const statusConfig = STATUS_CONFIG[selectedVendor.status];
    const typeConfig = TYPE_CONFIG[selectedVendor.type];
    const StatusIcon = statusConfig.icon;
    const TypeIcon = typeConfig.icon;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Vendor Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeaderTop}>
                <View style={[styles.typeIndicatorLarge, { backgroundColor: colors.backgroundSecondary }]}>
                  <TypeIcon size={28} color={colors.primary} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailNumber, { color: colors.primary }]}>
                    {selectedVendor.vendorNumber}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedVendor.name}
                  </Text>
                  {selectedVendor.legalName && selectedVendor.legalName !== selectedVendor.name && (
                    <Text style={[styles.legalName, { color: colors.textSecondary }]}>
                      {selectedVendor.legalName}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.headerBadges}>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={14} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
                {selectedVendor.isPreferredVendor && (
                  <View style={[styles.preferredBadgeLarge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.preferredText, { color: '#F59E0B' }]}>Preferred</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>General Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{typeConfig.label}</Text>
              </View>
              {selectedVendor.website && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Website</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>{selectedVendor.website}</Text>
                </View>
              )}
              {selectedVendor.taxId && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tax ID</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedVendor.taxId}</Text>
                </View>
              )}
              {selectedVendor.dunsNumber && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DUNS</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedVendor.dunsNumber}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Currency</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedVendor.currency}</Text>
              </View>
            </View>

            {selectedVendor.primaryContact && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Primary Contact</Text>
                <View style={styles.contactCard}>
                  <View style={[styles.contactAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.contactInitials}>
                      {selectedVendor.primaryContact.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: colors.text }]}>
                      {selectedVendor.primaryContact.name}
                    </Text>
                    {selectedVendor.primaryContact.title && (
                      <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>
                        {selectedVendor.primaryContact.title}
                      </Text>
                    )}
                    <View style={styles.contactDetails}>
                      <View style={styles.contactRow}>
                        <Mail size={12} color={colors.textSecondary} />
                        <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                          {selectedVendor.primaryContact.email}
                        </Text>
                      </View>
                      <View style={styles.contactRow}>
                        <Phone size={12} color={colors.textSecondary} />
                        <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                          {selectedVendor.primaryContact.phone}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {selectedVendor.addresses.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Addresses</Text>
                {selectedVendor.addresses.map((address, index) => (
                  <View key={address.id || index} style={[styles.addressItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.addressIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <MapPin size={16} color={colors.primary} />
                    </View>
                    <View style={styles.addressInfo}>
                      <Text style={[styles.addressType, { color: colors.text }]}>
                        {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                        {address.isPrimary && ' (Primary)'}
                      </Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                        {address.address1}
                        {address.address2 && `, ${address.address2}`}
                      </Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                        {address.city}, {address.state} {address.postalCode}
                      </Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                        {address.country}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Information</Text>
              {selectedVendor.paymentTerms && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Terms</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedVendor.paymentTerms}</Text>
                </View>
              )}
              {selectedVendor.paymentMethod && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Method</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedVendor.paymentMethod.toUpperCase().replace('_', ' ')}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tax Exempt</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedVendor.taxExempt ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>

            {selectedVendor.certifications.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Certifications ({selectedVendor.certifications.length})
                </Text>
                {selectedVendor.certifications.map((cert, index) => (
                  <View key={cert.id || index} style={[styles.certItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.certIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Award size={16} color={colors.primary} />
                    </View>
                    <View style={styles.certInfo}>
                      <Text style={[styles.certName, { color: colors.text }]}>{cert.name}</Text>
                      <Text style={[styles.certIssuer, { color: colors.textSecondary }]}>
                        Issued by {cert.issuedBy}
                      </Text>
                      {cert.expiryDate && (
                        <Text style={[styles.certExpiry, { color: cert.isActive ? colors.textSecondary : '#EF4444' }]}>
                          {cert.isActive ? 'Expires' : 'Expired'}: {formatDate(cert.expiryDate)}
                        </Text>
                      )}
                    </View>
                    {cert.isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <CheckCircle2 size={12} color="#10B981" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {selectedVendor.insuranceCoverage.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Insurance ({selectedVendor.insuranceCoverage.length})
                </Text>
                {selectedVendor.insuranceCoverage.map((insurance, index) => (
                  <View key={insurance.id || index} style={[styles.insuranceItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.insuranceIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Shield size={16} color={colors.primary} />
                    </View>
                    <View style={styles.insuranceInfo}>
                      <Text style={[styles.insuranceType, { color: colors.text }]}>{insurance.typeName}</Text>
                      <Text style={[styles.insuranceProvider, { color: colors.textSecondary }]}>
                        {insurance.provider} • Policy: {insurance.policyNumber}
                      </Text>
                      <Text style={[styles.insuranceCoverage, { color: colors.textSecondary }]}>
                        Coverage: ${insurance.coverageAmount.toLocaleString()}
                      </Text>
                      <Text style={[styles.insuranceExpiry, { color: insurance.isActive ? colors.textSecondary : '#EF4444' }]}>
                        {insurance.isActive ? 'Expires' : 'Expired'}: {formatDate(insurance.expiryDate)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedVendor.categories.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
                <View style={styles.categoriesContainer}>
                  {selectedVendor.categories.map((category, index) => (
                    <View key={index} style={[styles.categoryBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
              {selectedVendor.rating && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rating</Text>
                  <View style={styles.ratingLarge}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        color={star <= selectedVendor.rating! ? '#F59E0B' : colors.border}
                        fill={star <= selectedVendor.rating! ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                    <Text style={[styles.ratingValue, { color: colors.text }]}>{selectedVendor.rating}/5</Text>
                  </View>
                </View>
              )}
              {selectedVendor.performanceScore !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Performance Score</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedVendor.performanceScore}%</Text>
                </View>
              )}
            </View>

            {selectedVendor.notes && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {selectedVendor.notes}
                </Text>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Audit Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedVendor.createdAt)}</Text>
              </View>
              {selectedVendor.approvedByName && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedVendor.approvedByName}</Text>
                </View>
              )}
              {selectedVendor.approvedAt && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved On</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedVendor.approvedAt)}</Text>
                </View>
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Vendors</Text>
          <TouchableOpacity
            onPress={() => setShowFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>Status</Text>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleStatusFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Statuses</Text>
            {statusFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(VENDOR_STATUSES).map(([key, label]) => {
            const config = STATUS_CONFIG[key as VendorStatus];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleStatusFilterSelect(key as VendorStatus)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.filterIcon, { backgroundColor: config.bgColor }]}>
                    <Icon size={16} color={config.color} />
                  </View>
                  <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
                </View>
                {statusFilter === key && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.filterSectionTitle, { color: colors.textSecondary, marginTop: 20 }]}>Type</Text>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleTypeFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Types</Text>
            {typeFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(VENDOR_TYPES).map(([key, label]) => {
            const config = TYPE_CONFIG[key as VendorType];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleTypeFilterSelect(key as VendorType)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.filterIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <Icon size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
                </View>
                {typeFilter === key && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
          <TouchableOpacity
            onPress={() => setShowSortModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {[
            { field: 'name' as SortField, label: 'Vendor Name' },
            { field: 'type' as SortField, label: 'Type' },
            { field: 'status' as SortField, label: 'Status' },
            { field: 'rating' as SortField, label: 'Rating' },
            { field: 'created_at' as SortField, label: 'Date Added' },
          ].map(({ field, label }) => (
            <TouchableOpacity
              key={field}
              style={[styles.filterOption, { borderBottomColor: colors.border }]}
              onPress={() => handleSortSelect(field)}
            >
              <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
              {sortField === field && (
                <View style={styles.sortIndicator}>
                  <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Text>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Vendor List',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{statistics.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.preferred}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Preferred</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{statistics.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
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

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={16} color={(statusFilter !== 'all' || typeFilter !== 'all') ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: (statusFilter !== 'all' || typeFilter !== 'all') ? colors.primary : colors.textSecondary }]}>
              Filter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowSortModal(true)}
          >
            <ArrowUpDown size={16} color={colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: colors.textSecondary }]}>Sort</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading vendors...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredVendors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Building2 size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Vendors Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Vendors will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
              </Text>
              {filteredVendors.map(renderVendorCard)}
            </>
          )}
        </ScrollView>
      )}

      {renderDetailModal()}
      {renderFilterModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsText: {
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  vendorNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  preferredBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 16,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailHeader: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIndicatorLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderInfo: {
    marginLeft: 14,
    flex: 1,
  },
  detailNumber: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  legalName: {
    fontSize: 13,
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  preferredBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  preferredText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  contactTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  contactDetails: {
    marginTop: 8,
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  addressText: {
    fontSize: 13,
    marginTop: 2,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  certIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certInfo: {
    flex: 1,
    marginLeft: 12,
  },
  certName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  certIssuer: {
    fontSize: 13,
    marginTop: 2,
  },
  certExpiry: {
    fontSize: 12,
    marginTop: 4,
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insuranceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  insuranceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insuranceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  insuranceType: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  insuranceProvider: {
    fontSize: 13,
    marginTop: 2,
  },
  insuranceCoverage: {
    fontSize: 12,
    marginTop: 2,
  },
  insuranceExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  ratingLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
