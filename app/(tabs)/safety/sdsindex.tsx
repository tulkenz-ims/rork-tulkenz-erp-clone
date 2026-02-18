import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Linking,
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
  Edit3,
  QrCode,
  Printer,
  Upload,
  Eye,
  Check,
  Info,
  Download,
  Hash,
  Phone,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QR_PRINT_SIZES, QRPrintSize } from '@/types/documents';

// ============================================================================
// Department Prefix Mapping for QR Labels
// ============================================================================
const DEPARTMENT_PREFIXES: Record<string, { prefix: string; label: string; color: string }> = {
  maintenance: { prefix: 'MAINT', label: 'Maintenance', color: '#3B82F6' },
  sanitation: { prefix: 'SANI', label: 'Sanitation', color: '#10B981' },
  production: { prefix: 'PROD', label: 'Production', color: '#8B5CF6' },
  quality: { prefix: 'QUAL', label: 'Quality', color: '#F59E0B' },
  warehouse: { prefix: 'WHSE', label: 'Warehouse', color: '#6366F1' },
  cold_storage: { prefix: 'COLD', label: 'Cold Storage', color: '#06B6D4' },
  refrigeration: { prefix: 'REFRIG', label: 'Refrigeration', color: '#0EA5E9' },
  receiving: { prefix: 'RECV', label: 'Receiving', color: '#14B8A6' },
  safety: { prefix: 'SAFE', label: 'Safety', color: '#EF4444' },
  general: { prefix: 'GEN', label: 'General', color: '#6B7280' },
};

const DEPARTMENTS = Object.entries(DEPARTMENT_PREFIXES).map(([key, val]) => ({
  value: key,
  ...val,
}));

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

// ============================================================================
// Helpers
// ============================================================================
const getQRLabel = (dept: string | null, masterNumber: number | null): string => {
  const prefix = dept ? (DEPARTMENT_PREFIXES[dept]?.prefix || 'SDS') : 'SDS';
  return `${prefix} SDS #${masterNumber || '?'}`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return '#10B981';
    case 'expired': return '#EF4444';
    case 'superseded': return '#F59E0B';
    case 'archived': return '#6B7280';
    default: return '#6B7280';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'expired': return 'Expired';
    case 'superseded': return 'Superseded';
    case 'archived': return 'Archived';
    default: return status;
  }
};

const getSignalWordColor = (word: string): string => {
  switch (word?.toLowerCase()) {
    case 'danger': return '#EF4444';
    case 'warning': return '#F59E0B';
    default: return '#6B7280';
  }
};

// Simple fuzzy match: checks if terms appear in target
const fuzzyMatch = (target: string, search: string): number => {
  if (!target || !search) return 0;
  const t = target.toLowerCase().trim();
  const s = search.toLowerCase().trim();
  if (t === s) return 1.0;
  if (t.includes(s) || s.includes(t)) return 0.8;
  // Check individual words
  const searchWords = s.split(/\s+/);
  const matchedWords = searchWords.filter(w => t.includes(w));
  if (matchedWords.length > 0) return (matchedWords.length / searchWords.length) * 0.6;
  return 0;
};

// ============================================================================
// Main Component
// ============================================================================
export default function SDSMasterIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPrintQRModal, setShowPrintQRModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [printSize, setPrintSize] = useState<QRPrintSize>('medium');
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    product_name: '',
    manufacturer: '',
    manufacturer_phone: '',
    emergency_phone: '',
    cas_number: '',
    sds_number: '',
    primary_department: '' as string,
    physical_state: '' as string,
    signal_word: 'warning' as string,
    hazard_class: [] as string[],
    hazard_statements: [] as string[],
    precautionary_statements: [] as string[],
    location_used: [] as string[],
    department_codes: [] as string[],
    first_aid_inhalation: '',
    first_aid_skin: '',
    first_aid_eye: '',
    first_aid_ingestion: '',
    spill_procedures: '',
    storage_requirements: '',
    handling_precautions: '',
    fire_extinguishing_media: '',
    disposal_methods: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    revision_date: '',
    notes: '',
    file_url: '',
  });

  // ============================================================================
  // Queries
  // ============================================================================
  const { data: entries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sds_records', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('sds_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sds_master_number', { ascending: true });
      if (error) {
        console.warn('SDS query error:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!organizationId,
  });

  // ============================================================================
  // Duplicate Detection
  // ============================================================================
  useEffect(() => {
    if (!formData.product_name || formData.product_name.length < 3 || editingEntry) {
      setDuplicateMatches([]);
      setShowDuplicateWarning(false);
      return;
    }

    const matches = entries
      .filter(e => editingEntry ? e.id !== editingEntry.id : true)
      .map(e => ({
        ...e,
        score: Math.max(
          fuzzyMatch(e.product_name, formData.product_name),
          fuzzyMatch(e.manufacturer, formData.manufacturer || ''),
          formData.cas_number ? fuzzyMatch(e.cas_number || '', formData.cas_number) : 0,
        ),
      }))
      .filter(e => e.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setDuplicateMatches(matches);
    setShowDuplicateWarning(matches.length > 0);
  }, [formData.product_name, formData.manufacturer, formData.cas_number, entries, editingEntry]);

  // ============================================================================
  // Mutations
  // ============================================================================
  const createMutation = useMutation({
    mutationFn: async (record: any) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('sds_records')
        .insert([{ ...record, organization_id: organizationId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sds_records'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('sds_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sds_records'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sds_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sds_records'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================
  const resetForm = () => {
    setFormData({
      product_name: '',
      manufacturer: '',
      manufacturer_phone: '',
      emergency_phone: '',
      cas_number: '',
      sds_number: '',
      primary_department: '',
      physical_state: '',
      signal_word: 'warning',
      hazard_class: [],
      hazard_statements: [],
      precautionary_statements: [],
      location_used: [],
      department_codes: [],
      first_aid_inhalation: '',
      first_aid_skin: '',
      first_aid_eye: '',
      first_aid_ingestion: '',
      spill_procedures: '',
      storage_requirements: '',
      handling_precautions: '',
      fire_extinguishing_media: '',
      disposal_methods: '',
      issue_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      revision_date: '',
      notes: '',
      file_url: '',
    });
    setEditingEntry(null);
    setDuplicateMatches([]);
    setShowDuplicateWarning(false);
  };

  const handleSave = () => {
    if (!formData.product_name.trim() || !formData.manufacturer.trim()) {
      Alert.alert('Required Fields', 'Chemical name and manufacturer are required.');
      return;
    }
    if (!formData.primary_department) {
      Alert.alert('Required Fields', 'Please select a primary department for the QR label.');
      return;
    }

    const record: any = {
      product_name: formData.product_name.trim(),
      manufacturer: formData.manufacturer.trim(),
      manufacturer_phone: formData.manufacturer_phone || null,
      emergency_phone: formData.emergency_phone || null,
      cas_number: formData.cas_number || null,
      sds_number: formData.sds_number || null,
      primary_department: formData.primary_department,
      physical_state: formData.physical_state || null,
      signal_word: formData.signal_word || 'none',
      hazard_class: formData.hazard_class,
      hazard_statements: formData.hazard_statements,
      precautionary_statements: formData.precautionary_statements,
      location_used: formData.location_used,
      department_codes: formData.department_codes,
      first_aid_inhalation: formData.first_aid_inhalation || null,
      first_aid_skin: formData.first_aid_skin || null,
      first_aid_eye: formData.first_aid_eye || null,
      first_aid_ingestion: formData.first_aid_ingestion || null,
      spill_procedures: formData.spill_procedures || null,
      storage_requirements: formData.storage_requirements || null,
      handling_precautions: formData.handling_precautions || null,
      fire_extinguishing_media: formData.fire_extinguishing_media || null,
      disposal_methods: formData.disposal_methods || null,
      issue_date: formData.issue_date || new Date().toISOString().split('T')[0],
      expiration_date: formData.expiration_date || null,
      revision_date: formData.revision_date || null,
      notes: formData.notes || null,
      file_url: formData.file_url || null,
      status: 'active',
      version: '1.0',
      approved_for_use: true,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...record });
    } else {
      createMutation.mutate(record);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      product_name: entry.product_name || '',
      manufacturer: entry.manufacturer || '',
      manufacturer_phone: entry.manufacturer_phone || '',
      emergency_phone: entry.emergency_phone || '',
      cas_number: entry.cas_number || '',
      sds_number: entry.sds_number || '',
      primary_department: entry.primary_department || '',
      physical_state: entry.physical_state || '',
      signal_word: entry.signal_word || 'warning',
      hazard_class: entry.hazard_class || [],
      hazard_statements: entry.hazard_statements || [],
      precautionary_statements: entry.precautionary_statements || [],
      location_used: entry.location_used || [],
      department_codes: entry.department_codes || [],
      first_aid_inhalation: entry.first_aid_inhalation || '',
      first_aid_skin: entry.first_aid_skin || '',
      first_aid_eye: entry.first_aid_eye || '',
      first_aid_ingestion: entry.first_aid_ingestion || '',
      spill_procedures: entry.spill_procedures || '',
      storage_requirements: entry.storage_requirements || '',
      handling_precautions: entry.handling_precautions || '',
      fire_extinguishing_media: entry.fire_extinguishing_media || '',
      disposal_methods: entry.disposal_methods || '',
      issue_date: entry.issue_date || '',
      expiration_date: entry.expiration_date || '',
      revision_date: entry.revision_date || '',
      notes: entry.notes || '',
      file_url: entry.file_url || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (entry: any) => {
    const label = getQRLabel(entry.primary_department, entry.sds_master_number);
    Alert.alert(
      'Delete SDS Record',
      `Are you sure you want to delete "${entry.product_name}" (${label})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(entry.id),
        },
      ]
    );
  };

  const handleViewDetail = (entry: any) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const handlePrintQR = (entry: any) => {
    setSelectedEntry(entry);
    setShowPrintQRModal(true);
  };

  const handleViewSDS = (entry: any) => {
    if (entry.file_url) {
      Linking.openURL(entry.file_url);
    } else {
      Alert.alert('No PDF', 'No SDS document has been uploaded for this chemical yet.');
    }
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData(prev => {
      const arr = (prev as any)[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  // ============================================================================
  // Filtered entries
  // ============================================================================
  const filteredEntries = useMemo(() => {
    return entries.filter((entry: any) => {
      const matchesSearch = searchQuery === '' ||
        entry.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.cas_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.sds_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(entry.sds_master_number).includes(searchQuery);

      const matchesStatus = !filterStatus || entry.status === filterStatus;
      const matchesDept = !filterDepartment || entry.primary_department === filterDepartment;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [entries, searchQuery, filterStatus, filterDepartment]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // ============================================================================
  // Render Entry Card
  // ============================================================================
  const renderEntryCard = (entry: any) => {
    const statusColor = getStatusColor(entry.status || 'active');
    const deptInfo = DEPARTMENT_PREFIXES[entry.primary_department] || DEPARTMENT_PREFIXES.general;
    const qrLabel = getQRLabel(entry.primary_department, entry.sds_master_number);

    return (
      <Pressable
        key={entry.id}
        style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewDetail(entry)}
      >
        {/* Header: Master # + Name + Status */}
        <View style={styles.entryHeader}>
          <View style={styles.entryTitleRow}>
            <View style={[styles.masterNumberBadge, { backgroundColor: deptInfo.color + '20', borderColor: deptInfo.color + '40' }]}>
              <Text style={[styles.masterNumberText, { color: deptInfo.color }]}>
                #{entry.sds_master_number || '?'}
              </Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
                {entry.product_name}
              </Text>
              <Text style={[styles.qrLabelText, { color: deptInfo.color }]}>
                {qrLabel}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(entry.status || 'active')}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.entryDetails}>
          <View style={styles.detailRow}>
            <Building size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {entry.manufacturer}
            </Text>
          </View>
          {entry.cas_number && (
            <View style={styles.detailRow}>
              <Hash size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                CAS: {entry.cas_number}
              </Text>
            </View>
          )}
          {entry.emergency_phone && (
            <View style={styles.detailRow}>
              <Phone size={14} color="#EF4444" />
              <Text style={[styles.detailText, { color: '#EF4444' }]}>
                Emergency: {entry.emergency_phone}
              </Text>
            </View>
          )}
        </View>

        {/* Hazard badges */}
        <View style={styles.hazardRow}>
          {entry.signal_word && entry.signal_word !== 'none' && (
            <View style={[styles.signalBadge, { backgroundColor: getSignalWordColor(entry.signal_word) + '20' }]}>
              <AlertTriangle size={12} color={getSignalWordColor(entry.signal_word)} />
              <Text style={[styles.signalText, { color: getSignalWordColor(entry.signal_word) }]}>
                {entry.signal_word.toUpperCase()}
              </Text>
            </View>
          )}
          {(entry.hazard_class || []).slice(0, 3).map((hazard: string, idx: number) => (
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

        {/* Locations */}
        {(entry.location_used || []).length > 0 && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {entry.location_used.join(', ')}
            </Text>
          </View>
        )}

        {/* Footer: Actions */}
        <View style={[styles.entryFooter, { borderTopColor: colors.border }]}>
          <View style={styles.dateInfo}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {entry.issue_date || 'No date'}
            </Text>
          </View>
          <View style={styles.entryActions}>
            <Pressable
              onPress={() => handleViewSDS(entry)}
              style={[styles.actionButton, { backgroundColor: '#3B82F615' }]}
            >
              <Eye size={14} color="#3B82F6" />
            </Pressable>
            <Pressable
              onPress={() => handlePrintQR(entry)}
              style={[styles.actionButton, { backgroundColor: '#8B5CF615' }]}
            >
              <QrCode size={14} color="#8B5CF6" />
            </Pressable>
            <Pressable
              onPress={() => handleEdit(entry)}
              style={[styles.actionButton, { backgroundColor: '#F59E0B15' }]}
            >
              <Edit3 size={14} color="#F59E0B" />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(entry)}
              style={[styles.actionButton, { backgroundColor: '#EF444415' }]}
            >
              <Trash2 size={14} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================
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

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search chemicals, manufacturers, CAS #, SDS #..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterModal(true);
          }}
          style={[styles.filterButton, { backgroundColor: (filterStatus || filterDepartment) ? '#EAB30820' : colors.card }]}
        >
          <Filter size={18} color={(filterStatus || filterDepartment) ? '#EAB308' : colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{entries.filter((e: any) => e.status === 'active').length}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{entries.filter((e: any) => e.status === 'expired').length}</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Expired</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{entries.length}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Total</Text>
          </View>
        </View>

        {/* List */}
        {isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading SDS records...</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No SDS records found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap + to add an SDS record</Text>
          </View>
        ) : (
          filteredEntries.map(renderEntryCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB */}
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

      {/* ================================================================== */}
      {/* ADD/EDIT MODAL */}
      {/* ================================================================== */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingEntry ? 'Edit SDS Record' : 'Add SDS Record'}
            </Text>
            <Pressable onPress={handleSave} disabled={isMutating}>
              {isMutating ? (
                <ActivityIndicator size="small" color="#EAB308" />
              ) : (
                <Text style={[styles.saveButton, { color: '#EAB308' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Duplicate Warning */}
            {showDuplicateWarning && !editingEntry && (
              <View style={[styles.duplicateWarning, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B40' }]}>
                <View style={styles.duplicateHeader}>
                  <Info size={18} color="#F59E0B" />
                  <Text style={styles.duplicateTitle}>Similar chemicals found!</Text>
                </View>
                {duplicateMatches.map((match: any) => (
                  <View key={match.id} style={[styles.duplicateItem, { backgroundColor: '#FFFFFF', borderColor: '#F59E0B30' }]}>
                    <View style={styles.duplicateInfo}>
                      <Text style={styles.duplicateItemName}>{match.product_name}</Text>
                      <Text style={styles.duplicateItemMfr}>{match.manufacturer}</Text>
                      <Text style={styles.duplicateItemLabel}>
                        {getQRLabel(match.primary_department, match.sds_master_number)}
                      </Text>
                    </View>
                    <Text style={styles.duplicateScore}>
                      {Math.round(match.score * 100)}% match
                    </Text>
                  </View>
                ))}
                <Text style={styles.duplicateNote}>
                  If this is the same chemical, consider editing the existing record instead.
                </Text>
              </View>
            )}

            {/* Chemical Name */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Chemical / Product Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter chemical or product name"
              placeholderTextColor={colors.textSecondary}
              value={formData.product_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, product_name: text }))}
            />

            {/* Manufacturer */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Manufacturer *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter manufacturer name"
              placeholderTextColor={colors.textSecondary}
              value={formData.manufacturer}
              onChangeText={(text) => setFormData(prev => ({ ...prev, manufacturer: text }))}
            />

            {/* Primary Department (for QR label) */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Primary Department * (QR Label Prefix)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
              <View style={styles.deptRow}>
                {DEPARTMENTS.map(dept => (
                  <Pressable
                    key={dept.value}
                    style={[
                      styles.deptChip,
                      {
                        backgroundColor: formData.primary_department === dept.value ? dept.color + '20' : colors.surface,
                        borderColor: formData.primary_department === dept.value ? dept.color : colors.border,
                      },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, primary_department: dept.value }))}
                  >
                    {formData.primary_department === dept.value && (
                      <Check size={14} color={dept.color} />
                    )}
                    <Text style={[
                      styles.deptChipText,
                      { color: formData.primary_department === dept.value ? dept.color : colors.textSecondary },
                    ]}>
                      {dept.prefix} - {dept.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {formData.primary_department ? (
              <Text style={[styles.qrPreviewText, { color: DEPARTMENT_PREFIXES[formData.primary_department]?.color || '#666' }]}>
                QR Label: {DEPARTMENT_PREFIXES[formData.primary_department]?.prefix || 'SDS'} SDS #{editingEntry?.sds_master_number || 'auto'}
              </Text>
            ) : null}

            {/* Phones */}
            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Mfr Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Phone"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.manufacturer_phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, manufacturer_phone: text }))}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.colHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Emergency Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Emergency"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.emergency_phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, emergency_phone: text }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* CAS / SDS Number */}
            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>CAS Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="CAS #"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.cas_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, cas_number: text }))}
                />
              </View>
              <View style={styles.colHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>SDS Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Vendor SDS #"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.sds_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, sds_number: text }))}
                />
              </View>
            </View>

            {/* Signal Word */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Signal Word</Text>
            <View style={styles.signalWordRow}>
              {(['danger', 'warning', 'none'] as const).map((word) => (
                <Pressable
                  key={word}
                  style={[
                    styles.signalWordOption,
                    {
                      backgroundColor: formData.signal_word === word ? getSignalWordColor(word) + '20' : colors.surface,
                      borderColor: formData.signal_word === word ? getSignalWordColor(word) : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, signal_word: word }))}
                >
                  <Text style={[
                    styles.signalWordText,
                    { color: formData.signal_word === word ? getSignalWordColor(word) : colors.textSecondary },
                  ]}>
                    {word.charAt(0).toUpperCase() + word.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Hazard Classes */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Classes</Text>
            <View style={styles.chipContainer}>
              {HAZARD_CLASSES.map((hazard) => (
                <Pressable
                  key={hazard}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.hazard_class.includes(hazard) ? '#EAB30820' : colors.surface,
                      borderColor: formData.hazard_class.includes(hazard) ? '#EAB308' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('hazard_class', hazard)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.hazard_class.includes(hazard) ? '#EAB308' : colors.textSecondary },
                  ]}>
                    {hazard}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Storage Locations */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Storage Locations</Text>
            <View style={styles.chipContainer}>
              {LOCATIONS.map((location) => (
                <Pressable
                  key={location}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.location_used.includes(location) ? '#3B82F620' : colors.surface,
                      borderColor: formData.location_used.includes(location) ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('location_used', location)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.location_used.includes(location) ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {location}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Dates */}
            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Issue Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.issue_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, issue_date: text }))}
                />
              </View>
              <View style={styles.colHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Expiration Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.expiration_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, expiration_date: text }))}
                />
              </View>
            </View>

            {/* First Aid */}
            <Text style={[styles.sectionHeader, { color: colors.text }]}>First Aid Measures</Text>
            {(['first_aid_inhalation', 'first_aid_skin', 'first_aid_eye', 'first_aid_ingestion'] as const).map((field) => (
              <View key={field}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {field.replace('first_aid_', '').charAt(0).toUpperCase() + field.replace('first_aid_', '').slice(1)}
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder={`First aid for ${field.replace('first_aid_', '')}...`}
                  placeholderTextColor={colors.textSecondary}
                  value={formData[field]}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, [field]: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            ))}

            {/* Spill / Storage */}
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Handling & Storage</Text>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Spill Procedures</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Spill cleanup procedures..."
              placeholderTextColor={colors.textSecondary}
              value={formData.spill_procedures}
              onChangeText={(text) => setFormData(prev => ({ ...prev, spill_procedures: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Storage Requirements</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Storage requirements..."
              placeholderTextColor={colors.textSecondary}
              value={formData.storage_requirements}
              onChangeText={(text) => setFormData(prev => ({ ...prev, storage_requirements: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Notes */}
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

            {/* SDS File URL (manual for now) */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>SDS Document URL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="https://... (paste PDF link or upload later)"
              placeholderTextColor={colors.textSecondary}
              value={formData.file_url}
              onChangeText={(text) => setFormData(prev => ({ ...prev, file_url: text }))}
              autoCapitalize="none"
              keyboardType="url"
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* DETAIL MODAL */}
      {/* ================================================================== */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
            {selectedEntry && (
              <>
                <View style={[styles.detailModalHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.detailHeaderLeft}>
                    <View style={[styles.sdsIconBadge, { backgroundColor: '#EF4444' + '20' }]}>
                      <AlertTriangle size={24} color="#EF4444" />
                    </View>
                    <View style={styles.detailHeaderInfo}>
                      <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
                        {selectedEntry.product_name}
                      </Text>
                      <Text style={[styles.detailSubtitle, { color: DEPARTMENT_PREFIXES[selectedEntry.primary_department]?.color || '#666' }]}>
                        {getQRLabel(selectedEntry.primary_department, selectedEntry.sds_master_number)}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setShowDetailModal(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.detailContent}>
                  {/* QR Section */}
                  <View style={[styles.qrSection, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                    <View style={styles.qrLarge}>
                      <QrCode size={100} color="#000000" />
                    </View>
                    <Text style={styles.qrLabelLarge}>
                      {getQRLabel(selectedEntry.primary_department, selectedEntry.sds_master_number)}
                    </Text>
                    <Text style={styles.qrUrl}>tulkenz.app/sds/{selectedEntry.id}</Text>
                    <Text style={styles.qrNote}>Scan for instant SDS access — no login required</Text>
                  </View>

                  {/* Detail rows */}
                  <View style={[styles.detailsList, { borderColor: colors.border }]}>
                    {[
                      { label: 'Manufacturer', value: selectedEntry.manufacturer },
                      { label: 'CAS Number', value: selectedEntry.cas_number },
                      { label: 'SDS Number', value: selectedEntry.sds_number },
                      { label: 'Emergency Phone', value: selectedEntry.emergency_phone },
                      { label: 'Signal Word', value: selectedEntry.signal_word?.toUpperCase() },
                      { label: 'Physical State', value: selectedEntry.physical_state },
                      { label: 'Issue Date', value: selectedEntry.issue_date },
                      { label: 'Expiration', value: selectedEntry.expiration_date },
                    ].filter(r => r.value).map((row, idx) => (
                      <View key={idx} style={[styles.detailListRow, idx > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.detailListLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                        <Text style={[styles.detailListValue, { color: colors.text }]}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={[styles.detailFooter, { borderTopColor: colors.border }]}>
                  <Pressable
                    style={[styles.detailBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => { setShowDetailModal(false); handleViewSDS(selectedEntry); }}
                  >
                    <Eye size={16} color="#FFFFFF" />
                    <Text style={styles.detailBtnText}>View SDS</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.detailBtn, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => { setShowDetailModal(false); handlePrintQR(selectedEntry); }}
                  >
                    <QrCode size={16} color="#FFFFFF" />
                    <Text style={styles.detailBtnText}>Print QR</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.detailBtn, { backgroundColor: '#F59E0B' }]}
                    onPress={() => { setShowDetailModal(false); handleEdit(selectedEntry); }}
                  >
                    <Edit3 size={16} color="#FFFFFF" />
                    <Text style={styles.detailBtnText}>Edit</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* PRINT QR MODAL */}
      {/* ================================================================== */}
      <Modal visible={showPrintQRModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.printModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.printModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.printModalTitle, { color: colors.text }]}>Print QR Code</Text>
              <Pressable onPress={() => setShowPrintQRModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedEntry && (
              <ScrollView style={styles.printModalContent}>
                {/* QR Preview with Label */}
                <View style={[styles.qrPreviewCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                  <View style={styles.qrPreviewInner}>
                    <QrCode size={120} color="#000000" />
                  </View>
                  <Text style={styles.qrPreviewLabel}>
                    {getQRLabel(selectedEntry.primary_department, selectedEntry.sds_master_number)}
                  </Text>
                  <Text style={styles.qrPreviewName}>{selectedEntry.product_name}</Text>
                  <Text style={styles.qrPreviewScan}>SCAN FOR SDS</Text>
                </View>

                {/* Size Options */}
                <Text style={[styles.printSectionTitle, { color: colors.text }]}>Label Size</Text>
                <View style={styles.sizeOptions}>
                  {QR_PRINT_SIZES.map(size => (
                    <Pressable
                      key={size.id}
                      style={[
                        styles.sizeOption,
                        {
                          backgroundColor: printSize === size.id ? colors.primary + '20' : colors.background,
                          borderColor: printSize === size.id ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setPrintSize(size.id)}
                    >
                      {printSize === size.id && <Check size={16} color={colors.primary} />}
                      <Text style={[styles.sizeOptionText, { color: printSize === size.id ? colors.primary : colors.text }]}>
                        {size.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={[styles.printModalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.downloadPngBtn, { borderColor: colors.border }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Download', 'QR code PNG download — requires react-native-qrcode-svg library. Coming soon!');
                }}
              >
                <Download size={18} color={colors.text} />
                <Text style={[styles.downloadPngText, { color: colors.text }]}>Download PNG</Text>
              </Pressable>
              <Pressable
                style={[styles.printBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Print', 'QR code print — requires react-native-qrcode-svg library. Coming soon!');
                  setShowPrintQRModal(false);
                }}
              >
                <Printer size={18} color="#FFFFFF" />
                <Text style={styles.printBtnTextLarge}>Print QR Label</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* FILTER MODAL */}
      {/* ================================================================== */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={[styles.filterSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>Filter SDS Index</Text>
              <Pressable onPress={() => { setFilterStatus(null); setFilterDepartment(null); }}>
                <Text style={[styles.clearFilters, { color: '#EAB308' }]}>Clear All</Text>
              </Pressable>
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
            <View style={styles.filterOptions}>
              {[
                { value: null, label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'expired', label: 'Expired' },
                { value: 'superseded', label: 'Superseded' },
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

            <Text style={[styles.filterLabel, { color: colors.text }]}>Department</Text>
            <View style={styles.filterOptions}>
              <Pressable
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: filterDepartment === null ? '#3B82F620' : colors.card,
                    borderColor: filterDepartment === null ? '#3B82F6' : colors.border,
                  },
                ]}
                onPress={() => setFilterDepartment(null)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: filterDepartment === null ? '#3B82F6' : colors.text },
                ]}>
                  All
                </Text>
              </Pressable>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept.value}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: filterDepartment === dept.value ? dept.color + '20' : colors.card,
                      borderColor: filterDepartment === dept.value ? dept.color : colors.border,
                    },
                  ]}
                  onPress={() => setFilterDepartment(dept.value)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: filterDepartment === dept.value ? dept.color : colors.text },
                  ]}>
                    {dept.prefix}
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

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, margin: 16, marginBottom: 0, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, height: 48 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  filterButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' as const, borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: '700' as const },
  statLabel: { fontSize: 11, fontWeight: '500' as const },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center' as const },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '500' as const },
  emptySubtext: { marginTop: 4, fontSize: 14 },

  // Entry Card
  entryCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  entryHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 10 },
  entryTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 10 },
  masterNumberBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  masterNumberText: { fontSize: 13, fontWeight: '700' as const },
  titleBlock: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: '600' as const },
  qrLabelText: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  entryDetails: { marginBottom: 8, gap: 4 },
  detailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  detailText: { fontSize: 12 },
  hazardRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 },
  signalBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  signalText: { fontSize: 11, fontWeight: '600' as const },
  hazardBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  hazardText: { fontSize: 11 },
  moreHazards: { fontSize: 11, alignSelf: 'center' as const },
  locationRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 8 },
  locationText: { fontSize: 12, flex: 1 },
  entryFooter: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, borderTopWidth: 1, paddingTop: 10 },
  dateInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dateText: { fontSize: 11 },
  entryActions: { flexDirection: 'row' as const, gap: 6 },
  actionButton: { width: 32, height: 32, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const },

  // FAB
  fab: { position: 'absolute' as const, right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center' as const, justifyContent: 'center' as const, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },

  // Modal shared
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalBottomPadding: { height: 60 },

  // Form
  inputLabel: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6, marginTop: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '700' as const, marginTop: 24, marginBottom: 4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 70 },
  twoCol: { flexDirection: 'row' as const, gap: 12 },
  colHalf: { flex: 1 },
  signalWordRow: { flexDirection: 'row' as const, gap: 10 },
  signalWordOption: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  signalWordText: { fontSize: 14, fontWeight: '600' as const },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 13 },
  deptScroll: { marginBottom: 4 },
  deptRow: { flexDirection: 'row' as const, gap: 8, paddingVertical: 4 },
  deptChip: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 6 },
  deptChipText: { fontSize: 12, fontWeight: '500' as const },
  qrPreviewText: { fontSize: 13, fontWeight: '600' as const, marginTop: 6, marginBottom: 4 },

  // Duplicate Warning
  duplicateWarning: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  duplicateHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 10 },
  duplicateTitle: { fontSize: 14, fontWeight: '600' as const, color: '#92400E' },
  duplicateItem: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 6 },
  duplicateInfo: { flex: 1 },
  duplicateItemName: { fontSize: 13, fontWeight: '600' as const, color: '#1A1A2E' },
  duplicateItemMfr: { fontSize: 12, color: '#666', marginTop: 2 },
  duplicateItemLabel: { fontSize: 11, fontWeight: '600' as const, color: '#8B5CF6', marginTop: 2 },
  duplicateScore: { fontSize: 11, color: '#F59E0B', fontWeight: '600' as const },
  duplicateNote: { fontSize: 12, color: '#92400E', fontStyle: 'italic' as const, marginTop: 4 },

  // Detail Modal
  detailModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  detailModalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 20, borderBottomWidth: 1, gap: 12 },
  detailHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 12 },
  sdsIconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  detailHeaderInfo: { flex: 1 },
  detailTitle: { fontSize: 16, fontWeight: '600' as const },
  detailSubtitle: { fontSize: 13, fontWeight: '600' as const, marginTop: 2 },
  detailContent: { padding: 20 },
  qrSection: { alignItems: 'center' as const, padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  qrLarge: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12 },
  qrLabelLarge: { fontSize: 18, fontWeight: '700' as const, color: '#1A1A2E', marginBottom: 4 },
  qrUrl: { fontSize: 11, color: '#666', marginBottom: 8 },
  qrNote: { fontSize: 12, color: '#10B981', fontWeight: '500' as const, textAlign: 'center' as const },
  detailsList: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' as const },
  detailListRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 14, paddingVertical: 12 },
  detailListLabel: { fontSize: 13 },
  detailListValue: { fontSize: 13, fontWeight: '500' as const },
  detailFooter: { flexDirection: 'row' as const, gap: 10, padding: 20, borderTopWidth: 1 },
  detailBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 12, borderRadius: 10, gap: 6 },
  detailBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },

  // Print QR Modal
  printModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  printModalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 20, borderBottomWidth: 1 },
  printModalTitle: { fontSize: 18, fontWeight: '600' as const },
  printModalContent: { padding: 20 },
  printSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12, marginTop: 20 },
  qrPreviewCard: { alignItems: 'center' as const, padding: 24, borderRadius: 16, borderWidth: 1 },
  qrPreviewInner: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16 },
  qrPreviewLabel: { fontSize: 18, fontWeight: '700' as const, color: '#1A1A2E' },
  qrPreviewName: { fontSize: 14, color: '#666', marginTop: 4 },
  qrPreviewScan: { fontSize: 10, color: '#999', marginTop: 8, letterSpacing: 2 },
  sizeOptions: { gap: 10 },
  sizeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  sizeOptionText: { fontSize: 14, fontWeight: '500' as const },
  printModalFooter: { flexDirection: 'row' as const, gap: 12, padding: 20, borderTopWidth: 1 },
  downloadPngBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  downloadPngText: { fontSize: 14, fontWeight: '600' as const },
  printBtn: { flex: 2, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 12, gap: 8 },
  printBtnTextLarge: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },

  // Filter Modal
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  filterSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  filterHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 20 },
  filterTitle: { fontSize: 18, fontWeight: '600' as const },
  clearFilters: { fontSize: 14, fontWeight: '500' as const },
  filterLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 10, marginTop: 10 },
  filterOptions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  filterOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterOptionText: { fontSize: 13, fontWeight: '500' as const },
  applyFilterButton: { marginTop: 24, paddingVertical: 14, borderRadius: 10, alignItems: 'center' as const },
  applyFilterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 80 },
});
