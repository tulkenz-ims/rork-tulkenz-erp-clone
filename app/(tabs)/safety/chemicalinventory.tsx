import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Package,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  X,
  MapPin,
  Calendar,
  Scale,
  Trash2,
  BarChart3,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ChemicalInventoryEntry {
  id: string;
  chemical_name: string;
  manufacturer: string;
  product_code: string;
  cas_number: string;
  storage_location: string;
  container_size: string;
  quantity: number;
  unit: string;
  hazard_class: string[];
  storage_requirements: string[];
  date_received: string;
  expiration_date: string;
  lot_number: string;
  minimum_stock: number;
  max_stock: number;
  status: 'adequate' | 'low' | 'critical' | 'expired';
  created_at?: string;
  updated_at?: string;
}

const STORAGE_LOCATIONS = [
  'Chemical Storage Room A',
  'Chemical Storage Room B',
  'Maintenance Shop',
  'Sanitation Closet',
  'Quality Lab',
  'Refrigeration Room',
  'Flammable Cabinet',
  'Acid Cabinet',
];

const HAZARD_CLASSES = [
  'Flammable',
  'Corrosive',
  'Toxic',
  'Oxidizer',
  'Irritant',
  'Compressed Gas',
  'Environmental Hazard',
];

const STORAGE_REQUIREMENTS = [
  'Cool',
  'Refrigerated',
  'Ventilated',
  'Dry',
  'Away from acids',
  'Away from organics',
  'Secondary containment',
  'Flammable cabinet',
];

const UNITS = ['gallons', 'pails', 'drums', 'liters', 'kg', 'lbs', 'cases', 'bottles'];

export default function ChemicalInventoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<ChemicalInventoryEntry | null>(null);

  const [formData, setFormData] = useState({
    chemicalName: '',
    manufacturer: '',
    productCode: '',
    casNumber: '',
    storageLocation: '',
    containerSize: '',
    quantity: '',
    unit: 'gallons',
    hazardClass: [] as string[],
    storageRequirements: [] as string[],
    dateReceived: new Date().toISOString().split('T')[0],
    expirationDate: '',
    lotNumber: '',
    minimumStock: '',
    maxStock: '',
  });

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ['chemical-inventory'],
    queryFn: async () => {
      console.log('Fetching chemical inventory...');
      try {
        const { data, error } = await supabase
          .from('chemical_inventory')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Chemical inventory table may not exist, using empty data:', error.message);
          return [];
        }
        console.log('Fetched chemical inventory:', data?.length);
        return data as ChemicalInventoryEntry[];
      } catch (err) {
        console.warn('Chemical inventory query failed, using empty data:', err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: Omit<ChemicalInventoryEntry, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating chemical inventory entry:', entry);
      const { data, error } = await supabase
        .from('chemical_inventory')
        .insert([entry])
        .select()
        .single();

      if (error) {
        console.error('Error creating entry:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-inventory'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<ChemicalInventoryEntry> & { id: string }) => {
      console.log('Updating chemical inventory entry:', id);
      const { data, error } = await supabase
        .from('chemical_inventory')
        .update(entry)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating entry:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-inventory'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting chemical inventory entry:', id);
      const { error } = await supabase
        .from('chemical_inventory')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting entry:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-inventory'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      chemicalName: '',
      manufacturer: '',
      productCode: '',
      casNumber: '',
      storageLocation: '',
      containerSize: '',
      quantity: '',
      unit: 'gallons',
      hazardClass: [],
      storageRequirements: [],
      dateReceived: new Date().toISOString().split('T')[0],
      expirationDate: '',
      lotNumber: '',
      minimumStock: '',
      maxStock: '',
    });
    setEditingEntry(null);
  };

  const calculateStatus = (qty: number, min: number, expDate: string): 'adequate' | 'low' | 'critical' | 'expired' => {
    if (expDate && new Date(expDate) < new Date()) return 'expired';
    if (qty <= min * 0.5) return 'critical';
    if (qty <= min) return 'low';
    return 'adequate';
  };

  const handleAddEntry = () => {
    if (!formData.chemicalName.trim() || !formData.storageLocation) {
      Alert.alert('Required Fields', 'Please enter chemical name and storage location.');
      return;
    }

    const qty = parseInt(formData.quantity) || 0;
    const min = parseInt(formData.minimumStock) || 0;
    const max = parseInt(formData.maxStock) || 0;

    const entryData = {
      chemical_name: formData.chemicalName,
      manufacturer: formData.manufacturer,
      product_code: formData.productCode,
      cas_number: formData.casNumber,
      storage_location: formData.storageLocation,
      container_size: formData.containerSize,
      quantity: qty,
      unit: formData.unit,
      hazard_class: formData.hazardClass,
      storage_requirements: formData.storageRequirements,
      date_received: formData.dateReceived,
      expiration_date: formData.expirationDate,
      lot_number: formData.lotNumber,
      minimum_stock: min,
      max_stock: max,
      status: calculateStatus(qty, min, formData.expirationDate),
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...entryData });
    } else {
      createMutation.mutate(entryData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditEntry = (entry: ChemicalInventoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      chemicalName: entry.chemical_name,
      manufacturer: entry.manufacturer,
      productCode: entry.product_code,
      casNumber: entry.cas_number,
      storageLocation: entry.storage_location,
      containerSize: entry.container_size,
      quantity: entry.quantity.toString(),
      unit: entry.unit,
      hazardClass: entry.hazard_class || [],
      storageRequirements: entry.storage_requirements || [],
      dateReceived: entry.date_received,
      expirationDate: entry.expiration_date,
      lotNumber: entry.lot_number,
      minimumStock: entry.minimum_stock.toString(),
      maxStock: entry.max_stock.toString(),
    });
    setShowAddModal(true);
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      'Delete Inventory Item',
      'Are you sure you want to remove this item from inventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  const toggleHazardClass = (hazard: string) => {
    setFormData(prev => ({
      ...prev,
      hazardClass: prev.hazardClass.includes(hazard)
        ? prev.hazardClass.filter(h => h !== hazard)
        : [...prev.hazardClass, hazard],
    }));
  };

  const toggleStorageReq = (req: string) => {
    setFormData(prev => ({
      ...prev,
      storageRequirements: prev.storageRequirements.includes(req)
        ? prev.storageRequirements.filter(r => r !== req)
        : [...prev.storageRequirements, req],
    }));
  };

  const filteredInventory = inventory.filter(entry => {
    const matchesSearch = entry.chemical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.product_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || entry.status === filterStatus;
    const matchesLocation = !filterLocation || entry.storage_location === filterLocation;
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'adequate': return '#10B981';
      case 'low': return '#F59E0B';
      case 'critical': return '#EF4444';
      case 'expired': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'adequate': return 'Adequate';
      case 'low': return 'Low Stock';
      case 'critical': return 'Critical';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Chemical Inventory',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search chemicals..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterModal(true);
          }}
          style={[styles.filterButton, { backgroundColor: (filterStatus || filterLocation) ? '#8B5CF620' : colors.card }]}
        >
          <Filter size={18} color={(filterStatus || filterLocation) ? '#8B5CF6' : colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{inventory.filter(e => e.status === 'adequate').length}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Adequate</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{inventory.filter(e => e.status === 'low').length}</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Low</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{inventory.filter(e => e.status === 'critical' || e.status === 'expired').length}</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Critical</Text>
          </View>
        </View>

        {isLoading && inventory.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading inventory...</Text>
          </View>
        ) : filteredInventory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No inventory items found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to add a chemical</Text>
          </View>
        ) : (
          filteredInventory.map((entry) => (
            <Pressable
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleEditEntry(entry)}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleRow}>
                  <Package size={20} color="#8B5CF6" />
                  <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
                    {entry.chemical_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                    {getStatusLabel(entry.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.entryDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Code:</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>{entry.product_code}</Text>
                  {entry.cas_number && (
                    <>
                      <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CAS:</Text>
                      <Text style={[styles.detailText, { color: colors.text }]}>{entry.cas_number}</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.quantityRow}>
                <View style={styles.quantityInfo}>
                  <Scale size={14} color={colors.textSecondary} />
                  <Text style={[styles.quantityText, { color: colors.text }]}>
                    {entry.quantity} {entry.unit}
                  </Text>
                  <Text style={[styles.containerText, { color: colors.textSecondary }]}>
                    ({entry.container_size})
                  </Text>
                </View>
                <View style={styles.stockIndicator}>
                  <BarChart3 size={14} color={getStatusColor(entry.status)} />
                  <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                    Min: {entry.minimum_stock} / Max: {entry.max_stock}
                  </Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {entry.storage_location}
                </Text>
              </View>

              <View style={styles.hazardRow}>
                {(entry.hazard_class || []).slice(0, 3).map((hazard, idx) => (
                  <View key={idx} style={[styles.hazardBadge, { backgroundColor: '#EF444415' }]}>
                    <Text style={[styles.hazardText, { color: '#EF4444' }]}>{hazard}</Text>
                  </View>
                ))}
                {(entry.hazard_class || []).length > 3 && (
                  <Text style={[styles.moreHazards, { color: colors.textSecondary }]}>
                    +{entry.hazard_class.length - 3}
                  </Text>
                )}
              </View>

              <View style={styles.entryFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Exp: {entry.expiration_date}
                  </Text>
                </View>
                <View style={styles.entryActions}>
                  <Pressable
                    onPress={() => handleDeleteEntry(entry.id)}
                    style={[styles.actionButton, { backgroundColor: '#EF444415' }]}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#8B5CF6' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowAddModal(true);
        }}
        disabled={isMutating}
      >
        {isMutating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Plus size={24} color="#FFFFFF" />
        )}
      </Pressable>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingEntry ? 'Edit Inventory' : 'Add Chemical'}
            </Text>
            <Pressable onPress={handleAddEntry} disabled={isMutating}>
              {isMutating ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Text style={[styles.saveButton, { color: '#8B5CF6' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Chemical Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter chemical name"
              placeholderTextColor={colors.textSecondary}
              value={formData.chemicalName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, chemicalName: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Manufacturer</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Manufacturer"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.manufacturer}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, manufacturer: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Product Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Code"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.productCode}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, productCode: text }))}
                />
              </View>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>CAS Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="CAS #"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.casNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, casNumber: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Lot Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Lot #"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.lotNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lotNumber: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Storage Location *</Text>
            <View style={styles.chipContainer}>
              {STORAGE_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.storageLocation === loc ? '#8B5CF620' : colors.surface,
                      borderColor: formData.storageLocation === loc ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, storageLocation: loc }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.storageLocation === loc ? '#8B5CF6' : colors.textSecondary },
                  ]}>
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Container Size</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., 55 gallon drum, 5 gallon pail"
              placeholderTextColor={colors.textSecondary}
              value={formData.containerSize}
              onChangeText={(text) => setFormData(prev => ({ ...prev, containerSize: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Qty"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Unit</Text>
                <View style={styles.unitRow}>
                  {UNITS.slice(0, 4).map((unit) => (
                    <Pressable
                      key={unit}
                      style={[
                        styles.unitChip,
                        {
                          backgroundColor: formData.unit === unit ? '#8B5CF620' : colors.surface,
                          borderColor: formData.unit === unit ? '#8B5CF6' : colors.border,
                        },
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, unit }))}
                    >
                      <Text style={[
                        styles.unitText,
                        { color: formData.unit === unit ? '#8B5CF6' : colors.textSecondary },
                      ]}>
                        {unit}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Min Stock</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Min"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.minimumStock}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, minimumStock: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Max Stock</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Max"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.maxStock}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, maxStock: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Date Received</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.dateReceived}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, dateReceived: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Expiration Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.expirationDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, expirationDate: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Classes</Text>
            <View style={styles.chipContainer}>
              {HAZARD_CLASSES.map((hazard) => (
                <Pressable
                  key={hazard}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.hazardClass.includes(hazard) ? '#EF444420' : colors.surface,
                      borderColor: formData.hazardClass.includes(hazard) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleHazardClass(hazard)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.hazardClass.includes(hazard) ? '#EF4444' : colors.textSecondary },
                  ]}>
                    {hazard}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Storage Requirements</Text>
            <View style={styles.chipContainer}>
              {STORAGE_REQUIREMENTS.map((req) => (
                <Pressable
                  key={req}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.storageRequirements.includes(req) ? '#3B82F620' : colors.surface,
                      borderColor: formData.storageRequirements.includes(req) ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleStorageReq(req)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.storageRequirements.includes(req) ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {req}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showFilterModal} animationType="slide" transparent>
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={[styles.filterSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Inventory</Text>
              <Pressable onPress={() => { setFilterStatus(null); setFilterLocation(null); }}>
                <Text style={[styles.clearFilters, { color: '#8B5CF6' }]}>Clear All</Text>
              </Pressable>
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
            <View style={styles.filterOptions}>
              {[
                { value: null, label: 'All' },
                { value: 'adequate', label: 'Adequate' },
                { value: 'low', label: 'Low Stock' },
                { value: 'critical', label: 'Critical' },
                { value: 'expired', label: 'Expired' },
              ].map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: filterStatus === option.value ? '#8B5CF620' : colors.card,
                      borderColor: filterStatus === option.value ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => setFilterStatus(option.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filterStatus === option.value ? '#8B5CF6' : colors.text },
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.applyFilterButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyFilterText}>Apply Filters</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  entryCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  entryTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 8,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  entryDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  separator: {
    marginHorizontal: 4,
  },
  quantityRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  quantityInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  containerText: {
    fontSize: 12,
  },
  stockIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  stockText: {
    fontSize: 11,
  },
  locationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
  },
  hazardRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  hazardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hazardText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  moreHazards: {
    fontSize: 11,
    alignSelf: 'center' as const,
  },
  entryFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  entryActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  twoColumn: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  unitRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  unitText: {
    fontSize: 11,
  },
  modalBottomPadding: {
    height: 40,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  filterSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  filterHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  clearFilters: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  applyFilterButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  applyFilterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 80,
  },
});
