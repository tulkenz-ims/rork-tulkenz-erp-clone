import React, { useState, useCallback } from 'react';
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
  Plus,
  X,
  Check,
  Search,
  BookOpen,
  Power,
  ChevronRight,
  Hash,
  DollarSign,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Matches the existing gl_accounts table schema
interface GLAccount {
  id: string;
  organization_id: string;
  account_number: string;
  name: string;
  type: string;
  balance: number;
  parent_id: string | null;
  is_active: boolean;
  is_header: boolean;
  description: string;
  department_code: string;
  created_at: string;
  updated_at: string;
}

const ACCOUNT_TYPES = [
  { value: 'expense', label: 'Expense', color: '#EF4444' },
  { value: 'asset', label: 'Asset', color: '#3B82F6' },
  { value: 'liability', label: 'Liability', color: '#F59E0B' },
  { value: 'revenue', label: 'Revenue', color: '#10B981' },
  { value: 'cogs', label: 'COGS', color: '#8B5CF6' },
  { value: 'equity', label: 'Equity', color: '#06B6D4' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

export default function GLAccountsScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);

  // Form state
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('expense');
  const [description, setDescription] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [balance, setBalance] = useState('');
  const [isHeader, setIsHeader] = useState(false);

  const { data: accounts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gl_accounts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gl_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('account_number');
      if (error) throw error;
      return (data || []) as GLAccount[];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<GLAccount>) => {
      if (editingAccount) {
        const { error } = await supabase
          .from('gl_accounts')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gl_accounts')
          .insert({ ...payload, organization_id: organizationId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl_accounts'] });
      closeModal();
      Alert.alert('Success', editingAccount ? 'Account updated' : 'Account created');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to save account');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('gl_accounts')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl_accounts'] });
    },
  });

  const resetForm = useCallback(() => {
    setAccountNumber('');
    setAccountName('');
    setAccountType('expense');
    setDescription('');
    setDepartmentCode('');
    setBalance('');
    setIsHeader(false);
  }, []);

  const openCreate = () => {
    setEditingAccount(null);
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (account: GLAccount) => {
    setEditingAccount(account);
    setAccountNumber(account.account_number || '');
    setAccountName(account.name || '');
    setAccountType(account.type || 'expense');
    setDescription(account.description || '');
    setDepartmentCode(account.department_code || '');
    setBalance(account.balance?.toString() || '0');
    setIsHeader(account.is_header || false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAccount(null);
    resetForm();
  };

  const handleSave = () => {
    if (!accountNumber.trim()) {
      Alert.alert('Validation', 'Account number is required');
      return;
    }
    if (!accountName.trim()) {
      Alert.alert('Validation', 'Account name is required');
      return;
    }
    saveMutation.mutate({
      account_number: accountNumber.trim(),
      name: accountName.trim(),
      type: accountType,
      description: description.trim(),
      department_code: departmentCode.trim(),
      balance: parseFloat(balance) || 0,
      is_header: isHeader,
      is_active: true,
    });
  };

  const handleToggle = (account: GLAccount) => {
    Alert.alert(
      account.is_active ? 'Deactivate Account' : 'Activate Account',
      `${account.is_active ? 'Deactivate' : 'Activate'} ${account.account_number} — ${account.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: account.is_active ? 'Deactivate' : 'Activate',
          style: account.is_active ? 'destructive' : 'default',
          onPress: () => toggleMutation.mutate({ id: account.id, is_active: !account.is_active }),
        },
      ]
    );
  };

  const getTypeInfo = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type) ||
      { value: type, label: type, color: '#6B7280' };
  };

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = !search ||
      a.account_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.department_code?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeCount = accounts.filter(a => a.is_active).length;
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  // Get unique types from actual data
  const existingTypes = [...new Set(accounts.map(a => a.type).filter(Boolean))];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'GL Accounts',
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

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{accounts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{activeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{existingTypes.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Types</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]} numberOfLines={1}>
              ${Math.abs(totalBalance).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Balance</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by number, name, or dept..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Type Filter — built from actual data */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.typeFilterBar, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.typeFilterContent}
        >
          <Pressable
            style={[
              styles.typeChip,
              { borderColor: typeFilter === 'all' ? colors.primary : colors.border },
              typeFilter === 'all' && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setTypeFilter('all')}
          >
            <Text style={[styles.typeChipText, { color: typeFilter === 'all' ? colors.primary : colors.textSecondary }]}>
              All
            </Text>
          </Pressable>
          {existingTypes.map(type => {
            const typeInfo = getTypeInfo(type);
            return (
              <Pressable
                key={type}
                style={[
                  styles.typeChip,
                  { borderColor: typeFilter === type ? typeInfo.color : colors.border },
                  typeFilter === type && { backgroundColor: typeInfo.color + '15' },
                ]}
                onPress={() => setTypeFilter(type)}
              >
                <View style={[styles.typeChipDot, { backgroundColor: typeInfo.color }]} />
                <Text style={[
                  styles.typeChipText,
                  { color: typeFilter === type ? typeInfo.color : colors.textSecondary },
                ]}>
                  {typeInfo.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Account List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : filteredAccounts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <BookOpen size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {accounts.length === 0 ? 'No GL Accounts' : 'No Results'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {accounts.length === 0
                  ? 'Add your chart of accounts to code POs to GL accounts'
                  : 'Try adjusting your search or filter'}
              </Text>
              {accounts.length === 0 && (
                <Pressable
                  style={[styles.emptyCreateBtn, { backgroundColor: colors.primary }]}
                  onPress={openCreate}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.emptyCreateBtnText}>Add First Account</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
              </Text>
              {filteredAccounts.map(account => {
                const typeInfo = getTypeInfo(account.type);
                return (
                  <Pressable
                    key={account.id}
                    style={[
                      styles.accountCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      account.is_header && { borderLeftWidth: 3, borderLeftColor: typeInfo.color },
                      !account.is_active && { opacity: 0.6 },
                    ]}
                    onPress={() => openEdit(account)}
                  >
                    <View style={[styles.accountIcon, { backgroundColor: typeInfo.color + '15' }]}>
                      <Hash size={18} color={typeInfo.color} />
                    </View>
                    <View style={styles.accountInfo}>
                      <View style={styles.accountTitleRow}>
                        <Text style={[styles.accountNumber, { color: colors.text }]}>
                          {account.account_number}
                        </Text>
                        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '15' }]}>
                          <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                            {typeInfo.label}
                          </Text>
                        </View>
                        {account.is_header && (
                          <View style={[styles.headerBadge, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.headerBadgeText, { color: colors.primary }]}>Header</Text>
                          </View>
                        )}
                        {!account.is_active && (
                          <View style={[styles.inactiveBadge, { backgroundColor: colors.border }]}>
                            <Text style={[styles.inactiveBadgeText, { color: colors.textTertiary }]}>Inactive</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.accountName, { color: colors.textSecondary }]}>
                        {account.name}
                      </Text>
                      <View style={styles.accountMeta}>
                        {account.department_code ? (
                          <Text style={[styles.accountMetaText, { color: colors.textTertiary }]}>
                            Dept: {account.department_code}
                          </Text>
                        ) : null}
                        {account.balance !== null && account.balance !== 0 ? (
                          <Text style={[styles.accountBalance, { color: account.balance >= 0 ? '#10B981' : '#EF4444' }]}>
                            ${Math.abs(account.balance).toLocaleString()}
                          </Text>
                        ) : null}
                      </View>
                      {account.description ? (
                        <Text style={[styles.accountDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                          {account.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.accountActions}>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => handleToggle(account)}
                      >
                        <Power size={16} color={account.is_active ? '#10B981' : colors.textTertiary} />
                      </Pressable>
                      <ChevronRight size={18} color={colors.textTertiary} />
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <Pressable style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <Plus size={24} color="#fff" />
        </Pressable>

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
                {editingAccount ? 'Edit GL Account' : 'New GL Account'}
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
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>ACCOUNT DETAILS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Account Number *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        placeholder="e.g. 5001"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
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
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Account Name *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={accountName}
                      onChangeText={setAccountName}
                      placeholder="e.g. Maintenance Supplies"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Account Type *</Text>
                    <View style={styles.typeGrid}>
                      {ACCOUNT_TYPES.map(type => (
                        <Pressable
                          key={type.value}
                          style={[
                            styles.typeOption,
                            { borderColor: accountType === type.value ? type.color : colors.border },
                            accountType === type.value && { backgroundColor: type.color + '15' },
                          ]}
                          onPress={() => setAccountType(type.value)}
                        >
                          <View style={[styles.typeOptionDot, { backgroundColor: type.color }]} />
                          <Text style={[
                            styles.typeOptionText,
                            { color: accountType === type.value ? type.color : colors.textSecondary },
                          ]}>
                            {type.label}
                          </Text>
                          {accountType === type.value && <Check size={14} color={type.color} />}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Balance</Text>
                    <View style={[styles.currencyInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <DollarSign size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.currencyInputText, { color: colors.text }]}
                        value={balance}
                        onChangeText={setBalance}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Optional description"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <Pressable
                    style={[
                      styles.headerToggle,
                      { borderColor: isHeader ? colors.primary : colors.border },
                      isHeader && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setIsHeader(!isHeader)}
                  >
                    {isHeader
                      ? <Check size={18} color={colors.primary} />
                      : <View style={[styles.checkbox, { borderColor: colors.border }]} />
                    }
                    <View style={styles.headerToggleText}>
                      <Text style={[styles.headerToggleLabel, { color: colors.text }]}>Header Account</Text>
                      <Text style={[styles.headerToggleDesc, { color: colors.textTertiary }]}>
                        Summary account — no direct transactions
                      </Text>
                    </View>
                  </Pressable>
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
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700' as const },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 30, marginHorizontal: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  typeFilterBar: { borderBottomWidth: 1, maxHeight: 52 },
  typeFilterContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  typeChipDot: { width: 7, height: 7, borderRadius: 4 },
  typeChipText: { fontSize: 13, fontWeight: '500' as const },
  listContent: { padding: 16 },
  resultCount: { fontSize: 13, marginBottom: 12 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 14, borderWidth: 1, gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const },
  emptyText: { fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  emptyCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  emptyCreateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 12 },
  accountIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  accountInfo: { flex: 1, gap: 3 },
  accountTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  accountNumber: { fontSize: 15, fontWeight: '700' as const },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' as const },
  headerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  headerBadgeText: { fontSize: 11, fontWeight: '600' as const },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  inactiveBadgeText: { fontSize: 11, fontWeight: '500' as const },
  accountName: { fontSize: 13 },
  accountMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountMetaText: { fontSize: 11 },
  accountBalance: { fontSize: 12, fontWeight: '600' as const },
  accountDesc: { fontSize: 12 },
  accountActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  formSection: { marginBottom: 24 },
  formLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 10 },
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' as const },
  currencyInput: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  currencyInputText: { flex: 1, paddingVertical: 12, fontSize: 16 },
  typeGrid: { gap: 8 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  typeOptionDot: { width: 10, height: 10, borderRadius: 5 },
  typeOptionText: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  headerToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2 },
  headerToggleText: { flex: 1 },
  headerToggleLabel: { fontSize: 14, fontWeight: '500' as const },
  headerToggleDesc: { fontSize: 12, marginTop: 2 },
});
