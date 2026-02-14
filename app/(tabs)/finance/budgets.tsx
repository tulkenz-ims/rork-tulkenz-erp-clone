import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import {
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  Save,
  Edit3,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useBudgetsQuery,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  type Budget,
  type BudgetInput,
} from '@/hooks/useSupabaseFinance';

const PERIODS: BudgetInput['period'][] = ['monthly', 'quarterly', 'annual'];
const STATUSES: BudgetInput['status'][] = ['active', 'draft', 'closed'];

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#22C55E15', text: '#22C55E' },
  draft: { bg: '#F59E0B15', text: '#F59E0B' },
  closed: { bg: '#6B728015', text: '#6B7280' },
};

const EMPTY_FORM: BudgetInput = {
  name: '',
  departmentCode: '',
  departmentName: '',
  glAccountPrefix: '',
  fiscalYear: new Date().getFullYear(),
  period: 'monthly',
  amount: 0,
  spent: 0,
  status: 'active',
};

export default function BudgetingScreen() {
  const { colors } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetInput>({ ...EMPTY_FORM });

  const { data: budgets = [], isLoading, refetch, isRefetching } = useBudgetsQuery();

  const createMutation = useCreateBudget({
    onSuccess: () => { setShowForm(false); resetForm(); },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const updateMutation = useUpdateBudget({
    onSuccess: () => { setShowForm(false); resetForm(); },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deleteMutation = useDeleteBudget({
    onSuccess: () => { setShowForm(false); resetForm(); },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditingBudget(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      name: budget.name,
      departmentCode: budget.departmentCode,
      departmentName: budget.departmentName || '',
      glAccountPrefix: budget.glAccountPrefix || '',
      fiscalYear: budget.fiscalYear,
      period: budget.period,
      amount: budget.amount,
      spent: budget.spent,
      status: budget.status,
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Budget name is required');
      return;
    }
    if (!form.departmentCode.trim()) {
      Alert.alert('Required', 'Department code is required');
      return;
    }
    if (form.amount <= 0) {
      Alert.alert('Required', 'Budget amount must be greater than 0');
      return;
    }

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }, [form, editingBudget, createMutation, updateMutation]);

  const handleDelete = useCallback(() => {
    if (!editingBudget) return;
    Alert.alert(
      'Delete Budget',
      `Delete "${editingBudget.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(editingBudget.id),
        },
      ]
    );
  }, [editingBudget, deleteMutation]);

  const onRefresh = () => refetch();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.spent, 0);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderBudget = (budget: Budget) => {
    const usedPercent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const isOverBudget = usedPercent > 100;
    const progressColor = isOverBudget ? '#EF4444' : usedPercent > 80 ? '#F59E0B' : '#22C55E';
    const sc = STATUS_COLORS[budget.status] || STATUS_COLORS.active;

    return (
      <TouchableOpacity
        key={budget.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => openEdit(budget)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.budgetName, { color: colors.text }]}>{budget.name}</Text>
            <Text style={[styles.department, { color: colors.textSecondary }]}>
              {budget.departmentName || budget.departmentCode} · GL {budget.glAccountPrefix}xx · {budget.period}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{budget.status.toUpperCase()}</Text>
            </View>
            <Edit3 size={14} color={colors.textTertiary} />
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Budget Utilization</Text>
            <Text style={[styles.progressPercent, { color: progressColor }]}>{usedPercent.toFixed(1)}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: progressColor, width: `${Math.min(usedPercent, 100)}%` }]} />
          </View>
        </View>

        <View style={styles.budgetDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Budget</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(budget.amount)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Spent to Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(budget.spent)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.detailValue, { color: budget.remaining >= 0 ? '#22C55E' : '#EF4444' }]}>
              {formatCurrency(budget.remaining)}
            </Text>
          </View>
        </View>

        {isOverBudget && (
          <View style={[styles.warningBanner, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.warningText}>Over budget by {formatCurrency(Math.abs(budget.remaining))}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  function renderFormModal() {
    return (
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingBudget ? 'Edit Budget' : 'New Budget'}
              </Text>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} hitSlop={12}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Budget Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
                placeholder="e.g. Maintenance Operating Budget"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Department Code */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Department Code *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.departmentCode}
                onChangeText={(v) => setForm(prev => ({ ...prev, departmentCode: v }))}
                placeholder="e.g. 1001"
                placeholderTextColor={colors.textTertiary}
              />

              {/* Department Name */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Department Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.departmentName || ''}
                onChangeText={(v) => setForm(prev => ({ ...prev, departmentName: v }))}
                placeholder="e.g. Maintenance"
                placeholderTextColor={colors.textTertiary}
              />

              {/* GL Account Prefix */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>GL Account Prefix</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.glAccountPrefix || ''}
                onChangeText={(v) => setForm(prev => ({ ...prev, glAccountPrefix: v }))}
                placeholder="e.g. 61 (maps to 6100-6199)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
              />

              {/* Fiscal Year */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Fiscal Year</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.fiscalYear.toString()}
                onChangeText={(v) => {
                  const num = parseInt(v.replace(/[^0-9]/g, ''));
                  setForm(prev => ({ ...prev, fiscalYear: isNaN(num) ? new Date().getFullYear() : num }));
                }}
                placeholder="2026"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
              />

              {/* Period */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Budget Period *</Text>
              <View style={styles.chipRow}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: form.period === p ? colors.primary + '20' : colors.background,
                        borderColor: form.period === p ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, period: p }))}
                  >
                    <Text style={[styles.chipText, { color: form.period === p ? colors.primary : colors.textSecondary }]}>
                      {PERIOD_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Budget Amount *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.amount > 0 ? form.amount.toString() : ''}
                onChangeText={(v) => {
                  const num = parseFloat(v.replace(/[^0-9.]/g, ''));
                  setForm(prev => ({ ...prev, amount: isNaN(num) ? 0 : num }));
                }}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />

              {/* Spent (edit only) */}
              {editingBudget && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Spent to Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.spent?.toString() || '0'}
                    onChangeText={(v) => {
                      const num = parseFloat(v.replace(/[^0-9.]/g, ''));
                      setForm(prev => ({ ...prev, spent: isNaN(num) ? 0 : num }));
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Status */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Status *</Text>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => {
                  const sc = STATUS_COLORS[s];
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: form.status === s ? sc.bg : colors.background,
                          borderColor: form.status === s ? sc.text : colors.border,
                        },
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, status: s }))}
                    >
                      <Text style={[styles.chipText, { color: form.status === s ? sc.text : colors.textSecondary }]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              {editingBudget && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
                  onPress={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowForm(false); resetForm(); }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>{editingBudget ? 'Update' : 'Create'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <PiggyBank size={24} color="#CA8A04" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Budget</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <TrendingUp size={24} color="#22C55E" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent YTD</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totalActual)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Department Budgets</Text>
        {budgets.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <PiggyBank size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Budgets Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create a budget to start tracking department spending
            </Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
              <Plus size={18} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map(renderBudget)
        )}
      </ScrollView>

      {budgets.length > 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openAdd} activeOpacity={0.8}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {renderFormModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  content: { padding: 16, paddingBottom: 100 },
  summaryCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  summaryRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const },
  summaryItem: { alignItems: 'center' as const, gap: 8 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 20, fontWeight: '700' as const },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 16 },
  budgetName: { fontSize: 16, fontWeight: '600' as const },
  department: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
  progressLabel: { fontSize: 13 },
  progressPercent: { fontSize: 14, fontWeight: '600' as const },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' as const },
  progressFill: { height: '100%' as const, borderRadius: 4 },
  budgetDetails: { gap: 8 },
  detailRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '500' as const },
  warningBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 12, padding: 10, borderRadius: 8 },
  warningText: { fontSize: 13, color: '#EF4444', fontWeight: '500' as const },
  emptyState: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const },
  emptySubtitle: { fontSize: 14, textAlign: 'center' as const },
  emptyAddBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' as const, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700' as const },
  formScroll: { paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' as const },
  modalActions: { flexDirection: 'row' as const, gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  deleteBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  cancelBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  cancelBtnText: { fontSize: 15, fontWeight: '500' as const },
  saveBtn: { flex: 2, height: 44, borderRadius: 10, flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
});
