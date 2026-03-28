import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  TrendingUp,
  Plus,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  BarChart3,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Edit3,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const MONTHS = [
  { key: 'jan', label: 'Jan', num: 1 },
  { key: 'feb', label: 'Feb', num: 2 },
  { key: 'mar', label: 'Mar', num: 3 },
  { key: 'apr', label: 'Apr', num: 4 },
  { key: 'may', label: 'May', num: 5 },
  { key: 'jun', label: 'Jun', num: 6 },
  { key: 'jul', label: 'Jul', num: 7 },
  { key: 'aug', label: 'Aug', num: 8 },
  { key: 'sep', label: 'Sep', num: 9 },
  { key: 'oct', label: 'Oct', num: 10 },
  { key: 'nov', label: 'Nov', num: 11 },
  { key: 'dec', label: 'Dec', num: 12 },
];

interface MonthlyBreakdown {
  jan: number; feb: number; mar: number; apr: number;
  may: number; jun: number; jul: number; aug: number;
  sep: number; oct: number; nov: number; dec: number;
}

interface Budget {
  id: string;
  department_code: string;
  department_name: string;
  fiscal_year: number;
  annual_total: number;
  monthly_breakdown: MonthlyBreakdown;
  notes: string;
  status: 'draft' | 'active' | 'closed';
}

interface Department {
  code: string;
  name: string;
}

interface Actual {
  department_code: string;
  month_num: number;
  actual_spend: number;
}

const EMPTY_MONTHLY: MonthlyBreakdown = {
  jan: 0, feb: 0, mar: 0, apr: 0,
  may: 0, jun: 0, jul: 0, aug: 0,
  sep: 0, oct: 0, nov: 0, dec: 0,
};

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [annualTotal, setAnnualTotal] = useState('');
  const [monthly, setMonthly] = useState<MonthlyBreakdown>({ ...EMPTY_MONTHLY });
  const [notes, setNotes] = useState('');
  const [distributeEvenly, setDistributeEvenly] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('code, name')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!organizationId,
  });

  // Fetch budgets
  const { data: budgets = [], isLoading, refetch } = useQuery({
    queryKey: ['procurement_budgets', organizationId, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_budgets')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('fiscal_year', selectedYear)
        .order('department_name');
      if (error) throw error;
      return (data || []) as Budget[];
    },
    enabled: !!organizationId,
  });

  // Fetch actuals
  const { data: actuals = [] } = useQuery({
    queryKey: ['procurement_budget_actuals', organizationId, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_budget_actuals')
        .select('department_code, month_num, actual_spend')
        .eq('organization_id', organizationId)
        .eq('fiscal_year', selectedYear);
      if (error) throw error;
      return (data || []) as Actual[];
    },
    enabled: !!organizationId,
  });

  // Save budget mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Budget>) => {
      if (editingBudget) {
        const { error } = await supabase
          .from('procurement_budgets')
          .update(payload)
          .eq('id', editingBudget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('procurement_budgets')
          .insert({ ...payload, organization_id: organizationId, fiscal_year: selectedYear });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement_budgets'] });
      closeModal();
      Alert.alert('Success', editingBudget ? 'Budget updated' : 'Budget created');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save budget');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDeptActuals = useCallback((deptCode: string) => {
    const deptActuals = actuals.filter(a => a.department_code === deptCode);
    const byMonth: Record<number, number> = {};
    deptActuals.forEach(a => { byMonth[a.month_num] = a.actual_spend; });
    const ytdActual = deptActuals.reduce((sum, a) => sum + a.actual_spend, 0);
    return { byMonth, ytdActual };
  }, [actuals]);

  const getYTDBudget = useCallback((budget: Budget) => {
    return MONTHS.slice(0, currentMonth).reduce((sum, m) => {
      return sum + (budget.monthly_breakdown[m.key as keyof MonthlyBreakdown] || 0);
    }, 0);
  }, [currentMonth]);

  const openCreate = (dept: Department) => {
    setEditingBudget(null);
    setSelectedDept(dept);
    setAnnualTotal('');
    setMonthly({ ...EMPTY_MONTHLY });
    setNotes('');
    setDistributeEvenly(false);
    setModalVisible(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setSelectedDept({ code: budget.department_code, name: budget.department_name });
    setAnnualTotal(budget.annual_total.toString());
    setMonthly({ ...budget.monthly_breakdown });
    setNotes(budget.notes || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBudget(null);
    setSelectedDept(null);
  };

  const handleDistributeEvenly = () => {
    const total = parseFloat(annualTotal) || 0;
    const perMonth = Math.floor((total / 12) * 100) / 100;
    const newMonthly = { ...EMPTY_MONTHLY };
    MONTHS.forEach(m => {
      (newMonthly[m.key as keyof MonthlyBreakdown] as number) = perMonth;
    });
    setMonthly(newMonthly);
    setDistributeEvenly(true);
  };

  const handleSave = () => {
    if (!selectedDept) return;
    const total = parseFloat(annualTotal);
    if (isNaN(total) || total <= 0) {
      Alert.alert('Validation', 'Please enter a valid annual budget total');
      return;
    }
    saveMutation.mutate({
      department_code: selectedDept.code,
      department_name: selectedDept.name,
      annual_total: total,
      monthly_breakdown: monthly,
      notes,
      status: 'active',
    });
  };

  const totalBudget = useMemo(() =>
    budgets.reduce((sum, b) => sum + b.annual_total, 0),
    [budgets]
  );

  const totalActual = useMemo(() =>
    actuals.reduce((sum, a) => sum + a.actual_spend, 0),
    [actuals]
  );

  const years = [currentYear - 1, currentYear, currentYear + 1];

  const getBudgetForDept = (deptCode: string) =>
    budgets.find(b => b.department_code === deptCode);

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return '#EF4444';
    if (pct >= 85) return '#F59E0B';
    return '#10B981';
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Department Budgets',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerBackTitle: 'Procurement',
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {/* Year Selector */}
          <View style={styles.yearRow}>
            {years.map(year => (
              <Pressable
                key={year}
                style={[
                  styles.yearChip,
                  { borderColor: selectedYear === year ? colors.primary : colors.border },
                  selectedYear === year && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[
                  styles.yearChipText,
                  { color: selectedYear === year ? colors.primary : colors.textSecondary },
                ]}>
                  {year}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '20' }]}>
                <BarChart3 size={20} color={colors.primary} />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalBudget)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Budget</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#10B981' + '20' }]}>
                <TrendingUp size={20} color="#10B981" />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalActual)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>YTD Actual</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                <DollarSign size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(Math.max(0, totalBudget - totalActual))}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
            </View>
          </View>

          {/* Department Budgets */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DEPARTMENTS</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : departments.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Building2 size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No departments found. Add departments in Settings first.
              </Text>
            </View>
          ) : (
            departments.map(dept => {
              const budget = getBudgetForDept(dept.code);
              const { byMonth, ytdActual } = getDeptActuals(dept.code);
              const ytdBudget = budget ? getYTDBudget(budget) : 0;
              const pct = ytdBudget > 0 ? (ytdActual / ytdBudget) * 100 : 0;
              const statusColor = getStatusColor(pct);
              const isExpanded = expandedDept === dept.code;

              return (
                <View
                  key={dept.code}
                  style={[styles.deptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {/* Dept Header */}
                  <Pressable
                    style={styles.deptHeader}
                    onPress={() => setExpandedDept(isExpanded ? null : dept.code)}
                  >
                    <View style={[styles.deptIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Building2 size={18} color={colors.primary} />
                    </View>
                    <View style={styles.deptInfo}>
                      <Text style={[styles.deptName, { color: colors.text }]}>{dept.name}</Text>
                      <Text style={[styles.deptCode, { color: colors.textSecondary }]}>{dept.code}</Text>
                    </View>
                    <View style={styles.deptRight}>
                      {budget ? (
                        <>
                          <Text style={[styles.deptBudget, { color: colors.text }]}>
                            {formatCurrency(budget.annual_total)}
                          </Text>
                          <View style={[styles.pctBadge, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.pctText, { color: statusColor }]}>
                              {Math.round(pct)}%
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Pressable
                          style={[styles.addBudgetBtn, { borderColor: colors.primary }]}
                          onPress={() => openCreate(dept)}
                        >
                          <Plus size={14} color={colors.primary} />
                          <Text style={[styles.addBudgetText, { color: colors.primary }]}>Set Budget</Text>
                        </Pressable>
                      )}
                      {budget && (
                        isExpanded
                          ? <ChevronDown size={18} color={colors.textSecondary} />
                          : <ChevronRight size={18} color={colors.textSecondary} />
                      )}
                    </View>
                  </Pressable>

                  {/* Progress Bar */}
                  {budget && (
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: statusColor,
                              width: `${Math.min(100, pct)}%` as any,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        {formatCurrency(ytdActual)} of {formatCurrency(ytdBudget)} YTD
                      </Text>
                    </View>
                  )}

                  {/* Expanded Monthly Breakdown */}
                  {budget && isExpanded && (
                    <View style={[styles.monthlySection, { borderTopColor: colors.border }]}>
                      <View style={styles.monthlyHeader}>
                        <Text style={[styles.monthlyTitle, { color: colors.text }]}>Monthly Breakdown</Text>
                        <Pressable onPress={() => openEdit(budget)}>
                          <Edit3 size={16} color={colors.primary} />
                        </Pressable>
                      </View>
                      <View style={styles.monthlyGrid}>
                        {MONTHS.map(m => {
                          const budgeted = budget.monthly_breakdown[m.key as keyof MonthlyBreakdown] || 0;
                          const actual = byMonth[m.num] || 0;
                          const mPct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
                          const mColor = getStatusColor(mPct);
                          const isPast = m.num < currentMonth;
                          const isCurrent = m.num === currentMonth;

                          return (
                            <View
                              key={m.key}
                              style={[
                                styles.monthCell,
                                { backgroundColor: colors.backgroundSecondary },
                                isCurrent && { borderColor: colors.primary, borderWidth: 1 },
                              ]}
                            >
                              <Text style={[
                                styles.monthLabel,
                                { color: isCurrent ? colors.primary : colors.textSecondary },
                              ]}>
                                {m.label}
                              </Text>
                              <Text style={[styles.monthBudget, { color: colors.text }]}>
                                {formatCurrency(budgeted)}
                              </Text>
                              {isPast || isCurrent ? (
                                <>
                                  <Text style={[styles.monthActual, { color: mColor }]}>
                                    {formatCurrency(actual)}
                                  </Text>
                                  <View style={[styles.monthProgressTrack, { backgroundColor: colors.border }]}>
                                    <View
                                      style={[
                                        styles.monthProgressFill,
                                        {
                                          backgroundColor: mColor,
                                          width: `${Math.min(100, mPct)}%` as any,
                                        },
                                      ]}
                                    />
                                  </View>
                                </>
                              ) : (
                                <Text style={[styles.monthFuture, { color: colors.textTertiary }]}>—</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>

                      {/* Annual Summary */}
                      <View style={[styles.annualSummary, { backgroundColor: colors.backgroundSecondary }]}>
                        <View style={styles.annualRow}>
                          <Text style={[styles.annualLabel, { color: colors.textSecondary }]}>Annual Budget</Text>
                          <Text style={[styles.annualValue, { color: colors.text }]}>
                            {formatCurrency(budget.annual_total)}
                          </Text>
                        </View>
                        <View style={styles.annualRow}>
                          <Text style={[styles.annualLabel, { color: colors.textSecondary }]}>YTD Actual</Text>
                          <Text style={[styles.annualValue, { color: '#10B981' }]}>
                            {formatCurrency(ytdActual)}
                          </Text>
                        </View>
                        <View style={styles.annualRow}>
                          <Text style={[styles.annualLabel, { color: colors.textSecondary }]}>Remaining</Text>
                          <Text style={[
                            styles.annualValue,
                            { color: budget.annual_total - ytdActual >= 0 ? '#10B981' : '#EF4444' },
                          ]}>
                            {formatCurrency(budget.annual_total - ytdActual)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Create/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeModal}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable onPress={closeModal}>
                <X size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingBudget ? 'Edit Budget' : `Set Budget — ${selectedDept?.name}`}
              </Text>
              <Pressable onPress={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Check size={24} color={colors.primary} />
                }
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Annual Total */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>ANNUAL BUDGET TOTAL</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Total for {selectedYear}
                    </Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={annualTotal}
                        onChangeText={setAnnualTotal}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Pressable
                    style={[styles.distributeBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                    onPress={handleDistributeEvenly}
                  >
                    <Calendar size={16} color={colors.primary} />
                    <Text style={[styles.distributeBtnText, { color: colors.primary }]}>
                      Distribute Evenly Across 12 Months
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Monthly Breakdown */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>MONTHLY BREAKDOWN</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {MONTHS.map((m, idx) => (
                    <View
                      key={m.key}
                      style={[
                        styles.monthInputRow,
                        idx < MONTHS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.monthInputLabel, { color: colors.text }]}>{m.label}</Text>
                      <View style={[styles.monthInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <Text style={[styles.monthInputPrefix, { color: colors.textTertiary }]}>$</Text>
                        <TextInput
                          style={[styles.monthInputText, { color: colors.text }]}
                          value={monthly[m.key as keyof MonthlyBreakdown]?.toString() || '0'}
                          onChangeText={(val) => {
                            setMonthly(prev => ({
                              ...prev,
                              [m.key]: parseFloat(val) || 0,
                            }));
                          }}
                          keyboardType="numeric"
                          placeholderTextColor={colors.textTertiary}
                        />
                      </View>
                    </View>
                  ))}

                  {/* Monthly Total vs Annual */}
                  <View style={[styles.monthlyTotalRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.monthlyTotalLabel, { color: colors.textSecondary }]}>Monthly Total</Text>
                    <Text style={[
                      styles.monthlyTotalValue,
                      {
                        color: Math.abs(
                          Object.values(monthly).reduce((s, v) => s + v, 0) -
                          (parseFloat(annualTotal) || 0)
                        ) < 1 ? '#10B981' : '#F59E0B',
                      },
                    ]}>
                      {formatCurrency(Object.values(monthly).reduce((s, v) => s + v, 0))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>NOTES</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional budget notes..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  yearRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  yearChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  deptCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  deptIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptInfo: { flex: 1 },
  deptName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deptCode: {
    fontSize: 12,
    marginTop: 2,
  },
  deptRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptBudget: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBudgetText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  progressContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
  },
  monthlySection: {
    borderTopWidth: 1,
    padding: 14,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthlyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  monthCell: {
    width: '22%',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  monthBudget: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  monthActual: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  monthFuture: {
    fontSize: 10,
  },
  monthProgressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  monthProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  annualSummary: {
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  annualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  annualLabel: {
    fontSize: 13,
  },
  annualValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalContainer: { flex: 1 },
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
  formSection: { marginBottom: 24 },
  formLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  currencyInputText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  distributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  distributeBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  monthInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  monthInputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    width: 40,
  },
  monthInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    width: 140,
  },
  monthInputPrefix: {
    fontSize: 14,
    marginRight: 4,
  },
  monthInputText: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
  },
  monthlyTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  monthlyTotalLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  monthlyTotalValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  notesInput: {
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
});
