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
  FileText,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  X,
  AlertTriangle,
  Calendar,
  MapPin,
  Building,
  Trash2,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface SDSEntry {
  id: string;
  chemical_name: string;
  manufacturer: string;
  product_code: string;
  sds_revision_date: string;
  locations: string[];
  hazard_class: string[];
  ghs_pictograms: string[];
  signal_word: 'Danger' | 'Warning' | 'None';
  status: 'current' | 'review_needed' | 'expired';
  last_reviewed: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

const HAZARD_CLASSES = [
  'Flammable',
  'Corrosive',
  'Toxic',
  'Irritant',
  'Oxidizer',
  'Compressed Gas',
  'Health Hazard',
  'Environmental Hazard',
];

const LOCATIONS = [
  'Production',
  'Sanitation',
  'Maintenance',
  'Warehouse',
  'Cold Storage',
  'Refrigeration Room',
  'Quality Lab',
  'Receiving',
];

export default function SDSIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<SDSEntry | null>(null);

  const [formData, setFormData] = useState({
    chemicalName: '',
    manufacturer: '',
    productCode: '',
    sdsRevisionDate: '',
    locations: [] as string[],
    hazardClass: [] as string[],
    signalWord: 'Warning' as 'Danger' | 'Warning' | 'None',
    notes: '',
  });

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['sds-index'],
    queryFn: async () => {
      console.log('Fetching SDS entries...');
      try {
        const { data, error } = await supabase
          .from('sds_index')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('SDS table may not exist, using empty data:', error.message);
          return [];
        }
        console.log('Fetched SDS entries:', data?.length);
        return data as SDSEntry[];
      } catch (err) {
        console.warn('SDS query failed, using empty data:', err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: Omit<SDSEntry, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating SDS entry:', entry);
      const { data, error } = await supabase
        .from('sds_index')
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
      queryClient.invalidateQueries({ queryKey: ['sds-index'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<SDSEntry> & { id: string }) => {
      console.log('Updating SDS entry:', id);
      const { data, error } = await supabase
        .from('sds_index')
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
      queryClient.invalidateQueries({ queryKey: ['sds-index'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting SDS entry:', id);
      const { error } = await supabase
        .from('sds_index')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting entry:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sds-index'] });
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
      sdsRevisionDate: '',
      locations: [],
      hazardClass: [],
      signalWord: 'Warning',
      notes: '',
    });
    setEditingEntry(null);
  };

  const handleAddEntry = () => {
    if (!formData.chemicalName.trim() || !formData.manufacturer.trim()) {
      Alert.alert('Required Fields', 'Please enter chemical name and manufacturer.');
      return;
    }

    const entryData = {
      chemical_name: formData.chemicalName,
      manufacturer: formData.manufacturer,
      product_code: formData.productCode,
      sds_revision_date: formData.sdsRevisionDate || new Date().toISOString().split('T')[0],
      locations: formData.locations,
      hazard_class: formData.hazardClass,
      ghs_pictograms: formData.hazardClass.map(h => h.toLowerCase().replace(' ', '_')),
      signal_word: formData.signalWord,
      status: 'current' as const,
      last_reviewed: new Date().toISOString().split('T')[0],
      notes: formData.notes,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...entryData });
    } else {
      createMutation.mutate(entryData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditEntry = (entry: SDSEntry) => {
    setEditingEntry(entry);
    setFormData({
      chemicalName: entry.chemical_name,
      manufacturer: entry.manufacturer,
      productCode: entry.product_code,
      sdsRevisionDate: entry.sds_revision_date,
      locations: entry.locations || [],
      hazardClass: entry.hazard_class || [],
      signalWord: entry.signal_word,
      notes: entry.notes,
    });
    setShowAddModal(true);
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      'Delete SDS Entry',
      'Are you sure you want to remove this SDS from the index?',
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

  const toggleLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter(l => l !== location)
        : [...prev.locations, location],
    }));
  };

  const toggleHazardClass = (hazard: string) => {
    setFormData(prev => ({
      ...prev,
      hazardClass: prev.hazardClass.includes(hazard)
        ? prev.hazardClass.filter(h => h !== hazard)
        : [...prev.hazardClass, hazard],
    }));
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.chemical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.product_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || entry.status === filterStatus;
    const matchesLocation = !filterLocation || (entry.locations || []).includes(filterLocation);
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return '#10B981';
      case 'review_needed': return '#F59E0B';
      case 'expired': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'current': return 'Current';
      case 'review_needed': return 'Review Needed';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const getSignalWordColor = (word: string) => {
    switch (word) {
      case 'Danger': return '#EF4444';
      case 'Warning': return '#F59E0B';
      default: return colors.textSecondary;
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'SDS Master Index',
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
          placeholder="Search chemicals, manufacturers..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterModal(true);
          }}
          style={[styles.filterButton, { backgroundColor: (filterStatus || filterLocation) ? '#EAB30820' : colors.card }]}
        >
          <Filter size={18} color={(filterStatus || filterLocation) ? '#EAB308' : colors.textSecondary} />
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
            <Text style={[styles.statValue, { color: '#10B981' }]}>{entries.filter(e => e.status === 'current').length}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Current</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{entries.filter(e => e.status === 'review_needed').length}</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Review</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{entries.length}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Total</Text>
          </View>
        </View>

        {isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading SDS entries...</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No SDS entries found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to add an SDS entry</Text>
          </View>
        ) : (
          filteredEntries.map((entry) => (
            <Pressable
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleEditEntry(entry)}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleRow}>
                  <FileText size={20} color="#EAB308" />
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
                  <Building size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {entry.manufacturer}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Code:</Text>
                  <Text style={[styles.detailTextBold, { color: colors.text }]}>{entry.product_code}</Text>
                </View>
              </View>

              <View style={styles.hazardRow}>
                {entry.signal_word !== 'None' && (
                  <View style={[styles.signalBadge, { backgroundColor: getSignalWordColor(entry.signal_word) + '20' }]}>
                    <AlertTriangle size={12} color={getSignalWordColor(entry.signal_word)} />
                    <Text style={[styles.signalText, { color: getSignalWordColor(entry.signal_word) }]}>
                      {entry.signal_word}
                    </Text>
                  </View>
                )}
                {(entry.hazard_class || []).slice(0, 3).map((hazard, idx) => (
                  <View key={idx} style={[styles.hazardBadge, { backgroundColor: colors.card }]}>
                    <Text style={[styles.hazardText, { color: colors.textSecondary }]}>{hazard}</Text>
                  </View>
                ))}
                {(entry.hazard_class || []).length > 3 && (
                  <Text style={[styles.moreHazards, { color: colors.textSecondary }]}>
                    +{entry.hazard_class.length - 3}
                  </Text>
                )}
              </View>

              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {(entry.locations || []).join(', ') || 'No locations'}
                </Text>
              </View>

              <View style={styles.entryFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Rev: {entry.sds_revision_date}
                  </Text>
                </View>
                <View style={styles.entryActions}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert('View SDS', 'This would open the full SDS document.');
                    }}
                    style={[styles.actionButton, { backgroundColor: '#3B82F615' }]}
                  >
                    <ExternalLink size={14} color="#3B82F6" />
                  </Pressable>
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
        style={[styles.fab, { backgroundColor: '#EAB308' }]}
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
              {editingEntry ? 'Edit SDS Entry' : 'Add SDS Entry'}
            </Text>
            <Pressable onPress={handleAddEntry} disabled={isMutating}>
              {isMutating ? (
                <ActivityIndicator size="small" color="#EAB308" />
              ) : (
                <Text style={[styles.saveButton, { color: '#EAB308' }]}>Save</Text>
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

            <Text style={[styles.inputLabel, { color: colors.text }]}>Manufacturer *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter manufacturer name"
              placeholderTextColor={colors.textSecondary}
              value={formData.manufacturer}
              onChangeText={(text) => setFormData(prev => ({ ...prev, manufacturer: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Product Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter product code"
              placeholderTextColor={colors.textSecondary}
              value={formData.productCode}
              onChangeText={(text) => setFormData(prev => ({ ...prev, productCode: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>SDS Revision Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={formData.sdsRevisionDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, sdsRevisionDate: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Signal Word</Text>
            <View style={styles.signalWordRow}>
              {(['Danger', 'Warning', 'None'] as const).map((word) => (
                <Pressable
                  key={word}
                  style={[
                    styles.signalWordOption,
                    {
                      backgroundColor: formData.signalWord === word ? getSignalWordColor(word) + '20' : colors.surface,
                      borderColor: formData.signalWord === word ? getSignalWordColor(word) : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, signalWord: word }))}
                >
                  <Text style={[
                    styles.signalWordText,
                    { color: formData.signalWord === word ? getSignalWordColor(word) : colors.textSecondary },
                  ]}>
                    {word}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Classes</Text>
            <View style={styles.chipContainer}>
              {HAZARD_CLASSES.map((hazard) => (
                <Pressable
                  key={hazard}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.hazardClass.includes(hazard) ? '#EAB30820' : colors.surface,
                      borderColor: formData.hazardClass.includes(hazard) ? '#EAB308' : colors.border,
                    },
                  ]}
                  onPress={() => toggleHazardClass(hazard)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.hazardClass.includes(hazard) ? '#EAB308' : colors.textSecondary },
                  ]}>
                    {hazard}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Storage Locations</Text>
            <View style={styles.chipContainer}>
              {LOCATIONS.map((location) => (
                <Pressable
                  key={location}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.locations.includes(location) ? '#3B82F620' : colors.surface,
                      borderColor: formData.locations.includes(location) ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleLocation(location)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.locations.includes(location) ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {location}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional notes about this chemical..."
              placeholderTextColor={colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showFilterModal} animationType="slide" transparent>
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={[styles.filterSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>Filter SDS Index</Text>
              <Pressable onPress={() => { setFilterStatus(null); setFilterLocation(null); }}>
                <Text style={[styles.clearFilters, { color: '#EAB308' }]}>Clear All</Text>
              </Pressable>
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
            <View style={styles.filterOptions}>
              {[
                { value: null, label: 'All' },
                { value: 'current', label: 'Current' },
                { value: 'review_needed', label: 'Review Needed' },
                { value: 'expired', label: 'Expired' },
              ].map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: filterStatus === option.value ? '#EAB30820' : colors.card,
                      borderColor: filterStatus === option.value ? '#EAB308' : colors.border,
                    },
                  ]}
                  onPress={() => setFilterStatus(option.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filterStatus === option.value ? '#EAB308' : colors.text },
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Location</Text>
            <View style={styles.filterOptions}>
              <Pressable
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: filterLocation === null ? '#3B82F620' : colors.card,
                    borderColor: filterLocation === null ? '#3B82F6' : colors.border,
                  },
                ]}
                onPress={() => setFilterLocation(null)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: filterLocation === null ? '#3B82F6' : colors.text },
                ]}>
                  All
                </Text>
              </Pressable>
              {LOCATIONS.map((location) => (
                <Pressable
                  key={location}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: filterLocation === location ? '#3B82F620' : colors.card,
                      borderColor: filterLocation === location ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFilterLocation(location)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filterLocation === location ? '#3B82F6' : colors.text },
                  ]}>
                    {location}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.applyFilterButton, { backgroundColor: '#EAB308' }]}
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
    fontSize: 16,
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
    marginBottom: 10,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailText: {
    fontSize: 12,
  },
  detailTextBold: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  hazardRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  signalBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  hazardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hazardText: {
    fontSize: 11,
  },
  moreHazards: {
    fontSize: 11,
    alignSelf: 'center' as const,
  },
  locationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
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
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  signalWordRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  signalWordOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  signalWordText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    fontSize: 13,
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
    maxHeight: '70%',
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
    marginTop: 10,
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
