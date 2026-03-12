import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Package,
  Plus,
  Minus,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  MapPin,
  X,
  Save,
  RotateCcw,
  History,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface InventoryTransaction {
  id: string;
  type: 'add' | 'remove' | 'adjust';
  quantity: number;
  reason: string;
  location: string;
  timestamp: Date;
  user: string;
}

const LOCATIONS = [
  'Building A - 1st Floor Storage',
  'Building A - 2nd Floor Storage',
  'Building B - Main Storage',
  'Warehouse - Supply Room',
  'Janitor Closet A',
  'Janitor Closet B',
];

const DEFAULT_SUPPLY = {
  id: 'TP001',
  item_code: '6100010',
  item_name: 'Toilet Paper (Jumbo Rolls)',
  unit_of_measure: 'case',
  quantity_on_hand: 42,
  minimum_quantity: 20,
  reorder_quantity: 50,
  unit_cost: 35.00,
  location: 'Warehouse - Supply Room',
};

export default function ToiletPaperInventoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [currentQty, setCurrentQty] = useState(DEFAULT_SUPPLY.quantity_on_hand);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'add' | 'remove' | 'adjust'>('add');
  const [quantity, setQuantity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [reason, setReason] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([
    { id: '1', type: 'add',    quantity: 24, reason: 'Delivery received',    location: 'Warehouse - Supply Room',           timestamp: new Date(Date.now() - 86400000), user: 'John Smith'   },
    { id: '2', type: 'remove', quantity: 6,  reason: 'Restocked restrooms',  location: 'Building A - 1st Floor Storage',    timestamp: new Date(Date.now() - 43200000), user: 'Maria Garcia' },
    { id: '3', type: 'remove', quantity: 4,  reason: 'Restocked restrooms',  location: 'Building B - Main Storage',         timestamp: new Date(Date.now() - 21600000), user: 'Maria Garcia' },
  ]);

  const inventoryStatus = useMemo(() => {
    const qty = currentQty;
    const min = DEFAULT_SUPPLY.minimum_quantity;
    if (qty <= 0)         return { status: 'out',     color: '#EF4444', label: 'Out of Stock'  };
    if (qty <= min)       return { status: 'low',     color: '#F59E0B', label: 'Low Stock'     };
    if (qty <= min * 1.5) return { status: 'warning', color: '#F59E0B', label: 'Getting Low'   };
    return                       { status: 'good',    color: '#10B981', label: 'In Stock'      };
  }, [currentQty]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleTransaction = useCallback(() => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    if (transactionType === 'remove' && qty > currentQty) {
      Alert.alert('Insufficient Stock', 'Cannot remove more than available quantity.');
      return;
    }

    const newTransaction: InventoryTransaction = {
      id: Date.now().toString(),
      type: transactionType,
      quantity: qty,
      reason: reason || (transactionType === 'add' ? 'Stock added' : transactionType === 'remove' ? 'Stock removed' : 'Inventory adjusted'),
      location: selectedLocation,
      timestamp: new Date(),
      user: user?.displayName || 'Unknown',
    };

    setTransactions(prev => [newTransaction, ...prev]);

    let newQty = currentQty;
    if (transactionType === 'add')    newQty += qty;
    else if (transactionType === 'remove') newQty -= qty;
    else newQty = qty;
    setCurrentQty(newQty);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Transaction Recorded',
      `${transactionType === 'add' ? 'Added' : transactionType === 'remove' ? 'Removed' : 'Adjusted to'} ${qty} cases. New total: ${newQty} cases.`
    );

    setShowTransactionModal(false);
    setQuantity('');
    setReason('');
  }, [quantity, transactionType, selectedLocation, reason, currentQty, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#14B8A620' }]}>
            <Package size={28} color="#14B8A6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Toilet Paper Inventory</Text>
          <Text style={[styles.itemCode, { color: colors.textSecondary }]}>Item Code: {DEFAULT_SUPPLY.item_code}</Text>
        </View>

        <View style={[styles.stockCard, { backgroundColor: colors.surface, borderColor: inventoryStatus.color }]}>
          <View style={styles.stockHeader}>
            <View style={[styles.statusBadge, { backgroundColor: inventoryStatus.color + '20' }]}>
              {inventoryStatus.status === 'good'
                ? <CheckCircle2 size={16} color={inventoryStatus.color} />
                : <AlertTriangle size={16} color={inventoryStatus.color} />}
              <Text style={[styles.statusText, { color: inventoryStatus.color }]}>{inventoryStatus.label}</Text>
            </View>
          </View>

          <View style={styles.stockMain}>
            <Text style={[styles.stockQty, { color: colors.text }]}>{currentQty}</Text>
            <Text style={[styles.stockUnit, { color: colors.textSecondary }]}>{DEFAULT_SUPPLY.unit_of_measure}s on hand</Text>
          </View>

          <View style={styles.stockDetails}>
            {[
              { label: 'Min Level:',   value: `${DEFAULT_SUPPLY.minimum_quantity} ${DEFAULT_SUPPLY.unit_of_measure}s` },
              { label: 'Reorder Qty:', value: `${DEFAULT_SUPPLY.reorder_quantity} ${DEFAULT_SUPPLY.unit_of_measure}s` },
              { label: 'Unit Cost:',   value: `$${DEFAULT_SUPPLY.unit_cost.toFixed(2)}` },
              { label: 'Location:',    value: DEFAULT_SUPPLY.location },
            ].map(row => (
              <View key={row.label} style={styles.stockDetailRow}>
                <Text style={[styles.stockDetailLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.stockDetailValue, { color: colors.text }]}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.stockProgress}>
            <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={[styles.progressFill, {
                width: `${Math.min((currentQty / DEFAULT_SUPPLY.reorder_quantity) * 100, 100)}%`,
                backgroundColor: inventoryStatus.color,
              }]} />
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          {([
            { type: 'add' as const,    color: '#10B981', icon: <Plus size={20} color="#FFF" />,      label: 'Add Stock' },
            { type: 'remove' as const, color: '#F59E0B', icon: <Minus size={20} color="#FFF" />,     label: 'Remove'    },
            { type: 'adjust' as const, color: '#3B82F6', icon: <RotateCcw size={20} color="#FFF" />, label: 'Adjust'    },
          ]).map(btn => (
            <Pressable key={btn.type} style={[styles.actionBtn, { backgroundColor: btn.color }]}
              onPress={() => { setTransactionType(btn.type); setShowTransactionModal(true); }}>
              {btn.icon}
              <Text style={styles.actionBtnText}>{btn.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.historySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.historyHeader}>
            <History size={18} color={colors.text} />
            <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Transactions</Text>
          </View>
          {transactions.map((tx) => (
            <View key={tx.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={styles.txIcon}>
                {tx.type === 'add'    ? <TrendingUp size={18} color="#10B981" />   :
                 tx.type === 'remove' ? <TrendingDown size={18} color="#F59E0B" /> :
                                        <RotateCcw size={18} color="#3B82F6" />}
              </View>
              <View style={styles.txDetails}>
                <Text style={[styles.txReason, { color: colors.text }]}>{tx.reason}</Text>
                <View style={styles.txMeta}>
                  <MapPin size={12} color={colors.textTertiary} />
                  <Text style={[styles.txMetaText, { color: colors.textSecondary }]}>{tx.location}</Text>
                </View>
                <Text style={[styles.txTime, { color: colors.textTertiary }]}>
                  {tx.timestamp.toLocaleDateString()} at {tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.user}
                </Text>
              </View>
              <View style={[styles.txQty, { backgroundColor: tx.type === 'add' ? '#10B98115' : tx.type === 'remove' ? '#F59E0B15' : '#3B82F615' }]}>
                <Text style={[styles.txQtyText, { color: tx.type === 'add' ? '#10B981' : tx.type === 'remove' ? '#F59E0B' : '#3B82F6' }]}>
                  {tx.type === 'add' ? '+' : tx.type === 'remove' ? '-' : '='}{tx.quantity}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showTransactionModal} animationType="slide" transparent onRequestClose={() => setShowTransactionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {transactionType === 'add' ? 'Add Stock' : transactionType === 'remove' ? 'Remove Stock' : 'Adjust Inventory'}
              </Text>
              <Pressable onPress={() => setShowTransactionModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>{transactionType === 'adjust' ? 'New Quantity' : 'Quantity'} (cases) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textTertiary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
            <Pressable
              style={[styles.locationBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => setShowLocationPicker(!showLocationPicker)}
            >
              <Text style={[styles.locationBtnText, { color: colors.text }]}>{selectedLocation}</Text>
            </Pressable>
            {showLocationPicker && (
              <View style={[styles.locationList, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                {LOCATIONS.map((loc) => (
                  <Pressable key={loc} style={[styles.locationOption, { borderBottomColor: colors.border }]}
                    onPress={() => { setSelectedLocation(loc); setShowLocationPicker(false); }}>
                    <Text style={[styles.locationOptionText, { color: selectedLocation === loc ? '#14B8A6' : colors.text }]}>{loc}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>Reason / Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter reason for this transaction"
              placeholderTextColor={colors.textTertiary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            <Pressable
              style={[styles.submitBtn, { backgroundColor: transactionType === 'add' ? '#10B981' : transactionType === 'remove' ? '#F59E0B' : '#3B82F6' }]}
              onPress={handleTransaction}
            >
              <Save size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Record Transaction</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  headerCard: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  itemCode: { fontSize: 13 },
  stockCard: { borderRadius: 16, padding: 20, borderWidth: 2, marginBottom: 16 },
  stockHeader: { marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 13, fontWeight: '600' },
  stockMain: { alignItems: 'center', marginBottom: 20 },
  stockQty: { fontSize: 48, fontWeight: '700' },
  stockUnit: { fontSize: 14 },
  stockDetails: { gap: 8, marginBottom: 16 },
  stockDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stockDetailLabel: { fontSize: 13 },
  stockDetailValue: { fontSize: 13, fontWeight: '600' },
  stockProgress: { marginTop: 8 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  historySection: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  historyTitle: { fontSize: 16, fontWeight: '600' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txReason: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  txMetaText: { fontSize: 12 },
  txTime: { fontSize: 11 },
  txQty: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  txQtyText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  locationBtn: { borderRadius: 10, padding: 14, borderWidth: 1, marginBottom: 8 },
  locationBtnText: { fontSize: 15 },
  locationList: { borderRadius: 10, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  locationOption: { padding: 12, borderBottomWidth: 1 },
  locationOptionText: { fontSize: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  bottomPadding: { height: 40 },
});
