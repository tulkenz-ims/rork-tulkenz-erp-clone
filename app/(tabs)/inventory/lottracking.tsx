import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Plus,
  Filter,
  X,
  ChevronRight,
  Package,
  Calendar,
  AlertTriangle,
  Clock,
  MapPin,
  PauseCircle,
  PlayCircle,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Database,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import {
  useLotsQuery,
  useCreateLot,
  useHoldLot,
  useReleaseLot,
  useLotTransactionsQuery,
  InventoryLot,
  LotStatus,
  TransactionType,
} from '@/hooks/useSupabaseLots';
import { useProcurementVendorsQuery } from '@/hooks/useSupabaseProcurement';
import { getDepartmentFromMaterialNumber } from '@/constants/inventoryDepartmentCodes';
import * as Haptics from 'expo-haptics';

type SortField = 'received_date' | 'expiration_date' | 'quantity_remaining' | 'internal_lot_number';

const getExpirationStatus = (expirationDate: string) => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    return { status: 'expired', label: 'Expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
  } else if (daysUntilExpiration <= 7) {
    return { status: 'critical', label: `${daysUntilExpiration}d left`, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
  } else if (daysUntilExpiration <= 30) {
    return { status: 'expiring_soon', label: `${daysUntilExpiration}d left`, color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
  } else if (daysUntilExpiration <= 90) {
    return { status: 'warning', label: `${daysUntilExpiration}d left`, color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
  }
  return { status: 'good', label: `${daysUntilExpiration}d left`, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
};

const getLotStatusInfo = (status: LotStatus) => {
  switch (status) {
    case 'active':
      return { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
    case 'on_hold':
      return { label: 'On Hold', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
    case 'expired':
      return { label: 'Expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    case 'consumed':
      return { label: 'Consumed', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' };
    case 'disposed':
      return { label: 'Disposed', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' };
    default:
      return { label: status, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' };
  }
};

const getTransactionTypeInfo = (type: TransactionType) => {
  switch (type) {
    case 'received':
      return { label: 'Received', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
    case 'issued':
      return { label: 'Issued', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
    case 'adjusted':
      return { label: 'Adjusted', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' };
    case 'transferred':
      return { label: 'Transferred', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
    case 'disposed':
      return { label: 'Disposed', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    case 'hold':
      return { label: 'Put on Hold', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
    case 'release':
      return { label: 'Released', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
    default:
      return { label: type, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' };
  }
};

const generateNewLotNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${year}${month}${day}-${seq}`;
};

export default function LotTrackingScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LotStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('received_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    materialId: '',
    vendorLotNumber: '',
    vendorId: '',
    vendorName: '',
    poNumber: '',
    quantityReceived: 0,
    unitOfMeasure: 'each',
    receivedDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    bestByDate: '',
    storageLocation: '',
    notes: '',
    materialName: '',
    materialSku: '',
  });

  const lotsQuery = useLotsQuery({
    status: selectedStatus === 'all' ? undefined : selectedStatus,
  });

  const materialsQuery = useMaterialsQuery({ limit: 50 });

  const vendorsQuery = useProcurementVendorsQuery({ activeOnly: true, limit: 20 });
  const vendors = vendorsQuery.data || [];

  const transactionsQuery = useLotTransactionsQuery({
    lotId: selectedLotId || undefined,
    enabled: !!selectedLotId && !isCreating,
  });

  const createLotMutation = useCreateLot({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowLotModal(false);
      resetForm();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const holdLotMutation = useHoldLot({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLotModal(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const releaseLotMutation = useReleaseLot({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowLotModal(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const lots = useMemo(() => lotsQuery.data || [], [lotsQuery.data]);
  const materials = materialsQuery.data || [];
  const transactions = transactionsQuery.data || [];
  const selectedLot = selectedLotId ? lots.find(l => l.id === selectedLotId) : null;

  const filteredLots = useMemo(() => {
    let result = [...lots];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        l =>
          l.internal_lot_number.toLowerCase().includes(query) ||
          l.vendor_lot_number.toLowerCase().includes(query) ||
          l.material_name.toLowerCase().includes(query) ||
          l.material_sku.toLowerCase().includes(query) ||
          (l.vendor_name || '').toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'received_date':
          comparison = a.received_date.localeCompare(b.received_date);
          break;
        case 'expiration_date':
          comparison = (a.expiration_date || '9999').localeCompare(b.expiration_date || '9999');
          break;
        case 'quantity_remaining':
          comparison = a.quantity_remaining - b.quantity_remaining;
          break;
        case 'internal_lot_number':
          comparison = a.internal_lot_number.localeCompare(b.internal_lot_number);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [lots, searchQuery, sortField, sortAsc]);

  const stats = useMemo(() => {
    const active = lots.filter(l => l.status === 'active').length;
    const onHold = lots.filter(l => l.status === 'on_hold').length;
    const expired = lots.filter(l => l.status === 'expired').length;
    const expiringSoon = lots.filter(l => {
      if (!l.expiration_date || l.status !== 'active') return false;
      const status = getExpirationStatus(l.expiration_date);
      return status.status === 'expiring_soon' || status.status === 'warning';
    }).length;
    return { total: lots.length, active, onHold, expired, expiringSoon };
  }, [lots]);

  const resetForm = useCallback(() => {
    setFormData({
      materialId: '',
      vendorLotNumber: '',
      vendorId: '',
      vendorName: '',
      poNumber: '',
      quantityReceived: 0,
      unitOfMeasure: 'each',
      receivedDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      bestByDate: '',
      storageLocation: '',
      notes: '',
      materialName: '',
      materialSku: '',
    });
  }, []);

  const onRefresh = useCallback(() => {
    lotsQuery.refetch();
  }, [lotsQuery]);

  const handleAddLot = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setSelectedLotId(null);
    setIsCreating(true);
    setShowLotModal(true);
  }, [resetForm]);

  const handleViewLot = useCallback((lot: InventoryLot) => {
    Haptics.selectionAsync();
    setSelectedLotId(lot.id);
    setIsCreating(false);
    setShowLotModal(true);
  }, []);

  const handleHoldLot = useCallback((lot: InventoryLot) => {
    Alert.prompt(
      'Put Lot on Hold',
      'Enter reason for hold:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: (reason: string | undefined) => {
            holdLotMutation.mutate({
              lotId: lot.id,
              holdReason: reason || 'No reason provided',
              holdBy: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
            });
          },
        },
      ],
      'plain-text'
    );
  }, [holdLotMutation, user]);

  const handleReleaseLot = useCallback((lot: InventoryLot) => {
    Alert.alert(
      'Release Lot',
      'Are you sure you want to release this lot from hold?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          onPress: () => {
            releaseLotMutation.mutate({
              lotId: lot.id,
              releasedBy: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
              notes: 'Released from hold',
            });
          },
        },
      ]
    );
  }, [releaseLotMutation, user]);

  const handleDisposeLot = useCallback((lot: InventoryLot) => {
    Alert.alert(
      'Dispose Lot',
      `Are you sure you want to dispose of lot ${lot.internal_lot_number}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispose',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Dispose functionality coming soon');
          },
        },
      ]
    );
  }, []);

  const handleSaveLot = useCallback(() => {
    if (!formData.materialId) {
      Alert.alert('Error', 'Please select an item');
      return;
    }
    if (!formData.vendorLotNumber.trim()) {
      Alert.alert('Error', 'Vendor lot number is required');
      return;
    }
    if (formData.quantityReceived <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }

    createLotMutation.mutate({
      material_id: formData.materialId,
      material_name: formData.materialName,
      material_sku: formData.materialSku,
      internal_lot_number: generateNewLotNumber(),
      vendor_lot_number: formData.vendorLotNumber,
      vendor_id: formData.vendorId || undefined,
      vendor_name: formData.vendorName || undefined,
      po_number: formData.poNumber || undefined,
      quantity_received: formData.quantityReceived,
      quantity_remaining: formData.quantityReceived,
      unit_of_measure: formData.unitOfMeasure,
      received_date: formData.receivedDate,
      expiration_date: formData.expirationDate || undefined,
      best_by_date: formData.bestByDate || undefined,
      storage_location: formData.storageLocation || undefined,
      status: 'active',
      notes: formData.notes || undefined,
      created_by: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
    });
  }, [formData, createLotMutation, user]);

  const clearFilters = useCallback(() => {
    setSelectedStatus('all');
    setShowFilterModal(false);
  }, []);

  const renderLotCard = useCallback((lot: InventoryLot) => {
    const dept = getDepartmentFromMaterialNumber(lot.material_sku);
    const statusInfo = getLotStatusInfo(lot.status);
    const expInfo = lot.expiration_date ? getExpirationStatus(lot.expiration_date) : null;

    return (
      <Pressable
        key={lot.id}
        style={[styles.lotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewLot(lot)}
      >
        <View style={styles.lotHeader}>
          <View style={styles.lotTitleRow}>
            <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary }]}>
              <Text style={styles.deptBadgeText}>{dept?.shortName || 'INV'}</Text>
            </View>
            <Text style={[styles.lotNumber, { color: colors.text }]}>
              {lot.internal_lot_number}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {lot.material_name}
        </Text>
        <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
          {lot.material_sku} • Vendor: {lot.vendor_lot_number}
        </Text>

        <View style={styles.lotStats}>
          <View style={styles.lotStat}>
            <Package size={14} color={colors.textTertiary} />
            <Text style={[styles.lotStatText, { color: colors.text }]}>
              {lot.quantity_remaining} / {lot.quantity_received} {lot.unit_of_measure}
            </Text>
          </View>
          {lot.expiration_date && expInfo && (
            <View style={[styles.expBadge, { backgroundColor: expInfo.bgColor }]}>
              <Calendar size={12} color={expInfo.color} />
              <Text style={[styles.expBadgeText, { color: expInfo.color }]}>
                {expInfo.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.lotFooter}>
          <View style={styles.lotStat}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={[styles.lotStatSmall, { color: colors.textTertiary }]}>
              Received {lot.received_date}
            </Text>
          </View>
          {lot.storage_location && (
            <View style={styles.lotStat}>
              <MapPin size={12} color={colors.textTertiary} />
              <Text style={[styles.lotStatSmall, { color: colors.textTertiary }]}>
                {lot.storage_location}
              </Text>
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.lotChevron} />
      </Pressable>
    );
  }, [colors, handleViewLot]);

  const renderLotModal = () => {
    if (!showLotModal) return null;

    const statusInfo = selectedLot ? getLotStatusInfo(selectedLot.status) : null;
    const expInfo = selectedLot?.expiration_date ? getExpirationStatus(selectedLot.expiration_date) : null;
    const dept = selectedLot ? getDepartmentFromMaterialNumber(selectedLot.material_sku) : null;

    return (
      <Modal
        visible={showLotModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLotModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowLotModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isCreating ? 'Receive New Lot' : 'Lot Details'}
            </Text>
            {isCreating && (
              <Pressable 
                onPress={handleSaveLot} 
                style={styles.modalActionBtn}
                disabled={createLotMutation.isPending}
              >
                {createLotMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
                )}
              </Pressable>
            )}
            {!isCreating && <View style={{ width: 40 }} />}
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {isCreating ? (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Item Selection</Text>
                  
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Item *</Text>
                  {materialsQuery.isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                  ) : (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={styles.itemSelector}
                    >
                      {materials.slice(0, 15).map(item => (
                        <Pressable
                          key={item.id}
                          style={[
                            styles.itemOption,
                            { 
                              backgroundColor: formData.materialId === item.id ? colors.primary : colors.backgroundSecondary,
                              borderColor: formData.materialId === item.id ? colors.primary : colors.border,
                            }
                          ]}
                          onPress={() => setFormData(prev => ({ 
                            ...prev, 
                            materialId: item.id,
                            materialName: item.name,
                            materialSku: item.sku,
                            unitOfMeasure: item.unit_of_measure || 'each',
                          }))}
                        >
                          <Text style={[
                            styles.itemOptionNumber,
                            { color: formData.materialId === item.id ? '#FFFFFF' : colors.textSecondary }
                          ]}>
                            {item.sku}
                          </Text>
                          <Text 
                            style={[
                              styles.itemOptionName,
                              { color: formData.materialId === item.id ? '#FFFFFF' : colors.text }
                            ]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Lot Information</Text>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vendor Lot Number *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.vendorLotNumber}
                    onChangeText={text => setFormData(prev => ({ ...prev, vendorLotNumber: text }))}
                    placeholder="From supplier label"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                        value={formData.quantityReceived > 0 ? formData.quantityReceived.toString() : ''}
                        onChangeText={text => setFormData(prev => ({ ...prev, quantityReceived: parseInt(text) || 0 }))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>UOM</Text>
                      <View style={[styles.inputDisabled, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <Text style={[styles.inputDisabledText, { color: colors.textTertiary }]}>
                          {formData.unitOfMeasure}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vendor</Text>
                  {vendorsQuery.isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                  ) : vendors.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vendorSelector}>
                      {vendors.map(v => (
                        <Pressable
                          key={v.id}
                          style={[
                            styles.vendorOption,
                            { 
                              backgroundColor: formData.vendorId === v.id ? colors.primary : colors.backgroundSecondary,
                              borderColor: formData.vendorId === v.id ? colors.primary : colors.border,
                            }
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, vendorId: v.id, vendorName: v.name }))}
                        >
                          <Text style={[
                            styles.vendorOptionText,
                            { color: formData.vendorId === v.id ? '#FFFFFF' : colors.text }
                          ]}>
                            {v.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : (
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                      value={formData.vendorName}
                      onChangeText={text => setFormData(prev => ({ ...prev, vendorName: text, vendorId: '' }))}
                      placeholder="Enter vendor name"
                      placeholderTextColor={colors.textTertiary}
                    />
                  )}

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PO Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.poNumber}
                    onChangeText={text => setFormData(prev => ({ ...prev, poNumber: text }))}
                    placeholder="PO-2025-XXXX"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>Dates & Location</Text>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Received Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.receivedDate}
                    onChangeText={text => setFormData(prev => ({ ...prev, receivedDate: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Expiration Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.expirationDate}
                    onChangeText={text => setFormData(prev => ({ ...prev, expirationDate: text }))}
                    placeholder="YYYY-MM-DD (optional)"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Storage Location</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.storageLocation}
                    onChangeText={text => setFormData(prev => ({ ...prev, storageLocation: text }))}
                    placeholder="e.g., PROD-01-01"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={formData.notes}
                    onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
                    placeholder="Additional notes..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            ) : selectedLot && (
              <>
                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <View style={styles.detailHeader}>
                    <View style={[styles.deptBadgeLarge, { backgroundColor: dept?.color || colors.primary }]}>
                      <Text style={styles.deptBadgeLargeText}>{dept?.shortName || 'INV'}</Text>
                    </View>
                    <View style={styles.detailHeaderInfo}>
                      <Text style={[styles.detailLotNumber, { color: colors.text }]}>
                        {selectedLot.internal_lot_number}
                      </Text>
                      <Text style={[styles.detailItemName, { color: colors.textSecondary }]}>
                        {selectedLot.material_name}
                      </Text>
                    </View>
                    {statusInfo && (
                      <View style={[styles.statusBadgeLarge, { backgroundColor: statusInfo.bgColor }]}>
                        <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {selectedLot.status === 'on_hold' && selectedLot.hold_reason && (
                    <View style={[styles.holdBanner, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <AlertTriangle size={16} color="#F59E0B" />
                      <View style={styles.holdBannerText}>
                        <Text style={[styles.holdReasonTitle, { color: '#F59E0B' }]}>On Hold</Text>
                        <Text style={[styles.holdReason, { color: colors.textSecondary }]}>
                          {selectedLot.hold_reason}
                        </Text>
                        <Text style={[styles.holdMeta, { color: colors.textTertiary }]}>
                          By {selectedLot.hold_by} on {selectedLot.hold_date?.split('T')[0]}
                        </Text>
                      </View>
                    </View>
                  )}

                  {expInfo && selectedLot.expiration_date && (
                    <View style={[styles.expBanner, { backgroundColor: expInfo.bgColor }]}>
                      <Calendar size={16} color={expInfo.color} />
                      <Text style={[styles.expBannerText, { color: expInfo.color }]}>
                        {expInfo.label} • Expires {selectedLot.expiration_date}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Quantity</Text>
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityBlock}>
                      <Text style={[styles.quantityValue, { color: colors.text }]}>
                        {selectedLot.quantity_remaining}
                      </Text>
                      <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>Remaining</Text>
                    </View>
                    <View style={[styles.quantityDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.quantityBlock}>
                      <Text style={[styles.quantityValue, { color: colors.textSecondary }]}>
                        {selectedLot.quantity_received}
                      </Text>
                      <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>Received</Text>
                    </View>
                    <View style={[styles.quantityDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.quantityBlock}>
                      <Text style={[styles.quantityValue, { color: colors.textSecondary }]}>
                        {selectedLot.quantity_received - selectedLot.quantity_remaining}
                      </Text>
                      <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>Used</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Material #</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLot.material_sku}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Vendor Lot</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLot.vendor_lot_number}</Text>
                  </View>
                  {selectedLot.vendor_name && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Vendor</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLot.vendor_name}</Text>
                    </View>
                  )}
                  {selectedLot.po_number && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>PO Number</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLot.po_number}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Received</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLot.received_date}</Text>
                  </View>
                  {selectedLot.storage_location && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLot.storage_location}</Text>
                    </View>
                  )}
                  {selectedLot.notes && (
                    <View style={styles.notesRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Notes</Text>
                      <Text style={[styles.notesText, { color: colors.textSecondary }]}>{selectedLot.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Transaction History</Text>
                  {transactionsQuery.isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
                  ) : transactions.length > 0 ? (
                    transactions.map(txn => {
                      const txnInfo = getTransactionTypeInfo(txn.transaction_type);
                      const TxnIcon = txn.transaction_type === 'received' ? ArrowDownCircle : ArrowUpCircle;
                      return (
                        <View key={txn.id} style={[styles.transactionRow, { borderBottomColor: colors.border }]}>
                          <View style={[styles.transactionIcon, { backgroundColor: txnInfo.bgColor }]}>
                            <TxnIcon size={16} color={txnInfo.color} />
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={[styles.transactionType, { color: txnInfo.color }]}>
                              {txnInfo.label} • {txn.quantity} {selectedLot.unit_of_measure}
                            </Text>
                            <Text style={[styles.transactionMeta, { color: colors.textTertiary }]}>
                              {new Date(txn.performed_at).toLocaleDateString()} by {txn.performed_by}
                            </Text>
                            {txn.notes && (
                              <Text style={[styles.transactionNotes, { color: colors.textSecondary }]}>
                                {txn.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyTransactions}>
                      <Database size={24} color={colors.textTertiary} />
                      <Text style={[styles.emptyTransactionsText, { color: colors.textTertiary }]}>
                        No transactions recorded
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {selectedLot.status === 'active' && (
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
                      onPress={() => handleHoldLot(selectedLot)}
                      disabled={holdLotMutation.isPending}
                    >
                      {holdLotMutation.isPending ? (
                        <ActivityIndicator size="small" color="#F59E0B" />
                      ) : (
                        <>
                          <PauseCircle size={18} color="#F59E0B" />
                          <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Put on Hold</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  {selectedLot.status === 'on_hold' && (
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                      onPress={() => handleReleaseLot(selectedLot)}
                      disabled={releaseLotMutation.isPending}
                    >
                      {releaseLotMutation.isPending ? (
                        <ActivityIndicator size="small" color="#10B981" />
                      ) : (
                        <>
                          <PlayCircle size={18} color="#10B981" />
                          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Release</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.errorBg }]}
                    onPress={() => handleDisposeLot(selectedLot)}
                  >
                    <Trash2 size={18} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Dispose</Text>
                  </Pressable>
                </View>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
          <Pressable onPress={clearFilters} style={styles.modalActionBtn}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Status</Text>
          <View style={styles.filterOptions}>
            {(['all', 'active', 'on_hold', 'expired', 'consumed', 'disposed'] as const).map(status => {
              const info = status === 'all' ? null : getLotStatusInfo(status);
              return (
                <Pressable
                  key={status}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedStatus === status 
                        ? (info?.color || colors.primary) 
                        : colors.surface,
                      borderColor: selectedStatus === status 
                        ? (info?.color || colors.primary) 
                        : colors.border,
                    }
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: selectedStatus === status ? '#FFFFFF' : colors.text }
                  ]}>
                    {status === 'all' ? 'All' : info?.label || status}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Sort By</Text>
          <View style={styles.filterOptions}>
            {[
              { field: 'received_date' as SortField, label: 'Received Date' },
              { field: 'expiration_date' as SortField, label: 'Expiration Date' },
              { field: 'quantity_remaining' as SortField, label: 'Quantity' },
              { field: 'internal_lot_number' as SortField, label: 'Lot Number' },
            ].map(({ field, label }) => (
              <Pressable
                key={field}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: sortField === field ? colors.primary : colors.surface,
                    borderColor: sortField === field ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  if (sortField === field) {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortField(field);
                    setSortAsc(false);
                  }
                }}
              >
                <Text style={[styles.filterOptionText, { color: sortField === field ? '#FFFFFF' : colors.text }]}>
                  {label} {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Pressable
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilterModal(false)}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </View>
    </Modal>
  );

  const activeFilterCount = selectedStatus !== 'all' ? 1 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Lots</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.expiringSoon}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Expiring</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.onHold}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>On Hold</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search lots..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: activeFilterCount > 0 ? colors.primary : colors.border }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={activeFilterCount > 0 ? colors.primary : colors.textTertiary} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddLot}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={lotsQuery.isRefetching} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
      >
        {lotsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading lots...</Text>
          </View>
        ) : lotsQuery.isError ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={32} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>Failed to load lots</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => lotsQuery.refetch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {filteredLots.length} lots found
            </Text>

            {filteredLots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Package size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No lots found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                  {searchQuery ? 'Try adjusting your search' : 'Receive your first lot to get started'}
                </Text>
              </View>
            ) : (
              filteredLots.map(renderLotCard)
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {renderLotModal()}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' as const },
  statLabel: { fontSize: 10, marginTop: 2 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  filterButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  filterBadge: { position: 'absolute' as const, top: -4, right: -4, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' as const },
  addButton: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  resultCount: { fontSize: 13, marginBottom: 12 },
  lotCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10, position: 'relative' as const },
  lotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lotTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  deptBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF' },
  lotNumber: { fontSize: 13, fontWeight: '600' as const },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' as const },
  itemName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2, paddingRight: 24 },
  materialNumber: { fontSize: 12, marginBottom: 10 },
  lotStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  lotStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lotStatText: { fontSize: 13 },
  expBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  expBadgeText: { fontSize: 10, fontWeight: '600' as const },
  lotFooter: { flexDirection: 'row', gap: 16 },
  lotStatSmall: { fontSize: 11 },
  lotChevron: { position: 'absolute' as const, right: 14, top: '50%' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalActionBtn: { padding: 4, minWidth: 40 },
  saveText: { fontSize: 15, fontWeight: '600' as const },
  clearText: { fontSize: 15, fontWeight: '500' as const },
  modalContent: { flex: 1, padding: 16 },
  formSection: { borderRadius: 12, padding: 16, marginBottom: 12 },
  formSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 16 },
  inputLabel: { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' as const },
  inputDisabled: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  inputDisabledText: { fontSize: 15 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  itemSelector: { flexDirection: 'row', marginTop: 4 },
  itemOption: { width: 120, padding: 10, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  itemOptionNumber: { fontSize: 10, marginBottom: 2 },
  itemOptionName: { fontSize: 12, fontWeight: '500' as const },
  vendorSelector: { flexDirection: 'row', marginTop: 4 },
  vendorOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  vendorOptionText: { fontSize: 13, fontWeight: '500' as const },
  detailSection: { borderRadius: 12, padding: 16, marginBottom: 12 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deptBadgeLarge: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deptBadgeLargeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' as const },
  detailHeaderInfo: { flex: 1 },
  detailLotNumber: { fontSize: 17, fontWeight: '600' as const },
  detailItemName: { fontSize: 13 },
  statusBadgeLarge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  holdBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, marginTop: 12 },
  holdBannerText: { flex: 1 },
  holdReasonTitle: { fontSize: 13, fontWeight: '600' as const },
  holdReason: { fontSize: 13, marginTop: 2 },
  holdMeta: { fontSize: 11, marginTop: 4 },
  expBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginTop: 12 },
  expBannerText: { fontSize: 13, fontWeight: '500' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12 },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  quantityBlock: { flex: 1, alignItems: 'center' },
  quantityValue: { fontSize: 24, fontWeight: '700' as const },
  quantityLabel: { fontSize: 11, marginTop: 2 },
  quantityDivider: { width: 1, height: 40 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '500' as const },
  notesRow: { paddingVertical: 8 },
  notesText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  transactionRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  transactionIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  transactionType: { fontSize: 13, fontWeight: '600' as const },
  transactionMeta: { fontSize: 11, marginTop: 2 },
  transactionNotes: { fontSize: 12, marginTop: 4, fontStyle: 'italic' as const },
  emptyTransactions: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTransactionsText: { fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10 },
  actionButtonText: { fontSize: 14, fontWeight: '600' as const },
  filterSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterOptionText: { fontSize: 13, fontWeight: '500' as const },
  applyButton: { margin: 16, padding: 14, borderRadius: 10, alignItems: 'center' },
  applyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { fontSize: 14, marginTop: 12 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' as const },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' as const },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
});
