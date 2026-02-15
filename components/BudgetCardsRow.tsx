import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Budget {
  id?: string;
  name: string;
  departmentCode: string;
  departmentName?: string;
  amount: number;
  spent: number;
  remaining: number;
  fiscalYear?: number;
}

interface BudgetCardsRowProps {
  budgets: Budget[];
}

export default function BudgetCardsRow({ budgets }: BudgetCardsRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (budgets.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <DollarSign size={15} color="#10B981" />
          <Text style={styles.title}>Department Budgets</Text>
        </View>
        <Text style={styles.subtitle}>FY{budgets[0]?.fiscalYear || new Date().getFullYear()}</Text>
      </View>
      <View style={styles.grid}>
        {budgets.map((b, idx) => {
          const usedPct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
          const barColor = usedPct > 100 ? '#EF4444' : usedPct > 80 ? '#F59E0B' : '#10B981';
          const barWidth = Math.min(usedPct, 100);

          return (
            <View key={idx} style={styles.card}>
              <Text style={styles.deptName} numberOfLines={1}>
                {b.departmentName || b.departmentCode}
              </Text>

              <View style={styles.valueRow}>
                <Text style={[styles.pctValue, { color: barColor }]}>{usedPct}</Text>
                <Text style={[styles.pctSign, { color: barColor }]}>%</Text>
                <Text style={styles.usedLabel}>used</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>${(b.amount / 1000).toFixed(0)}K</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Remaining</Text>
                  <Text style={[styles.detailValue, { color: barColor }]}>
                    ${(b.remaining / 1000).toFixed(0)}K
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexGrow: 1,
    flexBasis: '10%',
    minWidth: 120,
  },
  deptName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 8,
  },
  pctValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pctSign: {
    fontSize: 14,
    fontWeight: '600',
  },
  usedLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    gap: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
});
