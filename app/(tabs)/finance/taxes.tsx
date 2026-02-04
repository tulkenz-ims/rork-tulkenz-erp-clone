import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Calculator, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MOCK_TAX_RECORDS, type TaxRecord } from '@/constants/financeConstants';

export default function TaxManagementScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#22C55E';
      case 'filed': return '#3B82F6';
      case 'pending': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} color="#22C55E" />;
      case 'filed': return <Calendar size={16} color="#3B82F6" />;
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'overdue': return <AlertTriangle size={16} color="#EF4444" />;
      default: return null;
    }
  };

  const pendingTaxes = MOCK_TAX_RECORDS.filter(t => t.status === 'pending');
  const totalPending = pendingTaxes.reduce((sum, t) => sum + t.taxAmount, 0);

  const renderTaxRecord = (record: TaxRecord) => (
    <TouchableOpacity key={record.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.taxType, { color: colors.text }]}>{record.taxType.charAt(0).toUpperCase() + record.taxType.slice(1)} Tax</Text>
          <Text style={[styles.jurisdiction, { color: colors.textSecondary }]}>{record.jurisdiction} - {record.period}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(record.status)}15` }]}>
          {getStatusIcon(record.status)}
          <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>{record.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.taxDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Taxable Amount</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(record.taxableAmount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tax Rate</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{record.taxRate}%</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tax Amount</Text>
          <Text style={[styles.taxAmount, { color: '#EF4444' }]}>{formatCurrency(record.taxAmount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due Date</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{record.dueDate}</Text>
        </View>
        {record.referenceNumber && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reference</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{record.referenceNumber}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <View style={[styles.summaryCard, { backgroundColor: pendingTaxes.length > 0 ? '#F59E0B15' : '#22C55E15', borderColor: pendingTaxes.length > 0 ? '#F59E0B' : '#22C55E' }]}>
        <View style={styles.summaryContent}>
          <Calculator size={28} color={pendingTaxes.length > 0 ? '#F59E0B' : '#22C55E'} />
          <View style={styles.summaryText}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {pendingTaxes.length > 0 ? 'Pending Tax Obligations' : 'All Taxes Current'}
            </Text>
            <Text style={[styles.summaryValue, { color: pendingTaxes.length > 0 ? '#F59E0B' : '#22C55E' }]}>
              {pendingTaxes.length > 0 ? formatCurrency(totalPending) : 'No pending filings'}
            </Text>
          </View>
        </View>
        {pendingTaxes.length > 0 && (
          <Text style={[styles.summaryNote, { color: colors.textSecondary }]}>{pendingTaxes.length} filing{pendingTaxes.length > 1 ? 's' : ''} due</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Records</Text>
      {MOCK_TAX_RECORDS.map(renderTaxRecord)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  summaryContent: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16 },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 22, fontWeight: '700' as const, marginTop: 4 },
  summaryNote: { fontSize: 13, marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  taxType: { fontSize: 16, fontWeight: '600' as const },
  jurisdiction: { fontSize: 13, marginTop: 2 },
  statusBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  taxDetails: { gap: 8 },
  detailRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '500' as const },
  taxAmount: { fontSize: 16, fontWeight: '600' as const },
});
