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
  useWarrantiesQuery,
  useExpiringWarranties,
} from '@/hooks/useCMMSVendors';
import { WarrantyTracking, WarrantyStatus, WARRANTY_STATUSES } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  ArrowUpDown,
  Check,
  Building2,
  Wrench,
  Package,
  DollarSign,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Truck,
  User,
  Hash,
  Settings,
  Tag,
  ClipboardList,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<WarrantyStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  expired: { label: 'Expired', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: Clock },
  claimed: { label: 'Claimed', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: AlertTriangle },
  void: { label: 'Void', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: XCircle },
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer Warranty',
  extended: 'Extended Warranty',
  service: 'Service Warranty',
  parts_only: 'Parts Only',
  labor_only: 'Labor Only',
  comprehensive: 'Comprehensive',
};

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  submitted: { label: 'Submitted', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  in_review: { label: 'In Review', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  approved: { label: 'Approved', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  denied: { label: 'Denied', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  completed: { label: 'Completed', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' },
};

type StatusFilter = 'all' | WarrantyStatus;
type SortField = 'equipment_name' | 'vendor_name' | 'expiry_date' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function WarrantyTrackingScreen() {
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('expiry_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyTracking | null>(null);

  const { data: warranties = [], isLoading, refetch } = useWarrantiesQuery();
  const { data: expiringWarranties = [] } = useExpiringWarranties(30);

  const filteredWarranties = useMemo(() => {
    let filtered = [...warranties];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(w =>
        w.equipmentName.toLowerCase().includes(query) ||
        w.equipmentTag.toLowerCase().includes(query) ||
        w.warrantyNumber.toLowerCase().includes(query) ||
        w.vendorName.toLowerCase().includes(query) ||
        (w.serialNumber?.toLowerCase().includes(query) ?? false)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'equipment_name':
          comparison = a.equipmentName.localeCompare(b.equipmentName);
          break;
        case 'vendor_name':
          comparison = a.vendorName.localeCompare(b.vendorName);
          break;
        case 'expiry_date':
          comparison = new Date(a.warrantyEndDate).getTime() - new Date(b.warrantyEndDate).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [warranties, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = warranties.length;
    const active = warranties.filter(w => w.status === 'active').length;
    const expiring = expiringWarranties.length;
    const totalClaims = warranties.reduce((sum, w) => sum + (w.claims?.length || 0), 0);
    
    return { total, active, expiring, totalClaims };
  }, [warranties, expiringWarranties]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleWarrantyPress = useCallback((warranty: WarrantyTracking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWarranty(warranty);
    setShowDetailModal(true);
  }, []);

  const handleStatusFilterSelect = useCallback((status: StatusFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(status);
    setShowFilterModal(false);
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

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryColor = (expiryDate: string, status: WarrantyStatus) => {
    if (status !== 'active') return colors.textSecondary;
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return '#EF4444';
    if (days <= 30) return '#F59E0B';
    if (days <= 90) return '#3B82F6';
    return colors.textSecondary;
  };

  const renderWarrantyCard = (warranty: WarrantyTracking) => {
    const statusConfig = STATUS_CONFIG[warranty.status];
    const StatusIcon = statusConfig.icon;
    const daysUntilExpiry = getDaysUntilExpiry(warranty.warrantyEndDate);
    const isExpiringSoon = warranty.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

    return (
      <TouchableOpacity
        key={warranty.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleWarrantyPress(warranty)}
        activeOpacity={0.7}
        testID={`warranty-card-${warranty.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.statusIndicator, { backgroundColor: statusConfig.bgColor }]}>
              <Shield size={16} color={statusConfig.color} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.warrantyNumber, { color: colors.primary }]}>
                {warranty.warrantyNumber}
              </Text>
              <Text style={[styles.equipmentName, { color: colors.text }]} numberOfLines={1}>
                {warranty.equipmentName}
              </Text>
            </View>
          </View>
          {isExpiringSoon && (
            <View style={[styles.expiringBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <AlertCircle size={12} color="#F59E0B" />
            </View>
          )}
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Tag size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {warranty.equipmentTag}
              {warranty.serialNumber && ` • S/N: ${warranty.serialNumber}`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {warranty.vendorName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar size={14} color={getExpiryColor(warranty.warrantyEndDate, warranty.status)} />
            <Text style={[styles.infoText, { color: getExpiryColor(warranty.warrantyEndDate, warranty.status) }]}>
              {warranty.status === 'active' && daysUntilExpiry > 0 
                ? `Expires ${formatDate(warranty.warrantyEndDate)} (${daysUntilExpiry} days)`
                : warranty.status === 'active' && daysUntilExpiry <= 0
                ? `Expired on ${formatDate(warranty.warrantyEndDate)}`
                : `Expiry: ${formatDate(warranty.warrantyEndDate)}`
              }
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.coverageContainer}>
            {warranty.laborIncluded && (
              <View style={[styles.coverageBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <User size={10} color={colors.textSecondary} />
                <Text style={[styles.coverageText, { color: colors.textSecondary }]}>Labor</Text>
              </View>
            )}
            {warranty.partsIncluded && (
              <View style={[styles.coverageBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Package size={10} color={colors.textSecondary} />
                <Text style={[styles.coverageText, { color: colors.textSecondary }]}>Parts</Text>
              </View>
            )}
            {warranty.onsiteService && (
              <View style={[styles.coverageBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Truck size={10} color={colors.textSecondary} />
                <Text style={[styles.coverageText, { color: colors.textSecondary }]}>On-site</Text>
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
    if (!selectedWarranty) return null;

    const statusConfig = STATUS_CONFIG[selectedWarranty.status];
    const StatusIcon = statusConfig.icon;
    const daysUntilExpiry = getDaysUntilExpiry(selectedWarranty.warrantyEndDate);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Warranty Details</Text>
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
                <View style={[styles.statusIndicatorLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <Shield size={24} color={statusConfig.color} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailNumber, { color: colors.primary }]}>
                    {selectedWarranty.warrantyNumber}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedWarranty.equipmentName}
                  </Text>
                  <Text style={[styles.equipmentTag, { color: colors.textSecondary }]}>
                    {selectedWarranty.equipmentTag}
                  </Text>
                </View>
              </View>
              <View style={styles.headerBadges}>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={14} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.typeText, { color: colors.text }]}>
                    {WARRANTY_TYPE_LABELS[selectedWarranty.type] || selectedWarranty.typeName}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tag</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWarranty.equipmentTag}</Text>
              </View>
              {selectedWarranty.serialNumber && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Serial Number</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWarranty.serialNumber}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWarranty.facilityName}</Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vendor</Text>
              <View style={styles.vendorCard}>
                <View style={[styles.vendorIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Building2 size={20} color={colors.primary} />
                </View>
                <View style={styles.vendorInfo}>
                  <Text style={[styles.vendorName, { color: colors.text }]}>{selectedWarranty.vendorName}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Warranty Dates</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Purchase Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(selectedWarranty.purchaseDate)}
                </Text>
              </View>
              {selectedWarranty.installDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Install Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedWarranty.installDate)}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Warranty Start</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(selectedWarranty.warrantyStartDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Warranty End</Text>
                <Text style={[styles.detailValue, { color: getExpiryColor(selectedWarranty.warrantyEndDate, selectedWarranty.status) }]}>
                  {formatDate(selectedWarranty.warrantyEndDate)}
                  {selectedWarranty.status === 'active' && daysUntilExpiry > 0 && ` (${daysUntilExpiry} days)`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notification</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedWarranty.notificationDays} days before expiry
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Coverage</Text>
              <Text style={[styles.coverageDescription, { color: colors.textSecondary }]}>
                {selectedWarranty.coverageDescription}
              </Text>
              
              <View style={styles.coverageGrid}>
                <View style={[styles.coverageItem, { backgroundColor: selectedWarranty.laborIncluded ? 'rgba(16, 185, 129, 0.1)' : colors.backgroundSecondary }]}>
                  <User size={18} color={selectedWarranty.laborIncluded ? '#10B981' : colors.textSecondary} />
                  <Text style={[styles.coverageLabel, { color: selectedWarranty.laborIncluded ? '#10B981' : colors.textSecondary }]}>
                    Labor
                  </Text>
                  <Text style={[styles.coverageStatus, { color: selectedWarranty.laborIncluded ? '#10B981' : colors.textSecondary }]}>
                    {selectedWarranty.laborIncluded ? 'Included' : 'Not Included'}
                  </Text>
                </View>
                <View style={[styles.coverageItem, { backgroundColor: selectedWarranty.partsIncluded ? 'rgba(16, 185, 129, 0.1)' : colors.backgroundSecondary }]}>
                  <Package size={18} color={selectedWarranty.partsIncluded ? '#10B981' : colors.textSecondary} />
                  <Text style={[styles.coverageLabel, { color: selectedWarranty.partsIncluded ? '#10B981' : colors.textSecondary }]}>
                    Parts
                  </Text>
                  <Text style={[styles.coverageStatus, { color: selectedWarranty.partsIncluded ? '#10B981' : colors.textSecondary }]}>
                    {selectedWarranty.partsIncluded ? 'Included' : 'Not Included'}
                  </Text>
                </View>
                <View style={[styles.coverageItem, { backgroundColor: selectedWarranty.onsiteService ? 'rgba(16, 185, 129, 0.1)' : colors.backgroundSecondary }]}>
                  <Truck size={18} color={selectedWarranty.onsiteService ? '#10B981' : colors.textSecondary} />
                  <Text style={[styles.coverageLabel, { color: selectedWarranty.onsiteService ? '#10B981' : colors.textSecondary }]}>
                    On-site
                  </Text>
                  <Text style={[styles.coverageStatus, { color: selectedWarranty.onsiteService ? '#10B981' : colors.textSecondary }]}>
                    {selectedWarranty.onsiteService ? 'Included' : 'Not Included'}
                  </Text>
                </View>
              </View>

              {selectedWarranty.responseTime && (
                <View style={[styles.detailRow, { marginTop: 12 }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Response Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWarranty.responseTime}</Text>
                </View>
              )}
            </View>

            {(selectedWarranty.exclusions || selectedWarranty.limitations) && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Terms & Conditions</Text>
                {selectedWarranty.exclusions && (
                  <View style={styles.termsItem}>
                    <Text style={[styles.termsLabel, { color: colors.text }]}>Exclusions</Text>
                    <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                      {selectedWarranty.exclusions}
                    </Text>
                  </View>
                )}
                {selectedWarranty.limitations && (
                  <View style={[styles.termsItem, { marginTop: 12 }]}>
                    <Text style={[styles.termsLabel, { color: colors.text }]}>Limitations</Text>
                    <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                      {selectedWarranty.limitations}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial</Text>
              {selectedWarranty.purchasePrice && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(selectedWarranty.purchasePrice)}
                  </Text>
                </View>
              )}
              {selectedWarranty.warrantyCost && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Warranty Cost</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(selectedWarranty.warrantyCost)}
                  </Text>
                </View>
              )}
              {selectedWarranty.deductible && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Deductible</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(selectedWarranty.deductible)}
                  </Text>
                </View>
              )}
              {selectedWarranty.maxClaimAmount && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Max Claim Amount</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(selectedWarranty.maxClaimAmount)}
                  </Text>
                </View>
              )}
            </View>

            {selectedWarranty.claims && selectedWarranty.claims.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Claims ({selectedWarranty.claims.length})
                </Text>
                {selectedWarranty.claims.map((claim, index) => {
                  const claimStatusConfig = CLAIM_STATUS_CONFIG[claim.status] || CLAIM_STATUS_CONFIG.submitted;
                  return (
                    <View key={claim.id || index} style={[styles.claimItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.claimHeader}>
                        <View style={styles.claimInfo}>
                          <Text style={[styles.claimNumber, { color: colors.primary }]}>{claim.claimNumber}</Text>
                          <Text style={[styles.claimDate, { color: colors.textSecondary }]}>
                            {formatDate(claim.claimDate)}
                          </Text>
                        </View>
                        <View style={[styles.claimStatusBadge, { backgroundColor: claimStatusConfig.bgColor }]}>
                          <Text style={[styles.claimStatusText, { color: claimStatusConfig.color }]}>
                            {claimStatusConfig.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.claimDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {claim.issueDescription}
                      </Text>
                      {claim.approvedAmount !== undefined && (
                        <View style={styles.claimFinancials}>
                          <Text style={[styles.claimApproved, { color: '#10B981' }]}>
                            Approved: {formatCurrency(claim.approvedAmount)}
                          </Text>
                        </View>
                      )}
                      {claim.denialReason && (
                        <View style={[styles.denialBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                          <AlertTriangle size={14} color="#EF4444" />
                          <Text style={[styles.denialText, { color: '#EF4444' }]}>{claim.denialReason}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {selectedWarranty.contacts && selectedWarranty.contacts.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Contacts ({selectedWarranty.contacts.length})
                </Text>
                {selectedWarranty.contacts.map((contact, index) => (
                  <View key={contact.id || index} style={[styles.contactItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.contactIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Phone size={16} color={colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeader}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                        <View style={[styles.contactTypeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.contactTypeText, { color: colors.textSecondary }]}>
                            {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.contactDetails}>
                        <View style={styles.contactRow}>
                          <Mail size={12} color={colors.textSecondary} />
                          <Text style={[styles.contactText, { color: colors.textSecondary }]}>{contact.email}</Text>
                        </View>
                        <View style={styles.contactRow}>
                          <Phone size={12} color={colors.textSecondary} />
                          <Text style={[styles.contactText, { color: colors.textSecondary }]}>{contact.phone}</Text>
                        </View>
                      </View>
                      {contact.notes && (
                        <Text style={[styles.contactNotes, { color: colors.textSecondary }]}>{contact.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedWarranty.notes && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {selectedWarranty.notes}
                </Text>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Audit Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedWarranty.createdAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Updated</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedWarranty.updatedAt)}</Text>
              </View>
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Status</Text>
          <TouchableOpacity
            onPress={() => setShowFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleStatusFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Statuses</Text>
            {statusFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(WARRANTY_STATUSES).map(([key, label]) => {
            const config = STATUS_CONFIG[key as WarrantyStatus];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleStatusFilterSelect(key as WarrantyStatus)}
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
            { field: 'equipment_name' as SortField, label: 'Equipment Name' },
            { field: 'vendor_name' as SortField, label: 'Vendor Name' },
            { field: 'expiry_date' as SortField, label: 'Expiry Date' },
            { field: 'status' as SortField, label: 'Status' },
            { field: 'created_at' as SortField, label: 'Date Created' },
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
          title: 'Warranty Tracking',
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
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.expiring}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expiring</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.totalClaims}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Claims</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search warranties..."
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
            <Filter size={16} color={statusFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: statusFilter !== 'all' ? colors.primary : colors.textSecondary }]}>
              {statusFilter !== 'all' ? STATUS_CONFIG[statusFilter].label : 'Filter'}
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
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading warranties...</Text>
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
          {filteredWarranties.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Shield size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Warranties Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Equipment warranties will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredWarranties.length} warrant{filteredWarranties.length !== 1 ? 'ies' : 'y'}
              </Text>
              {filteredWarranties.map(renderWarrantyCard)}
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
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  warrantyNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  expiringBadge: {
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
  coverageContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  coverageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  coverageText: {
    fontSize: 10,
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
  statusIndicatorLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
  equipmentTag: {
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
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  coverageDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  coverageGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  coverageItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  coverageLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  coverageStatus: {
    fontSize: 10,
  },
  termsItem: {},
  termsLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  claimItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  claimInfo: {},
  claimNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  claimDate: {
    fontSize: 12,
    marginTop: 2,
  },
  claimStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  claimStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  claimDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  claimFinancials: {
    marginTop: 8,
  },
  claimApproved: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  denialBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  denialText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  contactTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contactTypeText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  contactDetails: {
    marginTop: 6,
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
  },
  contactNotes: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
