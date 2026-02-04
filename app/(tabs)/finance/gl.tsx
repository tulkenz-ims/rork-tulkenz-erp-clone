import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { ChevronRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useGLAccountsQuery, type GLAccount, type AccountType } from '@/hooks/useSupabaseFinance';

export default function GeneralLedgerScreen() {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<AccountType | 'all'>('all');

  const { data: allAccounts = [], isLoading, refetch, isRefetching } = useGLAccountsQuery();

  const onRefresh = () => {
    refetch();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const accountTypes: (AccountType | 'all')[] = ['all', 'asset', 'liability', 'equity', 'revenue', 'expense'];
  
  const typeColors: Record<AccountType, string> = {
    asset: '#22C55E',
    liability: '#EF4444',
    equity: '#8B5CF6',
    revenue: '#3B82F6',
    expense: '#F59E0B',
  };

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

  const renderAccount = (account: GLAccount) => (
    <TouchableOpacity key={account.id} style={[styles.accountRow, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
      <View style={styles.accountInfo}>
        <View style={[styles.typeDot, { backgroundColor: typeColors[account.type] }]} />
        <View style={styles.accountDetails}>
          <Text style={[styles.accountNumber, { color: colors.textSecondary }]}>{account.accountNumber}</Text>
          <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
        </View>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={[styles.balance, { color: account.balance >= 0 ? colors.text : '#EF4444' }]}>{formatCurrency(account.balance)}</Text>
        <ChevronRight size={16} color={colors.textTertiary} />
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
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={[styles.content, styles.centered]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <AlertCircle size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Accounts Found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Pull to refresh or add accounts to get started</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}>
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

      <View style={[styles.netIncomeCard, { backgroundColor: totals.netIncome >= 0 ? '#22C55E15' : '#EF444415', borderColor: totals.netIncome >= 0 ? '#22C55E' : '#EF4444' }]}>
        <Text style={[styles.netIncomeLabel, { color: colors.textSecondary }]}>Net Income (YTD)</Text>
        <Text style={[styles.netIncomeValue, { color: totals.netIncome >= 0 ? '#22C55E' : '#EF4444' }]}>{formatCurrency(totals.netIncome)}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {accountTypes.map((type) => (
          <TouchableOpacity key={type} style={[styles.filterButton, { backgroundColor: selectedType === type ? colors.primary : colors.surface, borderColor: colors.border }]} onPress={() => setSelectedType(type)}>
            <Text style={[styles.filterText, { color: selectedType === type ? '#FFFFFF' : colors.text }]}>{type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Chart of Accounts ({filteredAccounts.length})</Text>
      {filteredAccounts.map(renderAccount)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' as const },
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
  balanceContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  balance: { fontSize: 15, fontWeight: '600' as const },
});
