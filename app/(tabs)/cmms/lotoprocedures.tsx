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
import {
  useLOTOProceduresQuery,
  useActiveLOTOExecutions,
} from '@/hooks/useCMMSSafetyCompliance';
import { LOTOProcedure, LOTOStatus, EnergySourceType, LOTO_STATUSES, ENERGY_SOURCE_TYPES } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  ArrowUpDown,
  Check,
  Zap,
  Wrench,
  Droplets,
  Wind,
  Flame,
  FlaskConical,
  Atom,
  CircleDot,
  Settings,
  Users,
  Shield,
  Calendar,
  Hash,
  Building,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<LOTOStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: FileText },
  active: { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  locked_out: { label: 'Locked Out', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: Lock },
  verified: { label: 'Verified', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: Shield },
  released: { label: 'Released', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: Unlock },
  archived: { label: 'Archived', color: '#9CA3AF', bgColor: 'rgba(156, 163, 175, 0.15)', icon: Clock },
};

const ENERGY_ICONS: Record<EnergySourceType, React.ElementType> = {
  electrical: Zap,
  mechanical: Wrench,
  hydraulic: Droplets,
  pneumatic: Wind,
  thermal: Flame,
  chemical: FlaskConical,
  gravitational: CircleDot,
  radiation: Atom,
  other: Settings,
};

type StatusFilter = 'all' | LOTOStatus;
type SortField = 'name' | 'equipment_name' | 'status' | 'effective_date' | 'version';
type SortDirection = 'asc' | 'desc';

export default function LOTOProceduresScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<LOTOProcedure | null>(null);

  const { data: procedures = [], isLoading, refetch } = useLOTOProceduresQuery({
    facilityId: facilityId || undefined,
  });

  const { data: activeExecutions = [] } = useActiveLOTOExecutions(facilityId || undefined);

  const filteredProcedures = useMemo(() => {
    let filtered = [...procedures];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.procedureNumber.toLowerCase().includes(query) ||
        p.equipmentName.toLowerCase().includes(query) ||
        p.equipmentTag.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'equipment_name':
          comparison = a.equipmentName.localeCompare(b.equipmentName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'effective_date':
          comparison = new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime();
          break;
        case 'version':
          comparison = a.version - b.version;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [procedures, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = procedures.length;
    const active = procedures.filter(p => p.status === 'active').length;
    const draft = procedures.filter(p => p.status === 'draft').length;
    const currentlyLockedOut = activeExecutions.filter(e => e.status === 'locked_out' || e.status === 'verified').length;
    
    return { total, active, draft, currentlyLockedOut };
  }, [procedures, activeExecutions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleProcedurePress = useCallback((procedure: LOTOProcedure) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProcedure(procedure);
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

  const renderProcedureCard = (procedure: LOTOProcedure) => {
    const statusConfig = STATUS_CONFIG[procedure.status];
    const StatusIcon = statusConfig.icon;
    const hasActiveExecution = activeExecutions.some(e => e.procedureId === procedure.id);

    return (
      <TouchableOpacity
        key={procedure.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleProcedurePress(procedure)}
        activeOpacity={0.7}
        testID={`procedure-card-${procedure.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.statusIndicator, { backgroundColor: statusConfig.bgColor }]}>
              <StatusIcon size={14} color={statusConfig.color} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.procedureNumber, { color: colors.primary }]}>
                {procedure.procedureNumber}
              </Text>
              <Text style={[styles.procedureName, { color: colors.text }]} numberOfLines={1}>
                {procedure.name}
              </Text>
            </View>
          </View>
          {hasActiveExecution && (
            <View style={[styles.activeBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Lock size={12} color="#EF4444" />
              <Text style={[styles.activeBadgeText, { color: '#EF4444' }]}>Active</Text>
            </View>
          )}
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Wrench size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {procedure.equipmentName} ({procedure.equipmentTag})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Building size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {procedure.facilityName}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.energySourcesContainer}>
            {procedure.energySources.slice(0, 4).map((source, index) => {
              const EnergyIcon = ENERGY_ICONS[source.type] || Settings;
              return (
                <View 
                  key={source.id || index} 
                  style={[styles.energyBadge, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <EnergyIcon size={12} color={colors.primary} />
                </View>
              );
            })}
            {procedure.energySources.length > 4 && (
              <View style={[styles.energyBadge, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.energyMoreText, { color: colors.textSecondary }]}>
                  +{procedure.energySources.length - 4}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metaInfo}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              v{procedure.version}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
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
    if (!selectedProcedure) return null;

    const statusConfig = STATUS_CONFIG[selectedProcedure.status];
    const StatusIcon = statusConfig.icon;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>LOTO Procedure</Text>
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
                    {selectedProcedure.procedureNumber}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedProcedure.name}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedProcedure.equipmentName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tag</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedProcedure.equipmentTag}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedProcedure.facilityName}</Text>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {selectedProcedure.description}
              </Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Energy Sources ({selectedProcedure.energySources.length})
              </Text>
              {selectedProcedure.energySources.map((source, index) => {
                const EnergyIcon = ENERGY_ICONS[source.type] || Settings;
                return (
                  <View key={source.id || index} style={[styles.energyItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.energyIconLarge, { backgroundColor: colors.backgroundSecondary }]}>
                      <EnergyIcon size={18} color={colors.primary} />
                    </View>
                    <View style={styles.energyInfo}>
                      <Text style={[styles.energyType, { color: colors.text }]}>
                        {ENERGY_SOURCE_TYPES[source.type]}
                      </Text>
                      <Text style={[styles.energyDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {source.description}
                      </Text>
                      <Text style={[styles.energyLocation, { color: colors.textSecondary }]}>
                        Location: {source.location}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Lockout Steps ({selectedProcedure.lockoutSteps.length})
              </Text>
              {selectedProcedure.lockoutSteps.map((step, index) => (
                <View key={step.id || index} style={[styles.stepItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>{step.order}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepDescription, { color: colors.text }]}>{step.description}</Text>
                    <Text style={[styles.stepLocation, { color: colors.textSecondary }]}>
                      Lock: {step.lockColor} • Location: {step.location}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Required PPE ({selectedProcedure.requiredPPE.length})
              </Text>
              <View style={styles.ppeContainer}>
                {selectedProcedure.requiredPPE.map((ppe, index) => (
                  <View key={index} style={[styles.ppeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Shield size={14} color={colors.primary} />
                    <Text style={[styles.ppeText, { color: colors.text }]}>{ppe}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Authorized Personnel ({selectedProcedure.authorizedEmployees.length})
              </Text>
              {selectedProcedure.authorizedEmployees.map((employee, index) => (
                <View key={employee.id || index} style={[styles.employeeItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.employeeAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.employeeInitials}>
                      {employee.employeeName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={[styles.employeeName, { color: colors.text }]}>{employee.employeeName}</Text>
                    <Text style={[styles.employeeRole, { color: colors.textSecondary }]}>
                      {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)} • {employee.employeeNumber}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Version</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedProcedure.version}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Effective Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedProcedure.effectiveDate)}</Text>
              </View>
              {selectedProcedure.reviewDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Review Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedProcedure.reviewDate)}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedProcedure.createdByName}</Text>
              </View>
              {selectedProcedure.approvedByName && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedProcedure.approvedByName}</Text>
                </View>
              )}
            </View>

            {selectedProcedure.specialInstructions && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Special Instructions</Text>
                <View style={[styles.warningBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B' }]}>
                  <AlertTriangle size={18} color="#F59E0B" />
                  <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                    {selectedProcedure.specialInstructions}
                  </Text>
                </View>
              </View>
            )}

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

          {Object.entries(LOTO_STATUSES).map(([key, label]) => {
            const config = STATUS_CONFIG[key as LOTOStatus];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleStatusFilterSelect(key as LOTOStatus)}
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
            { field: 'name' as SortField, label: 'Procedure Name' },
            { field: 'equipment_name' as SortField, label: 'Equipment Name' },
            { field: 'status' as SortField, label: 'Status' },
            { field: 'effective_date' as SortField, label: 'Effective Date' },
            { field: 'version' as SortField, label: 'Version' },
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
          title: 'LOTO Procedures',
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
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{statistics.draft}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Draft</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{statistics.currentlyLockedOut}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Locked Out</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search procedures..."
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
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading procedures...</Text>
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
          {filteredProcedures.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Lock size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Procedures Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'LOTO procedures will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredProcedures.length} procedure{filteredProcedures.length !== 1 ? 's' : ''}
              </Text>
              {filteredProcedures.map(renderProcedureCard)}
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
    borderBottomWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  procedureNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  procedureName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
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
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  energySourcesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  energyBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyMoreText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
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
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
  energyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  energyIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  energyType: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  energyDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  energyLocation: {
    fontSize: 12,
    marginTop: 4,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stepInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stepDescription: {
    fontSize: 14,
  },
  stepLocation: {
    fontSize: 12,
    marginTop: 4,
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
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  employeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  employeeRole: {
    fontSize: 12,
    marginTop: 2,
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
