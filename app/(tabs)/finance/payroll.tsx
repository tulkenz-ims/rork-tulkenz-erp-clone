import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import {
  Wallet,
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Building2,
  TrendingUp,
  AlertTriangle,
  X,
  Check,
  Banknote,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MOCK_PAYROLL_RECORDS, type PayrollRecord } from '@/constants/financeConstants';


type PayPeriod = {
  id: string;
  label: string;
  start: string;
  end: string;
  payDate: string;
};

const PAY_PERIODS: PayPeriod[] = [
  { id: 'pp-2024-02', label: 'Jan 16 - Jan 31, 2024', start: '2024-01-16', end: '2024-01-31', payDate: '2024-02-05' },
  { id: 'pp-2024-01', label: 'Jan 01 - Jan 15, 2024', start: '2024-01-01', end: '2024-01-15', payDate: '2024-01-20' },
];

const DEPARTMENT_MAP: Record<string, string> = {
  '1001': 'Maintenance',
  '1002': 'Production',
  '1003': 'Sanitation',
  '1004': 'Quality',
  '1005': 'Safety',
  '1006': 'Admin',
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'paid';

export default function PayrollScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod>(PAY_PERIODS[0]);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const filteredRecords = useMemo(() => {
    let records = MOCK_PAYROLL_RECORDS.filter(
      r => r.payPeriodStart === selectedPeriod.start && r.payPeriodEnd === selectedPeriod.end
    );
    if (selectedDept !== 'all') {
      records = records.filter(r => r.departmentCode === selectedDept);
    }
    if (statusFilter !== 'all') {
      records = records.filter(r => r.status === statusFilter);
    }
    return records;
  }, [selectedPeriod, selectedDept, statusFilter]);

  const periodStats = useMemo(() => {
    const records = MOCK_PAYROLL_RECORDS.filter(
      r => r.payPeriodStart === selectedPeriod.start && r.payPeriodEnd === selectedPeriod.end
    );
    const totalGross = records.reduce((sum, r) => sum + r.grossPay, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
    const totalTaxes = records.reduce(
      (sum, r) => sum + r.federalTax + r.stateTax + r.socialSecurity + r.medicare,
      0
    );
    const totalHours = records.reduce((sum, r) => sum + r.regularHours + r.overtimeHours, 0);
    const overtimeHours = records.reduce((sum, r) => sum + r.overtimeHours, 0);
    const pendingCount = records.filter(r => r.status === 'pending').length;
    const approvedCount = records.filter(r => r.status === 'approved').length;
    const paidCount = records.filter(r => r.status === 'paid').length;

    return {
      employeeCount: records.length,
      totalGross,
      totalNet,
      totalTaxes,
      totalDeductions: totalGross - totalNet,
      totalHours,
      overtimeHours,
      pendingCount,
      approvedCount,
      paidCount,
    };
  }, [selectedPeriod]);

  const ytdStats = useMemo(() => {
    const totalGross = MOCK_PAYROLL_RECORDS.reduce((sum, r) => sum + r.grossPay, 0);
    const totalNet = MOCK_PAYROLL_RECORDS.reduce((sum, r) => sum + r.netPay, 0);
    const totalTaxes = MOCK_PAYROLL_RECORDS.reduce(
      (sum, r) => sum + r.federalTax + r.stateTax + r.socialSecurity + r.medicare,
      0
    );
    return { totalGross, totalNet, totalTaxes };
  }, []);

  const handleRunPayroll = () => {
    Alert.alert(
      'Run Payroll',
      `Process payroll for ${periodStats.pendingCount} pending records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: () => {
            console.log('Processing payroll...');
            Alert.alert('Success', 'Payroll has been submitted for processing.');
          },
        },
      ]
    );
  };

  const handleApproveAll = () => {
    Alert.alert(
      'Approve All',
      `Approve ${periodStats.pendingCount} pending payroll records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            console.log('Approving all...');
            Alert.alert('Success', 'All pending records have been approved.');
          },
        },
      ]
    );
  };

  const openRecordDetail = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#22C55E';
      case 'approved':
        return '#3B82F6';
      case 'pending':
        return '#F59E0B';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={14} color="#22C55E" />;
      case 'approved':
        return <Check size={14} color="#3B82F6" />;
      case 'pending':
        return <Clock size={14} color="#F59E0B" />;
      default:
        return null;
    }
  };

  const renderPayrollRecord = (record: PayrollRecord) => {
    const totalDeductions = record.grossPay - record.netPay;
    const deptName = DEPARTMENT_MAP[record.departmentCode] || record.departmentCode;

    return (
      <TouchableOpacity
        key={record.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => openRecordDetail(record)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, { color: colors.text }]}>{record.employeeName}</Text>
            <View style={styles.deptBadge}>
              <Building2 size={12} color={colors.textSecondary} />
              <Text style={[styles.deptText, { color: colors.textSecondary }]}>{deptName}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(record.status)}15` }]}>
            {getStatusIcon(record.status)}
            <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.hoursRow}>
          <View style={styles.hourItem}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary }]}>Regular</Text>
            <Text style={[styles.hourValue, { color: colors.text }]}>{record.regularHours}h</Text>
          </View>
          <View style={styles.hourItem}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary }]}>Overtime</Text>
            <Text style={[styles.hourValue, { color: record.overtimeHours > 0 ? '#F59E0B' : colors.text }]}>
              {record.overtimeHours}h
            </Text>
          </View>
          <View style={styles.hourItem}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary }]}>Rate</Text>
            <Text style={[styles.hourValue, { color: colors.text }]}>${record.regularRate}/h</Text>
          </View>
        </View>

        <View style={[styles.payRow, { borderTopColor: colors.border }]}>
          <View style={styles.payItem}>
            <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Gross</Text>
            <Text style={[styles.grossValue, { color: colors.text }]}>{formatCurrency(record.grossPay)}</Text>
          </View>
          <View style={styles.payItem}>
            <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Deductions</Text>
            <Text style={[styles.deductValue, { color: '#EF4444' }]}>-{formatCurrency(totalDeductions)}</Text>
          </View>
          <View style={styles.payItem}>
            <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Net Pay</Text>
            <Text style={[styles.netValue, { color: '#22C55E' }]}>{formatCurrency(record.netPay)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.viewDetails, { color: colors.primary }]}>View Details</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.periodSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPeriodPicker(true)}
        >
          <View style={styles.periodInfo}>
            <Calendar size={18} color={colors.primary} />
            <View>
              <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Pay Period</Text>
              <Text style={[styles.periodValue, { color: colors.text }]}>{selectedPeriod.label}</Text>
            </View>
          </View>
          <View style={styles.periodRight}>
            <Text style={[styles.payDateLabel, { color: colors.textSecondary }]}>
              Pay Date: {selectedPeriod.payDate}
            </Text>
            <ChevronDown size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22C55E15' }]}>
              <Users size={20} color="#22C55E" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{periodStats.employeeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Employees</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F615' }]}>
              <DollarSign size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(periodStats.totalGross)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gross Pay</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#EF444415' }]}>
              <Banknote size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(periodStats.totalTaxes)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tax W/H</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22C55E15' }]}>
              <Wallet size={20} color="#22C55E" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(periodStats.totalNet)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net Pay</Text>
          </View>
        </View>

        <View style={[styles.ytdCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.ytdHeader}>
            <TrendingUp size={18} color={colors.primary} />
            <Text style={[styles.ytdTitle, { color: colors.text }]}>Year-to-Date Summary</Text>
          </View>
          <View style={styles.ytdRow}>
            <View style={styles.ytdItem}>
              <Text style={[styles.ytdLabel, { color: colors.textSecondary }]}>Gross Wages</Text>
              <Text style={[styles.ytdValue, { color: colors.text }]}>{formatCurrency(ytdStats.totalGross)}</Text>
            </View>
            <View style={styles.ytdItem}>
              <Text style={[styles.ytdLabel, { color: colors.textSecondary }]}>Taxes Paid</Text>
              <Text style={[styles.ytdValue, { color: '#EF4444' }]}>{formatCurrency(ytdStats.totalTaxes)}</Text>
            </View>
            <View style={styles.ytdItem}>
              <Text style={[styles.ytdLabel, { color: colors.textSecondary }]}>Net Paid</Text>
              <Text style={[styles.ytdValue, { color: '#22C55E' }]}>{formatCurrency(ytdStats.totalNet)}</Text>
            </View>
          </View>
        </View>

        {periodStats.pendingCount > 0 && (
          <View style={[styles.actionCard, { backgroundColor: `${colors.warning}10`, borderColor: colors.warning }]}>
            <View style={styles.actionInfo}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {periodStats.pendingCount} pending, {periodStats.approvedCount} approved
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleApproveAll}
              >
                <Check size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#22C55E' }]}
                onPress={handleRunPayroll}
              >
                <Play size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Run</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: selectedDept === 'all' ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setSelectedDept('all')}
            >
              <Text style={[styles.filterChipText, { color: selectedDept === 'all' ? '#FFF' : colors.text }]}>
                All Depts
              </Text>
            </TouchableOpacity>
            {Object.entries(DEPARTMENT_MAP).map(([code, name]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.filterChip,
                  { backgroundColor: selectedDept === code ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setSelectedDept(code)}
              >
                <Text style={[styles.filterChipText, { color: selectedDept === code ? '#FFF' : colors.text }]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statusFilterRow}>
          {(['all', 'pending', 'approved', 'paid'] as StatusFilter[]).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusFilterBtn,
                { backgroundColor: statusFilter === status ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.statusFilterText, { color: statusFilter === status ? '#FFF' : colors.text }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            Payroll Records ({filteredRecords.length})
          </Text>
        </View>

        {filteredRecords.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No records found for this period
            </Text>
          </View>
        ) : (
          filteredRecords.map(renderPayrollRecord)
        )}
      </ScrollView>

      <Modal visible={showPeriodPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodPicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Pay Period</Text>
              <TouchableOpacity onPress={() => setShowPeriodPicker(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {PAY_PERIODS.map(period => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodOption,
                  { borderColor: colors.border },
                  selectedPeriod.id === period.id && { backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => {
                  setSelectedPeriod(period);
                  setShowPeriodPicker(false);
                }}
              >
                <View>
                  <Text style={[styles.periodOptionLabel, { color: colors.text }]}>{period.label}</Text>
                  <Text style={[styles.periodOptionDate, { color: colors.textSecondary }]}>
                    Pay Date: {period.payDate}
                  </Text>
                </View>
                {selectedPeriod.id === period.id && <CheckCircle size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.background }]}>
            {selectedRecord && (
              <>
                <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.detailName, { color: colors.text }]}>{selectedRecord.employeeName}</Text>
                    <Text style={[styles.detailDept, { color: colors.textSecondary }]}>
                      {DEPARTMENT_MAP[selectedRecord.departmentCode] || selectedRecord.departmentCode}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                  <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Earnings</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Regular Hours ({selectedRecord.regularHours}h × ${selectedRecord.regularRate})
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatCurrency(selectedRecord.regularHours * selectedRecord.regularRate)}
                      </Text>
                    </View>
                    {selectedRecord.overtimeHours > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          Overtime ({selectedRecord.overtimeHours}h × ${selectedRecord.overtimeRate})
                        </Text>
                        <Text style={[styles.detailValue, { color: '#F59E0B' }]}>
                          {formatCurrency(selectedRecord.overtimeHours * selectedRecord.overtimeRate)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.detailTotalRow]}>
                      <Text style={[styles.detailTotalLabel, { color: colors.text }]}>Gross Pay</Text>
                      <Text style={[styles.detailTotalValue, { color: colors.text }]}>
                        {formatCurrency(selectedRecord.grossPay)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Tax Withholdings</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Federal Income Tax</Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                        -{formatCurrency(selectedRecord.federalTax)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>State Income Tax</Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                        -{formatCurrency(selectedRecord.stateTax)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Social Security (6.2%)</Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                        -{formatCurrency(selectedRecord.socialSecurity)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Medicare (1.45%)</Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                        -{formatCurrency(selectedRecord.medicare)}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, styles.detailTotalRow]}>
                      <Text style={[styles.detailTotalLabel, { color: colors.text }]}>Total Taxes</Text>
                      <Text style={[styles.detailTotalValue, { color: '#EF4444' }]}>
                        -{formatCurrency(
                          selectedRecord.federalTax +
                            selectedRecord.stateTax +
                            selectedRecord.socialSecurity +
                            selectedRecord.medicare
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Other Deductions</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Benefits & Contributions
                      </Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                        -{formatCurrency(selectedRecord.otherDeductions)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.netPayCard, { backgroundColor: '#22C55E15', borderColor: '#22C55E' }]}>
                    <View>
                      <Text style={[styles.netPayLabel, { color: colors.textSecondary }]}>Net Pay</Text>
                      <Text style={[styles.netPayValue, { color: '#22C55E' }]}>
                        {formatCurrency(selectedRecord.netPay)}
                      </Text>
                    </View>
                    <Wallet size={32} color="#22C55E" />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  periodSelector: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  periodInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  periodLabel: { fontSize: 12 },
  periodValue: { fontSize: 15, fontWeight: '600' as const },
  periodRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  payDateLabel: { fontSize: 12 },
  statsGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%' as any,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 6,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  statValue: { fontSize: 16, fontWeight: '700' as const },
  statLabel: { fontSize: 11 },
  ytdCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  ytdHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 },
  ytdTitle: { fontSize: 15, fontWeight: '600' as const },
  ytdRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  ytdItem: { alignItems: 'center' as const },
  ytdLabel: { fontSize: 11, marginBottom: 4 },
  ytdValue: { fontSize: 14, fontWeight: '600' as const },
  actionCard: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  actionInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, flex: 1 },
  actionText: { fontSize: 14, fontWeight: '500' as const },
  actionButtons: { flexDirection: 'row' as const, gap: 8 },
  actionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' as const },
  filterSection: { marginBottom: 12 },
  filterScroll: { gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '500' as const },
  statusFilterRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statusFilterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' as const },
  statusFilterText: { fontSize: 12, fontWeight: '500' as const },
  listHeader: { marginBottom: 12 },
  listTitle: { fontSize: 18, fontWeight: '600' as const },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '600' as const },
  deptBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 4 },
  deptText: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  hoursRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const, marginBottom: 12 },
  hourItem: { alignItems: 'center' as const },
  hourLabel: { fontSize: 11, marginBottom: 2 },
  hourValue: { fontSize: 14, fontWeight: '600' as const },
  payRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingTop: 12, borderTopWidth: 1 },
  payItem: { alignItems: 'center' as const },
  payLabel: { fontSize: 11, marginBottom: 2 },
  grossValue: { fontSize: 14, fontWeight: '600' as const },
  deductValue: { fontSize: 14, fontWeight: '600' as const },
  netValue: { fontSize: 15, fontWeight: '700' as const },
  cardFooter: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'flex-end' as const, marginTop: 12 },
  viewDetails: { fontSize: 13, fontWeight: '500' as const },
  emptyState: { padding: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const },
  emptyText: { fontSize: 14, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, padding: 20 },
  pickerModal: { borderRadius: 16, padding: 20 },
  pickerHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 16 },
  pickerTitle: { fontSize: 18, fontWeight: '600' as const },
  periodOption: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  periodOptionLabel: { fontSize: 15, fontWeight: '500' as const },
  periodOptionDate: { fontSize: 13, marginTop: 2 },
  detailModalOverlay: { flex: 1, justifyContent: 'flex-end' as const },
  detailModal: { height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  detailHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 20, borderBottomWidth: 1 },
  detailName: { fontSize: 20, fontWeight: '700' as const },
  detailDept: { fontSize: 14, marginTop: 2 },
  detailContent: { padding: 16 },
  detailSection: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  detailSectionTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12 },
  detailRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 8 },
  detailLabel: { fontSize: 14, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '500' as const },
  detailTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E5E5' },
  detailTotalLabel: { fontSize: 15, fontWeight: '600' as const },
  detailTotalValue: { fontSize: 15, fontWeight: '700' as const },
  netPayCard: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  netPayLabel: { fontSize: 14, marginBottom: 4 },
  netPayValue: { fontSize: 28, fontWeight: '700' as const },
});
