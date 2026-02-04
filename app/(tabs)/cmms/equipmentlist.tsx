import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  Plus,
  Cog,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Tag,
  X,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  useEquipmentQuery, 
  useEquipmentMetrics,
  useEquipmentCategories,
  ExtendedEquipment,
  EquipmentStatus,
  EquipmentCriticality,
} from '@/hooks/useSupabaseEquipment';
import * as Haptics from 'expo-haptics';

type StatusFilter = 'all' | EquipmentStatus;
type CriticalityFilter = 'all' | EquipmentCriticality;

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  operational: { label: 'Operational', color: '#10B981', icon: CheckCircle },
  needs_maintenance: { label: 'Needs Maintenance', color: '#F59E0B', icon: Clock },
  down: { label: 'Down', color: '#EF4444', icon: XCircle },
  retired: { label: 'Retired', color: '#6B7280', icon: AlertTriangle },
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
};

export default function EquipmentListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const { data: equipment = [], refetch } = useEquipmentQuery();
  const { data: metrics } = useEquipmentMetrics();
  const { data: categories = [] } = useEquipmentCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<CriticalityFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(e => {
      const matchesSearch = searchQuery === '' ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.equipment_tag?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location_data?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location_data?.location_code?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.facility_data?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesCriticality = criticalityFilter === 'all' || e.criticality === criticalityFilter;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesCriticality;
    });
  }, [equipment, searchQuery, statusFilter, categoryFilter, criticalityFilter]);

  const stats = useMemo(() => ({
    total: metrics?.total ?? equipment.length,
    operational: metrics?.operational ?? equipment.filter(e => e.status === 'operational').length,
    needsMaintenance: metrics?.needsMaintenance ?? equipment.filter(e => e.status === 'needs_maintenance').length,
    down: metrics?.down ?? equipment.filter(e => e.status === 'down').length,
  }), [metrics, equipment]);

  const handleEquipmentPress = useCallback((equipmentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/cmms/equipmentdetail?id=${equipmentId}`);
  }, [router]);

  const handleAddEquipment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/cmms/equipmentregistry');
  }, [router]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setCriticalityFilter('all');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || criticalityFilter !== 'all';

  const renderEquipmentCard = useCallback((item: ExtendedEquipment) => {
    const statusConfig = STATUS_CONFIG[item.status as EquipmentStatus] || STATUS_CONFIG.operational;
    const StatusIcon = statusConfig.icon;
    const criticalityColor = CRITICALITY_COLORS[item.criticality || 'medium'];

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.equipmentCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => handleEquipmentPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.equipmentIcon, { backgroundColor: statusConfig.color + '15' }]}>
            <Cog size={24} color={statusConfig.color} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.equipmentName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.tagRow}>
              <Tag size={12} color={colors.textSecondary} />
              <Text style={[styles.assetTag, { color: colors.textSecondary }]}>
                {item.equipment_tag}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          {item.facility_data && (
            <View style={styles.infoRow}>
              <Building2 size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.facility_data.name}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.location_data 
                ? `${item.location_data.name} (${item.location_data.location_code})`
                : item.location || 'No location'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Cog size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {item.category}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <StatusIcon size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          
          <View style={[styles.criticalityBadge, { backgroundColor: criticalityColor + '15' }]}>
            <Text style={[styles.criticalityText, { color: criticalityColor }]}>
              {(item.criticality || 'medium').charAt(0).toUpperCase() + (item.criticality || 'medium').slice(1)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }, [colors, handleEquipmentPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search equipment..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[
            styles.filterButton,
            { 
              backgroundColor: hasActiveFilters ? colors.primary + '15' : colors.surface, 
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(true);
          }}
        >
          <Filter size={18} color={hasActiveFilters ? colors.primary : colors.textSecondary} />
          <Text style={[styles.filterButtonText, { color: hasActiveFilters ? colors.primary : colors.text }]}>
            Filters {hasActiveFilters && `(${[statusFilter !== 'all', categoryFilter !== 'all', criticalityFilter !== 'all'].filter(Boolean).length})`}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddEquipment}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Equipment</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.operational}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Operational</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.needsMaintenance}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Needs PM</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.down}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Down</Text>
        </View>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredEquipment.length > 0 ? (
          filteredEquipment.map(renderEquipmentCard)
        ) : (
          <View style={styles.emptyState}>
            <Cog size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Equipment Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || hasActiveFilters 
                ? 'Try adjusting your search or filters'
                : 'Add equipment to get started'}
            </Text>
            {hasActiveFilters && (
              <Pressable style={[styles.clearButton, { backgroundColor: colors.primary }]} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFilters(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
              <View style={styles.filterOptions}>
                {(['all', 'operational', 'needs_maintenance', 'down', 'retired'] as StatusFilter[]).map(status => (
                  <Pressable
                    key={status}
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: statusFilter === status ? colors.primary : colors.backgroundSecondary,
                        borderColor: statusFilter === status ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: statusFilter === status ? '#FFFFFF' : colors.text },
                    ]}>
                      {status === 'all' ? 'All' : status === 'needs_maintenance' ? 'Needs PM' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Criticality</Text>
              <View style={styles.filterOptions}>
                {(['all', 'critical', 'high', 'medium', 'low'] as CriticalityFilter[]).map(crit => (
                  <Pressable
                    key={crit}
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: criticalityFilter === crit ? colors.primary : colors.backgroundSecondary,
                        borderColor: criticalityFilter === crit ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCriticalityFilter(crit)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: criticalityFilter === crit ? '#FFFFFF' : colors.text },
                    ]}>
                      {crit === 'all' ? 'All' : crit.charAt(0).toUpperCase() + crit.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: categoryFilter === 'all' ? colors.primary : colors.backgroundSecondary,
                        borderColor: categoryFilter === 'all' ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategoryFilter('all')}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: categoryFilter === 'all' ? '#FFFFFF' : colors.text },
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {categories.map(cat => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.filterChip,
                        { 
                          backgroundColor: categoryFilter === cat ? colors.primary : colors.backgroundSecondary,
                          borderColor: categoryFilter === cat ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setCategoryFilter(cat)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: categoryFilter === cat ? '#FFFFFF' : colors.text },
                      ]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Clear All</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginLeft: 'auto',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  equipmentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  equipmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assetTag: {
    fontSize: 12,
  },
  cardBody: {
    gap: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  criticalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  criticalityText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
