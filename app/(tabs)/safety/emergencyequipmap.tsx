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
  Map,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Heart,
  Eye,
  DoorOpen,
  Bell,
  Siren,
  Package,
  Clock,
  Building,
  Edit3,
  Trash2,
  Navigation,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface EmergencyEquipment {
  id: string;
  equipment_type: string;
  equipment_id: string;
  location: string;
  building: string;
  floor: string;
  nearest_landmark: string;
  grid_reference: string;
  accessibility: string;
  last_inspection: string;
  next_inspection: string;
  condition: 'good' | 'fair' | 'poor' | 'out_of_service';
  signage_present: boolean;
  signage_condition: string;
  obstructions: boolean;
  obstruction_details: string;
  special_instructions: string;
  responsible_person: string;
  added_by: string;
  added_date: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

const EQUIPMENT_TYPES = [
  { value: 'Fire Extinguisher', icon: Flame, color: '#EF4444' },
  { value: 'AED', icon: Heart, color: '#EC4899' },
  { value: 'Emergency Exit', icon: DoorOpen, color: '#10B981' },
  { value: 'Eyewash Station', icon: Eye, color: '#3B82F6' },
  { value: 'Safety Shower', icon: Eye, color: '#0891B2' },
  { value: 'Fire Alarm Pull Station', icon: Bell, color: '#F59E0B' },
  { value: 'First Aid Kit', icon: Package, color: '#8B5CF6' },
  { value: 'Spill Kit', icon: Package, color: '#F97316' },
  { value: 'Emergency Phone', icon: Siren, color: '#6366F1' },
  { value: 'Assembly Point', icon: Navigation, color: '#14B8A6' },
];

const BUILDINGS = ['Main Building', 'Production Wing', 'Warehouse', 'Office Building', 'Outdoor'];
const FLOORS = ['Basement', '1st Floor', '2nd Floor', '3rd Floor', 'Mezzanine', 'Roof Access'];
const CONDITIONS = [
  { value: 'good', label: 'Good', color: '#10B981' },
  { value: 'fair', label: 'Fair', color: '#F59E0B' },
  { value: 'poor', label: 'Poor', color: '#EF4444' },
  { value: 'out_of_service', label: 'Out of Service', color: '#6B7280' },
];

export default function EmergencyEquipMapScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EmergencyEquipment | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    equipmentType: '',
    equipmentId: '',
    location: '',
    building: '',
    floor: '',
    nearestLandmark: '',
    gridReference: '',
    accessibility: '',
    lastInspection: new Date().toISOString().split('T')[0],
    condition: 'good' as 'good' | 'fair' | 'poor' | 'out_of_service',
    signagePresent: true,
    signageCondition: '',
    obstructions: false,
    obstructionDetails: '',
    specialInstructions: '',
    responsiblePerson: '',
    notes: '',
  });

  const { data: equipment = [], isLoading, refetch } = useQuery({
    queryKey: ['emergency-equipment'],
    queryFn: async () => {
      console.log('Fetching emergency equipment...');
      try {
        const { data, error } = await supabase
          .from('emergency_equipment')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Emergency equipment table may not exist, using empty data:', error.message);
          return [];
        }
        console.log('Fetched emergency equipment:', data?.length);
        return data as EmergencyEquipment[];
      } catch (err) {
        console.warn('Emergency equipment query failed, using empty data:', err);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: Omit<EmergencyEquipment, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating emergency equipment:', entry);
      const { data, error } = await supabase
        .from('emergency_equipment')
        .insert([entry])
        .select()
        .single();

      if (error) {
        console.error('Error creating equipment:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-equipment'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...entry }: Partial<EmergencyEquipment> & { id: string }) => {
      console.log('Updating emergency equipment:', id);
      const { data, error } = await supabase
        .from('emergency_equipment')
        .update(entry)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating equipment:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-equipment'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting emergency equipment:', id);
      const { error } = await supabase
        .from('emergency_equipment')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting equipment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-equipment'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      equipmentType: '',
      equipmentId: '',
      location: '',
      building: '',
      floor: '',
      nearestLandmark: '',
      gridReference: '',
      accessibility: '',
      lastInspection: new Date().toISOString().split('T')[0],
      condition: 'good',
      signagePresent: true,
      signageCondition: '',
      obstructions: false,
      obstructionDetails: '',
      specialInstructions: '',
      responsiblePerson: '',
      notes: '',
    });
    setEditingEquipment(null);
  };

  const handleSaveEquipment = () => {
    if (!formData.equipmentType || !formData.equipmentId || !formData.location) {
      Alert.alert('Required Fields', 'Please enter equipment type, ID, and location.');
      return;
    }

    const nextInspection = new Date(formData.lastInspection);
    nextInspection.setMonth(nextInspection.getMonth() + 1);

    const entryData = {
      equipment_type: formData.equipmentType,
      equipment_id: formData.equipmentId,
      location: formData.location,
      building: formData.building,
      floor: formData.floor,
      nearest_landmark: formData.nearestLandmark,
      grid_reference: formData.gridReference,
      accessibility: formData.accessibility,
      last_inspection: formData.lastInspection,
      next_inspection: nextInspection.toISOString().split('T')[0],
      condition: formData.condition,
      signage_present: formData.signagePresent,
      signage_condition: formData.signageCondition,
      obstructions: formData.obstructions,
      obstruction_details: formData.obstructionDetails,
      special_instructions: formData.specialInstructions,
      responsible_person: formData.responsiblePerson,
      added_by: editingEquipment?.added_by || 'Current User',
      added_date: editingEquipment?.added_date || new Date().toISOString().split('T')[0],
      notes: formData.notes,
    };

    if (editingEquipment) {
      updateMutation.mutate({ id: editingEquipment.id, ...entryData });
    } else {
      createMutation.mutate(entryData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditEquipment = (item: EmergencyEquipment) => {
    setEditingEquipment(item);
    setFormData({
      equipmentType: item.equipment_type,
      equipmentId: item.equipment_id,
      location: item.location,
      building: item.building,
      floor: item.floor,
      nearestLandmark: item.nearest_landmark,
      gridReference: item.grid_reference,
      accessibility: item.accessibility,
      lastInspection: item.last_inspection,
      condition: item.condition,
      signagePresent: item.signage_present,
      signageCondition: item.signage_condition,
      obstructions: item.obstructions,
      obstructionDetails: item.obstruction_details,
      specialInstructions: item.special_instructions,
      responsiblePerson: item.responsible_person,
      notes: item.notes,
    });
    setShowAddModal(true);
  };

  const handleDeleteEquipment = (item: EmergencyEquipment) => {
    Alert.alert(
      'Delete Equipment',
      `Are you sure you want to delete ${item.equipment_id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]
    );
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.equipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.equipment_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || item.equipment_type === selectedType;
    const matchesBuilding = !selectedBuilding || item.building === selectedBuilding;
    return matchesSearch && matchesType && matchesBuilding;
  });

  const getEquipmentIcon = (type: string) => {
    const found = EQUIPMENT_TYPES.find(t => t.value === type);
    return found?.icon || Package;
  };

  const getEquipmentColor = (type: string) => {
    const found = EQUIPMENT_TYPES.find(t => t.value === type);
    return found?.color || '#6B7280';
  };

  const getConditionColor = (condition: string) => {
    const found = CONDITIONS.find(c => c.value === condition);
    return found?.color || '#6B7280';
  };

  const equipmentCounts = EQUIPMENT_TYPES.map(type => ({
    ...type,
    count: equipment.filter(e => e.equipment_type === type.value).length,
  })).filter(t => t.count > 0);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Emergency Equipment Map',
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
          placeholder="Search equipment..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        <Pressable
          style={[
            styles.filterChip,
            {
              backgroundColor: !selectedType ? '#10B98120' : colors.surface,
              borderColor: !selectedType ? '#10B981' : colors.border,
            },
          ]}
          onPress={() => setSelectedType(null)}
        >
          <Text style={[styles.filterChipText, { color: !selectedType ? '#10B981' : colors.textSecondary }]}>
            All Types
          </Text>
        </Pressable>
        {equipmentCounts.map((type) => {
          const Icon = type.icon;
          return (
            <Pressable
              key={type.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedType === type.value ? type.color + '20' : colors.surface,
                  borderColor: selectedType === type.value ? type.color : colors.border,
                },
              ]}
              onPress={() => setSelectedType(type.value === selectedType ? null : type.value)}
            >
              <Icon size={14} color={selectedType === type.value ? type.color : colors.textSecondary} />
              <Text style={[styles.filterChipText, { color: selectedType === type.value ? type.color : colors.textSecondary }]}>
                {type.value} ({type.count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.buildingScroll}
        contentContainerStyle={styles.filterContainer}
      >
        <Pressable
          style={[
            styles.filterChip,
            {
              backgroundColor: !selectedBuilding ? '#3B82F620' : colors.surface,
              borderColor: !selectedBuilding ? '#3B82F6' : colors.border,
            },
          ]}
          onPress={() => setSelectedBuilding(null)}
        >
          <Building size={14} color={!selectedBuilding ? '#3B82F6' : colors.textSecondary} />
          <Text style={[styles.filterChipText, { color: !selectedBuilding ? '#3B82F6' : colors.textSecondary }]}>
            All Buildings
          </Text>
        </Pressable>
        {BUILDINGS.map((bldg) => (
          <Pressable
            key={bldg}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedBuilding === bldg ? '#3B82F620' : colors.surface,
                borderColor: selectedBuilding === bldg ? '#3B82F6' : colors.border,
              },
            ]}
            onPress={() => setSelectedBuilding(bldg === selectedBuilding ? null : bldg)}
          >
            <Text style={[styles.filterChipText, { color: selectedBuilding === bldg ? '#3B82F6' : colors.textSecondary }]}>
              {bldg}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {equipment.filter(e => e.condition === 'good').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Good</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Map size={18} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{equipment.length}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {equipment.filter(e => e.obstructions || e.condition === 'poor' || e.condition === 'out_of_service').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Issues</Text>
          </View>
        </View>

        {isLoading && equipment.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading equipment...</Text>
          </View>
        ) : filteredEquipment.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Map size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No equipment found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to add equipment</Text>
          </View>
        ) : (
          filteredEquipment.map((item) => {
            const EquipIcon = getEquipmentIcon(item.equipment_type);
            const equipColor = getEquipmentColor(item.equipment_type);
            const conditionColor = getConditionColor(item.condition);

            return (
              <Pressable
                key={item.id}
                style={[styles.equipmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleEditEquipment(item)}
              >
                <View style={styles.equipmentHeader}>
                  <View style={[styles.equipIconContainer, { backgroundColor: equipColor + '15' }]}>
                    <EquipIcon size={24} color={equipColor} />
                  </View>
                  <View style={styles.equipmentTitleContent}>
                    <View style={styles.equipmentTitleRow}>
                      <Text style={[styles.equipmentId, { color: colors.text }]}>{item.equipment_id}</Text>
                      <View style={[styles.conditionBadge, { backgroundColor: conditionColor + '20' }]}>
                        <Text style={[styles.conditionText, { color: conditionColor }]}>
                          {item.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.equipmentType, { color: equipColor }]}>{item.equipment_type}</Text>
                  </View>
                  <View style={styles.equipmentActions}>
                    <Pressable onPress={() => handleEditEquipment(item)} style={styles.actionButton}>
                      <Edit3 size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteEquipment(item)} style={styles.actionButton}>
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.locationInfo}>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.text }]}>{item.location}</Text>
                  </View>
                  <View style={styles.locationMeta}>
                    <Text style={[styles.buildingText, { color: colors.textSecondary }]}>
                      {item.building} • {item.floor}
                    </Text>
                    {item.grid_reference && (
                      <Text style={[styles.gridText, { color: colors.textSecondary }]}>
                        Grid: {item.grid_reference}
                      </Text>
                    )}
                  </View>
                </View>

                {item.nearest_landmark && (
                  <Text style={[styles.landmarkText, { color: colors.textSecondary }]}>
                    📍 {item.nearest_landmark}
                  </Text>
                )}

                <View style={styles.statusRow}>
                  <View style={[styles.statusItem, { backgroundColor: item.signage_present ? '#10B98115' : '#EF444415' }]}>
                    {item.signage_present ? (
                      <CheckCircle2 size={12} color="#10B981" />
                    ) : (
                      <AlertTriangle size={12} color="#EF4444" />
                    )}
                    <Text style={[styles.statusItemText, { color: item.signage_present ? '#10B981' : '#EF4444' }]}>
                      Signage
                    </Text>
                  </View>
                  {item.obstructions && (
                    <View style={[styles.statusItem, { backgroundColor: '#F59E0B15' }]}>
                      <AlertTriangle size={12} color="#F59E0B" />
                      <Text style={[styles.statusItemText, { color: '#F59E0B' }]}>Obstructed</Text>
                    </View>
                  )}
                </View>

                <View style={styles.equipmentFooter}>
                  <View style={styles.inspectionInfo}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text style={[styles.inspectionText, { color: colors.textSecondary }]}>
                      Last: {item.last_inspection}
                    </Text>
                  </View>
                  <View style={styles.inspectionInfo}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={[styles.inspectionText, { color: colors.textSecondary }]}>
                      Next: {item.next_inspection}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#10B981' }]}
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
              {editingEquipment ? 'Edit Equipment' : 'Add Equipment'}
            </Text>
            <Pressable onPress={handleSaveEquipment} disabled={isMutating}>
              {isMutating ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={[styles.saveButton, { color: '#10B981' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Equipment Type *</Text>
            <View style={styles.chipContainer}>
              {EQUIPMENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: formData.equipmentType === type.value ? type.color + '20' : colors.surface,
                        borderColor: formData.equipmentType === type.value ? type.color : colors.border,
                      },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, equipmentType: type.value }))}
                  >
                    <Icon size={16} color={formData.equipmentType === type.value ? type.color : colors.textSecondary} />
                    <Text style={[styles.typeChipText, { color: formData.equipmentType === type.value ? type.color : colors.textSecondary }]}>
                      {type.value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Equipment ID *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., FE-001, AED-002"
              placeholderTextColor={colors.textSecondary}
              value={formData.equipmentId}
              onChangeText={(text) => setFormData(prev => ({ ...prev, equipmentId: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location Description *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Main Entrance Lobby"
              placeholderTextColor={colors.textSecondary}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Building</Text>
            <View style={styles.chipContainer}>
              {BUILDINGS.map((bldg) => (
                <Pressable
                  key={bldg}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.building === bldg ? '#3B82F620' : colors.surface,
                      borderColor: formData.building === bldg ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, building: bldg }))}
                >
                  <Text style={[styles.chipText, { color: formData.building === bldg ? '#3B82F6' : colors.textSecondary }]}>
                    {bldg}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Floor</Text>
            <View style={styles.chipContainer}>
              {FLOORS.map((floor) => (
                <Pressable
                  key={floor}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.floor === floor ? '#8B5CF620' : colors.surface,
                      borderColor: formData.floor === floor ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, floor }))}
                >
                  <Text style={[styles.chipText, { color: formData.floor === floor ? '#8B5CF6' : colors.textSecondary }]}>
                    {floor}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Grid Reference</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., A-1"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.gridReference}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, gridReference: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Last Inspection</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.lastInspection}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lastInspection: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Nearest Landmark</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Next to reception desk"
              placeholderTextColor={colors.textSecondary}
              value={formData.nearestLandmark}
              onChangeText={(text) => setFormData(prev => ({ ...prev, nearestLandmark: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Accessibility</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Fully accessible, Clear 3ft radius"
              placeholderTextColor={colors.textSecondary}
              value={formData.accessibility}
              onChangeText={(text) => setFormData(prev => ({ ...prev, accessibility: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Condition</Text>
            <View style={styles.chipContainer}>
              {CONDITIONS.map((cond) => (
                <Pressable
                  key={cond.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.condition === cond.value ? cond.color + '20' : colors.surface,
                      borderColor: formData.condition === cond.value ? cond.color : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, condition: cond.value as typeof formData.condition }))}
                >
                  <Text style={[styles.chipText, { color: formData.condition === cond.value ? cond.color : colors.textSecondary }]}>
                    {cond.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Signage Present</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.signagePresent ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, signagePresent: !prev.signagePresent }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.signagePresent ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            {formData.signagePresent && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Signage Condition</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., Good - clearly visible"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.signageCondition}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, signageCondition: text }))}
                />
              </>
            )}

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Obstructions Present</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.obstructions ? '#F59E0B' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, obstructions: !prev.obstructions }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.obstructions ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            {formData.obstructions && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Obstruction Details</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Describe obstructions..."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.obstructionDetails}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, obstructionDetails: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>Special Instructions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Type, capacity, special notes..."
              placeholderTextColor={colors.textSecondary}
              value={formData.specialInstructions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, specialInstructions: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Responsible Person</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Name of responsible person"
              placeholderTextColor={colors.textSecondary}
              value={formData.responsiblePerson}
              onChangeText={(text) => setFormData(prev => ({ ...prev, responsiblePerson: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional notes..."
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  filterScroll: { maxHeight: 40, marginBottom: 4 },
  buildingScroll: { maxHeight: 40, marginBottom: 8 },
  filterContainer: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: '500' as const },
  statsRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const },
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
  equipmentCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  equipmentHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  equipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  equipmentTitleContent: { flex: 1 },
  equipmentTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 2,
  },
  equipmentId: { fontSize: 16, fontWeight: '600' as const },
  conditionBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  conditionText: { fontSize: 10, fontWeight: '600' as const },
  equipmentType: { fontSize: 12, fontWeight: '500' as const },
  equipmentActions: { flexDirection: 'row' as const, gap: 8 },
  actionButton: { padding: 4 },
  locationInfo: { marginBottom: 8 },
  locationRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 2 },
  locationText: { fontSize: 13, flex: 1 },
  locationMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginLeft: 20,
  },
  buildingText: { fontSize: 11 },
  gridText: { fontSize: 11 },
  landmarkText: { fontSize: 11, marginBottom: 8, marginLeft: 20 },
  statusRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 10 },
  statusItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusItemText: { fontSize: 11, fontWeight: '500' as const },
  equipmentFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  inspectionInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  inspectionText: { fontSize: 11 },
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
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 70 },
  twoColumn: { flexDirection: 'row' as const, gap: 12 },
  halfWidth: { flex: 1 },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12 },
  typeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: { fontSize: 11 },
  toggleRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  toggleButton: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' as const },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  modalBottomPadding: { height: 40 },
  bottomPadding: { height: 80 },
});
