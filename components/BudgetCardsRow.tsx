import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign } from 'lucide-react-native';

const HUD = {
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  green:        '#00ff88',
  amber:        '#ffb800',
  red:          '#ff2d55',
  purple:       '#7b61ff',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

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

export default function BudgetCardsRow({ budgets }: { budgets: Budget[] }) {
  if (budgets.length === 0) return null;

  return (
    <View style={S.grid}>
      {budgets.map((b, idx) => {
        const usedPct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
        const col = usedPct > 100 ? HUD.red : usedPct > 80 ? HUD.amber : HUD.green;
        const barWidth = Math.min(usedPct, 100);

        return (
          <View key={idx} style={[S.card, { borderColor: col + '35', shadowColor: col }]}>
            <View style={[S.leftBar, { backgroundColor: col }]} />
            <Text style={S.deptName} numberOfLines={1}>{b.departmentName || b.departmentCode}</Text>
            <View style={S.valueRow}>
              <Text style={[S.pctValue, { color: col }]}>{usedPct}</Text>
              <Text style={[S.pctSign, { color: col }]}>%</Text>
              <Text style={S.usedLabel}>used</Text>
            </View>
            <View style={S.barTrack}>
              <View style={[S.barFill, { width: `${barWidth}%` as any, backgroundColor: col }]} />
            </View>
            <View style={S.detailRow}>
              <View>
                <Text style={S.detailLabel}>BUDGET</Text>
                <Text style={S.detailValue}>${(b.amount / 1000).toFixed(0)}K</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={S.detailLabel}>REMAINING</Text>
                <Text style={[S.detailValue, { color: col }]}>${(b.remaining / 1000).toFixed(0)}K</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card:       { backgroundColor: HUD.bgCardAlt, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 12, paddingLeft: 15, flexGrow: 1, flexBasis: '10%', minWidth: 120, overflow: 'hidden', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  leftBar:    { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  deptName:   { fontSize: 8, fontWeight: '800', color: HUD.textSec, marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  valueRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 8 },
  pctValue:   { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  pctSign:    { fontSize: 14, fontWeight: '700' },
  usedLabel:  { fontSize: 10, color: HUD.textDim, marginLeft: 4, fontWeight: '600' },
  barTrack:   { height: 3, backgroundColor: HUD.border, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  barFill:    { height: '100%' as any, borderRadius: 2 },
  detailRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel:{ fontSize: 7, color: HUD.textDim, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  detailValue:{ fontSize: 12, fontWeight: '800', color: HUD.text },
});
