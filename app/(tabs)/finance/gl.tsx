import React, { useState, useMemo, useCallback } from 'react';
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
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  X,
  Trash2,
  Save,
  Edit3,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useGLAccountsQuery,
  useCreateGLAccount,
  useUpdateGLAccount,
  useDeleteGLAccount,
  type GLAccount,
  type AccountType,
  type GLAccountInput,
} from '@/hooks/useSupabaseFinance';

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const TYPE_COLORS: Record<AccountType, string> = {
  asset: '#22C55E',
  liability: '#EF4444',
  equity: '#8B5CF6',
  revenue: '#3B82F6',
  expense: '#F59E0B',
};

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

const EMPTY_FORM: GLAccountInput = {
  accountNumber: '',
  name: '',
  type: 'expense',
  balance: 0,
  description: '',
  departmentCode: '',
  isHeader: false,
  isActive: true,
};

export default function GeneralLedgerScreen() {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<AccountType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);
  const [form, setForm] = useState<GLAccountInput>({ ...EMPTY_FORM });

  const { data: allAccounts = [], isLoading, refetch, isRefetching } = useGLAccountsQuery();

  const createMutation = useCreateGLAccount({
    onSuccess: () => {
      setShowForm(false);
      resetForm();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const updateMutation = useUpdateGLAccount({
    onSuccess: () => {
      setShowForm(false);
      resetForm();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deleteMutation = useDeleteGLAccount({
    onSuccess: () => {
      setShowForm(false);
      resetForm();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditingAccount(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback((account: GLAccount) => {
    setEditingAccount(account);
    setForm({
      accountNumber: account.accountNumber,
      name: account.name,
      type: account.type,
      balance: account.balance,
      description: account.description || '',
      departmentCode: account.departmentCode || '',
      isHeader: account.isHeader,
      isActive: account.isActive,
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.accountNumber.trim()) {
      Alert.alert('Required', 'Account number is required');
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Required', 'Account name is required');
      return;
    }

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }, [form, editingAccount, createMutation, updateMutation]);

  const handleDelete = useCallback(() => {
    if (!editingAccount) return;
    Alert.alert(
      'Delete Account',
      `Delete "${editingAccount.accountNumber} - ${editingAccount.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(editingAccount.id),
        },
      ]
    );
  }, [editingAccount, deleteMutation]);

  const onRefresh = () => refetch();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const accountTypes: (AccountType | 'all')[] = ['all', ...ACCOUNT_TYPES];

  const filteredAccounts = useMemo(() => {
    const accounts = allAccounts.filter(a => !a.isHeader);
    if (selectedType === 'all') return accounts;
    return accounts.filter(a => a.type === selectedType);
  }, [selectedType, allAccounts]);

  const totals = useMemo(() => {
    const assets = allAccounts.filter(a => a.type === 'asset' && !a.isHeader).reduce((sum, a) => sum + a.balance, 0);
    const liabilities = allAccounts.filter(a => a.type === 'liability' && !a.isHeader).reduce((sum, a) => sum + a.balance, 0);
    const equity = allAccounts.filter(a => a.type === 'equity' && !a.isHeader).reduce((sum, a) => sum + a.balance, 0);
    const revenue = allAccounts.filter(a => a.type === 'revenue' && !a.isHeader).reduce((sum, a) => sum + a.balance, 0);
    const expenses = allAccounts.filter(a => a.type === 'expense' && !a.isHeader).reduce((sum, a) => sum + a.balance, 0);
    return { assets, liabilities, equity, revenue, expenses, netIncome: revenue - expenses };
  }, [allAccounts]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderAccount = (account: GLAccount) => (
    <TouchableOpacity
      key={account.id}
      style={[styles.accountRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => openEdit(account)}
    >
      <View style={styles.accountInfo}>
        <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[account.type] }]} />
        <View style={styles.accountDetails}>
          <Text style={[styles.accountNumber, { color: colors.textSecondary }]}>{account.accountNumber}</Text>
          <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
          {account.departmentCode ? (
            <Text style={[styles.deptBadge, { color: colors.textTertiary }]}>Dept: {account.departmentCode}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={[styles.balance, { color: account.balance >= 0 ? colors.text : '#EF4444' }]}>
          {formatCurrency(account.balance)}
        </Text>
        <Edit3 size={14} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading accounts...</Text>
      </View>
    );
  }

  if (allAccounts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, styles.centered]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <AlertCircle size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Accounts Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add your first GL account to get started
          </Text>
          <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Plus size={18} color="#fff" />
            <Text style={styles.emptyAddBtnText}>Add Account</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderFormModal()}
      </View>
    );
  }

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
                {editingAccount ? 'Edit Account' : 'New GL Account'}
              </Text>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} hitSlop={12}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.accountNumber}
                onChangeText={(v) => setForm(prev => ({ ...prev, accountNumber: v }))}
                placeholder="e.g. 1010"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={10}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
                placeholder="e.g. Operating Cash Account"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Type *</Text>
              <View style={styles.typeRow}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: form.type === t ? TYPE_COLORS[t] + '20' : colors.background,
                        borderColor: form.type === t ? TYPE_COLORS[t] : colors.border,
                      },
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, type: t }))}
                  >
                    <View style={[styles.typeChipDot, { backgroundColor: TYPE_COLORS[t] }]} />
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: form.type === t ? TYPE_COLORS[t] : colors.textSecondary },
                      ]}
                    >
                      {TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Opening Balance</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.balance?.toString() || '0'}
                onChangeText={(v) => {
                  const num = parseFloat(v.replace(/[^0-9.-]/g, ''));
                  setForm(prev => ({ ...prev, balance: isNaN(num) ? 0 : num }));
                }}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Department Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.departmentCode || ''}
                onChangeText={(v) => setForm(prev => ({ ...prev, departmentCode: v }))}
                placeholder="e.g. MAINT, PROD, QA"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                value={form.description || ''}
                onChangeText={(v) => setForm(prev => ({ ...prev, description: v }))}
                placeholder="Optional description"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              >
                <View
                  style={[
                    styles.toggleBox,
                    {
                      backgroundColor: form.isActive ? colors.primary : colors.background,
                      borderColor: form.isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {form.isActive && <Text style={styles.toggleCheck}>✓</Text>}
                </View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Active Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setForm(prev => ({ ...prev, isHeader: !prev.isHeader }))}
              >
                <View
                  style={[
                    styles.toggleBox,
                    {
                      backgroundColor: form.isHeader ? colors.primary : colors.background,
                      borderColor: form.isHeader ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {form.isHeader && <Text style={styles.toggleCheck}>✓</Text>}
                </View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Header Account (grouping only)</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              {editingAccount && (
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
                    <Text style={styles.saveBtnText}>{editingAccount ? 'Update' : 'Create'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TrendingUp size={20} color="#22C55E" />
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Assets</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totals.assets)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TrendingDown size={20} color="#EF4444" />
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Liabilities</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(totals.liabilities)}</Text>
          </View>
        </View>

        <View
          style={[
            styles.netIncomeCard,
            {
              backgroundColor: totals.netIncome >= 0 ? '#22C55E15' : '#EF444415',
              borderColor: totals.netIncome >= 0 ? '#22C55E' : '#EF4444',
            },
          ]}
        >
          <Text style={[styles.netIncomeLabel, { color: colors.textSecondary }]}>Net Income (YTD)</Text>
          <Text style={[styles.netIncomeValue, { color: totals.netIncome >= 0 ? '#22C55E' : '#EF4444' }]}>
            {formatCurrency(totals.netIncome)}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {accountTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                { backgroundColor: selectedType === type ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.filterText, { color: selectedType === type ? '#FFFFFF' : colors.text }]}>
                {type === 'all' ? 'All' : TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Chart of Accounts ({filteredAccounts.length})
        </Text>
        {filteredAccounts.map(renderAccount)}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openAdd} activeOpacity={0.8}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {renderFormModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' as const },
  emptyAddBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  summaryCards: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, gap: 6 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 18, fontWeight: '700' as const },
  netIncomeCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  netIncomeLabel: { fontSize: 14 },
  netIncomeValue: { fontSize: 22, fontWeight: '700' as const },
  filterScroll: { marginBottom: 16 },
  filterRow: { gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12 },
  accountRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  accountInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, flex: 1 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  accountDetails: { flex: 1 },
  accountNumber: { fontSize: 12 },
  accountName: { fontSize: 14, fontWeight: '500' as const },
  deptBadge: { fontSize: 10, marginTop: 2 },
  balanceContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  balance: { fontSize: 15, fontWeight: '600' as const },
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
  textArea: { minHeight: 70, textAlignVertical: 'top' as const },
  typeRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  typeChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeChipDot: { width: 8, height: 8, borderRadius: 4 },
  typeChipText: { fontSize: 13, fontWeight: '500' as const },
  toggleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginTop: 14 },
  toggleBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center' as const, alignItems: 'center' as const },
  toggleCheck: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  toggleLabel: { fontSize: 14 },
  modalActions: { flexDirection: 'row' as const, gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  deleteBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  cancelBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
  cancelBtnText: { fontSize: 15, fontWeight: '500' as const },
  saveBtn: { flex: 2, height: 44, borderRadius: 10, flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
});
