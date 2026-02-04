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
  useCostReportsQuery,
  useGenerateCostReport,
  useCostSummary,
} from '@/hooks/useCMMSCostTracking';
import { CostReport, CostReportDetail } from '@/types/cmms';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  FileText,
  Calendar,
  User,
  Building2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wrench,
  Users,
  Package,
  Briefcase,
  Download,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const REPORT_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  equipment: { label: 'Equipment', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: Wrench },
  work_order: { label: 'Work Order', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: FileText },
  department: { label: 'Department', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: Users },
  facility: { label: 'Facility', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: Building2 },
  budget_variance: { label: 'Budget Variance', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: TrendingDown },
  trend: { label: 'Trend Analysis', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)', icon: TrendingUp },
};

type ReportTypeFilter = 'all' | CostReport['reportType'];
type SortField = 'generated_at' | 'report_name' | 'total_cost';
type SortDirection = 'asc' | 'desc';

export default function CostReportsScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportTypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('generated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CostReport | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

  const { data: costReports = [], isLoading, refetch } = useCostReportsQuery({
    facilityId: facilityId || undefined,
  });

  const { data: costSummary } = useCostSummary({
    facilityId: facilityId || undefined,
  });

  const generateMutation = useGenerateCostReport({
    onSuccess: () => {
      setShowGenerateModal(false);
      Alert.alert('Success', 'Cost report generated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to generate report');
    },
  });

  const filteredReports = useMemo(() => {
    let filtered = [...costReports];

    if (reportTypeFilter !== 'all') {
      filtered = filtered.filter(report => report.reportType === reportTypeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(report =>
        report.reportName.toLowerCase().includes(query) ||
        report.reportNumber.toLowerCase().includes(query) ||
        report.facilityName?.toLowerCase().includes(query) ||
        report.generatedByName.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'generated_at':
          comparison = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
          break;
        case 'report_name':
          comparison = a.reportName.localeCompare(b.reportName);
          break;
        case 'total_cost':
          comparison = a.summary.totalCost - b.summary.totalCost;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [costReports, reportTypeFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const totalReports = costReports.length;
    const totalCostReported = costReports.reduce((sum, r) => sum + (r.summary.totalCost || 0), 0);
    const avgCostPerReport = totalReports > 0 ? totalCostReported / totalReports : 0;
    const reportsByType = Object.entries(REPORT_TYPE_CONFIG).map(([type, config]) => ({
      type,
      label: config.label,
      count: costReports.filter(r => r.reportType === type).length,
    }));
    return { totalReports, totalCostReported, avgCostPerReport, reportsByType };
  }, [costReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleReportPress = useCallback((report: CostReport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReport(report);
    setShowDetailModal(true);
  }, []);

  const handleGenerateReport = useCallback((reportType: CostReport['reportType']) => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    generateMutation.mutate({
      reportType,
      reportName: `${REPORT_TYPE_CONFIG[reportType].label} Cost Report`,
      periodStart: thirtyDaysAgo.toISOString(),
      periodEnd: today.toISOString(),
      parameters: {
        includeLabor: true,
        includeParts: true,
        includeContractor: true,
        includeOther: true,
      },
      generatedBy: 'current-user-id',
      generatedByName: 'Current User',
      facilityId: facilityId || undefined,
      facilityName: orgContext?.facility?.name || undefined,
    });
  }, [generateMutation, facilityId, orgContext?.facility?.name]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderReportCard = (report: CostReport) => {
    const typeConfig = REPORT_TYPE_CONFIG[report.reportType] || REPORT_TYPE_CONFIG.equipment;
    const TypeIcon = typeConfig.icon;

    return (
      <TouchableOpacity
        key={report.id}
        style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleReportPress(report)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIconContainer, { backgroundColor: typeConfig.bgColor }]}>
            <TypeIcon size={20} color={typeConfig.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={[styles.reportName, { color: colors.text }]} numberOfLines={1}>
              {report.reportName}
            </Text>
            <Text style={[styles.reportNumber, { color: colors.textTertiary }]}>
              {report.reportNumber}
            </Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
            <Text style={[styles.typeText, { color: typeConfig.color }]}>
              {typeConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.periodRow}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={[styles.periodText, { color: colors.textSecondary }]}>
            {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
          </Text>
        </View>

        {report.facilityName && (
          <View style={styles.facilityRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.facilityText, { color: colors.textSecondary }]} numberOfLines={1}>
              {report.facilityName}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Users size={12} color="#3B82F6" />
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Labor</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(report.summary.totalLaborCost)}
            </Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <Package size={12} color="#F59E0B" />
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Parts</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(report.summary.totalPartsCost)}
            </Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#10B981' + '15' }]}>
            <DollarSign size={12} color="#10B981" />
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              {formatCurrency(report.summary.totalCost)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.generatedInfo}>
            <User size={12} color={colors.textTertiary} />
            <Text style={[styles.generatedText, { color: colors.textTertiary }]}>
              {report.generatedByName} • {formatDate(report.generatedAt)}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailRow = (detail: CostReportDetail, index: number) => {
    const isExpanded = expandedDetail === detail.id;

    return (
      <View key={detail.id} style={[styles.detailItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.detailHeader}
          onPress={() => setExpandedDetail(isExpanded ? null : detail.id)}
        >
          <View style={styles.detailTitleRow}>
            <Text style={[styles.detailRank, { color: colors.primary }]}>#{index + 1}</Text>
            <Text style={[styles.detailName, { color: colors.text }]} numberOfLines={1}>
              {detail.groupName}
            </Text>
          </View>
          <View style={styles.detailTotalRow}>
            <Text style={[styles.detailTotal, { color: '#10B981' }]}>
              {formatCurrency(detail.totalCost)}
            </Text>
            {isExpanded ? (
              <ChevronDown size={18} color={colors.textTertiary} />
            ) : (
              <ChevronRight size={18} color={colors.textTertiary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.detailExpanded, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.detailBreakdown}>
              <View style={styles.detailBreakdownItem}>
                <Text style={[styles.detailBreakdownLabel, { color: colors.textTertiary }]}>Labor</Text>
                <Text style={[styles.detailBreakdownValue, { color: colors.text }]}>
                  {formatCurrency(detail.laborCost)}
                </Text>
                <Text style={[styles.detailBreakdownSub, { color: colors.textTertiary }]}>
                  {detail.laborHours.toFixed(1)} hrs
                </Text>
              </View>
              <View style={styles.detailBreakdownItem}>
                <Text style={[styles.detailBreakdownLabel, { color: colors.textTertiary }]}>Parts</Text>
                <Text style={[styles.detailBreakdownValue, { color: colors.text }]}>
                  {formatCurrency(detail.partsCost)}
                </Text>
                <Text style={[styles.detailBreakdownSub, { color: colors.textTertiary }]}>
                  {detail.partsCount} items
                </Text>
              </View>
              <View style={styles.detailBreakdownItem}>
                <Text style={[styles.detailBreakdownLabel, { color: colors.textTertiary }]}>Contractor</Text>
                <Text style={[styles.detailBreakdownValue, { color: colors.text }]}>
                  {formatCurrency(detail.contractorCost)}
                </Text>
              </View>
              <View style={styles.detailBreakdownItem}>
                <Text style={[styles.detailBreakdownLabel, { color: colors.textTertiary }]}>Other</Text>
                <Text style={[styles.detailBreakdownValue, { color: colors.text }]}>
                  {formatCurrency(detail.otherCost)}
                </Text>
              </View>
            </View>
            <View style={styles.detailMetrics}>
              <Text style={[styles.detailMetricText, { color: colors.textSecondary }]}>
                {detail.workOrderCount} work orders
              </Text>
              {detail.variance !== undefined && (
                <Text style={[
                  styles.detailVarianceText,
                  { color: detail.variance >= 0 ? '#EF4444' : '#10B981' }
                ]}>
                  {detail.variance >= 0 ? '+' : ''}{formatCurrency(detail.variance)} variance
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedReport) return null;
    const typeConfig = REPORT_TYPE_CONFIG[selectedReport.reportType] || REPORT_TYPE_CONFIG.equipment;
    const TypeIcon = typeConfig.icon;

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Cost Report</Text>
            <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Download size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.reportHeader}>
                <View style={[styles.typeIconLarge, { backgroundColor: typeConfig.bgColor }]}>
                  <TypeIcon size={28} color={typeConfig.color} />
                </View>
                <View style={styles.reportHeaderInfo}>
                  <Text style={[styles.reportNameLarge, { color: colors.text }]}>
                    {selectedReport.reportName}
                  </Text>
                  <Text style={[styles.reportNumberLarge, { color: colors.textSecondary }]}>
                    {selectedReport.reportNumber}
                  </Text>
                  <View style={[styles.typeBadgeLarge, { backgroundColor: typeConfig.bgColor }]}>
                    <Text style={[styles.typeTextLarge, { color: typeConfig.color }]}>
                      {typeConfig.label}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedReport.description && (
                <Text style={[styles.reportDescription, { color: colors.textSecondary }]}>
                  {selectedReport.description}
                </Text>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Calendar size={16} color="#F59E0B" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Report Period</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedReport.periodStart)} - {formatDate(selectedReport.periodEnd)}
                  </Text>
                </View>
              </View>

              {selectedReport.facilityName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                    <Building2 size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Facility</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedReport.facilityName}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <User size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Generated By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedReport.generatedByName}
                  </Text>
                  <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                    {formatDateTime(selectedReport.generatedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.summarySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Summary</Text>
              
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { backgroundColor: '#3B82F6' + '10' }]}>
                  <Users size={20} color="#3B82F6" />
                  <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Labor</Text>
                  <Text style={[styles.summaryCardValue, { color: '#3B82F6' }]}>
                    {formatCurrency(selectedReport.summary.totalLaborCost)}
                  </Text>
                  <Text style={[styles.summaryCardSub, { color: colors.textTertiary }]}>
                    {selectedReport.summary.laborHours.toFixed(1)} hours
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#F59E0B' + '10' }]}>
                  <Package size={20} color="#F59E0B" />
                  <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Parts</Text>
                  <Text style={[styles.summaryCardValue, { color: '#F59E0B' }]}>
                    {formatCurrency(selectedReport.summary.totalPartsCost)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#8B5CF6' + '10' }]}>
                  <Briefcase size={20} color="#8B5CF6" />
                  <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Contractor</Text>
                  <Text style={[styles.summaryCardValue, { color: '#8B5CF6' }]}>
                    {formatCurrency(selectedReport.summary.totalContractorCost)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#EC4899' + '10' }]}>
                  <BarChart3 size={20} color="#EC4899" />
                  <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Other</Text>
                  <Text style={[styles.summaryCardValue, { color: '#EC4899' }]}>
                    {formatCurrency(selectedReport.summary.totalOtherCost)}
                  </Text>
                </View>
              </View>

              <View style={[styles.totalBox, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}>
                <View style={styles.totalBoxMain}>
                  <Text style={[styles.totalLabel, { color: '#10B981' }]}>Total Cost</Text>
                  <Text style={[styles.totalValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedReport.summary.totalCost)}
                  </Text>
                </View>
                <View style={styles.totalBoxMetrics}>
                  <Text style={[styles.totalMetric, { color: colors.textSecondary }]}>
                    {selectedReport.summary.workOrderCount} work orders
                  </Text>
                  <Text style={[styles.totalMetric, { color: colors.textSecondary }]}>
                    Avg: {formatCurrency(selectedReport.summary.avgCostPerWorkOrder)}/WO
                  </Text>
                </View>
              </View>

              {selectedReport.summary.variance !== undefined && (
                <View style={[
                  styles.varianceBox,
                  { 
                    backgroundColor: selectedReport.summary.variance >= 0 ? '#EF4444' + '10' : '#10B981' + '10',
                    borderColor: selectedReport.summary.variance >= 0 ? '#EF4444' + '30' : '#10B981' + '30',
                  }
                ]}>
                  {selectedReport.summary.variance >= 0 ? (
                    <TrendingUp size={20} color="#EF4444" />
                  ) : (
                    <TrendingDown size={20} color="#10B981" />
                  )}
                  <View style={styles.varianceInfo}>
                    <Text style={[
                      styles.varianceLabel,
                      { color: selectedReport.summary.variance >= 0 ? '#EF4444' : '#10B981' }
                    ]}>
                      Budget Variance
                    </Text>
                    <Text style={[
                      styles.varianceValue,
                      { color: selectedReport.summary.variance >= 0 ? '#EF4444' : '#10B981' }
                    ]}>
                      {selectedReport.summary.variance >= 0 ? '+' : ''}
                      {formatCurrency(selectedReport.summary.variance)}
                      {selectedReport.summary.variancePercent !== undefined && (
                        ` (${selectedReport.summary.variancePercent.toFixed(1)}%)`
                      )}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {selectedReport.details.length > 0 && (
              <View style={[styles.detailsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Breakdown ({selectedReport.details.length})
                </Text>
                {selectedReport.details.map((detail, index) => renderDetailRow(detail, index))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderGenerateModal = () => (
    <Modal
      visible={showGenerateModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowGenerateModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowGenerateModal(false)}
      >
        <View style={[styles.generateModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.generateModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.generateModalTitle, { color: colors.text }]}>Generate Report</Text>
            <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.generateOptions}>
            {Object.entries(REPORT_TYPE_CONFIG).map(([type, config]) => {
              const IconComponent = config.icon;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.generateOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setShowGenerateModal(false);
                    handleGenerateReport(type as CostReport['reportType']);
                  }}
                  disabled={generateMutation.isPending}
                >
                  <View style={[styles.generateOptionIcon, { backgroundColor: config.bgColor }]}>
                    <IconComponent size={20} color={config.color} />
                  </View>
                  <View style={styles.generateOptionInfo}>
                    <Text style={[styles.generateOptionTitle, { color: colors.text }]}>
                      {config.label} Report
                    </Text>
                    <Text style={[styles.generateOptionDesc, { color: colors.textTertiary }]}>
                      Analyze costs by {config.label.toLowerCase()}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Type</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                { borderBottomColor: colors.border },
                reportTypeFilter === 'all' && { backgroundColor: colors.primary + '10' },
              ]}
              onPress={() => {
                setReportTypeFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, { color: reportTypeFilter === 'all' ? colors.primary : colors.text }]}>
                All Types
              </Text>
              {reportTypeFilter === 'all' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
            {Object.entries(REPORT_TYPE_CONFIG).map(([type, config]) => {
              const IconComponent = config.icon;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    { borderBottomColor: colors.border },
                    reportTypeFilter === type && { backgroundColor: config.bgColor },
                  ]}
                  onPress={() => {
                    setReportTypeFilter(type as ReportTypeFilter);
                    setShowFilterModal(false);
                  }}
                >
                  <View style={styles.filterOptionContent}>
                    <IconComponent size={18} color={config.color} />
                    <Text style={[styles.filterOptionText, { color: reportTypeFilter === type ? config.color : colors.text }]}>
                      {config.label}
                    </Text>
                  </View>
                  {reportTypeFilter === type && <Check size={20} color={config.color} />}
                </TouchableOpacity>
              );
            })}
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
              { field: 'generated_at', label: 'Date Generated' },
              { field: 'report_name', label: 'Report Name' },
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading cost reports...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Cost Reports',
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowGenerateModal(true)}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.totalReports}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Reports</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#3B82F6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              {formatCurrency(costSummary?.totalLaborCost || 0).replace('$', '')}
            </Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Labor</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#F59E0B' + '15' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {formatCurrency(costSummary?.totalPartsCost || 0).replace('$', '')}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Parts</Text>
          </View>
        </View>
        <View style={[styles.totalCostRow, { backgroundColor: '#10B981' + '10' }]}>
          <DollarSign size={16} color="#10B981" />
          <Text style={[styles.totalCostRowLabel, { color: '#10B981' }]}>Total Reported:</Text>
          <Text style={[styles.totalCostRowAmount, { color: '#10B981' }]}>
            {formatCurrency(statistics.totalCostReported)}
          </Text>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search reports..."
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
            { backgroundColor: colors.surface, borderColor: reportTypeFilter !== 'all' ? colors.primary : colors.border },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={reportTypeFilter !== 'all' ? colors.primary : colors.textSecondary} />
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
          {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
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
        {filteredReports.length > 0 ? (
          filteredReports.map(renderReportCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <BarChart3 size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cost Reports</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || reportTypeFilter !== 'all'
                ? 'No reports match your filters'
                : 'Generate a report to analyze maintenance costs'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowGenerateModal(true)}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderFilterModal()}
      {renderSortModal()}
      {renderGenerateModal()}
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
    fontSize: 16,
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
  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  reportNumber: {
    fontSize: 12,
    marginTop: 2,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  typeTextLarge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodText: {
    fontSize: 13,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facilityText: {
    fontSize: 13,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  generatedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generatedText: {
    fontSize: 12,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
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
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reportHeaderInfo: {
    flex: 1,
  },
  reportNameLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  reportNumberLarge: {
    fontSize: 14,
    marginTop: 2,
  },
  reportDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  detailSubvalue: {
    fontSize: 12,
    marginTop: 2,
  },
  summarySection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  summaryCardSub: {
    fontSize: 11,
  },
  totalBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  totalBoxMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  totalBoxMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalMetric: {
    fontSize: 12,
  },
  varianceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  varianceInfo: {
    flex: 1,
  },
  varianceLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  detailsSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  detailItem: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailRank: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  detailName: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  detailTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTotal: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailExpanded: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  detailBreakdown: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBreakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailBreakdownLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  detailBreakdownValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  detailBreakdownSub: {
    fontSize: 10,
    marginTop: 2,
  },
  detailMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailMetricText: {
    fontSize: 12,
  },
  detailVarianceText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
    maxHeight: '60%',
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
    maxHeight: 400,
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
  generateModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  generateModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  generateOptions: {
    maxHeight: 450,
  },
  generateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  generateOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateOptionInfo: {
    flex: 1,
  },
  generateOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  generateOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
