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
  Building2,
  Cog,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  ArrowUpRight,
  Layers,
  Tag,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  useEquipmentQuery,
  ExtendedEquipment,
  EquipmentStatus,
} from '@/hooks/useSupabaseEquipment';

import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  operational: { label: 'Operational', color: '#10B981', icon: CheckCircle },
  needs_maintenance: { label: 'Needs PM', color: '#F59E0B', icon: Clock },
  down: { label: 'Down', color: '#EF4444', icon: XCircle },
  retired: { label: 'Retired', color: '#6B7280', icon: AlertTriangle },
};

interface TreeNode extends ExtendedEquipment {
  children: TreeNode[];
  depth: number;
}

export default function EquipmentHierarchyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: equipment = [], refetch } = useEquipmentQuery();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['facility-1', 'facility-2']));
  const [selectedEquipment, setSelectedEquipment] = useState<ExtendedEquipment | null>(null);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const buildTree = useCallback((items: ExtendedEquipment[]): TreeNode[] => {
    const roots: TreeNode[] = items.map(item => ({
      ...item,
      children: [],
      depth: 0,
    }));

    roots.sort((a, b) => a.name.localeCompare(b.name));

    return roots;
  }, []);

  const hierarchyTree = useMemo(() => buildTree(equipment), [equipment, buildTree]);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return hierarchyTree;

    const lowerQuery = searchQuery.toLowerCase();
    const matchingIds = new Set<string>();

    const findMatches = (items: ExtendedEquipment[]) => {
      items.forEach(item => {
        if (
          item.name.toLowerCase().includes(lowerQuery) ||
          (item.equipment_tag?.toLowerCase().includes(lowerQuery)) ||
          (item.location?.toLowerCase().includes(lowerQuery))
        ) {
          matchingIds.add(item.id);
        }
      });
    };
    findMatches(equipment);

    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .filter(node => matchingIds.has(node.id))
        .map(node => ({
          ...node,
          children: filterTree(node.children),
        }));
    };

    return filterTree(hierarchyTree);
  }, [hierarchyTree, searchQuery, equipment]);

  const getWhereUsedParts = useCallback((equipmentId: string): string[] => {
    return [];
  }, []);

  const toggleExpand = useCallback((nodeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodePress = useCallback((node: ExtendedEquipment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/cmms/equipmentdetail?id=${node.id}`);
  }, [router]);

  const handleShowParts = useCallback((node: ExtendedEquipment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEquipment(node);
    setShowPartsModal(true);
  }, []);

  const expandAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const allIds = new Set(equipment.map(e => e.id));
    setExpandedNodes(allIds);
  }, [equipment]);

  const collapseAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedNodes(new Set());
  }, []);

  const stats = useMemo(() => {
    const categories: Record<string, number> = {};
    equipment.forEach(e => {
      const cat = e.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return {
      total: equipment.length,
      operational: equipment.filter(e => e.status === 'operational').length,
      down: equipment.filter(e => e.status === 'down').length,
      categories,
    };
  }, [equipment]);

  const renderTreeNode = useCallback((node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const statusConfig = STATUS_CONFIG[node.status as EquipmentStatus] || STATUS_CONFIG.operational;
    const indent = node.depth * 20;

    return (
      <View key={node.id}>
        <Pressable
          style={({ pressed }) => [
            styles.treeNode,
            { 
              backgroundColor: pressed ? colors.backgroundSecondary : colors.surface,
              borderColor: colors.border,
              marginLeft: indent,
            },
          ]}
          onPress={() => handleNodePress(node)}
        >
          <View style={styles.nodeLeft}>
            {hasChildren ? (
              <Pressable 
                style={styles.expandButton} 
                onPress={() => toggleExpand(node.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isExpanded ? (
                  <ChevronDown size={18} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={18} color={colors.textSecondary} />
                )}
              </Pressable>
            ) : (
              <View style={styles.expandPlaceholder} />
            )}
            
            <View style={[styles.nodeIcon, { backgroundColor: statusConfig.color + '15' }]}>
              <Cog size={18} color={statusConfig.color} />
            </View>
            
            <View style={styles.nodeInfo}>
              <View style={styles.nodeHeader}>
                <Text style={[styles.nodeName, { color: colors.text }]} numberOfLines={1}>
                  {node.name}
                </Text>
                <View style={[styles.levelBadge, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Text style={[styles.levelText, { color: '#3B82F6' }]}>
                    {node.category || 'Equipment'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.nodeDetails}>
                <View style={styles.tagRow}>
                  <Tag size={10} color={colors.textSecondary} />
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                    {node.equipment_tag}
                  </Text>
                </View>
                
                <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.nodeRight}>
            <ArrowUpRight size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
        
        {isExpanded && node.children.map(child => renderTreeNode(child))}
      </View>
    );
  }, [expandedNodes, colors, handleNodePress, toggleExpand, getWhereUsedParts, handleShowParts]);

  

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

      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Cog size={14} color="#3B82F6" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CheckCircle size={14} color="#10B981" />
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.operational}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Operational</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <XCircle size={14} color="#EF4444" />
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.down}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Down</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={expandAll}
        >
          <Layers size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Expand All</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={collapseAll}
        >
          <Layers size={16} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Collapse All</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.treeContainer}
        contentContainerStyle={styles.treeContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredTree.length > 0 ? (
          filteredTree.map(node => renderTreeNode(node))
        ) : (
          <View style={styles.emptyState}>
            <Building2 size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Equipment Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Add equipment to get started'}
            </Text>
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showPartsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPartsModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowPartsModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.surface }]} 
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Package size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Where-Used Parts</Text>
              </View>
              <Pressable onPress={() => setShowPartsModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            {selectedEquipment && (
              <View style={[styles.equipmentInfo, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.equipmentName, { color: colors.text }]}>
                  {selectedEquipment.name}
                </Text>
                <Text style={[styles.equipmentTag, { color: colors.textSecondary }]}>
                  {selectedEquipment.equipment_tag}
                </Text>
              </View>
            )}
            
            <View style={styles.noPartsState}>
              <Package size={32} color={colors.textSecondary} />
              <Text style={[styles.noPartsText, { color: colors.textSecondary }]}>
                No parts associated with this equipment
              </Text>
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 9,
    textAlign: 'center' as const,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  treeContainer: {
    flex: 1,
  },
  treeContent: {
    paddingHorizontal: 16,
  },
  treeNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandButton: {
    width: 24,
    height: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  expandPlaceholder: {
    width: 24,
  },
  nodeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  nodeInfo: {
    flex: 1,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nodeName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  nodeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tagText: {
    fontSize: 11,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  nodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  partsCount: {
    fontSize: 12,
    fontWeight: '600' as const,
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
    maxHeight: '80%',
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
  equipmentInfo: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  equipmentTag: {
    fontSize: 12,
  },
  partsList: {
    maxHeight: 400,
  },
  partItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  partName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  recommendedText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500' as const,
  },
  partNumber: {
    fontSize: 12,
    marginBottom: 6,
  },
  partDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  partDetail: {
    fontSize: 12,
  },
  partNotes: {
    fontSize: 11,
    fontStyle: 'italic' as const,
    marginTop: 6,
  },
  noPartsState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    gap: 10,
  },
  noPartsText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
