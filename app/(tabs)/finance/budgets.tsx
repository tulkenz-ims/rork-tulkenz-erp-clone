import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { PiggyBank, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBudgetsQuery, type Budget } from '@/hooks/useSupabaseFinance';

export default function BudgetingScreen() {
  const { colors } = useTheme();
  const { data: budgets = [], isLoading, refetch, isRefetching } = useBudgetsQuery();

  const onRefresh = () => {
    refetch();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const renderBudget = (budget: Budget) => {
    const usedPercent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const isOverBudget = usedPercent > 100;
    const progressColor = isOverBudget ? '#EF4444' : usedPercent > 80 ? '#F59E0B' : '#22C55E';

    return (
      <TouchableOpacity key={budget.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.budgetName, { color: colors.text }]}>{budget.name}</Text>
            <Text style={[styles.department, { color: colors.textSecondary }]}>{budget.departmentName || budget.departmentCode} · GL {budget.glAccountPrefix}xx · {budget.period}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: budget.status === 'active' ? '#22C55E15' : '#6B728015' }]}>
            <Text style={[styles.statusText, { color: budget.status === 'active' ? '#22C55E' : '#6B7280' }]}>{budget.status.toUpperCase()}</Text>
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
            <Text style={[styles.detailValue, { color: budget.remaining >= 0 ? '#22C55E' : '#EF4444' }]}>{formatCurrency(budget.remaining)}</Text>
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

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.spent, 0);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}>
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
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Create a budget to start tracking department spending</Text>
        </View>
      ) : (
        budgets.map(renderBudget)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  summaryRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const },
  summaryItem: { alignItems: 'center' as const, gap: 8 },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 20, fontWeight: '700' as const },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 16 },
  budgetName: { fontSize: 16, fontWeight: '600' as const },
  department: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
  progressLabel: { fontSize: 13 },
  progressPercent: { fontSize: 14, fontWeight: '600' as const },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' as const },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetDetails: { gap: 8 },
  detailRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '500' as const },
  warningBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 12, padding: 10, borderRadius: 8 },
  warningText: { fontSize: 13, color: '#EF4444', fontWeight: '500' as const },
  emptyState: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const },
  emptySubtitle: { fontSize: 14, textAlign: 'center' as const },
});
