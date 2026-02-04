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
  Package,
  Cog,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ArrowLeftRight,
  CheckCircle,
  MapPin,
  Hash,
  Layers,
  Factory,
  Filter,
  ArrowUpRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMROPartsQuery, type MROPart, type EquipmentAssociation } from '@/hooks/useSupabaseMROParts';
import { useEquipmentQuery, ExtendedEquipment } from '@/hooks/useSupabaseEquipment';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

type ViewMode = 'by_equipment' | 'by_part';

interface EquipmentWithParts {
  equipment: ExtendedEquipment;
  parts: { part: MROPart; association: EquipmentAssociation }[];
  totalParts: number;
  recommendedParts: number;
}

interface PartWithEquipment {
  part: MROPart;
  equipmentList: EquipmentAssociation[];
  totalEquipment: number;
}

const STOCK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_stock: { label: 'In Stock', color: '#10B981' },
  low_stock: { label: 'Low Stock', color: '#F59E0B' },
  critical: { label: 'Critical', color: '#EF4444' },
  out_of_stock: { label: 'Out of Stock', color: '#DC2626' },
  overstocked: { label: 'Overstocked', color: '#3B82F6' },
};

export default function WhereUsedScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { data: equipment = [], refetch: refetchEquipment } = useEquipmentQuery();

  const [viewMode, setViewMode] = useState<ViewMode>('by_equipment');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedPart, setSelectedPart] = useState<MROPart | null>(null);
  const [showPartModal, setShowPartModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRecommendedOnly, setFilterRecommendedOnly] = useState(false);
  
  const { data: mroParts = [], refetch } = useMROPartsQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchEquipment(),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchEquipment, queryClient]);

  const equipmentWithParts = useMemo((): EquipmentWithParts[] => {
    return equipment
      .filter(eq => (eq as any).hierarchy_level === 'equipment' || (eq as any).hierarchy_level === 'component' || !(eq as any).hierarchy_level)
      .map(eq => {
        const partsForEquipment = mroParts
          .filter(part => part.equipmentAssociations.some(a => a.equipmentId === eq.id))
          .map(part => ({
            part,
            association: part.equipmentAssociations.find(a => a.equipmentId === eq.id)!,
          }));
        
        return {
          equipment: eq,
          parts: partsForEquipment,
          totalParts: partsForEquipment.length,
          recommendedParts: partsForEquipment.filter(p => p.association.isRecommended).length,
        };
      })
      .filter(ewp => ewp.totalParts > 0)
      .sort((a, b) => b.totalParts - a.totalParts);
  }, [equipment, mroParts]);

  const partsWithEquipment = useMemo((): PartWithEquipment[] => {
    return mroParts
      .filter(part => part.equipmentAssociations.length > 0)
      .map(part => ({
        part,
        equipmentList: part.equipmentAssociations,
        totalEquipment: part.equipmentAssociations.length,
      }))
      .sort((a, b) => b.totalEquipment - a.totalEquipment);
  }, [mroParts]);

  const filteredEquipmentWithParts = useMemo(() => {
    let result = equipmentWithParts;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ewp =>
        ewp.equipment.name.toLowerCase().includes(query) ||
        ((ewp.equipment as any).asset_tag || ewp.equipment.equipment_tag || '').toLowerCase().includes(query) ||
        ewp.parts.some(p => 
          p.part.partNumber.toLowerCase().includes(query) ||
          p.part.name.toLowerCase().includes(query)
        )
      );
    }
    
    if (filterRecommendedOnly) {
      result = result.filter(ewp => ewp.recommendedParts > 0);
    }
    
    return result;
  }, [equipmentWithParts, searchQuery, filterRecommendedOnly]);

  const filteredPartsWithEquipment = useMemo(() => {
    let result = partsWithEquipment;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(pwe =>
        pwe.part.partNumber.toLowerCase().includes(query) ||
        pwe.part.name.toLowerCase().includes(query) ||
        pwe.part.category.toLowerCase().includes(query) ||
        pwe.equipmentList.some(eq =>
          eq.equipmentName.toLowerCase().includes(query) ||
          (eq.equipmentTag || '').toLowerCase().includes(query)
        )
      );
    }
    
    if (filterRecommendedOnly) {
      result = result.map(pwe => ({
        ...pwe,
        equipmentList: pwe.equipmentList.filter(eq => eq.isRecommended),
        totalEquipment: pwe.equipmentList.filter(eq => eq.isRecommended).length,
      })).filter(pwe => pwe.totalEquipment > 0);
    }
    
    return result;
  }, [partsWithEquipment, searchQuery, filterRecommendedOnly]);

  const toggleExpand = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleViewPart = useCallback((part: MROPart) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPart(part);
    setShowPartModal(true);
  }, []);

  const handleNavigateToEquipment = useCallback((equipmentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPartModal(false);
    router.push(`/cmms/equipmentdetail?id=${equipmentId}`);
  }, [router]);

  const expandAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMode === 'by_equipment') {
      setExpandedItems(new Set(filteredEquipmentWithParts.map(e => e.equipment.id)));
    } else {
      setExpandedItems(new Set(filteredPartsWithEquipment.map(p => p.part.id)));
    }
  }, [viewMode, filteredEquipmentWithParts, filteredPartsWithEquipment]);

  const collapseAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItems(new Set());
  }, []);

  const stats = useMemo(() => {
    const totalParts = mroParts.filter(p => p.equipmentAssociations.length > 0).length;
    const totalEquipment = equipmentWithParts.length;
    const totalAssociations = mroParts.reduce((sum, p) => sum + p.equipmentAssociations.length, 0);
    const recommendedAssociations = mroParts.reduce(
      (sum, p) => sum + p.equipmentAssociations.filter(a => a.isRecommended).length, 
      0
    );
    return { totalParts, totalEquipment, totalAssociations, recommendedAssociations };
  }, [mroParts, equipmentWithParts]);

  const renderEquipmentView = useCallback(() => {
    return filteredEquipmentWithParts.map(ewp => {
      const isExpanded = expandedItems.has(ewp.equipment.id);
      
      return (
        <View key={ewp.equipment.id} style={[styles.treeItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={styles.treeHeader}
            onPress={() => toggleExpand(ewp.equipment.id)}
          >
            <View style={styles.headerLeft}>
              {isExpanded ? (
                <ChevronDown size={18} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={18} color={colors.textSecondary} />
              )}
              <View style={[styles.iconBox, { backgroundColor: '#F59E0B15' }]}>
                <Cog size={18} color="#F59E0B" />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {ewp.equipment.name}
                </Text>
                <View style={styles.tagRow}>
                  <Hash size={10} color={colors.textSecondary} />
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                    {(ewp.equipment as any).asset_tag || ewp.equipment.equipment_tag || ewp.equipment.id.slice(-8).toUpperCase()}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin size={10} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {ewp.equipment.location || 'No location'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
                <Package size={12} color={colors.primary} />
                <Text style={[styles.countText, { color: colors.primary }]}>{ewp.totalParts}</Text>
              </View>
              {ewp.recommendedParts > 0 && (
                <View style={[styles.countBadge, { backgroundColor: '#10B98115' }]}>
                  <CheckCircle size={12} color="#10B981" />
                  <Text style={[styles.countText, { color: '#10B981' }]}>{ewp.recommendedParts}</Text>
                </View>
              )}
            </View>
          </Pressable>
          
          {isExpanded && (
            <View style={[styles.childrenContainer, { borderTopColor: colors.border }]}>
              {ewp.parts.map(({ part, association }) => {
                const stockConfig = STOCK_STATUS_CONFIG[part.stockStatus] || STOCK_STATUS_CONFIG.in_stock;
                return (
                  <Pressable
                    key={part.id}
                    style={[styles.partRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleViewPart(part)}
                  >
                    <View style={styles.partMain}>
                      <View style={styles.partIdRow}>
                        <View style={[styles.materialIdBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.materialIdText, { color: colors.text }]}>
                            {part.partNumber}
                          </Text>
                        </View>
                        {association.isRecommended && (
                          <View style={[styles.recommendedBadge, { backgroundColor: '#10B98115' }]}>
                            <CheckCircle size={10} color="#10B981" />
                            <Text style={styles.recommendedText}>REC</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.partName, { color: colors.text }]} numberOfLines={1}>
                        {part.name}
                      </Text>
                      <View style={styles.partMeta}>
                        <View style={[styles.stockBadge, { backgroundColor: stockConfig.color + '15' }]}>
                          <View style={[styles.stockDot, { backgroundColor: stockConfig.color }]} />
                          <Text style={[styles.stockText, { color: stockConfig.color }]}>
                            {part.onHand} {part.uom}
                          </Text>
                        </View>
                        {association.quantityPerPM && (
                          <Text style={[styles.qtyPm, { color: colors.primary }]}>
                            Qty/PM: {association.quantityPerPM}
                          </Text>
                        )}
                        <Text style={[styles.binText, { color: colors.textSecondary }]}>
                          Bin: {part.binLocation}
                        </Text>
                      </View>
                      {(association as any).notes && (
                        <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {(association as any).notes}
                        </Text>
                      )}
                    </View>
                    <ArrowUpRight size={14} color={colors.textSecondary} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      );
    });
  }, [filteredEquipmentWithParts, expandedItems, colors, toggleExpand, handleViewPart]);

  const renderPartsView = useCallback(() => {
    return filteredPartsWithEquipment.map(pwe => {
      const isExpanded = expandedItems.has(pwe.part.id);
      const stockConfig = STOCK_STATUS_CONFIG[pwe.part.stockStatus] || STOCK_STATUS_CONFIG.in_stock;
      
      return (
        <View key={pwe.part.id} style={[styles.treeItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={styles.treeHeader}
            onPress={() => toggleExpand(pwe.part.id)}
          >
            <View style={styles.headerLeft}>
              {isExpanded ? (
                <ChevronDown size={18} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={18} color={colors.textSecondary} />
              )}
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                <Package size={18} color={colors.primary} />
              </View>
              <View style={styles.headerInfo}>
                <View style={styles.partHeaderRow}>
                  <View style={[styles.materialIdBadgeLarge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Hash size={12} color={colors.text} />
                    <Text style={[styles.materialIdTextLarge, { color: colors.text }]}>
                      {pwe.part.partNumber}
                    </Text>
                  </View>
                  <View style={[styles.stockBadgeSmall, { backgroundColor: stockConfig.color + '15' }]}>
                    <View style={[styles.stockDot, { backgroundColor: stockConfig.color }]} />
                    <Text style={[styles.stockTextSmall, { color: stockConfig.color }]}>
                      {pwe.part.onHand}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {pwe.part.name}
                </Text>
                <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                  {pwe.part.category} • {pwe.part.binLocation}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.countBadge, { backgroundColor: '#F59E0B15' }]}>
                <Cog size={12} color="#F59E0B" />
                <Text style={[styles.countText, { color: '#F59E0B' }]}>{pwe.totalEquipment}</Text>
              </View>
            </View>
          </Pressable>
          
          {isExpanded && (
            <View style={[styles.childrenContainer, { borderTopColor: colors.border }]}>
              {pwe.equipmentList.map((assoc, index) => (
                <Pressable
                  key={`${pwe.part.id}-${assoc.equipmentId}-${index}`}
                  style={[styles.equipmentRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleNavigateToEquipment(assoc.equipmentId)}
                >
                  <View style={styles.equipmentMain}>
                    <View style={styles.equipmentIdRow}>
                      <View style={[styles.equipmentTagBadge, { backgroundColor: '#F59E0B15' }]}>
                        <Text style={[styles.equipmentTagText, { color: '#F59E0B' }]}>
                          {assoc.equipmentTag}
                        </Text>
                      </View>
                      {assoc.isRecommended && (
                        <View style={[styles.recommendedBadge, { backgroundColor: '#10B98115' }]}>
                          <CheckCircle size={10} color="#10B981" />
                          <Text style={styles.recommendedText}>REC</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.equipmentName, { color: colors.text }]} numberOfLines={1}>
                      {assoc.equipmentName}
                    </Text>
                    <View style={styles.equipmentMeta}>
                      <View style={styles.areaRow}>
                        <MapPin size={10} color={colors.textSecondary} />
                        <Text style={[styles.areaText, { color: colors.textSecondary }]}>
                          {assoc.area}
                        </Text>
                      </View>
                      {assoc.line && (
                        <View style={styles.lineRow}>
                          <Factory size={10} color={colors.textSecondary} />
                          <Text style={[styles.lineText, { color: colors.textSecondary }]}>
                            {assoc.line}
                          </Text>
                        </View>
                      )}
                      {assoc.quantityPerPM && (
                        <Text style={[styles.qtyPm, { color: colors.primary }]}>
                          Qty/PM: {assoc.quantityPerPM}
                        </Text>
                      )}
                    </View>
                    {(assoc as any).notes && (
                      <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {(assoc as any).notes}
                      </Text>
                    )}
                  </View>
                  <ArrowUpRight size={14} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      );
    });
  }, [filteredPartsWithEquipment, expandedItems, colors, toggleExpand, handleNavigateToEquipment]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.modeToggle}>
        <Pressable
          style={[
            styles.modeButton,
            viewMode === 'by_equipment' && styles.modeButtonActive,
            { 
              backgroundColor: viewMode === 'by_equipment' ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('by_equipment');
            setExpandedItems(new Set());
          }}
        >
          <Cog size={16} color={viewMode === 'by_equipment' ? '#fff' : colors.text} />
          <Text style={[styles.modeText, { color: viewMode === 'by_equipment' ? '#fff' : colors.text }]}>
            Equipment → Parts
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.modeButton,
            viewMode === 'by_part' && styles.modeButtonActive,
            { 
              backgroundColor: viewMode === 'by_part' ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('by_part');
            setExpandedItems(new Set());
          }}
        >
          <Package size={16} color={viewMode === 'by_part' ? '#fff' : colors.text} />
          <Text style={[styles.modeText, { color: viewMode === 'by_part' ? '#fff' : colors.text }]}>
            Parts → Equipment
          </Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Package size={16} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalParts}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Parts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Cog size={16} color="#F59E0B" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalEquipment}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Equipment</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ArrowLeftRight size={16} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalAssociations}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Links</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.recommendedAssociations}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rec</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={viewMode === 'by_equipment' ? 'Search equipment or parts...' : 'Search parts or equipment...'}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[
            styles.filterButton, 
            { 
              backgroundColor: filterRecommendedOnly ? '#10B98115' : colors.surface, 
              borderColor: filterRecommendedOnly ? '#10B981' : colors.border 
            }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterRecommendedOnly(!filterRecommendedOnly);
          }}
        >
          <Filter size={14} color={filterRecommendedOnly ? '#10B981' : colors.textSecondary} />
          <Text style={[styles.filterText, { color: filterRecommendedOnly ? '#10B981' : colors.textSecondary }]}>
            Recommended Only
          </Text>
        </Pressable>
        <View style={styles.expandButtons}>
          <Pressable
            style={[styles.expandButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={expandAll}
          >
            <Layers size={14} color={colors.primary} />
            <Text style={[styles.expandText, { color: colors.primary }]}>Expand</Text>
          </Pressable>
          <Pressable
            style={[styles.expandButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={collapseAll}
          >
            <Layers size={14} color={colors.textSecondary} />
            <Text style={[styles.expandText, { color: colors.textSecondary }]}>Collapse</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {viewMode === 'by_equipment' ? (
          filteredEquipmentWithParts.length > 0 ? (
            renderEquipmentView()
          ) : (
            <View style={styles.emptyState}>
              <Cog size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Equipment Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : 'No equipment with associated parts'}
              </Text>
            </View>
          )
        ) : (
          filteredPartsWithEquipment.length > 0 ? (
            renderPartsView()
          ) : (
            <View style={styles.emptyState}>
              <Package size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Parts Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : 'No parts with equipment associations'}
              </Text>
            </View>
          )
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showPartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPartModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPartModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Package size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Part Details</Text>
              </View>
              <Pressable onPress={() => setShowPartModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            {selectedPart && (
              <ScrollView style={styles.modalScroll}>
                <View style={[styles.partDetailCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.partDetailHeader}>
                    <View style={[styles.materialIdBadgeLarge, { backgroundColor: colors.surface }]}>
                      <Hash size={14} color={colors.text} />
                      <Text style={[styles.materialIdTextLarge, { color: colors.text }]}>
                        {selectedPart.partNumber}
                      </Text>
                    </View>
                    <View style={[styles.stockBadge, { backgroundColor: STOCK_STATUS_CONFIG[selectedPart.stockStatus]?.color + '15' || '#10B98115' }]}>
                      <View style={[styles.stockDot, { backgroundColor: STOCK_STATUS_CONFIG[selectedPart.stockStatus]?.color || '#10B981' }]} />
                      <Text style={[styles.stockText, { color: STOCK_STATUS_CONFIG[selectedPart.stockStatus]?.color || '#10B981' }]}>
                        {STOCK_STATUS_CONFIG[selectedPart.stockStatus]?.label || 'In Stock'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.partDetailName, { color: colors.text }]}>
                    {selectedPart.name}
                  </Text>
                  {selectedPart.description && (
                    <Text style={[styles.partDetailDesc, { color: colors.textSecondary }]}>
                      {selectedPart.description}
                    </Text>
                  )}
                </View>

                <View style={styles.detailGrid}>
                  <View style={[styles.detailItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>On Hand</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPart.onHand} {selectedPart.uom}</Text>
                  </View>
                  <View style={[styles.detailItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPart.binLocation}</Text>
                  </View>
                  <View style={[styles.detailItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPart.category}</Text>
                  </View>
                  <View style={[styles.detailItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Unit Cost</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>${selectedPart.unitCost.toFixed(2)}</Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Where Used ({selectedPart.equipmentAssociations.length})
                </Text>
                {selectedPart.equipmentAssociations.map((assoc, index) => (
                  <Pressable
                    key={`${selectedPart.id}-modal-${assoc.equipmentId}-${index}`}
                    style={[styles.modalEquipmentItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => handleNavigateToEquipment(assoc.equipmentId)}
                  >
                    <View style={styles.modalEquipmentMain}>
                      <View style={styles.modalEquipmentHeader}>
                        <Text style={[styles.modalEquipmentTag, { color: '#F59E0B' }]}>
                          {assoc.equipmentTag}
                        </Text>
                        {assoc.isRecommended && (
                          <View style={[styles.recommendedBadge, { backgroundColor: '#10B98115' }]}>
                            <CheckCircle size={10} color="#10B981" />
                            <Text style={styles.recommendedText}>Recommended</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.modalEquipmentName, { color: colors.text }]}>
                        {assoc.equipmentName}
                      </Text>
                      <View style={styles.modalEquipmentMeta}>
                        <Text style={[styles.modalEquipmentArea, { color: colors.textSecondary }]}>
                          {assoc.area}{assoc.line ? ` • ${assoc.line}` : ''}
                        </Text>
                        {assoc.quantityPerPM && (
                          <Text style={[styles.qtyPm, { color: colors.primary }]}>
                            Qty/PM: {assoc.quantityPerPM}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ArrowUpRight size={16} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
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
  modeToggle: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  modeButtonActive: {},
  modeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  expandButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  treeItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  treeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  tagText: {
    fontSize: 11,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 11,
  },
  partHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  childrenContainer: {
    borderTopWidth: 1,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingLeft: 56,
    borderBottomWidth: 1,
  },
  partMain: {
    flex: 1,
  },
  partIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  materialIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  materialIdText: {
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily: 'monospace',
  },
  materialIdBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  materialIdTextLarge: {
    fontSize: 13,
    fontWeight: '700' as const,
    fontFamily: 'monospace',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  partName: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  partMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  stockBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  stockTextSmall: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  qtyPm: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  binText: {
    fontSize: 11,
  },
  notesText: {
    fontSize: 10,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingLeft: 56,
    borderBottomWidth: 1,
  },
  equipmentMain: {
    flex: 1,
  },
  equipmentIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  equipmentTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  equipmentTagText: {
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily: 'monospace',
  },
  equipmentName: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  equipmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  areaText: {
    fontSize: 11,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lineText: {
    fontSize: 11,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalScroll: {
    maxHeight: 500,
  },
  partDetailCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  partDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  partDetailName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  partDetailDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    width: '48%',
    padding: 10,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  modalEquipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalEquipmentMain: {
    flex: 1,
  },
  modalEquipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalEquipmentTag: {
    fontSize: 12,
    fontWeight: '700' as const,
    fontFamily: 'monospace',
  },
  modalEquipmentName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  modalEquipmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalEquipmentArea: {
    fontSize: 12,
  },
});
