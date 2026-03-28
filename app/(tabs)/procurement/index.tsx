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
  X,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  BarChart3,
  Building2,
  Edit3,
  Users,
  Package,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Department {
  id: string;
  department_code: string;
  name: string;
  short_name: string;
  annual_budget: number;
  ytd_spend: number;
  labor_budget: number;
  materials_budget: number;
  budgeted_headcount: number;
  actual_headcount: number;
  color: string;
  status: string;
}

interface Actual {
  department_id: string;
  department_code: string;
  department_name: string;
  annual_budget: number;
  fiscal_year: number;
  month_num: number;
  actual_spend: number;
}

const MONTHS = [
  { key: 1, label: 'Jan' }, { key: 2, label: 'Feb' }, { key: 3, label: 'Mar' },
  { key: 4, label: 'Apr' }, { key: 5, label: 'May' }, { key: 6, label: 'Jun' },
  { key: 7, label: 'Jul' }, { key: 8, label: 'Aug' }, { key: 9, label: 'Sep' },
  { key: 10, label: 'Oct' }, { key: 11, label: 'Nov' }, { key: 12, label: 'Dec' },
];

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [annualBudget, setAnnualBudget] = useState('');
  const [laborBudget, setLaborBudget] = useState('');
  const [materialsBudget, setMaterialsBudget] = useState('');
  const [budgetedHeadcount, setBudgetedHeadcount] = useState('');

  const { data: departments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['departments_budget', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_code, name, short_name, annual_budget, ytd_spend, labor_budget, materials_budget, budgeted_headcount, actual_headcount, color, status')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!organizationId,
  });

  const { data: actuals = [] } = useQuery({
    queryKey: ['procurement_budget_actuals', organizationId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_budget_actuals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('fiscal_year', currentYear);
      if (error) throw error;
      return (data || []) as Actual[];
    },
    enabled: !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      annual_budget: number;
      labor_budget: number;
      materials_budget: number;
      budgeted_headcount: number;
    }) => {
      const { error } = await supabase
        .from('departments')
        .update({
          annual_budget: payload.annual_budget,
          labor_budget: payload.labor_budget,
          materials_budget: payload.materials_budget,
          budgeted_headcount: payload.budgeted_headcount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments_budget'] });
      closeModal();
      Alert.alert('Success', 'Budget updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update budget');
    },
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDeptActuals = useCallback((deptName: string) => {
    const deptActuals = actuals.filter(a => a.department_name === deptName);
    const byMonth: Record<number, number> = {};
    deptActuals.forEach(a => { byMonth[a.month_num] = a.actual_spend; });
    const ytdActual = deptActuals
      .filter(a => a.month_num <= currentMonth)
      .reduce((sum, a) => sum + a.actual_spend, 0);
    return { byMonth, ytdActual };
  }, [actuals, currentMonth]);

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return '#EF4444';
    if (pct >= 85) return '#F59E0B';
    return '#10B981';
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setAnnualBudget(dept.annual_budget?.toString() || '');
    setLaborBudget(dept.labor_budget?.toString() || '');
    setMaterialsBudget(dept.materials_budget?.toString() || '');
    setBudgetedHeadcount(dept.budgeted_headcount?.toString() || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingDept(null);
  };

  const handleSave = () => {
    if (!editingDept) return;
    const annual = parseFloat(annualBudget) || 0;
    if (annual <= 0) {
      Alert.alert('Validation', 'Please enter a valid annual budget');
      return;
    }
    updateMutation.mutate({
      id: editingDept.id,
      annual_budget: annual,
      labor_budget: parseFloat(laborBudget) || 0,
      materials_budget: parseFloat(materialsBudget) || 0,
      budgeted_headcount: parseInt(budgetedHeadcount) || 0,
    });
  };

  const totalAnnualBudget = useMemo(() =>
    departments.reduce((sum, d) => sum + (d.annual_budget || 0), 0),
    [departments]
  );

  const totalYTDActual = useMemo(() =>
    actuals
      .filter(a => a.month_num <= currentMonth && a.fiscal_year === currentYear)
      .reduce((sum, a) => sum + a.actual_spend, 0),
    [actuals, currentMonth, currentYear]
  );

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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {/* Year Badge */}
          <View style={[styles.yearBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Text style={[styles.yearBadgeText, { color: colors.primary }]}>
              Fiscal Year {currentYear}
            </Text>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primary + '20' }]}>
                <BarChart3 size={18} color={colors.primary} />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(totalAnnualBudget)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Budget</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#10B981' + '20' }]}>
                <TrendingUp size={18} color="#10B981" />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(totalYTDActual)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>YTD from POs</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                <DollarSign size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(Math.max(0, totalAnnualBudget - totalYTDActual))}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
            </View>
          </View>

          {/* Department List */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DEPARTMENTS</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : departments.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Building2 size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No active departments found.
              </Text>
            </View>
          ) : (
            departments.map(dept => {
              const { byMonth, ytdActual } = getDeptActuals(dept.name);
              const annual = dept.annual_budget || 0;
              const pct = annual > 0 ? (ytdActual / annual) * 100 : 0;
              const statusColor = getStatusColor(pct);
              const isExpanded = expandedDept === dept.id;
              const deptColor = dept.color || colors.primary;

              return (
                <View
                  key={dept.id}
                  style={[styles.deptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.deptColorBar, { backgroundColor: deptColor }]} />

                  <Pressable
                    style={styles.deptHeader}
                    onPress={() => setExpandedDept(isExpanded ? null : dept.id)}
                  >
                    <View style={styles.deptInfo}>
                      <Text style={[styles.deptName, { color: colors.text }]}>{dept.name}</Text>
                      <Text style={[styles.deptCode, { color: colors.textSecondary }]}>
                        {dept.department_code}
                      </Text>
                    </View>
                    <View style={styles.deptRight}>
                      {annual > 0 ? (
                        <>
                          <Text style={[styles.deptBudget, { color: colors.text }]}>
                            {formatCurrency(annual)}
                          </Text>
                          <View style={[styles.pctBadge, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.pctText, { color: statusColor }]}>
                              {Math.round(pct)}%
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={[styles.noBudgetText, { color: colors.textTertiary }]}>
                          No budget set
                        </Text>
                      )}
                      <Pressable
                        onPress={() => openEdit(dept)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit3 size={16} color={colors.primary} />
                      </Pressable>
                      {isExpanded
                        ? <ChevronDown size={18} color={colors.textSecondary} />
                        : <ChevronRight size={18} color={colors.textSecondary} />
                      }
                    </View>
                  </Pressable>

                  {annual > 0 && (
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
                        {formatCurrency(ytdActual)} spent of {formatCurrency(annual)} annual budget
                      </Text>
                    </View>
                  )}

                  {isExpanded && (
                    <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                      <View style={styles.budgetBreakdown}>
                        <View style={[styles.breakdownItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <View style={[styles.breakdownIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                            <Users size={14} color="#3B82F6" />
                          </View>
                          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Labor</Text>
                          <Text style={[styles.breakdownValue, { color: colors.text }]}>
                            {formatCurrency(dept.labor_budget)}
                          </Text>
                        </View>
                        <View style={[styles.breakdownItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <View style={[styles.breakdownIcon, { backgroundColor: '#10B981' + '20' }]}>
                            <Package size={14} color="#10B981" />
                          </View>
                          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Materials</Text>
                          <Text style={[styles.breakdownValue, { color: colors.text }]}>
                            {formatCurrency(dept.materials_budget)}
                          </Text>
                        </View>
                        <View style={[styles.breakdownItem, { backgroundColor: colors.backgroundSecondary }]}>
                          <View style={[styles.breakdownIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                            <Users size={14} color="#8B5CF6" />
                          </View>
                          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Headcount</Text>
                          <Text style={[styles.breakdownValue, { color: colors.text }]}>
                            {dept.actual_headcount || 0} / {dept.budgeted_headcount || 0}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.monthlyTitle, { color: colors.text }]}>
                        Monthly Spend from POs
                      </Text>
                      <View style={styles.monthlyGrid}>
                        {MONTHS.map(m => {
                          const actual = byMonth[m.key] || 0;
                          const isPast = m.key < currentMonth;
                          const isCurrent = m.key === currentMonth;
                          const monthlyBudget = annual / 12;
                          const mPct = monthlyBudget > 0 ? (actual / monthlyBudget) * 100 : 0;
                          const mColor = getStatusColor(mPct);

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

                      <View style={[styles.annualSummary, { backgroundColor: colors.backgroundSecondary }]}>
                        <View style={styles.annualRow}>
                          <Text style={[styles.annualLabel, { color: colors.textSecondary }]}>Annual Budget</Text>
                          <Text style={[styles.annualValue, { color: colors.text }]}>{formatCurrency(annual)}</Text>
                        </View>
                        <View style={styles.annualRow}>
                          <Text style={[styles.annualLabel, { color: colors.textSecondary }]}>YTD Actual (POs)</Text>
                          <Text style={[styles.annualValue, { color: '#10B981' }]}>{formatCurrency(ytdActual)}</Text>
                        </View>
                        <View style={[styles.annualRow, styles.annualRowLast, { borderTopColor: colors.border }]}>
                          <Text style={[styles.annualLabel, { color: colors.textSecondary }]}>Remaining</Text>
                          <Text style={[
                            styles.annualValue,
                            { color: annual - ytdActual >= 0 ? '#10B981' : '#EF4444' },
                          ]}>
                            {formatCurrency(annual - ytdActual)}
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
                {editingDept?.name} — Budget
              </Text>
              <Pressable onPress={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Check size={24} color={colors.primary} />
                }
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>BUDGET AMOUNTS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Annual Budget Total</Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={annualBudget}
                        onChangeText={setAnnualBudget}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Labor Budget</Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={laborBudget}
                        onChangeText={setLaborBudget}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Materials Budget</Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={materialsBudget}
                        onChangeText={setMaterialsBudget}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Budgeted Headcount</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={budgetedHeadcount}
                      onChangeText={setBudgetedHeadcount}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
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
  yearBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  yearBadgeText: { fontSize: 13, fontWeight: '600' as const },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 4,
  },
  summaryIcon: {
    width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  summaryValue: { fontSize: 12, fontWeight: '700' as const },
  summaryLabel: { fontSize: 10, fontWeight: '500' as const, textAlign: 'center' as const },
  sectionTitle: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 12 },
  emptyState: { alignItems: 'center', padding: 32, borderRadius: 12, borderWidth: 1, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' as const },
  deptCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  deptColorBar: { height: 4, width: '100%' },
  deptHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  deptInfo: { flex: 1 },
  deptName: { fontSize: 15, fontWeight: '600' as const },
  deptCode: { fontSize: 12, marginTop: 2 },
  deptRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptBudget: { fontSize: 14, fontWeight: '700' as const },
  noBudgetText: { fontSize: 12 },
  pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pctText: { fontSize: 12, fontWeight: '600' as const },
  progressContainer: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11 },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 14 },
  budgetBreakdown: { flexDirection: 'row', gap: 8 },
  breakdownItem: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', gap: 4 },
  breakdownIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  breakdownLabel: { fontSize: 10, fontWeight: '500' as const },
  breakdownValue: { fontSize: 12, fontWeight: '700' as const },
  monthlyTitle: { fontSize: 13, fontWeight: '600' as const },
  monthlyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthCell: {
    width: '22%', padding: 8, borderRadius: 8, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: 'transparent',
  },
  monthLabel: { fontSize: 11, fontWeight: '600' as const },
  monthActual: { fontSize: 10, fontWeight: '600' as const },
  monthFuture: { fontSize: 10 },
  monthProgressTrack: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
  monthProgressFill: { height: '100%', borderRadius: 2 },
  annualSummary: { borderRadius: 10, padding: 12, gap: 8 },
  annualRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  annualRowLast: { paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  annualLabel: { fontSize: 13 },
  annualValue: { fontSize: 14, fontWeight: '600' as const },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  formSection: { marginBottom: 24 },
  formLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 10 },
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  currencyInput: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, gap: 8,
  },
  currencyInputText: { flex: 1, paddingVertical: 12, fontSize: 16 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
});
