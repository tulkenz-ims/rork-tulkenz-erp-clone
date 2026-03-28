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
  Plus,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface DepartmentBudget {
  id: string;
  organization_id: string;
  name: string;
  department_code: string;
  department_name: string;
  gl_account_prefix: string;
  fiscal_year: number;
  period: string;
  amount: number;
  spent: number;
  remaining: number;
  status: string;
  notes: string;
}

const PERIODS = [
  'Q1', 'Q2', 'Q3', 'Q4', 'Annual',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'draft', label: 'Draft', color: '#6B7280' },
  { value: 'closed', label: 'Closed', color: '#EF4444' },
];

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<DepartmentBudget | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [glAccountPrefix, setGlAccountPrefix] = useState('');
  const [period, setPeriod] = useState('Annual');
  const [amount, setAmount] = useState('');
  const [spent, setSpent] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');

  const { data: budgets = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['department_budgets', organizationId, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_budgets')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('fiscal_year', selectedYear)
        .order('department_name');
      if (error) throw error;
      return (data || []) as DepartmentBudget[];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<DepartmentBudget>) => {
      if (editingBudget) {
        const { error } = await supabase
          .from('department_budgets')
          .update({
            ...payload,
            remaining: (parseFloat(payload.amount as any) || 0) - (parseFloat(payload.spent as any) || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBudget.id);
        if (error) throw error;
      } else {
        const amt = parseFloat(payload.amount as any) || 0;
        const spentAmt = parseFloat(payload.spent as any) || 0;
        const { error } = await supabase
          .from('department_budgets')
          .insert({
            ...payload,
            organization_id: organizationId,
            fiscal_year: selectedYear,
            remaining: amt - spentAmt,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department_budgets'] });
      closeModal();
      Alert.alert('Success', editingBudget ? 'Budget updated' : 'Budget created');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save budget');
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

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return '#EF4444';
    if (pct >= 85) return '#F59E0B';
    return '#10B981';
  };

  const openCreate = () => {
    setEditingBudget(null);
    setName('');
    setDepartmentName('');
    setDepartmentCode('');
    setGlAccountPrefix('');
    setPeriod('Annual');
    setAmount('');
    setSpent('0');
    setNotes('');
    setStatus('active');
    setModalVisible(true);
  };

  const openEdit = (budget: DepartmentBudget) => {
    setEditingBudget(budget);
    setName(budget.name || '');
    setDepartmentName(budget.department_name || '');
    setDepartmentCode(budget.department_code || '');
    setGlAccountPrefix(budget.gl_account_prefix || '');
    setPeriod(budget.period || 'Annual');
    setAmount(budget.amount?.toString() || '');
    setSpent(budget.spent?.toString() || '0');
    setNotes(budget.notes || '');
    setStatus(budget.status || 'active');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBudget(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Budget name is required');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid budget amount');
      return;
    }
    saveMutation.mutate({
      name: name.trim(),
      department_name: departmentName.trim(),
      department_code: departmentCode.trim(),
      gl_account_prefix: glAccountPrefix.trim(),
      period,
      amount: parseFloat(amount),
      spent: parseFloat(spent) || 0,
      notes: notes.trim(),
      status,
    });
  };

  const totalBudget = useMemo(() =>
    budgets.reduce((sum, b) => sum + (b.amount || 0), 0), [budgets]);

  const totalSpent = useMemo(() =>
    budgets.reduce((sum, b) => sum + (b.spent || 0), 0), [budgets]);

  const totalRemaining = useMemo(() =>
    budgets.reduce((sum, b) => sum + (b.remaining || 0), 0), [budgets]);

  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Group by department
  const groupedByDept = useMemo(() => {
    const groups: Record<string, DepartmentBudget[]> = {};
    budgets.forEach(b => {
      const key = b.department_name || b.department_code || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return groups;
  }, [budgets]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Department Budgets',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerBackTitle: 'Procurement',
          headerRight: () => (
            <Pressable onPress={openCreate} style={{ marginRight: 16 }}>
              <Plus size={24} color={colors.primary} />
            </Pressable>
          ),
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
                <BarChart3 size={18} color={colors.primary} />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalBudget)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Budget</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#10B981' + '20' }]}>
                <TrendingUp size={18} color="#10B981" />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalSpent)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                <DollarSign size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalRemaining)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Remaining</Text>
            </View>
          </View>

          {/* Budget List grouped by department */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            BUDGETS — {selectedYear}
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : budgets.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Building2 size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Budgets for {selectedYear}</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap + to create your first budget entry
              </Text>
            </View>
          ) : (
            Object.entries(groupedByDept).map(([deptName, deptBudgets]) => {
              const deptTotal = deptBudgets.reduce((s, b) => s + (b.amount || 0), 0);
              const deptSpent = deptBudgets.reduce((s, b) => s + (b.spent || 0), 0);
              const pct = deptTotal > 0 ? (deptSpent / deptTotal) * 100 : 0;
              const statusColor = getStatusColor(pct);
              const isExpanded = expandedId === deptName;

              return (
                <View
                  key={deptName}
                  style={[styles.deptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {/* Dept Header */}
                  <Pressable
                    style={styles.deptHeader}
                    onPress={() => setExpandedId(isExpanded ? null : deptName)}
                  >
                    <View style={[styles.deptIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Building2 size={18} color={colors.primary} />
                    </View>
                    <View style={styles.deptInfo}>
                      <Text style={[styles.deptName, { color: colors.text }]}>{deptName}</Text>
                      <Text style={[styles.deptMeta, { color: colors.textSecondary }]}>
                        {deptBudgets.length} budget{deptBudgets.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.deptRight}>
                      <Text style={[styles.deptTotal, { color: colors.text }]}>
                        {formatCurrency(deptTotal)}
                      </Text>
                      <View style={[styles.pctBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.pctText, { color: statusColor }]}>
                          {Math.round(pct)}%
                        </Text>
                      </View>
                      {isExpanded
                        ? <ChevronDown size={18} color={colors.textSecondary} />
                        : <ChevronRight size={18} color={colors.textSecondary} />
                      }
                    </View>
                  </Pressable>

                  {/* Dept Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { backgroundColor: statusColor, width: `${Math.min(100, pct)}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                      {formatCurrency(deptSpent)} spent of {formatCurrency(deptTotal)}
                    </Text>
                  </View>

                  {/* Expanded budget line items */}
                  {isExpanded && (
                    <View style={[styles.lineItems, { borderTopColor: colors.border }]}>
                      {deptBudgets.map(budget => {
                        const bPct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                        const bColor = getStatusColor(bPct);
                        const statusInfo = STATUS_OPTIONS.find(s => s.value === budget.status);

                        return (
                          <Pressable
                            key={budget.id}
                            style={[styles.lineItem, { borderBottomColor: colors.border }]}
                            onPress={() => openEdit(budget)}
                          >
                            <View style={styles.lineItemTop}>
                              <View style={styles.lineItemLeft}>
                                <Text style={[styles.lineItemName, { color: colors.text }]}>
                                  {budget.name}
                                </Text>
                                <View style={styles.lineItemMeta}>
                                  <View style={[styles.periodBadge, { backgroundColor: colors.primary + '15' }]}>
                                    <Calendar size={10} color={colors.primary} />
                                    <Text style={[styles.periodText, { color: colors.primary }]}>
                                      {budget.period}
                                    </Text>
                                  </View>
                                  {statusInfo && (
                                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                                        {statusInfo.label}
                                      </Text>
                                    </View>
                                  )}
                                  {budget.gl_account_prefix && (
                                    <Text style={[styles.glPrefix, { color: colors.textTertiary }]}>
                                      GL: {budget.gl_account_prefix}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.lineItemAmounts}>
                                <Text style={[styles.lineItemBudget, { color: colors.text }]}>
                                  {formatCurrency(budget.amount)}
                                </Text>
                                <Text style={[styles.lineItemSpent, { color: bColor }]}>
                                  {formatCurrency(budget.spent)} spent
                                </Text>
                              </View>
                              <Edit3 size={14} color={colors.textTertiary} />
                            </View>
                            <View style={[styles.lineProgressTrack, { backgroundColor: colors.border }]}>
                              <View
                                style={[
                                  styles.lineProgressFill,
                                  { backgroundColor: bColor, width: `${Math.min(100, bPct)}%` as any },
                                ]}
                              />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Create / Edit Modal */}
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
                {editingBudget ? 'Edit Budget' : 'New Budget'}
              </Text>
              <Pressable onPress={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Check size={24} color={colors.primary} />
                }
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>BUDGET DETAILS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Budget Name *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Maintenance Materials Q1"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Department Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={departmentName}
                        onChangeText={setDepartmentName}
                        placeholder="e.g. Maintenance"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Dept Code</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={departmentCode}
                        onChangeText={setDepartmentCode}
                        placeholder="e.g. 1001"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>GL Account Prefix</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={glAccountPrefix}
                      onChangeText={setGlAccountPrefix}
                      placeholder="e.g. 5001"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Period</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.periodGrid}>
                        {PERIODS.map(p => (
                          <Pressable
                            key={p}
                            style={[
                              styles.periodOption,
                              { borderColor: period === p ? colors.primary : colors.border },
                              period === p && { backgroundColor: colors.primary + '15' },
                            ]}
                            onPress={() => setPeriod(p)}
                          >
                            <Text style={[
                              styles.periodOptionText,
                              { color: period === p ? colors.primary : colors.textSecondary },
                            ]}>
                              {p}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>AMOUNTS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Budget Amount *</Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Amount Spent</Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={spent}
                        onChangeText={setSpent}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>STATUS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.statusGrid}>
                    {STATUS_OPTIONS.map(opt => (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.statusOption,
                          { borderColor: status === opt.value ? opt.color : colors.border },
                          status === opt.value && { backgroundColor: opt.color + '15' },
                        ]}
                        onPress={() => setStatus(opt.value)}
                      >
                        <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                        <Text style={[
                          styles.statusOptionText,
                          { color: status === opt.value ? opt.color : colors.textSecondary },
                        ]}>
                          {opt.label}
                        </Text>
                        {status === opt.value && <Check size={14} color={opt.color} />}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>NOTES</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional notes..."
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
  yearRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  yearChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  yearChipText: { fontSize: 14, fontWeight: '600' as const },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  summaryIcon: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  summaryValue: { fontSize: 12, fontWeight: '700' as const },
  summaryLabel: { fontSize: 10, fontWeight: '500' as const, textAlign: 'center' as const },
  sectionTitle: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 12 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 14, borderWidth: 1, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' as const },
  emptyText: { fontSize: 14, textAlign: 'center' as const },
  deptCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  deptHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  deptIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deptInfo: { flex: 1 },
  deptName: { fontSize: 15, fontWeight: '600' as const },
  deptMeta: { fontSize: 12, marginTop: 2 },
  deptRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptTotal: { fontSize: 14, fontWeight: '700' as const },
  pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pctText: { fontSize: 12, fontWeight: '600' as const },
  progressContainer: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11 },
  lineItems: { borderTopWidth: 1 },
  lineItem: { padding: 14, borderBottomWidth: 1 },
  lineItemTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  lineItemLeft: { flex: 1 },
  lineItemName: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  lineItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  periodText: { fontSize: 10, fontWeight: '600' as const },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  glPrefix: { fontSize: 10 },
  lineItemAmounts: { alignItems: 'flex-end' },
  lineItemBudget: { fontSize: 14, fontWeight: '700' as const },
  lineItemSpent: { fontSize: 11, fontWeight: '500' as const },
  lineProgressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  lineProgressFill: { height: '100%', borderRadius: 2 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  formSection: { marginBottom: 24 },
  formLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 10 },
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  currencyInput: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  currencyInputText: { flex: 1, paddingVertical: 12, fontSize: 16 },
  periodGrid: { flexDirection: 'row', gap: 8 },
  periodOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  periodOptionText: { fontSize: 13, fontWeight: '500' as const },
  statusGrid: { gap: 8 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  notesInput: { fontSize: 14, minHeight: 80, textAlignVertical: 'top' as const, borderRadius: 10, borderWidth: 1, padding: 12 },
});
