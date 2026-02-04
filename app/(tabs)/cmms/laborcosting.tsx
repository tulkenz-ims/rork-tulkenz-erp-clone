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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useLaborCostsQuery,
  useCreateLaborCost,
  useUpdateLaborCost,
  useApproveLaborCost,
} from '@/hooks/useCMMSCostTracking';
import { LaborCost } from '@/types/cmms';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  User,
  Calendar,
  Wrench,
  Timer,
  Hash,
  Briefcase,
  Building2,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const LABOR_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; multiplier: string }> = {
  regular: { label: 'Regular', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', multiplier: '1x' },
  overtime: { label: 'Overtime', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', multiplier: '1.5x' },
  double_time: { label: 'Double Time', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', multiplier: '2x' },
  contractor: { label: 'Contractor', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', multiplier: '-' },
};

type LaborTypeFilter = 'all' | 'regular' | 'overtime' | 'double_time' | 'contractor';
type ApprovalFilter = 'all' | 'approved' | 'pending';
type SortField = 'date_worked' | 'employee_name' | 'hours_worked' | 'total_cost';
type SortDirection = 'asc' | 'desc';

export default function LaborCostingScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [laborTypeFilter, setLaborTypeFilter] = useState<LaborTypeFilter>('all');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date_worked');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedLaborCost, setSelectedLaborCost] = useState<LaborCost | null>(null);

  const { data: laborCosts = [], isLoading, refetch } = useLaborCostsQuery({
    facilityId: facilityId || undefined,
  });

  const approveMutation = useApproveLaborCost({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedLaborCost(null);
      Alert.alert('Success', 'Labor cost approved successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to approve labor cost');
    },
  });

  const filteredLaborCosts = useMemo(() => {
    let filtered = [...laborCosts];

    if (laborTypeFilter !== 'all') {
      filtered = filtered.filter(lc => lc.laborType === laborTypeFilter);
    }

    if (approvalFilter !== 'all') {
      filtered = filtered.filter(lc => 
        approvalFilter === 'approved' ? lc.isApproved : !lc.isApproved
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(lc =>
        lc.employeeName.toLowerCase().includes(query) ||
        lc.employeeNumber.toLowerCase().includes(query) ||
        lc.workOrderNumber.toLowerCase().includes(query) ||
        lc.equipmentName?.toLowerCase().includes(query) ||
        lc.craftName?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date_worked':
          comparison = new Date(a.dateWorked).getTime() - new Date(b.dateWorked).getTime();
          break;
        case 'employee_name':
          comparison = a.employeeName.localeCompare(b.employeeName);
          break;
        case 'hours_worked':
          comparison = a.hoursWorked - b.hoursWorked;
          break;
        case 'total_cost':
          comparison = a.totalCost - b.totalCost;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [laborCosts, laborTypeFilter, approvalFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = laborCosts.length;
    const pending = laborCosts.filter(lc => !lc.isApproved).length;
    const approved = laborCosts.filter(lc => lc.isApproved).length;
    const totalHours = laborCosts.reduce((sum, lc) => sum + (lc.hoursWorked || 0), 0);
    const totalCost = laborCosts.reduce((sum, lc) => sum + (lc.totalCost || 0), 0);
    const regularHours = laborCosts.filter(lc => lc.laborType === 'regular').reduce((sum, lc) => sum + lc.hoursWorked, 0);
    const overtimeHours = laborCosts.filter(lc => lc.laborType === 'overtime').reduce((sum, lc) => sum + lc.hoursWorked, 0);
    const avgHourlyRate = laborCosts.length > 0 
      ? laborCosts.reduce((sum, lc) => sum + lc.hourlyRate, 0) / laborCosts.length 
      : 0;
    return { total, pending, approved, totalHours, totalCost, regularHours, overtimeHours, avgHourlyRate };
  }, [laborCosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLaborCostPress = useCallback((laborCost: LaborCost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLaborCost(laborCost);
    setShowDetailModal(true);
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedLaborCost) return;
    Alert.alert(
      'Approve Labor Cost',
      `Approve ${selectedLaborCost.hoursWorked} hours for ${selectedLaborCost.employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            approveMutation.mutate({
              id: selectedLaborCost.id,
              approvedBy: 'current-user-id',
              approvedByName: 'Current User',
            });
          },
        },
      ]
    );
  }, [selectedLaborCost, approveMutation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`;
  };

  const renderLaborCostCard = (laborCost: LaborCost) => {
    const typeConfig = LABOR_TYPE_CONFIG[laborCost.laborType] || LABOR_TYPE_CONFIG.regular;

    return (
      <TouchableOpacity
        key={laborCost.id}
        style={[styles.laborCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleLaborCostPress(laborCost)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {laborCost.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={styles.employeeDetails}>
              <Text style={[styles.employeeName, { color: colors.text }]} numberOfLines={1}>
                {laborCost.employeeName}
              </Text>
              <Text style={[styles.employeeNumber, { color: colors.textTertiary }]}>
                #{laborCost.employeeNumber}
                {laborCost.craftName && ` • ${laborCost.craftName}`}
              </Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
              <Text style={[styles.typeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>
            {laborCost.isApproved ? (
              <CheckCircle2 size={18} color="#10B981" />
            ) : (
              <Clock size={18} color="#F59E0B" />
            )}
          </View>
        </View>

        <View style={styles.workOrderRow}>
          <Wrench size={14} color={colors.textSecondary} />
          <Text style={[styles.workOrderText, { color: colors.textSecondary }]}>
            WO: {laborCost.workOrderNumber}
          </Text>
          {laborCost.equipmentName && (
            <Text style={[styles.equipmentText, { color: colors.textTertiary }]} numberOfLines={1}>
              • {laborCost.equipmentName}
            </Text>
          )}
        </View>

        <View style={styles.dateTimeRow}>
          <View style={styles.dateContainer}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(laborCost.dateWorked)}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatTime(laborCost.startTime)} - {formatTime(laborCost.endTime)}
            </Text>
          </View>
        </View>

        <View style={styles.costRow}>
          <View style={[styles.costItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Timer size={14} color={colors.primary} />
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Hours</Text>
            <Text style={[styles.costValue, { color: colors.text }]}>
              {formatHours(laborCost.hoursWorked)}
            </Text>
          </View>
          <View style={[styles.costItem, { backgroundColor: colors.backgroundSecondary }]}>
            <DollarSign size={14} color="#F59E0B" />
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Rate</Text>
            <Text style={[styles.costValue, { color: colors.text }]}>
              {formatCurrency(laborCost.hourlyRate)}/hr
            </Text>
          </View>
          <View style={[styles.costItem, { backgroundColor: '#10B981' + '15' }]}>
            <DollarSign size={14} color="#10B981" />
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[styles.costValue, { color: '#10B981' }]}>
              {formatCurrency(laborCost.totalCost)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.approvalStatus, { color: laborCost.isApproved ? '#10B981' : '#F59E0B' }]}>
            {laborCost.isApproved ? 'Approved' : 'Pending Approval'}
          </Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedLaborCost) return null;
    const typeConfig = LABOR_TYPE_CONFIG[selectedLaborCost.laborType] || LABOR_TYPE_CONFIG.regular;
    const canApprove = !selectedLaborCost.isApproved;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Labor Cost Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.employeeHeader}>
                <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarTextLarge}>
                    {selectedLaborCost.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.employeeHeaderInfo}>
                  <Text style={[styles.employeeNameLarge, { color: colors.text }]}>
                    {selectedLaborCost.employeeName}
                  </Text>
                  <Text style={[styles.employeeNumberLarge, { color: colors.textSecondary }]}>
                    #{selectedLaborCost.employeeNumber}
                  </Text>
                </View>
                <View style={[styles.typeBadgeLarge, { backgroundColor: typeConfig.bgColor }]}>
                  <Text style={[styles.typeTextLarge, { color: typeConfig.color }]}>
                    {typeConfig.label}
                  </Text>
                  <Text style={[styles.multiplierText, { color: typeConfig.color }]}>
                    {typeConfig.multiplier}
                  </Text>
                </View>
              </View>

              {selectedLaborCost.craftName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                    <Briefcase size={16} color="#8B5CF6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Craft/Trade</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedLaborCost.craftName}
                      {selectedLaborCost.craftCode && ` (${selectedLaborCost.craftCode})`}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Wrench size={16} color="#3B82F6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Work Order</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedLaborCost.workOrderNumber}
                  </Text>
                </View>
              </View>

              {selectedLaborCost.equipmentName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                    <Building2 size={16} color="#F59E0B" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Equipment</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedLaborCost.equipmentName}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <Calendar size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Date Worked</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedLaborCost.dateWorked)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#EC4899' + '15' }]}>
                  <Clock size={16} color="#EC4899" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatTime(selectedLaborCost.startTime)} - {formatTime(selectedLaborCost.endTime)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.costSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Breakdown</Text>
              
              <View style={styles.costGrid}>
                <View style={[styles.costCard, { backgroundColor: colors.primary + '10' }]}>
                  <Timer size={20} color={colors.primary} />
                  <Text style={[styles.costCardLabel, { color: colors.textSecondary }]}>Hours Worked</Text>
                  <Text style={[styles.costCardValue, { color: colors.primary }]}>
                    {selectedLaborCost.hoursWorked.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.costCard, { backgroundColor: '#F59E0B' + '10' }]}>
                  <DollarSign size={20} color="#F59E0B" />
                  <Text style={[styles.costCardLabel, { color: colors.textSecondary }]}>Hourly Rate</Text>
                  <Text style={[styles.costCardValue, { color: '#F59E0B' }]}>
                    {formatCurrency(selectedLaborCost.hourlyRate)}
                  </Text>
                </View>
              </View>

              <View style={[styles.totalCostBox, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}>
                <Text style={[styles.totalCostLabel, { color: '#10B981' }]}>Total Cost</Text>
                <Text style={[styles.totalCostValue, { color: '#10B981' }]}>
                  {formatCurrency(selectedLaborCost.totalCost)}
                </Text>
              </View>

              {(selectedLaborCost.costCenter || selectedLaborCost.glAccount) && (
                <View style={styles.accountingRow}>
                  {selectedLaborCost.costCenter && (
                    <View style={styles.accountingItem}>
                      <Text style={[styles.accountingLabel, { color: colors.textTertiary }]}>Cost Center</Text>
                      <Text style={[styles.accountingValue, { color: colors.text }]}>
                        {selectedLaborCost.costCenter}
                      </Text>
                    </View>
                  )}
                  {selectedLaborCost.glAccount && (
                    <View style={styles.accountingItem}>
                      <Text style={[styles.accountingLabel, { color: colors.textTertiary }]}>GL Account</Text>
                      <Text style={[styles.accountingValue, { color: colors.text }]}>
                        {selectedLaborCost.glAccount}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={[styles.approvalSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Approval Status</Text>
              
              <View style={[
                styles.approvalStatusBox,
                { backgroundColor: selectedLaborCost.isApproved ? '#10B981' + '10' : '#F59E0B' + '10' }
              ]}>
                {selectedLaborCost.isApproved ? (
                  <CheckCircle2 size={24} color="#10B981" />
                ) : (
                  <AlertCircle size={24} color="#F59E0B" />
                )}
                <View style={styles.approvalStatusInfo}>
                  <Text style={[
                    styles.approvalStatusText,
                    { color: selectedLaborCost.isApproved ? '#10B981' : '#F59E0B' }
                  ]}>
                    {selectedLaborCost.isApproved ? 'Approved' : 'Pending Approval'}
                  </Text>
                  {selectedLaborCost.approvedByName && (
                    <Text style={[styles.approvedByText, { color: colors.textSecondary }]}>
                      By {selectedLaborCost.approvedByName}
                      {selectedLaborCost.approvedAt && ` on ${formatDate(selectedLaborCost.approvedAt)}`}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {selectedLaborCost.notes && (
              <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.notesLabel, { color: colors.textTertiary }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{selectedLaborCost.notes}</Text>
              </View>
            )}
          </ScrollView>

          {canApprove && (
            <View style={[styles.modalActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, { backgroundColor: '#10B981' }]}
                onPress={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Approve Labor Cost</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter Labor Costs</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            <Text style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Labor Type</Text>
            <TouchableOpacity
              style={[
                styles.filterOption,
                { borderBottomColor: colors.border },
                laborTypeFilter === 'all' && { backgroundColor: colors.primary + '10' },
              ]}
              onPress={() => setLaborTypeFilter('all')}
            >
              <Text style={[styles.filterOptionText, { color: laborTypeFilter === 'all' ? colors.primary : colors.text }]}>
                All Types
              </Text>
              {laborTypeFilter === 'all' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
            {Object.entries(LABOR_TYPE_CONFIG).map(([type, config]) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  laborTypeFilter === type && { backgroundColor: config.bgColor },
                ]}
                onPress={() => setLaborTypeFilter(type as LaborTypeFilter)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.colorDot, { backgroundColor: config.color }]} />
                  <Text style={[styles.filterOptionText, { color: laborTypeFilter === type ? config.color : colors.text }]}>
                    {config.label}
                  </Text>
                </View>
                {laborTypeFilter === type && <Check size={20} color={config.color} />}
              </TouchableOpacity>
            ))}

            <Text style={[styles.filterSectionLabel, { color: colors.textTertiary, marginTop: 16 }]}>Approval Status</Text>
            {[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  approvalFilter === option.value && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => {
                  setApprovalFilter(option.value as ApprovalFilter);
                }}
              >
                <Text style={[styles.filterOptionText, { color: approvalFilter === option.value ? colors.primary : colors.text }]}>
                  {option.label}
                </Text>
                {approvalFilter === option.value && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            {[
              { field: 'date_worked', label: 'Date Worked' },
              { field: 'employee_name', label: 'Employee Name' },
              { field: 'hours_worked', label: 'Hours Worked' },
              { field: 'total_cost', label: 'Total Cost' },
            ].map((option) => (
              <TouchableOpacity
                key={option.field}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  sortField === option.field && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => {
                  if (sortField === option.field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(option.field as SortField);
                    setSortDirection('desc');
                  }
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, { color: sortField === option.field ? colors.primary : colors.text }]}>
                  {option.label}
                </Text>
                {sortField === option.field && (
                  <View style={styles.sortIndicator}>
                    <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading labor costs...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Labor Costing' }} />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Entries</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#F59E0B' + '15' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.pending}</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Pending</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#10B981' + '15' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{statistics.totalHours.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Hours</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#8B5CF6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{formatCurrency(statistics.avgHourlyRate).replace('$', '')}</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Avg Rate</Text>
          </View>
        </View>
        <View style={[styles.totalCostRow, { backgroundColor: '#10B981' + '10' }]}>
          <DollarSign size={16} color="#10B981" />
          <Text style={[styles.totalCostRowLabel, { color: '#10B981' }]}>Total Labor Cost:</Text>
          <Text style={[styles.totalCostRowAmount, { color: '#10B981' }]}>{formatCurrency(statistics.totalCost)}</Text>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search employees, work orders..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: (laborTypeFilter !== 'all' || approvalFilter !== 'all') ? colors.primary : colors.border },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={(laborTypeFilter !== 'all' || approvalFilter !== 'all') ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
        >
          <ArrowUpDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredLaborCosts.length} {filteredLaborCosts.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredLaborCosts.length > 0 ? (
          filteredLaborCosts.map(renderLaborCostCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <Timer size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Labor Costs</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || laborTypeFilter !== 'all' || approvalFilter !== 'all'
                ? 'No labor costs match your filters'
                : 'Labor cost entries will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  statsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  totalCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  totalCostRowLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  totalCostRowAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  laborCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  employeeNumber: {
    fontSize: 12,
    marginTop: 2,
  },
  statusContainer: {
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
    fontWeight: '600' as const,
  },
  typeBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  typeTextLarge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  multiplierText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  workOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workOrderText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  equipmentText: {
    fontSize: 13,
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
  },
  costRow: {
    flexDirection: 'row',
    gap: 8,
  },
  costItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 2,
  },
  costLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  costValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  approvalStatus: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  detailSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  employeeHeaderInfo: {
    flex: 1,
  },
  employeeNameLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  employeeNumberLarge: {
    fontSize: 14,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  costSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  costGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  costCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  costCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  costCardValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  totalCostBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalCostLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  totalCostValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  accountingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  accountingItem: {
    flex: 1,
  },
  accountingLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  accountingValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  approvalSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  approvalStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  approvalStatusInfo: {
    flex: 1,
  },
  approvalStatusText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  approvedByText: {
    fontSize: 13,
    marginTop: 2,
  },
  notesSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {},
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filterOptions: {
    maxHeight: 450,
    paddingBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 15,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  applyButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sortIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
