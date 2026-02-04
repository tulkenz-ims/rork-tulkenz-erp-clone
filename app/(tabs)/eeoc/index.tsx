import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Scale,
  FileText,
  Users,
  Calendar,
  CheckCircle,
  X,
  Download,
  PieChart,
  BarChart3,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_EEOC_REPORTS,
  JOB_CATEGORY_LABELS,
  type EEOCReport,
  type JobCategory,
} from '@/constants/complianceDataConstants';

type ViewMode = 'overview' | 'reports' | 'demographics' | 'analysis';

const RACE_LABELS: Record<string, string> = {
  'white': 'White',
  'black': 'Black/African American',
  'asian': 'Asian',
  'native-american': 'American Indian/Alaska Native',
  'pacific-islander': 'Native Hawaiian/Pacific Islander',
  'two-or-more': 'Two or More Races',
  'not-disclosed': 'Not Disclosed',
};

export default function EEOCScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedReport, setSelectedReport] = useState<EEOCReport | null>(null);
  const [showReportDetail, setShowReportDetail] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const currentReport = MOCK_EEOC_REPORTS[0];
  const summary = currentReport.data.summary;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'submitted': return '#3B82F6';
      case 'pending-review': return '#F59E0B';
      case 'draft': return '#6B7280';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'submitted': return 'Submitted';
      case 'pending-review': return 'Pending Review';
      case 'draft': return 'Draft';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'eeo-1': return 'EEO-1 Component 1';
      case 'vets-4212': return 'VETS-4212';
      case 'aap': return 'AAP Report';
      default: return type;
    }
  };

  const genderData = useMemo(() => {
    const total = summary.genderDiversity.male + summary.genderDiversity.female + summary.genderDiversity.other;
    return [
      { label: 'Male', value: summary.genderDiversity.male, percentage: Math.round((summary.genderDiversity.male / total) * 100), color: '#3B82F6' },
      { label: 'Female', value: summary.genderDiversity.female, percentage: Math.round((summary.genderDiversity.female / total) * 100), color: '#EC4899' },
      { label: 'Other/Not Disclosed', value: summary.genderDiversity.other + summary.genderDiversity.notDisclosed, percentage: Math.round(((summary.genderDiversity.other + summary.genderDiversity.notDisclosed) / total) * 100), color: '#6B7280' },
    ];
  }, [summary]);

  const ethnicityData = useMemo(() => {
    const total = Object.values(summary.ethnicityDiversity).reduce((a, b) => a + b, 0);
    return Object.entries(summary.ethnicityDiversity)
      .map(([key, value]) => ({
        label: RACE_LABELS[key] || key,
        value,
        percentage: Math.round((value / total) * 100),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [summary]);

  const renderOverview = () => (
    <>
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryHeader}>
          <View style={[styles.summaryIcon, { backgroundColor: '#64748B15' }]}>
            <Scale size={24} color="#64748B" />
          </View>
          <View style={styles.summaryHeaderText}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>EEO Compliance Dashboard</Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              Reporting Period: 2025
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{summary.totalHeadcount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Employees</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{summary.diversityScore}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Diversity Score</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{summary.veteranCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Veterans</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{summary.disabilityCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Disability</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Gender Distribution</Text>
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {genderData.map((item, index) => (
          <View key={index} style={styles.barItem}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                {item.value} ({item.percentage}%)
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Race/Ethnicity Distribution</Text>
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {ethnicityData.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.barItem}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                {item.value} ({item.percentage}%)
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: '#64748B' }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Age Distribution</Text>
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.ageRow}>
          <View style={styles.ageItem}>
            <Text style={[styles.ageValue, { color: '#3B82F6' }]}>{summary.ageDistribution.under40}</Text>
            <Text style={[styles.ageLabel, { color: colors.textSecondary }]}>Under 40</Text>
            <Text style={[styles.agePercent, { color: colors.textSecondary }]}>
              {Math.round((summary.ageDistribution.under40 / summary.totalHeadcount) * 100)}%
            </Text>
          </View>
          <View style={[styles.ageDivider, { backgroundColor: colors.border }]} />
          <View style={styles.ageItem}>
            <Text style={[styles.ageValue, { color: '#8B5CF6' }]}>{summary.ageDistribution.over40}</Text>
            <Text style={[styles.ageLabel, { color: colors.textSecondary }]}>40 and Over</Text>
            <Text style={[styles.agePercent, { color: colors.textSecondary }]}>
              {Math.round((summary.ageDistribution.over40 / summary.totalHeadcount) * 100)}%
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderReports = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>EEO Reports</Text>
      {MOCK_EEOC_REPORTS.map((report) => (
        <TouchableOpacity
          key={report.id}
          style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setSelectedReport(report);
            setShowReportDetail(true);
          }}
        >
          <View style={styles.reportHeader}>
            <View style={[styles.reportIcon, { backgroundColor: '#64748B15' }]}>
              <FileText size={20} color="#64748B" />
            </View>
            <View style={styles.reportInfo}>
              <Text style={[styles.reportType, { color: colors.text }]}>
                {getReportTypeLabel(report.reportType)}
              </Text>
              <Text style={[styles.reportPeriod, { color: colors.textSecondary }]}>
                Period: {report.reportingPeriod}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(report.status)}15` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                {getStatusLabel(report.status)}
              </Text>
            </View>
          </View>

          <View style={styles.reportMeta}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Due: {new Date(report.dueDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {report.totalEmployees} employees
              </Text>
            </View>
          </View>

          {report.submittedDate && (
            <View style={[styles.submittedInfo, { backgroundColor: colors.background }]}>
              <CheckCircle size={14} color="#10B981" />
              <Text style={[styles.submittedText, { color: colors.textSecondary }]}>
                Submitted: {new Date(report.submittedDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => console.log('Create new report')}
      >
        <FileText size={20} color="#fff" />
        <Text style={styles.addButtonText}>Generate New Report</Text>
      </TouchableOpacity>
    </>
  );

  const renderDepartmentBreakdown = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Department Demographics</Text>
      {currentReport.data.byDepartment.map((dept, index) => (
        <View
          key={index}
          style={[styles.deptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.deptHeader}>
            <View style={[styles.deptIcon, { backgroundColor: '#64748B15' }]}>
              <Building2 size={18} color="#64748B" />
            </View>
            <Text style={[styles.deptName, { color: colors.text }]}>{dept.department}</Text>
            <Text style={[styles.deptCount, { color: colors.textSecondary }]}>
              {dept.totalCount} employees
            </Text>
          </View>

          <View style={styles.deptStats}>
            <View style={styles.deptStatItem}>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Gender</Text>
              <View style={styles.miniBarContainer}>
                <View style={[styles.miniBar, { width: `${(dept.genderRatio.male / dept.totalCount) * 100}%`, backgroundColor: '#3B82F6' }]} />
                <View style={[styles.miniBar, { width: `${(dept.genderRatio.female / dept.totalCount) * 100}%`, backgroundColor: '#EC4899' }]} />
              </View>
              <Text style={[styles.deptStatValue, { color: colors.text }]}>
                {dept.genderRatio.male}M / {dept.genderRatio.female}F
              </Text>
            </View>
            <View style={styles.deptStatItem}>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Diversity Index</Text>
              <Text style={[styles.diversityScore, { color: dept.diversityIndex >= 0.7 ? '#10B981' : '#F59E0B' }]}>
                {Math.round(dept.diversityIndex * 100)}%
              </Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );

  const renderJobCategoryAnalysis = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Job Category Analysis</Text>
      {currentReport.data.byJobCategory.map((cat, index) => (
        <View
          key={index}
          style={[styles.jobCatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.jobCatHeader}>
            <Text style={[styles.jobCatName, { color: colors.text }]}>
              {JOB_CATEGORY_LABELS[cat.category as JobCategory]}
            </Text>
            <Text style={[styles.jobCatCount, { color: colors.primary }]}>{cat.totalCount}</Text>
          </View>
          
          <View style={styles.jobCatBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Male/Female:</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                {cat.maleCount} / {cat.femaleCount}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Hispanic:</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{cat.hispanicCount}</Text>
            </View>
          </View>

          <View style={styles.raceBreakdown}>
            {cat.whiteCount > 0 && (
              <View style={[styles.raceBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.raceBadgeText, { color: colors.text }]}>White: {cat.whiteCount}</Text>
              </View>
            )}
            {cat.blackCount > 0 && (
              <View style={[styles.raceBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.raceBadgeText, { color: colors.text }]}>Black: {cat.blackCount}</Text>
              </View>
            )}
            {cat.asianCount > 0 && (
              <View style={[styles.raceBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.raceBadgeText, { color: colors.text }]}>Asian: {cat.asianCount}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: 'overview', label: 'Overview', icon: PieChart },
            { key: 'reports', label: 'Reports', icon: FileText },
            { key: 'demographics', label: 'Departments', icon: Building2 },
            { key: 'analysis', label: 'Job Categories', icon: BarChart3 },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                viewMode === tab.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => setViewMode(tab.key as ViewMode)}
            >
              <tab.icon size={16} color={viewMode === tab.key ? '#fff' : colors.textSecondary} />
              <Text style={[
                styles.tabText,
                { color: viewMode === tab.key ? '#fff' : colors.textSecondary },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
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
        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'reports' && renderReports()}
        {viewMode === 'demographics' && renderDepartmentBreakdown()}
        {viewMode === 'analysis' && renderJobCategoryAnalysis()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showReportDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReportDetail(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowReportDetail(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report Details</Text>
            <TouchableOpacity>
              <Download size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {selectedReport && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailTitle, { color: colors.text }]}>
                  {getReportTypeLabel(selectedReport.reportType)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedReport.status)}15`, alignSelf: 'flex-start', marginTop: 8 }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedReport.status) }]}>
                    {getStatusLabel(selectedReport.status)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reporting Period</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReport.reportingPeriod}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedReport.dueDate).toLocaleDateString()}
                  </Text>
                </View>
                {selectedReport.submittedDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedReport.submittedDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Employees</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReport.totalEmployees}</Text>
                </View>
              </View>

              {selectedReport.status === 'draft' && (
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={() => console.log('Submit report')}
                >
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  barItem: {
    marginBottom: 14,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  barValue: {
    fontSize: 13,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  ageValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  ageLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  agePercent: {
    fontSize: 12,
  },
  ageDivider: {
    width: 1,
    height: 60,
  },
  reportCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportType: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  reportPeriod: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  submittedText: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deptCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  deptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deptName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  deptCount: {
    fontSize: 13,
  },
  deptStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deptStatItem: {
    flex: 1,
  },
  deptStatLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  miniBarContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniBar: {
    height: '100%',
  },
  deptStatValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  diversityScore: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  jobCatCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  jobCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobCatName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  jobCatCount: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  jobCatBreakdown: {
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  raceBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  raceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  raceBadgeText: {
    fontSize: 11,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 20,
  },
});
