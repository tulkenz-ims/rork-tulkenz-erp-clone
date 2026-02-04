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
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSafetyPermitsQuery } from '@/hooks/useCMMSSafetyCompliance';
import { SafetyPermit, PermitStatus, PermitType, PERMIT_STATUSES, PERMIT_TYPES } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Check,
  Flame,
  Box,
  Shovel,
  Zap,
  Home,
  Truck,
  Atom,
  HelpCircle,
  MapPin,
  Calendar,
  User,
  Shield,
  Users,
  AlertTriangle,
  ClipboardList,
  Building,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<PermitStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: FileCheck },
  pending_approval: { label: 'Pending', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: Clock },
  approved: { label: 'Approved', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  active: { label: 'Active', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: Shield },
  expired: { label: 'Expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: '#9CA3AF', bgColor: 'rgba(156, 163, 175, 0.15)', icon: XCircle },
  closed: { label: 'Closed', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: CheckCircle2 },
};

const PERMIT_ICONS: Record<PermitType, React.ElementType> = {
  hot_work: Flame,
  confined_space: Box,
  excavation: Shovel,
  electrical: Zap,
  roof_work: Home,
  crane_lift: Truck,
  radiation: Atom,
  other: HelpCircle,
};

type StatusFilter = 'all' | PermitStatus;
type TypeFilter = 'all' | PermitType;
type SortField = 'name' | 'type' | 'status' | 'valid_from' | 'valid_to';
type SortDirection = 'asc' | 'desc';

export default function SafetyPermitsScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('valid_from');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTypeFilterModal, setShowTypeFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<SafetyPermit | null>(null);

  const { data: permits = [], isLoading, refetch } = useSafetyPermitsQuery({
    facilityId: facilityId || undefined,
  });

  const filteredPermits = useMemo(() => {
    let filtered = [...permits];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.permitNumber.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.workDescription.toLowerCase().includes(query) ||
        p.requestedByName.toLowerCase().includes(query)
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
        case 'valid_from':
          comparison = new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime();
          break;
        case 'valid_to':
          comparison = new Date(a.validTo).getTime() - new Date(b.validTo).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [permits, statusFilter, typeFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = permits.length;
    const active = permits.filter(p => p.status === 'active').length;
    const pending = permits.filter(p => p.status === 'pending_approval').length;
    const expiringSoon = permits.filter(p => {
      if (p.status !== 'active') return false;
      const validTo = new Date(p.validTo);
      const now = new Date();
      const daysDiff = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && daysDiff > 0;
    }).length;

    return { total, active, pending, expiringSoon };
  }, [permits]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePermitPress = useCallback((permit: SafetyPermit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPermit(permit);
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
    setShowTypeFilterModal(false);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = (permit: SafetyPermit) => {
    if (permit.status !== 'active') return false;
    const validTo = new Date(permit.validTo);
    const now = new Date();
    const daysDiff = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0;
  };

  const renderPermitCard = (permit: SafetyPermit) => {
    const statusConfig = STATUS_CONFIG[permit.status];
    const StatusIcon = statusConfig.icon;
    const PermitIcon = PERMIT_ICONS[permit.type] || HelpCircle;
    const expiringSoon = isExpiringSoon(permit);

    return (
      <TouchableOpacity
        key={permit.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handlePermitPress(permit)}
        activeOpacity={0.7}
        testID={`permit-card-${permit.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.permitTypeIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <PermitIcon size={18} color={colors.primary} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.permitNumber, { color: colors.primary }]}>
                {permit.permitNumber}
              </Text>
              <Text style={[styles.permitName, { color: colors.text }]} numberOfLines={1}>
                {permit.name}
              </Text>
            </View>
          </View>
          {expiringSoon && (
            <View style={[styles.expiringBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <AlertTriangle size={12} color="#F59E0B" />
            </View>
          )}
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {permit.location}{permit.area ? ` - ${permit.area}` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {permit.requestedByName}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateRange}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(permit.validFrom)} - {formatDate(permit.validTo)}
            </Text>
          </View>
          <View style={styles.cardBadges}>
            <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.typeText, { color: colors.text }]}>
                {PERMIT_TYPES[permit.type]}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <StatusIcon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPermit) return null;

    const statusConfig = STATUS_CONFIG[selectedPermit.status];
    const StatusIcon = statusConfig.icon;
    const PermitIcon = PERMIT_ICONS[selectedPermit.type] || HelpCircle;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Safety Permit</Text>
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
                <View style={[styles.permitTypeIconLarge, { backgroundColor: colors.backgroundSecondary }]}>
                  <PermitIcon size={28} color={colors.primary} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailNumber, { color: colors.primary }]}>
                    {selectedPermit.permitNumber}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedPermit.name}
                  </Text>
                  <Text style={[styles.detailType, { color: colors.textSecondary }]}>
                    {PERMIT_TYPES[selectedPermit.type]}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                <StatusIcon size={16} color={statusConfig.color} />
                <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Validity Period</Text>
              <View style={[styles.validityBox, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.validityItem}>
                  <Text style={[styles.validityLabel, { color: colors.textSecondary }]}>From</Text>
                  <Text style={[styles.validityValue, { color: colors.text }]}>
                    {formatDateTime(selectedPermit.validFrom)}
                  </Text>
                </View>
                <View style={[styles.validityDivider, { backgroundColor: colors.border }]} />
                <View style={styles.validityItem}>
                  <Text style={[styles.validityLabel, { color: colors.textSecondary }]}>To</Text>
                  <Text style={[styles.validityValue, { color: colors.text }]}>
                    {formatDateTime(selectedPermit.validTo)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.facilityName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.location}</Text>
              </View>
              {selectedPermit.area && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Area</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.area}</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Work Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {selectedPermit.workDescription}
              </Text>
            </View>

            {selectedPermit.hazards.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Identified Hazards ({selectedPermit.hazards.length})
                </Text>
                <View style={styles.hazardsList}>
                  {selectedPermit.hazards.map((hazard, index) => (
                    <View key={index} style={[styles.hazardItem, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <AlertTriangle size={14} color="#EF4444" />
                      <Text style={[styles.hazardText, { color: colors.text }]}>{hazard}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedPermit.controlMeasures.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Control Measures ({selectedPermit.controlMeasures.length})
                </Text>
                <View style={styles.controlsList}>
                  {selectedPermit.controlMeasures.map((control, index) => (
                    <View key={index} style={[styles.controlItem, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={[styles.controlText, { color: colors.text }]}>{control}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedPermit.requiredPPE.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Required PPE ({selectedPermit.requiredPPE.length})
                </Text>
                <View style={styles.ppeContainer}>
                  {selectedPermit.requiredPPE.map((ppe, index) => (
                    <View key={index} style={[styles.ppeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <Shield size={14} color={colors.primary} />
                      <Text style={[styles.ppeText, { color: colors.text }]}>{ppe}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedPermit.issuedTo.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Issued To ({selectedPermit.issuedTo.length})
                </Text>
                {selectedPermit.issuedTo.map((worker, index) => (
                  <View key={worker.id || index} style={[styles.workerItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.workerAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.workerInitials}>
                        {worker.employeeName.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={[styles.workerName, { color: colors.text }]}>{worker.employeeName}</Text>
                      <Text style={[styles.workerRole, { color: colors.textSecondary }]}>
                        {worker.role.charAt(0).toUpperCase() + worker.role.slice(1)}
                        {worker.company ? ` • ${worker.company}` : ''}
                      </Text>
                    </View>
                    {worker.isAcknowledged && (
                      <View style={[styles.acknowledgedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <CheckCircle2 size={12} color="#10B981" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {selectedPermit.emergencyProcedures && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Procedures</Text>
                <View style={[styles.warningBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={[styles.warningText, { color: '#EF4444' }]}>
                    {selectedPermit.emergencyProcedures}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Approval Details</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requested By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.requestedByName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requested At</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedPermit.requestedAt)}</Text>
              </View>
              {selectedPermit.approvedByName && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.approvedByName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved At</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedPermit.approvedAt!)}</Text>
                  </View>
                </>
              )}
              {selectedPermit.closedByName && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Closed By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.closedByName}</Text>
                  </View>
                  {selectedPermit.closureNotes && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Closure Notes</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.closureNotes}</Text>
                    </View>
                  )}
                </>
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

          {Object.entries(PERMIT_STATUSES).map(([key, label]) => {
            const config = STATUS_CONFIG[key as PermitStatus];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleStatusFilterSelect(key as PermitStatus)}
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

  const renderTypeFilterModal = () => (
    <Modal
      visible={showTypeFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowTypeFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Type</Text>
          <TouchableOpacity
            onPress={() => setShowTypeFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleTypeFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Types</Text>
            {typeFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(PERMIT_TYPES).map(([key, label]) => {
            const Icon = PERMIT_ICONS[key as PermitType];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleTypeFilterSelect(key as PermitType)}
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
            { field: 'name' as SortField, label: 'Permit Name' },
            { field: 'type' as SortField, label: 'Permit Type' },
            { field: 'status' as SortField, label: 'Status' },
            { field: 'valid_from' as SortField, label: 'Valid From' },
            { field: 'valid_to' as SortField, label: 'Valid To' },
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
          title: 'Safety Permits',
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
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{statistics.expiringSoon}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expiring</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search permits..."
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
              {statusFilter !== 'all' ? STATUS_CONFIG[statusFilter].label : 'Status'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowTypeFilterModal(true)}
          >
            <ClipboardList size={16} color={typeFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: typeFilter !== 'all' ? colors.primary : colors.textSecondary }]}>
              {typeFilter !== 'all' ? PERMIT_TYPES[typeFilter] : 'Type'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowSortModal(true)}
          >
            <ArrowUpDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading permits...</Text>
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
          {filteredPermits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileCheck size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Permits Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Safety permits will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredPermits.length} permit{filteredPermits.length !== 1 ? 's' : ''}
              </Text>
              {filteredPermits.map(renderPermitCard)}
            </>
          )}
        </ScrollView>
      )}

      {renderDetailModal()}
      {renderFilterModal()}
      {renderTypeFilterModal()}
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
    fontSize: 13,
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
  permitTypeIcon: {
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
  permitNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  permitName: {
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  permitTypeIconLarge: {
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
  detailType: {
    fontSize: 13,
    marginTop: 4,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusTextLarge: {
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
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  validityBox: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
  },
  validityItem: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  validityDivider: {
    width: 1,
  },
  validityLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  validityValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'right',
  },
  hazardsList: {
    gap: 8,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  hazardText: {
    fontSize: 13,
    flex: 1,
  },
  controlsList: {
    gap: 8,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  controlText: {
    fontSize: 13,
    flex: 1,
  },
  ppeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ppeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  ppeText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  workerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  workerRole: {
    fontSize: 12,
    marginTop: 2,
  },
  acknowledgedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
