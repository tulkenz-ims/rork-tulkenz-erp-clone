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
  useVendorContractsQuery,
  useExpiringContracts,
} from '@/hooks/useCMMSVendors';
import { VendorContract, ContractStatus, CONTRACT_STATUSES } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Check,
  Building2,
  Users,
  Briefcase,
  Target,
  TrendingUp,
  AlertCircle,
  Star,
  Hash,
  MapPin,
  FileCheck,
  Ban,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: FileText },
  pending_approval: { label: 'Pending', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: Clock },
  active: { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  expired: { label: 'Expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)', icon: XCircle },
  renewed: { label: 'Renewed', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: RefreshCw },
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  service: 'Service Agreement',
  supply: 'Supply Contract',
  maintenance: 'Maintenance Contract',
  blanket_po: 'Blanket PO',
  rental: 'Rental Agreement',
  lease: 'Lease Agreement',
  other: 'Other',
};

type StatusFilter = 'all' | ContractStatus;
type SortField = 'name' | 'vendor_name' | 'expiry_date' | 'total_value' | 'status';
type SortDirection = 'asc' | 'desc';

export default function VendorContractsScreen() {
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('expiry_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<VendorContract | null>(null);

  const { data: contracts = [], isLoading, refetch } = useVendorContractsQuery();
  const { data: expiringContracts = [] } = useExpiringContracts(30);

  const filteredContracts = useMemo(() => {
    let filtered = [...contracts];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.contractNumber.toLowerCase().includes(query) ||
        c.vendorName.toLowerCase().includes(query) ||
        c.vendorNumber.toLowerCase().includes(query) ||
        (c.description?.toLowerCase().includes(query) ?? false)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'vendor_name':
          comparison = a.vendorName.localeCompare(b.vendorName);
          break;
        case 'expiry_date':
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case 'total_value':
          comparison = (a.totalValue || 0) - (b.totalValue || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [contracts, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter(c => c.status === 'active').length;
    const expiring = expiringContracts.length;
    const totalValue = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.totalValue || 0), 0);
    
    return { total, active, expiring, totalValue };
  }, [contracts, expiringContracts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleContractPress = useCallback((contract: VendorContract) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContract(contract);
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

  const getExpiryColor = (expiryDate: string, status: ContractStatus) => {
    if (status !== 'active') return colors.textSecondary;
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return '#EF4444';
    if (days <= 30) return '#F59E0B';
    if (days <= 90) return '#3B82F6';
    return colors.textSecondary;
  };

  const renderContractCard = (contract: VendorContract) => {
    const statusConfig = STATUS_CONFIG[contract.status];
    const StatusIcon = statusConfig.icon;
    const daysUntilExpiry = getDaysUntilExpiry(contract.expiryDate);
    const isExpiringSoon = contract.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

    return (
      <TouchableOpacity
        key={contract.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleContractPress(contract)}
        activeOpacity={0.7}
        testID={`contract-card-${contract.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.statusIndicator, { backgroundColor: statusConfig.bgColor }]}>
              <StatusIcon size={16} color={statusConfig.color} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.contractNumber, { color: colors.primary }]}>
                {contract.contractNumber}
              </Text>
              <Text style={[styles.contractName, { color: colors.text }]} numberOfLines={1}>
                {contract.name}
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
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {contract.vendorName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Briefcase size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {CONTRACT_TYPE_LABELS[contract.type] || contract.typeName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar size={14} color={getExpiryColor(contract.expiryDate, contract.status)} />
            <Text style={[styles.infoText, { color: getExpiryColor(contract.expiryDate, contract.status) }]}>
              {contract.status === 'active' && daysUntilExpiry > 0 
                ? `Expires ${formatDate(contract.expiryDate)} (${daysUntilExpiry} days)`
                : `Expiry: ${formatDate(contract.expiryDate)}`
              }
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerLeft}>
            {contract.totalValue && (
              <View style={styles.valueContainer}>
                <DollarSign size={14} color={colors.primary} />
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {formatCurrency(contract.totalValue)}
                </Text>
              </View>
            )}
            {contract.autoRenewal && (
              <View style={[styles.autoRenewBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <RefreshCw size={10} color={colors.textSecondary} />
                <Text style={[styles.autoRenewText, { color: colors.textSecondary }]}>Auto</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedContract) return null;

    const statusConfig = STATUS_CONFIG[selectedContract.status];
    const StatusIcon = statusConfig.icon;
    const daysUntilExpiry = getDaysUntilExpiry(selectedContract.expiryDate);
    const spentPercentage = selectedContract.totalValue 
      ? Math.round((selectedContract.spentToDate / selectedContract.totalValue) * 100)
      : 0;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Contract Details</Text>
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
                  <StatusIcon size={24} color={statusConfig.color} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailNumber, { color: colors.primary }]}>
                    {selectedContract.contractNumber}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedContract.name}
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
                {selectedContract.autoRenewal && (
                  <View style={[styles.autoRenewBadgeLarge, { backgroundColor: colors.backgroundSecondary }]}>
                    <RefreshCw size={14} color={colors.primary} />
                    <Text style={[styles.autoRenewTextLarge, { color: colors.primary }]}>Auto Renewal</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vendor</Text>
              <View style={styles.vendorCard}>
                <View style={[styles.vendorIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Building2 size={20} color={colors.primary} />
                </View>
                <View style={styles.vendorInfo}>
                  <Text style={[styles.vendorName, { color: colors.text }]}>{selectedContract.vendorName}</Text>
                  <Text style={[styles.vendorNumber, { color: colors.textSecondary }]}>
                    {selectedContract.vendorNumber}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Contract Dates</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {CONTRACT_TYPE_LABELS[selectedContract.type] || selectedContract.typeName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Effective Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(selectedContract.effectiveDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expiry Date</Text>
                <Text style={[styles.detailValue, { color: getExpiryColor(selectedContract.expiryDate, selectedContract.status) }]}>
                  {formatDate(selectedContract.expiryDate)}
                  {selectedContract.status === 'active' && daysUntilExpiry > 0 && ` (${daysUntilExpiry} days)`}
                </Text>
              </View>
              {selectedContract.renewalDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Renewal Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedContract.renewalDate)}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notification</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedContract.notificationDays} days before expiry
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial</Text>
              {selectedContract.totalValue && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Value</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatCurrency(selectedContract.totalValue)}
                    </Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        Spent to Date: {formatCurrency(selectedContract.spentToDate)}
                      </Text>
                      <Text style={[styles.progressPercent, { color: colors.text }]}>{spentPercentage}%</Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min(spentPercentage, 100)}%`,
                            backgroundColor: spentPercentage > 90 ? '#EF4444' : spentPercentage > 75 ? '#F59E0B' : colors.primary,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.remainingText, { color: colors.textSecondary }]}>
                      Remaining: {formatCurrency(selectedContract.remainingValue)}
                    </Text>
                  </View>
                </>
              )}
              {selectedContract.annualValue && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Annual Value</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatCurrency(selectedContract.annualValue)}
                  </Text>
                </View>
              )}
              {selectedContract.paymentTerms && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payment Terms</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedContract.paymentTerms}</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Scope</Text>
              <Text style={[styles.scopeText, { color: colors.textSecondary }]}>
                {selectedContract.scope}
              </Text>
              {selectedContract.deliverables && (
                <>
                  <Text style={[styles.subsectionTitle, { color: colors.text, marginTop: 12 }]}>Deliverables</Text>
                  <Text style={[styles.scopeText, { color: colors.textSecondary }]}>
                    {selectedContract.deliverables}
                  </Text>
                </>
              )}
            </View>

            {selectedContract.slaMetrics && selectedContract.slaMetrics.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  SLA Metrics ({selectedContract.slaMetrics.length})
                </Text>
                {selectedContract.slaMetrics.map((sla, index) => (
                  <View key={sla.id || index} style={[styles.slaItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.slaIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Target size={16} color={colors.primary} />
                    </View>
                    <View style={styles.slaInfo}>
                      <Text style={[styles.slaMetric, { color: colors.text }]}>{sla.metric}</Text>
                      <Text style={[styles.slaTarget, { color: colors.textSecondary }]}>
                        Target: {sla.target}
                      </Text>
                      <Text style={[styles.slaMeasurement, { color: colors.textSecondary }]}>
                        Measurement: {sla.measurementMethod}
                      </Text>
                      {sla.penalty && (
                        <Text style={[styles.slaPenalty, { color: '#F59E0B' }]}>
                          Penalty: {sla.penalty}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedContract.contacts.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Contacts ({selectedContract.contacts.length})
                </Text>
                {selectedContract.contacts.map((contact, index) => (
                  <View key={contact.id || index} style={[styles.contactItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.contactAvatar, { backgroundColor: contact.isInternal ? colors.primary : '#6B7280' }]}>
                      <Text style={styles.contactInitials}>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeader}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                        {contact.isInternal && (
                          <View style={[styles.internalBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <Text style={[styles.internalText, { color: colors.primary }]}>Internal</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.contactRole, { color: colors.textSecondary }]}>
                        {contact.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Text style={[styles.contactDetail, { color: colors.textSecondary }]}>{contact.email}</Text>
                      <Text style={[styles.contactDetail, { color: colors.textSecondary }]}>{contact.phone}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedContract.facilities.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Facilities ({selectedContract.facilities.filter(f => f.isIncluded).length})
                </Text>
                <View style={styles.facilitiesContainer}>
                  {selectedContract.facilities.filter(f => f.isIncluded).map((facility, index) => (
                    <View key={facility.id || index} style={[styles.facilityBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <MapPin size={12} color={colors.primary} />
                      <Text style={[styles.facilityText, { color: colors.text }]}>{facility.facilityName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedContract.performanceReviews.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Performance Reviews ({selectedContract.performanceReviews.length})
                </Text>
                {selectedContract.performanceReviews.slice(0, 3).map((review, index) => (
                  <View key={review.id || index} style={[styles.reviewItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.reviewHeader}>
                      <Text style={[styles.reviewDate, { color: colors.text }]}>
                        {formatDate(review.reviewDate)}
                      </Text>
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            color={star <= review.overallRating ? '#F59E0B' : colors.border}
                            fill={star <= review.overallRating ? '#F59E0B' : 'transparent'}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={[styles.reviewBy, { color: colors.textSecondary }]}>
                      Reviewed by {review.reviewedByName}
                    </Text>
                    {review.comments && (
                      <Text style={[styles.reviewComments, { color: colors.textSecondary }]} numberOfLines={2}>
                        {review.comments}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {selectedContract.amendmentHistory.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Amendments ({selectedContract.amendmentHistory.length})
                </Text>
                {selectedContract.amendmentHistory.map((amendment, index) => (
                  <View key={amendment.id || index} style={[styles.amendmentItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.amendmentIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <FileCheck size={16} color={colors.primary} />
                    </View>
                    <View style={styles.amendmentInfo}>
                      <Text style={[styles.amendmentNumber, { color: colors.text }]}>
                        {amendment.amendmentNumber}
                      </Text>
                      <Text style={[styles.amendmentDesc, { color: colors.textSecondary }]}>
                        {amendment.description}
                      </Text>
                      {amendment.valueChange && (
                        <Text style={[styles.amendmentValue, { color: amendment.valueChange > 0 ? '#10B981' : '#EF4444' }]}>
                          {amendment.valueChange > 0 ? '+' : ''}{formatCurrency(amendment.valueChange)}
                        </Text>
                      )}
                      <Text style={[styles.amendmentDate, { color: colors.textSecondary }]}>
                        Effective: {formatDate(amendment.effectiveDate)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedContract.terminatedAt && (
              <View style={[styles.section, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: '#EF4444' }]}>
                <View style={styles.terminationHeader}>
                  <Ban size={20} color="#EF4444" />
                  <Text style={[styles.sectionTitle, { color: '#EF4444', marginBottom: 0, marginLeft: 8 }]}>
                    Termination Details
                  </Text>
                </View>
                <View style={[styles.detailRow, { marginTop: 12 }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Terminated By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedContract.terminatedByName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Terminated On</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedContract.terminatedAt)}</Text>
                </View>
                {selectedContract.terminationReason && (
                  <View style={styles.terminationReason}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reason</Text>
                    <Text style={[styles.reasonText, { color: colors.text }]}>{selectedContract.terminationReason}</Text>
                  </View>
                )}
              </View>
            )}

            {selectedContract.notes && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {selectedContract.notes}
                </Text>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Audit Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedContract.createdByName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created On</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedContract.createdAt)}</Text>
              </View>
              {selectedContract.approvedByName && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedContract.approvedByName}</Text>
                </View>
              )}
              {selectedContract.approvedAt && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved On</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedContract.approvedAt)}</Text>
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

          {Object.entries(CONTRACT_STATUSES).map(([key, label]) => {
            const config = STATUS_CONFIG[key as ContractStatus];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleStatusFilterSelect(key as ContractStatus)}
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
            { field: 'name' as SortField, label: 'Contract Name' },
            { field: 'vendor_name' as SortField, label: 'Vendor Name' },
            { field: 'expiry_date' as SortField, label: 'Expiry Date' },
            { field: 'total_value' as SortField, label: 'Total Value' },
            { field: 'status' as SortField, label: 'Status' },
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
          title: 'Vendor Contracts',
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
          <Text style={[styles.statValueSmall, { color: colors.text }]} numberOfLines={1}>
            {formatCurrency(statistics.totalValue)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search contracts..."
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
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contracts...</Text>
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
          {filteredContracts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Contracts Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Vendor contracts will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
              </Text>
              {filteredContracts.map(renderContractCard)}
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
  statValueSmall: {
    fontSize: 16,
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
  contractNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  contractName: {
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  autoRenewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  autoRenewText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  autoRenewBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  autoRenewTextLarge: {
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
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
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
  vendorNumber: {
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 12,
    marginTop: 4,
  },
  scopeText: {
    fontSize: 14,
    lineHeight: 22,
  },
  slaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  slaIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  slaMetric: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  slaTarget: {
    fontSize: 13,
    marginTop: 2,
  },
  slaMeasurement: {
    fontSize: 12,
    marginTop: 2,
  },
  slaPenalty: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
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
  internalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  internalText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  contactRole: {
    fontSize: 12,
    marginTop: 2,
  },
  contactDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  facilityText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewBy: {
    fontSize: 12,
    marginTop: 4,
  },
  reviewComments: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },
  amendmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  amendmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amendmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  amendmentNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  amendmentDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  amendmentValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  amendmentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  terminationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  terminationReason: {
    marginTop: 8,
  },
  reasonText: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 22,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
