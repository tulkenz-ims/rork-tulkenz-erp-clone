import React, { useState, useMemo, useCallback } from 'react';
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
  Package,
  MapPin,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Truck,
  Settings,
  TrendingDown,
  Clock,
  DollarSign,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Wrench,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  useMROPartsQuery,
  useWarehousesQuery,
  useMROPartsSummary,
  type MROPart,
  type StockStatus,
  type PartCategory,
} from '@/hooks/useSupabaseMROParts';
import {
  getStockStatusColor,
  getStockStatusLabel,
  getCriticalityColor,
} from '@/constants/mroPartsConstants';

type SortField = 'partNumber' | 'name' | 'onHand' | 'stockStatus' | 'totalValue' | 'lastUsedDate';
type SortOrder = 'asc' | 'desc';

const STOCK_STATUS_OPTIONS: { value: StockStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'critical', label: 'Critical' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'overstocked', label: 'Overstocked' },
];

const CATEGORY_OPTIONS: { value: PartCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'Bearings', label: 'Bearings' },
  { value: 'Belts & Pulleys', label: 'Belts & Pulleys' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Filters', label: 'Filters' },
  { value: 'Fluids & Lubricants', label: 'Fluids & Lubricants' },
  { value: 'Fasteners', label: 'Fasteners' },
  { value: 'Gaskets & Seals', label: 'Gaskets & Seals' },
  { value: 'Motors', label: 'Motors' },
  { value: 'Pumps', label: 'Pumps' },
  { value: 'Safety Equipment', label: 'Safety Equipment' },
  { value: 'Tools', label: 'Tools' },
  { value: 'Valves', label: 'Valves' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Hydraulic', label: 'Hydraulics' },
  { value: 'Pneumatic', label: 'Pneumatics' },
  { value: 'Sensors', label: 'Sensors' },
  { value: 'Conveyor Parts', label: 'Conveyor Parts' },
  { value: 'General MRO', label: 'General MRO' },
];

export default function PartsListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StockStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<PartCategory | 'all'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('partNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPartDetail, setShowPartDetail] = useState<MROPart | null>(null);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  const { data: parts = [], refetch } = useMROPartsQuery();
  const { data: warehouses = [] } = useWarehousesQuery();
  const { data: summary } = useMROPartsSummary();
  
  const defaultSummary = useMemo(() => ({
    totalParts: 0,
    totalValue: 0,
    outOfStockCount: 0,
    criticalStockCount: 0,
    lowStockCount: 0,
    overstockCount: 0,
    partsNeedingReorder: 0,
  }), []);
  
  const displaySummary = summary || defaultSummary;

  const filteredParts = useMemo(() => {
    let result = [...parts];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(part =>
        part.partNumber.toLowerCase().includes(query) ||
        part.name.toLowerCase().includes(query) ||
        part.category.toLowerCase().includes(query)
      );
    }
    
    if (selectedStatus !== 'all') {
      result = result.filter(p => p.stockStatus === selectedStatus);
    }
    
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }
    
    if (selectedWarehouse !== 'all') {
      result = result.filter(p => p.warehouseId === selectedWarehouse);
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'partNumber':
          comparison = a.partNumber.localeCompare(b.partNumber);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'onHand':
          comparison = a.onHand - b.onHand;
          break;
        case 'stockStatus':
          const statusOrder = { out_of_stock: 0, critical: 1, low_stock: 2, in_stock: 3, overstocked: 4 };
          comparison = statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
          break;
        case 'totalValue':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'lastUsedDate':
          comparison = (a.lastUsedDate || '').localeCompare(b.lastUsedDate || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [parts, searchQuery, selectedStatus, selectedCategory, selectedWarehouse, sortField, sortOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handlePartPress = useCallback((part: MROPart) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedPart(expandedPart === part.id ? null : part.id);
  }, [expandedPart]);

  const handleViewDetail = useCallback((part: MROPart) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPartDetail(part);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const clearFilters = useCallback(() => {
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedWarehouse('all');
    setSearchQuery('');
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedWarehouse !== 'all') count++;
    return count;
  }, [selectedStatus, selectedCategory, selectedWarehouse]);

  const renderSummaryCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.summaryIconContainer, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.summarySubtitle, { color }]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderStockStatusBadge = (status: StockStatus) => {
    const color = getStockStatusColor(status);
    const label = getStockStatusLabel(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderPartCard = ({ item }: { item: MROPart }) => {
    const isExpanded = expandedPart === item.id;
    const statusColor = getStockStatusColor(item.stockStatus);
    
    return (
      <Pressable
        style={[styles.partCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handlePartPress(item)}
      >
        <View style={styles.partCardHeader}>
          <View style={styles.partMainInfo}>
            <View style={styles.partNumberRow}>
              <Text style={[styles.partId, { color: colors.primary }]}>{item.partId}</Text>
              {item.criticality === 'critical' && (
                <View style={[styles.criticalBadge, { backgroundColor: '#EF4444' + '20' }]}>
                  <AlertTriangle size={10} color="#EF4444" />
                  <Text style={[styles.criticalText, { color: '#EF4444' }]}>Critical</Text>
                </View>
              )}
            </View>
            <Text style={[styles.partName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.partCategory, { color: colors.textSecondary }]}>
              {item.category} • {item.manufacturer || 'No Manufacturer'}
            </Text>
            <Text style={[styles.partSku, { color: colors.textSecondary }]}>
              SKU: {item.partNumber}
            </Text>
          </View>
          
          <View style={styles.partStockInfo}>
            {renderStockStatusBadge(item.stockStatus)}
            <View style={styles.stockQtyContainer}>
              <Text style={[styles.stockQty, { color: statusColor }]}>{item.onHand}</Text>
              <Text style={[styles.stockUom, { color: colors.textSecondary }]}>{item.uom}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.partCardMeta}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.binLocation}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <DollarSign size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              ${item.unitCost.toFixed(2)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Package size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Min: {item.minLevel} / Max: {item.maxLevel}
            </Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={16} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={16} color={colors.textSecondary} />
          )}
        </View>
        
        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            <View style={styles.expandedSection}>
              <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>
                Stock Levels
              </Text>
              <View style={styles.stockLevelRow}>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>On Hand</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>{item.onHand}</Text>
                </View>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>Reserved</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>{item.reservedQty}</Text>
                </View>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>Available</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.primary }]}>
                    {item.onHand - item.reservedQty}
                  </Text>
                </View>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>Reorder Pt</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>{item.reorderPoint}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.expandedSection}>
              <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>
                Usage & Value
              </Text>
              <View style={styles.stockLevelRow}>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>Avg Daily</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>{item.avgDailyUsage}</Text>
                </View>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>Days Stock</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>
                    {item.daysOfStock ?? '-'}
                  </Text>
                </View>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>Total Value</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>
                    ${item.totalValue.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.stockLevelItem}>
                  <Text style={[styles.stockLevelLabel, { color: colors.textSecondary }]}>WOs Used</Text>
                  <Text style={[styles.stockLevelValue, { color: colors.text }]}>{item.totalWorkOrdersUsed}</Text>
                </View>
              </View>
            </View>
            
            {item.equipmentAssociations.length > 0 && (
              <View style={styles.expandedSection}>
                <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>
                  Equipment (Where Used)
                </Text>
                <View style={styles.equipmentList}>
                  {item.equipmentAssociations.slice(0, 3).map((eq, idx) => (
                    <View 
                      key={idx} 
                      style={[styles.equipmentItem, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <Settings size={12} color={colors.primary} />
                      <Text style={[styles.equipmentText, { color: colors.text }]} numberOfLines={1}>
                        {eq.equipmentTag}
                      </Text>
                      {eq.isRecommended && (
                        <View style={[styles.recommendedBadge, { backgroundColor: '#10B981' + '20' }]}>
                          <CheckCircle2 size={8} color="#10B981" />
                        </View>
                      )}
                    </View>
                  ))}
                  {item.equipmentAssociations.length > 3 && (
                    <Text style={[styles.moreText, { color: colors.primary }]}>
                      +{item.equipmentAssociations.length - 3} more
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {item.vendors.length > 0 && (
              <View style={styles.expandedSection}>
                <Text style={[styles.expandedSectionTitle, { color: colors.text }]}>
                  Primary Vendor
                </Text>
                <View style={[styles.vendorInfo, { backgroundColor: colors.backgroundSecondary }]}>
                  <Truck size={14} color={colors.primary} />
                  <View style={styles.vendorDetails}>
                    <Text style={[styles.vendorName, { color: colors.text }]}>
                      {item.vendors.find(v => v.isPrimary)?.vendorName || item.vendors[0].vendorName}
                    </Text>
                    <Text style={[styles.vendorMeta, { color: colors.textSecondary }]}>
                      Lead Time: {item.vendors.find(v => v.isPrimary)?.leadTimeDays || item.vendors[0].leadTimeDays} days
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.expandedActions}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleViewDetail(item)}
              >
                <FileText size={14} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>View Details</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButtonOutline, { borderColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/cmms/workorders');
                }}
              >
                <Wrench size={14} color={colors.primary} />
                <Text style={[styles.actionButtonOutlineText, { color: colors.primary }]}>
                  Issue to WO
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.filterModal, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter Parts</Text>
            <Pressable onPress={() => setShowFilterModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <ScrollView style={styles.filterModalContent}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Stock Status</Text>
            <View style={styles.filterOptions}>
              {STOCK_STATUS_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedStatus === option.value 
                        ? colors.primary + '15' 
                        : colors.backgroundSecondary,
                      borderColor: selectedStatus === option.value 
                        ? colors.primary 
                        : 'transparent',
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedStatus(option.value);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedStatus === option.value ? colors.primary : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <Text style={[styles.filterLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.filterOptions}>
              {CATEGORY_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedCategory === option.value 
                        ? colors.primary + '15' 
                        : colors.backgroundSecondary,
                      borderColor: selectedCategory === option.value 
                        ? colors.primary 
                        : 'transparent',
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(option.value);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedCategory === option.value ? colors.primary : colors.text }
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <Text style={[styles.filterLabel, { color: colors.text }]}>Warehouse</Text>
            <View style={styles.filterOptions}>
              <Pressable
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: selectedWarehouse === 'all' 
                      ? colors.primary + '15' 
                      : colors.backgroundSecondary,
                    borderColor: selectedWarehouse === 'all' 
                      ? colors.primary 
                      : 'transparent',
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedWarehouse('all');
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedWarehouse === 'all' ? colors.primary : colors.text }
                ]}>
                  All Warehouses
                </Text>
              </Pressable>
              {warehouses.map(wh => (
                <Pressable
                  key={wh.id}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: selectedWarehouse === wh.id 
                        ? colors.primary + '15' 
                        : colors.backgroundSecondary,
                      borderColor: selectedWarehouse === wh.id 
                        ? colors.primary 
                        : 'transparent',
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedWarehouse(wh.id);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedWarehouse === wh.id ? colors.primary : colors.text }
                  ]}>
                    {wh.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          
          <View style={[styles.filterModalFooter, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.clearButton, { borderColor: colors.border }]}
              onPress={() => {
                clearFilters();
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
                Clear All
              </Text>
            </Pressable>
            <Pressable
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPartDetailModal = () => {
    if (!showPartDetail) return null;
    const part = showPartDetail;
    
    return (
      <Modal
        visible={!!showPartDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPartDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.detailModalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.detailPartId, { color: colors.primary }]}>
                  {part.partId}
                </Text>
                <Text style={[styles.detailPartName, { color: colors.text }]}>
                  {part.name}
                </Text>
                <Text style={[styles.detailPartSku, { color: colors.textSecondary }]}>
                  SKU: {part.partNumber}
                </Text>
              </View>
              <Pressable onPress={() => setShowPartDetail(null)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.detailModalContent}>
              {renderStockStatusBadge(part.stockStatus)}
              
              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Part Information
                </Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {part.description || 'No description'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.category}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Manufacturer</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {part.manufacturer || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Mfr Part #</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {part.manufacturerPartNumber || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Criticality</Text>
                  <View style={[styles.criticalityBadge, { backgroundColor: getCriticalityColor(part.criticality) + '15' }]}>
                    <Text style={[styles.criticalityText, { color: getCriticalityColor(part.criticality) }]}>
                      {part.criticality.charAt(0).toUpperCase() + part.criticality.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Stock Information
                </Text>
                <View style={styles.stockGrid}>
                  <View style={[styles.stockGridItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.stockGridLabel, { color: colors.textSecondary }]}>On Hand</Text>
                    <Text style={[styles.stockGridValue, { color: colors.text }]}>{part.onHand}</Text>
                  </View>
                  <View style={[styles.stockGridItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.stockGridLabel, { color: colors.textSecondary }]}>Reserved</Text>
                    <Text style={[styles.stockGridValue, { color: colors.text }]}>{part.reservedQty}</Text>
                  </View>
                  <View style={[styles.stockGridItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.stockGridLabel, { color: colors.textSecondary }]}>Available</Text>
                    <Text style={[styles.stockGridValue, { color: colors.primary }]}>
                      {part.onHand - part.reservedQty}
                    </Text>
                  </View>
                  <View style={[styles.stockGridItem, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.stockGridLabel, { color: colors.textSecondary }]}>Open WO Qty</Text>
                    <Text style={[styles.stockGridValue, { color: colors.text }]}>{part.openWorkOrderQty}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Min Level</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.minLevel}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Max Level</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.maxLevel}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reorder Point</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.reorderPoint}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reorder Qty</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.reorderQty}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Safety Stock</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.safetyStock}</Text>
                </View>
              </View>
              
              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Location
                </Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Warehouse</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.warehouseName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bin Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.binLocation}</Text>
                </View>
              </View>
              
              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Costing
                </Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Unit Cost</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>${part.unitCost.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Value</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>${part.totalValue.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Cost</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    ${part.lastCost?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Usage Statistics
                </Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Avg Daily Usage</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.avgDailyUsage}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Avg Monthly Usage</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.avgMonthlyUsage}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Days of Stock</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.daysOfStock ?? 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Used</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {part.lastUsedDate ? new Date(part.lastUsedDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total WOs Used</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{part.totalWorkOrdersUsed}</Text>
                </View>
              </View>
              
              {part.equipmentAssociations.length > 0 && (
                <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    Equipment (Where Used) - {part.equipmentAssociations.length}
                  </Text>
                  {part.equipmentAssociations.map((eq, idx) => (
                    <View 
                      key={idx} 
                      style={[styles.equipmentDetailItem, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <View style={styles.equipmentDetailHeader}>
                        <Settings size={14} color={colors.primary} />
                        <Text style={[styles.equipmentDetailTag, { color: colors.primary }]}>
                          {eq.equipmentTag}
                        </Text>
                        {eq.isRecommended && (
                          <View style={[styles.recommendedBadgeLg, { backgroundColor: '#10B981' + '20' }]}>
                            <CheckCircle2 size={10} color="#10B981" />
                            <Text style={[styles.recommendedText, { color: '#10B981' }]}>Recommended</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.equipmentDetailName, { color: colors.text }]}>
                        {eq.equipmentName}
                      </Text>
                      <Text style={[styles.equipmentDetailArea, { color: colors.textSecondary }]}>
                        {eq.area}{eq.line ? ` • ${eq.line}` : ''}
                        {eq.quantityPerPM ? ` • ${eq.quantityPerPM} per PM` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {part.vendors.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    Vendors - {part.vendors.length}
                  </Text>
                  {part.vendors.map((vendor, idx) => (
                    <View 
                      key={idx} 
                      style={[styles.vendorDetailItem, { backgroundColor: colors.backgroundSecondary }]}
                    >
                      <View style={styles.vendorDetailHeader}>
                        <Truck size={14} color={colors.primary} />
                        <Text style={[styles.vendorDetailName, { color: colors.text }]}>
                          {vendor.vendorName}
                        </Text>
                        {vendor.isPrimary && (
                          <View style={[styles.primaryBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.primaryText, { color: colors.primary }]}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.vendorDetailMeta}>
                        <Text style={[styles.vendorDetailText, { color: colors.textSecondary }]}>
                          Part #: {vendor.vendorPartNumber || 'N/A'}
                        </Text>
                        <Text style={[styles.vendorDetailText, { color: colors.textSecondary }]}>
                          Price: ${vendor.unitPrice.toFixed(2)}
                        </Text>
                        <Text style={[styles.vendorDetailText, { color: colors.textSecondary }]}>
                          Lead Time: {vendor.leadTimeDays} days
                        </Text>
                        <Text style={[styles.vendorDetailText, { color: colors.textSecondary }]}>
                          Min Order: {vendor.minOrderQty}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickyHeaderIndices={[1]}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryContainer}
        >
          {renderSummaryCard(
            'Total Parts',
            displaySummary.totalParts,
            <Package size={20} color="#3B82F6" />,
            '#3B82F6'
          )}
          {renderSummaryCard(
            'Total Value',
            `${displaySummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            <DollarSign size={20} color="#10B981" />,
            '#10B981'
          )}
          {renderSummaryCard(
            'Out of Stock',
            displaySummary.outOfStockCount,
            <AlertCircle size={20} color="#EF4444" />,
            '#EF4444',
            displaySummary.outOfStockCount > 0 ? 'Action needed' : undefined
          )}
          {renderSummaryCard(
            'Critical',
            displaySummary.criticalStockCount,
            <AlertTriangle size={20} color="#DC2626" />,
            '#DC2626'
          )}
          {renderSummaryCard(
            'Low Stock',
            displaySummary.lowStockCount,
            <TrendingDown size={20} color="#F59E0B" />,
            '#F59E0B'
          )}
          {renderSummaryCard(
            'Reorder Needed',
            displaySummary.partsNeedingReorder,
            <Clock size={20} color="#8B5CF6" />,
            '#8B5CF6'
          )}
        </ScrollView>
        
        <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search parts..."
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
          
          <Pressable
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFilterCount > 0 ? colors.primary + '15' : colors.surface,
                borderColor: activeFilterCount > 0 ? colors.primary : colors.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilterModal(true);
            }}
          >
            <Filter size={18} color={activeFilterCount > 0 ? colors.primary : colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
          
          <Pressable
            style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleSort(sortField)}
          >
            <ArrowUpDown size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
        
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredParts.length} parts found
          </Text>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearFilters}>
              <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear filters</Text>
            </Pressable>
          )}
        </View>
        
        <View style={styles.listContainer}>
          {filteredParts.map(part => (
            <View key={part.id}>
              {renderPartCard({ item: part })}
            </View>
          ))}
          
          {filteredParts.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Package size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No parts found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {renderFilterModal()}
      {renderPartDetailModal()}
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
  scrollContent: {
    paddingBottom: 40,
  },
  summaryScroll: {
    marginTop: 12,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  summaryCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  summaryTitle: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  summarySubtitle: {
    fontSize: 9,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  searchSection: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 13,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  partCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  partCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    padding: 12,
  },
  partMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  partNumberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  partId: {
    fontSize: 14,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  partSku: {
    fontSize: 11,
    marginTop: 2,
  },
  criticalBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  criticalText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  partName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  partCategory: {
    fontSize: 12,
  },
  partStockInfo: {
    alignItems: 'flex-end',
  },
  stockQtyContainer: {
    flexDirection: 'row' as const,
    alignItems: 'baseline',
    marginTop: 8,
    gap: 4,
  },
  stockQty: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  stockUom: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  partCardMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 12,
  },
  expandedSection: {
    marginBottom: 12,
  },
  expandedSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  stockLevelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
  },
  stockLevelItem: {
    alignItems: 'center',
  },
  stockLevelLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  stockLevelValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  equipmentList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  equipmentItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  equipmentText: {
    fontSize: 11,
    maxWidth: 100,
  },
  recommendedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '500' as const,
    alignSelf: 'center',
  },
  vendorInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  vendorMeta: {
    fontSize: 11,
  },
  expandedActions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionButtonOutlineText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filterModalContent: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
  },
  filterModalFooter: {
    flexDirection: 'row' as const,
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  detailModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  detailModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  detailPartId: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
    fontVariant: ['tabular-nums'] as const,
  },
  detailPartSku: {
    fontSize: 12,
    marginTop: 4,
  },
  detailPartName: {
    fontSize: 18,
    fontWeight: '600' as const,
    maxWidth: 280,
  },
  detailModalContent: {
    padding: 16,
  },
  detailSection: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    maxWidth: '60%',
    textAlign: 'right' as const,
  },
  criticalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  criticalityText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  stockGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  stockGridItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stockGridLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  stockGridValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  equipmentDetailItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  equipmentDetailHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  equipmentDetailTag: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  recommendedBadgeLg: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  equipmentDetailName: {
    fontSize: 13,
    marginBottom: 2,
  },
  equipmentDetailArea: {
    fontSize: 11,
  },
  vendorDetailItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  vendorDetailHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  vendorDetailName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  vendorDetailMeta: {
    gap: 2,
  },
  vendorDetailText: {
    fontSize: 12,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
});
