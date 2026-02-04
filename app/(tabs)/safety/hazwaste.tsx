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
  Trash2,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  MapPin,
  Truck,
  FileText,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle2,
  User,
  Scale,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface HazWasteEntry {
  id: string;
  waste_description: string;
  waste_code: string[];
  generator: string;
  container_type: string;
  container_count: number;
  quantity: string;
  unit: string;
  storage_location: string;
  accumulation_start_date: string;
  manifest_number: string;
  transporter_name: string;
  tsd_facility: string;
  pickup_date: string;
  status: 'accumulating' | 'ready_pickup' | 'manifested' | 'shipped' | 'disposed';
  hazard_characteristics: string[];
  handling_instructions: string;
  prepared_by: string;
  created_at?: string;
  updated_at?: string;
}

const WASTE_CODES = [
  'D001 - Ignitable',
  'D002 - Corrosive',
  'D003 - Reactive',
  'D004 - Toxic (Arsenic)',
  'D005 - Toxic (Barium)',
  'D006 - Toxic (Cadmium)',
  'D007 - Toxic (Chromium)',
  'D008 - Toxic (Lead)',
  'F001 - Spent Solvents',
  'F002 - Spent Solvents',
  'F003 - Spent Solvents',
  'F005 - Spent Solvents',
];

const CONTAINER_TYPES = [
  '55-gallon drum',
  '30-gallon drum',
  '5-gallon pail',
  'Cubic yard box',
  'Tote (275 gal)',
  'Lab pack',
];

const HAZARD_CHARACTERISTICS = [
  'Ignitable',
  'Corrosive',
  'Reactive',
  'Toxic',
  'Listed Waste',
  'Acute Hazardous',
];

const STORAGE_LOCATIONS = [
  'Hazardous Waste Storage Area A',
  'Hazardous Waste Storage Area B',
  'Maintenance Waste Area',
  'Lab Waste Satellite',
  '90-Day Storage Area',
];

export default function HazWasteScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HazWasteEntry | null>(null);

  const [formData, setFormData] = useState({
    wasteDescription: '',
    wasteCode: [] as string[],
    containerType: '',
    containerCount: '1',
    quantity: '',
    unit: 'gallons',
    storageLocation: '',
    accumulationStartDate: new Date().toISOString().split('T')[0],
    hazardCharacteristics: [] as string[],
    handlingInstructions: '',
    preparedBy: '',
  });

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['haz-waste'],
    queryFn: async () => {
      console.log('Fetching hazardous waste entries...');
      try {
        const { data, error } = await supabase
          .from('haz_waste')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Haz waste table may not exist, using empty data:', error.message);
          return [];
        }
        console.log('Fetched haz waste entries:', data?.length);
        return data as HazWasteEntry[];
      } catch (err) {
        console.warn('Haz waste query failed, using empty data:', err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: Omit<HazWasteEntry, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating haz waste entry:', entry);
      const { data, error } = await supabase
        .from('haz_waste')
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
      queryClient.invalidateQueries({ queryKey: ['haz-waste'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<HazWasteEntry> & { id: string }) => {
      console.log('Updating haz waste entry:', id);
      const { data, error } = await supabase
        .from('haz_waste')
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
      queryClient.invalidateQueries({ queryKey: ['haz-waste'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting haz waste entry:', id);
      const { error } = await supabase
        .from('haz_waste')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting entry:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['haz-waste'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      wasteDescription: '',
      wasteCode: [],
      containerType: '',
      containerCount: '1',
      quantity: '',
      unit: 'gallons',
      storageLocation: '',
      accumulationStartDate: new Date().toISOString().split('T')[0],
      hazardCharacteristics: [],
      handlingInstructions: '',
      preparedBy: '',
    });
    setEditingEntry(null);
  };

  const handleAddEntry = () => {
    if (!formData.wasteDescription.trim() || !formData.storageLocation) {
      Alert.alert('Required Fields', 'Please enter waste description and storage location.');
      return;
    }

    const entryData = {
      waste_description: formData.wasteDescription,
      waste_code: formData.wasteCode,
      generator: 'ABC Food Processing',
      container_type: formData.containerType,
      container_count: parseInt(formData.containerCount) || 1,
      quantity: formData.quantity,
      unit: formData.unit,
      storage_location: formData.storageLocation,
      accumulation_start_date: formData.accumulationStartDate,
      manifest_number: editingEntry?.manifest_number || '',
      transporter_name: editingEntry?.transporter_name || '',
      tsd_facility: editingEntry?.tsd_facility || '',
      pickup_date: editingEntry?.pickup_date || '',
      status: editingEntry?.status || 'accumulating' as const,
      hazard_characteristics: formData.hazardCharacteristics,
      handling_instructions: formData.handlingInstructions,
      prepared_by: formData.preparedBy || 'Current User',
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...entryData });
    } else {
      createMutation.mutate(entryData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditEntry = (entry: HazWasteEntry) => {
    setEditingEntry(entry);
    setFormData({
      wasteDescription: entry.waste_description,
      wasteCode: entry.waste_code || [],
      containerType: entry.container_type,
      containerCount: entry.container_count.toString(),
      quantity: entry.quantity,
      unit: entry.unit,
      storageLocation: entry.storage_location,
      accumulationStartDate: entry.accumulation_start_date,
      hazardCharacteristics: entry.hazard_characteristics || [],
      handlingInstructions: entry.handling_instructions,
      preparedBy: entry.prepared_by,
    });
    setShowAddModal(true);
  };

  const handleUpdateStatus = (id: string, newStatus: HazWasteEntry['status']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate({ id, status: newStatus });
  };

  const toggleWasteCode = (code: string) => {
    const codeShort = code.split(' - ')[0];
    setFormData(prev => ({
      ...prev,
      wasteCode: prev.wasteCode.includes(codeShort)
        ? prev.wasteCode.filter(c => c !== codeShort)
        : [...prev.wasteCode, codeShort],
    }));
  };

  const toggleHazard = (hazard: string) => {
    setFormData(prev => ({
      ...prev,
      hazardCharacteristics: prev.hazardCharacteristics.includes(hazard)
        ? prev.hazardCharacteristics.filter(h => h !== hazard)
        : [...prev.hazardCharacteristics, hazard],
    }));
  };

  const filteredEntries = entries.filter(entry =>
    entry.waste_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.waste_code || []).some(code => code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accumulating': return '#F59E0B';
      case 'ready_pickup': return '#3B82F6';
      case 'manifested': return '#8B5CF6';
      case 'shipped': return '#10B981';
      case 'disposed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accumulating': return 'Accumulating';
      case 'ready_pickup': return 'Ready for Pickup';
      case 'manifested': return 'Manifested';
      case 'shipped': return 'Shipped';
      case 'disposed': return 'Disposed';
      default: return status;
    }
  };

  const getDaysAccumulating = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Hazardous Waste',
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
          placeholder="Search waste streams..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {entries.filter(e => e.status === 'accumulating').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Accumulating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Truck size={18} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              {entries.filter(e => e.status === 'ready_pickup' || e.status === 'manifested').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {entries.filter(e => e.status === 'shipped' || e.status === 'disposed').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Completed</Text>
          </View>
        </View>

        <View style={[styles.warningBanner, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
          <AlertTriangle size={18} color="#EF4444" />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: '#EF4444' }]}>90-Day Accumulation Limit</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              RCRA requires hazardous waste to be shipped within 90 days of accumulation start.
            </Text>
          </View>
        </View>

        {isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading waste entries...</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Trash2 size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No waste entries found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to add a waste entry</Text>
          </View>
        ) : (
          filteredEntries.map((entry) => {
            const daysAccum = getDaysAccumulating(entry.accumulation_start_date);
            const isNearLimit = daysAccum >= 75 && entry.status === 'accumulating';
            const isOverLimit = daysAccum > 90 && entry.status === 'accumulating';

            return (
              <Pressable
                key={entry.id}
                style={[
                  styles.entryCard,
                  { backgroundColor: colors.surface, borderColor: isOverLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : colors.border },
                ]}
                onPress={() => handleEditEntry(entry)}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryTitleRow}>
                    <Trash2 size={20} color="#F97316" />
                    <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
                      {entry.waste_description}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                      {getStatusLabel(entry.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.codeRow}>
                  {(entry.waste_code || []).map((code, idx) => (
                    <View key={idx} style={[styles.codeBadge, { backgroundColor: '#8B5CF620' }]}>
                      <Text style={[styles.codeText, { color: '#8B5CF6' }]}>{code}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Package size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {entry.container_count}x {entry.container_type}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Scale size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {entry.quantity} {entry.unit}
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
                  {(entry.hazard_characteristics || []).map((hazard, idx) => (
                    <View key={idx} style={[styles.hazardBadge, { backgroundColor: '#EF444415' }]}>
                      <AlertTriangle size={10} color="#EF4444" />
                      <Text style={[styles.hazardText, { color: '#EF4444' }]}>{hazard}</Text>
                    </View>
                  ))}
                </View>

                {entry.status === 'accumulating' && (
                  <View style={[
                    styles.daysRow,
                    { backgroundColor: isOverLimit ? '#EF444415' : isNearLimit ? '#F59E0B15' : '#3B82F615' },
                  ]}>
                    <Clock size={14} color={isOverLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#3B82F6'} />
                    <Text style={[
                      styles.daysText,
                      { color: isOverLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#3B82F6' },
                    ]}>
                      {daysAccum} days accumulating ({90 - daysAccum} days remaining)
                    </Text>
                  </View>
                )}

                {entry.manifest_number && (
                  <View style={styles.manifestRow}>
                    <FileText size={14} color={colors.textSecondary} />
                    <Text style={[styles.manifestText, { color: colors.text }]}>
                      Manifest: {entry.manifest_number}
                    </Text>
                  </View>
                )}

                <View style={styles.entryFooter}>
                  <View style={styles.dateInfo}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      Started: {entry.accumulation_start_date}
                    </Text>
                  </View>
                  <View style={styles.preparedInfo}>
                    <User size={12} color={colors.textSecondary} />
                    <Text style={[styles.preparedText, { color: colors.textSecondary }]}>
                      {entry.prepared_by}
                    </Text>
                  </View>
                </View>

                {entry.status === 'accumulating' && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateStatus(entry.id, 'ready_pickup')}
                    disabled={isMutating}
                  >
                    {isMutating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Mark Ready for Pickup</Text>
                    )}
                  </Pressable>
                )}
              </Pressable>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#F97316' }]}
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
              {editingEntry ? 'Edit Waste Entry' : 'New Waste Entry'}
            </Text>
            <Pressable onPress={handleAddEntry} disabled={isMutating}>
              {isMutating ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Text style={[styles.saveButton, { color: '#F97316' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Waste Description *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe the waste stream"
              placeholderTextColor={colors.textSecondary}
              value={formData.wasteDescription}
              onChangeText={(text) => setFormData(prev => ({ ...prev, wasteDescription: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>EPA Waste Codes</Text>
            <View style={styles.chipContainer}>
              {WASTE_CODES.map((code) => {
                const codeShort = code.split(' - ')[0];
                return (
                  <Pressable
                    key={code}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: formData.wasteCode.includes(codeShort) ? '#8B5CF620' : colors.surface,
                        borderColor: formData.wasteCode.includes(codeShort) ? '#8B5CF6' : colors.border,
                      },
                    ]}
                    onPress={() => toggleWasteCode(code)}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: formData.wasteCode.includes(codeShort) ? '#8B5CF6' : colors.textSecondary },
                    ]}>
                      {code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Container Type</Text>
            <View style={styles.chipContainer}>
              {CONTAINER_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.containerType === type ? '#F9731620' : colors.surface,
                      borderColor: formData.containerType === type ? '#F97316' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, containerType: type }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.containerType === type ? '#F97316' : colors.textSecondary },
                  ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Container Count</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Count"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.containerCount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, containerCount: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Amount"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  keyboardType="numeric"
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
                      backgroundColor: formData.storageLocation === loc ? '#3B82F620' : colors.surface,
                      borderColor: formData.storageLocation === loc ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, storageLocation: loc }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.storageLocation === loc ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Accumulation Start Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={formData.accumulationStartDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, accumulationStartDate: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Characteristics</Text>
            <View style={styles.chipContainer}>
              {HAZARD_CHARACTERISTICS.map((hazard) => (
                <Pressable
                  key={hazard}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.hazardCharacteristics.includes(hazard) ? '#EF444420' : colors.surface,
                      borderColor: formData.hazardCharacteristics.includes(hazard) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleHazard(hazard)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.hazardCharacteristics.includes(hazard) ? '#EF4444' : colors.textSecondary },
                  ]}>
                    {hazard}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Handling Instructions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Special handling requirements..."
              placeholderTextColor={colors.textSecondary}
              value={formData.handlingInstructions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, handlingInstructions: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Prepared By</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              value={formData.preparedBy}
              onChangeText={(text) => setFormData(prev => ({ ...prev, preparedBy: text }))}
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
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
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
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
  codeRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  detailsGrid: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  hazardBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  hazardText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  daysRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  manifestRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  manifestText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
  preparedInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  preparedText: {
    fontSize: 11,
  },
  actionButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
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
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  modalBottomPadding: {
    height: 40,
  },
  bottomPadding: {
    height: 80,
  },
});
