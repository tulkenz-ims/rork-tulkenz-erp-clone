import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Edit3, 
  Trash2,
  X,
  DollarSign,
  Clock,
  Users,
  Shield,
  Settings,
  TrendingUp,
  BarChart3,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useApprovalTiersQuery,
  useTierStats,
  useCreateApprovalTier,
  useUpdateApprovalTier,
  useDeleteApprovalTier,
} from '@/hooks/useSupabaseApprovalTiers';
import type {
  ApprovalTier,
  ApprovalTierLevel,
  WorkflowCategory,
  TierThreshold,
  TierApprover,
  ApproverLimit,
} from '@/types/approvalWorkflows';
import {
  tierLevelLabels,
  tierLevelColors,
  workflowCategoryLabels,
  workflowCategoryColors,
} from '@/types/approvalWorkflows';


type ViewMode = 'byCategory' | 'byLevel' | 'list';

export default function TiersScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategory | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<ApprovalTierLevel | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('byCategory');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<ApprovalTier | null>(null);

  const { data: tiers = [], isLoading: tiersLoading } = useApprovalTiersQuery();
  const { data: stats, isLoading: statsLoading } = useTierStats();
  const createTier = useCreateApprovalTier();
  const updateTier = useUpdateApprovalTier();
  const deleteTier = useDeleteApprovalTier();

  const filteredTiers = useMemo(() => {
    let result = [...tiers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }

    if (selectedLevel !== 'all') {
      result = result.filter(t => t.level === selectedLevel);
    }

    return result;
  }, [tiers, searchQuery, selectedCategory, selectedLevel]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<WorkflowCategory, ApprovalTier[]> = {
      purchase: [],
      expense: [],
      time_off: [],
      permit: [],
      contract: [],
      custom: [],
    };

    filteredTiers.forEach(tier => {
      groups[tier.category].push(tier);
    });

    Object.keys(groups).forEach(key => {
      groups[key as WorkflowCategory].sort((a, b) => a.level - b.level);
    });

    return groups;
  }, [filteredTiers]);

  const groupedByLevel = useMemo(() => {
    const groups: Record<ApprovalTierLevel, ApprovalTier[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    filteredTiers.forEach(tier => {
      groups[tier.level].push(tier);
    });

    return groups;
  }, [filteredTiers]);

  const handleCreateTier = useCallback(() => {
    setEditingTier(null);
    setShowTierModal(true);
  }, []);

  const handleEditTier = useCallback((tier: ApprovalTier) => {
    setEditingTier(tier);
    setShowTierModal(true);
  }, []);

  const handleDeleteTier = useCallback((tier: ApprovalTier) => {
    Alert.alert(
      'Delete Tier',
      `Are you sure you want to delete "${tier.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTier.mutate(tier.id);
          },
        },
      ]
    );
  }, [deleteTier]);

  const renderStatsCard = () => (
    <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Layers size={20} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.totalTiers || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total Tiers
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#10B981' + '20' }]}>
            <Settings size={20} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.totalConfigurations || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Configurations
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B' + '20' }]}>
            <TrendingUp size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats?.activeConfigurations || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Active
          </Text>
        </View>
      </View>

      <View style={[styles.tierLevelBar, { backgroundColor: colors.border }]}>
        {([1, 2, 3, 4, 5] as ApprovalTierLevel[]).map(level => {
          const count = stats?.tiersByLevel.find(t => t.level === level)?.count || 0;
          const percentage = stats?.totalTiers ? (count / stats.totalTiers) * 100 : 0;
          return (
            <View
              key={level}
              style={[
                styles.tierLevelSegment,
                { 
                  backgroundColor: tierLevelColors[level],
                  width: `${Math.max(percentage, 5)}%`,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.tierLevelLegend}>
        {([1, 2, 3, 4, 5] as ApprovalTierLevel[]).map(level => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: tierLevelColors[level] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              T{level}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTierCard = (tier: ApprovalTier) => {
    const thresholdText = tier.thresholds.length > 0
      ? tier.thresholds.map(t => t.label || `${t.triggerType}: ${t.value}`).join(', ')
      : 'No thresholds';

    return (
      <TouchableOpacity
        key={tier.id}
        style={[styles.tierCard, { backgroundColor: colors.surface }]}
        onPress={() => handleEditTier(tier)}
        activeOpacity={0.7}
      >
        <View style={styles.tierCardHeader}>
          <View style={styles.tierCardLeft}>
            <View style={[styles.tierLevelBadge, { backgroundColor: tierLevelColors[tier.level] }]}>
              <Text style={styles.tierLevelText}>T{tier.level}</Text>
            </View>
            <View style={styles.tierInfo}>
              <Text style={[styles.tierName, { color: colors.text }]}>{tier.name}</Text>
              <Text style={[styles.tierCategory, { color: workflowCategoryColors[tier.category] }]}>
                {workflowCategoryLabels[tier.category]}
              </Text>
            </View>
          </View>
          <View style={styles.tierCardRight}>
            {tier.isActive ? (
              <View style={[styles.statusBadge, { backgroundColor: '#10B981' + '20' }]}>
                <Text style={[styles.statusText, { color: '#10B981' }]}>Active</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>Inactive</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.tierDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {tier.description}
        </Text>

        <View style={styles.tierDetails}>
          <View style={styles.tierDetailItem}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={[styles.tierDetailText, { color: colors.textSecondary }]}>
              {thresholdText}
            </Text>
          </View>
          <View style={styles.tierDetailItem}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.tierDetailText, { color: colors.textSecondary }]}>
              {tier.approvers.length} approver{tier.approvers.length !== 1 ? 's' : ''}
              {tier.requireAllApprovers ? ' (all required)' : ''}
            </Text>
          </View>
          <View style={styles.tierDetailItem}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.tierDetailText, { color: colors.textSecondary }]}>
              {tier.maxApprovalDays} day{tier.maxApprovalDays !== 1 ? 's' : ''} max
            </Text>
          </View>
        </View>

        <View style={styles.tierCardActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => handleEditTier(tier)}
          >
            <Edit3 size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' + '15' }]}
            onPress={() => handleDeleteTier(tier)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderByCategoryView = () => (
    <>
      {Object.entries(groupedByCategory).map(([category, categoryTiers]) => {
        if (categoryTiers.length === 0) return null;
        return (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categorySectionHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: workflowCategoryColors[category as WorkflowCategory] + '20' }]}>
                <Shield size={18} color={workflowCategoryColors[category as WorkflowCategory]} />
              </View>
              <Text style={[styles.categorySectionTitle, { color: colors.text }]}>
                {workflowCategoryLabels[category as WorkflowCategory]} ({categoryTiers.length})
              </Text>
            </View>
            {categoryTiers.map(renderTierCard)}
          </View>
        );
      })}
    </>
  );

  const renderByLevelView = () => (
    <>
      {([1, 2, 3, 4, 5] as ApprovalTierLevel[]).map(level => {
        const levelTiers = groupedByLevel[level];
        if (levelTiers.length === 0) return null;
        return (
          <View key={level} style={styles.categorySection}>
            <View style={styles.categorySectionHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: tierLevelColors[level] + '20' }]}>
                <Layers size={18} color={tierLevelColors[level]} />
              </View>
              <Text style={[styles.categorySectionTitle, { color: colors.text }]}>
                {tierLevelLabels[level]} ({levelTiers.length})
              </Text>
            </View>
            {levelTiers.map(renderTierCard)}
          </View>
        );
      })}
    </>
  );

  const renderListView = () => (
    <>
      {filteredTiers.map(renderTierCard)}
    </>
  );

  if (tiersLoading || statsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading tier configurations...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Approval Tiers',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStatsCard()}

        <View style={styles.controlsContainer}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search tiers..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={18} color={colors.textSecondary} />
              <Text style={[styles.filterButtonText, { color: colors.textSecondary }]}>
                Filter
              </Text>
            </TouchableOpacity>

            <View style={[styles.viewToggle, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[
                  styles.viewToggleButton,
                  viewMode === 'byCategory' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setViewMode('byCategory')}
              >
                <BarChart3 size={16} color={viewMode === 'byCategory' ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewToggleButton,
                  viewMode === 'byLevel' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setViewMode('byLevel')}
              >
                <Layers size={16} color={viewMode === 'byLevel' ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewToggleButton,
                  viewMode === 'list' && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setViewMode('list')}
              >
                <ChevronRight size={16} color={viewMode === 'list' ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.tiersContainer}>
          {filteredTiers.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Layers size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                No Tiers Found
              </Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {searchQuery || selectedCategory !== 'all' || selectedLevel !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first approval tier to get started'}
              </Text>
            </View>
          ) : (
            <>
              {viewMode === 'byCategory' && renderByCategoryView()}
              {viewMode === 'byLevel' && renderByLevelView()}
              {viewMode === 'list' && renderListView()}
            </>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateTier}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedCategory={selectedCategory}
        selectedLevel={selectedLevel}
        onCategoryChange={setSelectedCategory}
        onLevelChange={setSelectedLevel}
        colors={colors}
      />

      <TierModal
        visible={showTierModal}
        onClose={() => {
          setShowTierModal(false);
          setEditingTier(null);
        }}
        tier={editingTier}
        onSave={(tierData) => {
          if (editingTier) {
            updateTier.mutate({ id: editingTier.id, ...tierData });
          } else {
            createTier.mutate(tierData as Omit<ApprovalTier, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setShowTierModal(false);
          setEditingTier(null);
        }}
        colors={colors}
      />
    </View>
  );
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCategory: WorkflowCategory | 'all';
  selectedLevel: ApprovalTierLevel | 'all';
  onCategoryChange: (category: WorkflowCategory | 'all') => void;
  onLevelChange: (level: ApprovalTierLevel | 'all') => void;
  colors: any;
}

function FilterModal({
  visible,
  onClose,
  selectedCategory,
  selectedLevel,
  onCategoryChange,
  onLevelChange,
  colors,
}: FilterModalProps) {
  const categories: (WorkflowCategory | 'all')[] = ['all', 'purchase', 'expense', 'time_off', 'permit', 'contract', 'custom'];
  const levels: (ApprovalTierLevel | 'all')[] = ['all', 1, 2, 3, 4, 5];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Tiers</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.filterLabel, { color: colors.text }]}>Category</Text>
          <View style={styles.filterOptions}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterOption,
                  { backgroundColor: colors.background },
                  selectedCategory === category && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => onCategoryChange(category)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: selectedCategory === category ? colors.primary : colors.text },
                  ]}
                >
                  {category === 'all' ? 'All' : workflowCategoryLabels[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterLabel, { color: colors.text, marginTop: 16 }]}>Level</Text>
          <View style={styles.filterOptions}>
            {levels.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterOption,
                  { backgroundColor: colors.background },
                  selectedLevel === level && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => onLevelChange(level)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: selectedLevel === level ? colors.primary : colors.text },
                  ]}
                >
                  {level === 'all' ? 'All' : `Tier ${level}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => {
                onCategoryChange('all');
                onLevelChange('all');
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface TierModalProps {
  visible: boolean;
  onClose: () => void;
  tier: ApprovalTier | null;
  onSave: (tier: Partial<ApprovalTier>) => void;
  colors: any;
}

function TierModal({ visible, onClose, tier, onSave, colors }: TierModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<ApprovalTierLevel>(1);
  const [category, setCategory] = useState<WorkflowCategory>('purchase');
  const [isActive, setIsActive] = useState(true);
  const [requireAllApprovers, setRequireAllApprovers] = useState(false);
  const [maxApprovalDays, setMaxApprovalDays] = useState('5');
  const [autoEscalateHours, setAutoEscalateHours] = useState('48');
  const [thresholdType, setThresholdType] = useState<'amount' | 'urgency'>('amount');
  const [thresholdMin, setThresholdMin] = useState('');
  const [thresholdMax, setThresholdMax] = useState('');
  const [approvers, setApprovers] = useState<TierApprover[]>([]);
  const [showApproverModal, setShowApproverModal] = useState(false);
  const [editingApprover, setEditingApprover] = useState<TierApprover | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'approvers' | 'limits'>('basic');

  React.useEffect(() => {
    if (tier) {
      setName(tier.name);
      setDescription(tier.description);
      setLevel(tier.level);
      setCategory(tier.category);
      setIsActive(tier.isActive);
      setRequireAllApprovers(tier.requireAllApprovers);
      setMaxApprovalDays(String(tier.maxApprovalDays));
      setAutoEscalateHours(String(tier.autoEscalateHours || 48));
      setApprovers(tier.approvers || []);
      
      const amountThreshold = tier.thresholds.find(t => t.triggerType === 'amount');
      if (amountThreshold) {
        setThresholdType('amount');
        setThresholdMin(String(amountThreshold.value));
        setThresholdMax(amountThreshold.valueEnd ? String(amountThreshold.valueEnd) : '');
      }
    } else {
      setName('');
      setDescription('');
      setLevel(1);
      setCategory('purchase');
      setIsActive(true);
      setRequireAllApprovers(false);
      setMaxApprovalDays('5');
      setAutoEscalateHours('48');
      setThresholdType('amount');
      setThresholdMin('');
      setThresholdMax('');
      setApprovers([]);
    }
    setActiveTab('basic');
  }, [tier, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a tier name');
      return;
    }

    const thresholds: TierThreshold[] = [];
    if (thresholdMin) {
      const minVal = parseFloat(thresholdMin);
      const maxVal = thresholdMax ? parseFloat(thresholdMax) : undefined;
      
      thresholds.push({
        id: `th-${Date.now()}`,
        triggerType: thresholdType,
        operator: maxVal ? 'between' : (minVal === 0 ? 'less_than' : 'greater_than'),
        value: minVal,
        valueEnd: maxVal,
        label: maxVal 
          ? `$${minVal.toLocaleString()} - $${maxVal.toLocaleString()}`
          : (minVal === 0 ? 'Under minimum' : `Over $${minVal.toLocaleString()}`),
      });
    }

    const tierData: Partial<ApprovalTier> = {
      name: name.trim(),
      description: description.trim(),
      level,
      category,
      isActive,
      thresholds,
      approvers,
      requireAllApprovers,
      autoEscalateHours: parseInt(autoEscalateHours) || 48,
      autoApproveOnTimeout: false,
      notifyOnEscalation: true,
      maxApprovalDays: parseInt(maxApprovalDays) || 5,
      color: tierLevelColors[level],
      createdBy: tier?.createdBy || 'Current User',
      updatedBy: 'Current User',
    };

    onSave(tierData);
  };

  const handleAddApprover = () => {
    setEditingApprover(null);
    setShowApproverModal(true);
  };

  const handleEditApprover = (approver: TierApprover) => {
    setEditingApprover(approver);
    setShowApproverModal(true);
  };

  const handleDeleteApprover = (approverId: string) => {
    setApprovers(prev => prev.filter(a => a.id !== approverId));
  };

  const handleSaveApprover = (approver: TierApprover) => {
    if (editingApprover) {
      setApprovers(prev => prev.map(a => a.id === approver.id ? approver : a));
    } else {
      setApprovers(prev => [...prev, { ...approver, order: prev.length + 1 }]);
    }
    setShowApproverModal(false);
    setEditingApprover(null);
  };

  const moveApprover = (approverId: string, direction: 'up' | 'down') => {
    const index = approvers.findIndex(a => a.id === approverId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === approvers.length - 1) return;

    const newApprovers = [...approvers];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newApprovers[index], newApprovers[swapIndex]] = [newApprovers[swapIndex], newApprovers[index]];
    newApprovers.forEach((a, i) => a.order = i + 1);
    setApprovers(newApprovers);
  };

  const categories: WorkflowCategory[] = ['purchase', 'expense', 'time_off', 'permit', 'contract', 'custom'];
  const levels: ApprovalTierLevel[] = [1, 2, 3, 4, 5];

  const renderBasicTab = () => (
    <>
      <Text style={[styles.inputLabel, { color: colors.text }]}>Tier Name *</Text>
      <TextInput
        style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Standard Purchase"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
      <TextInput
        style={[styles.textInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe when this tier applies..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.inputLabel, { color: colors.text }]}>Category *</Text>
      <View style={styles.optionsRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.optionChip,
              { backgroundColor: colors.background, borderColor: colors.border },
              category === cat && { backgroundColor: workflowCategoryColors[cat] + '20', borderColor: workflowCategoryColors[cat] },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.optionChipText, { color: category === cat ? workflowCategoryColors[cat] : colors.text }]}>
              {workflowCategoryLabels[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.inputLabel, { color: colors.text }]}>Tier Level *</Text>
      <View style={styles.optionsRow}>
        {levels.map(lvl => (
          <TouchableOpacity
            key={lvl}
            style={[
              styles.levelChip,
              { backgroundColor: colors.background, borderColor: colors.border },
              level === lvl && { backgroundColor: tierLevelColors[lvl] + '20', borderColor: tierLevelColors[lvl] },
            ]}
            onPress={() => setLevel(lvl)}
          >
            <Text style={[styles.levelChipText, { color: level === lvl ? tierLevelColors[lvl] : colors.text }]}>
              {lvl}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Threshold Configuration</Text>
      
      <View style={styles.thresholdRow}>
        <View style={styles.thresholdInput}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Min Amount ($)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={thresholdMin}
            onChangeText={setThresholdMin}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.thresholdInput}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Max Amount ($)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={thresholdMax}
            onChangeText={setThresholdMax}
            placeholder="No limit"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Active</Text>
          <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
            Enable this tier for use
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ false: colors.border, true: colors.primary + '50' }}
          thumbColor={isActive ? colors.primary : colors.textSecondary}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Require All Approvers</Text>
          <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
            All approvers must approve
          </Text>
        </View>
        <Switch
          value={requireAllApprovers}
          onValueChange={setRequireAllApprovers}
          trackColor={{ false: colors.border, true: colors.primary + '50' }}
          thumbColor={requireAllApprovers ? colors.primary : colors.textSecondary}
        />
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Max Approval Days</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={maxApprovalDays}
            onChangeText={setMaxApprovalDays}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Escalate After (hrs)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={autoEscalateHours}
            onChangeText={setAutoEscalateHours}
            keyboardType="numeric"
          />
        </View>
      </View>
    </>
  );

  const renderApproversTab = () => (
    <>
      <View style={styles.approverHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>Tier Approvers</Text>
        <TouchableOpacity
          style={[styles.addApproverButton, { backgroundColor: colors.primary }]}
          onPress={handleAddApprover}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addApproverButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {approvers.length === 0 ? (
        <View style={[styles.emptyApprovers, { backgroundColor: colors.background }]}>
          <Users size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyApproversText, { color: colors.textSecondary }]}>
            No approvers assigned to this tier
          </Text>
          <Text style={[styles.emptyApproversHint, { color: colors.textSecondary }]}>
            Add approvers to define who can approve requests at this level
          </Text>
        </View>
      ) : (
        <View style={styles.approversList}>
          {approvers.sort((a, b) => a.order - b.order).map((approver, index) => (
            <View key={approver.id} style={[styles.approverItem, { backgroundColor: colors.background }]}>
              <View style={styles.approverOrderControls}>
                <TouchableOpacity
                  style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}
                  onPress={() => moveApprover(approver.id, 'up')}
                  disabled={index === 0}
                >
                  <ChevronRight size={16} color={index === 0 ? colors.border : colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
                <Text style={[styles.orderNumber, { color: colors.primary }]}>{approver.order}</Text>
                <TouchableOpacity
                  style={[styles.orderButton, index === approvers.length - 1 && styles.orderButtonDisabled]}
                  onPress={() => moveApprover(approver.id, 'down')}
                  disabled={index === approvers.length - 1}
                >
                  <ChevronRight size={16} color={index === approvers.length - 1 ? colors.border : colors.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>

              <View style={styles.approverInfo}>
                <View style={styles.approverNameRow}>
                  <Text style={[styles.approverName, { color: colors.text }]}>
                    {approver.roleName || approver.userName || 'Unknown'}
                  </Text>
                  {approver.isRequired && (
                    <View style={[styles.requiredBadge, { backgroundColor: '#EF4444' + '20' }]}>
                      <Text style={[styles.requiredBadgeText, { color: '#EF4444' }]}>Required</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.approverType, { color: colors.textSecondary }]}>
                  {approver.type === 'manager' ? 'Direct Manager' :
                   approver.type === 'department_head' ? 'Department Head' :
                   approver.type === 'executive' ? 'Executive' :
                   approver.type === 'user' ? 'Specific User' : 'Role-Based'}
                </Text>
                {approver.limits?.maxApprovalAmount && (
                  <Text style={[styles.approverLimit, { color: colors.primary }]}>
                    Max: ${approver.limits.maxApprovalAmount.toLocaleString()}
                  </Text>
                )}
              </View>

              <View style={styles.approverActions}>
                <TouchableOpacity
                  style={[styles.approverActionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => handleEditApprover(approver)}
                >
                  <Edit3 size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approverActionButton, { backgroundColor: '#EF4444' + '15' }]}
                  onPress={() => handleDeleteApprover(approver.id)}
                >
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.approverSummary, { backgroundColor: colors.background }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Approvers</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{approvers.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Required</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{approvers.filter(a => a.isRequired).length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Optional</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{approvers.filter(a => !a.isRequired).length}</Text>
        </View>
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.tierModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {tier ? 'Edit Tier' : 'New Approval Tier'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'basic' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab('basic')}
            >
              <Settings size={16} color={activeTab === 'basic' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'basic' ? colors.primary : colors.textSecondary }]}>Basic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'approvers' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab('approvers')}
            >
              <Users size={16} color={activeTab === 'approvers' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === 'approvers' ? colors.primary : colors.textSecondary }]}>Approvers ({approvers.length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.tierModalScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'basic' && renderBasicTab()}
            {activeTab === 'approvers' && renderApproversTab()}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                {tier ? 'Save Changes' : 'Create Tier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ApproverModal
        visible={showApproverModal}
        onClose={() => {
          setShowApproverModal(false);
          setEditingApprover(null);
        }}
        approver={editingApprover}
        onSave={handleSaveApprover}
        colors={colors}
      />
    </Modal>
  );
}

interface ApproverModalProps {
  visible: boolean;
  onClose: () => void;
  approver: TierApprover | null;
  onSave: (approver: TierApprover) => void;
  colors: any;
}

function ApproverModal({ visible, onClose, approver, onSave, colors }: ApproverModalProps) {
  const [approverType, setApproverType] = useState<TierApprover['type']>('role');
  const [selectedRole, setSelectedRole] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [maxApprovalAmount, setMaxApprovalAmount] = useState('');
  const [minApprovalAmount, setMinApprovalAmount] = useState('');
  const [maxApprovalsPerDay, setMaxApprovalsPerDay] = useState('');
  const [canDelegateApproval, setCanDelegateApproval] = useState(true);
  const [canApproveDirectReports, setCanApproveDirectReports] = useState(true);
  const [canApproveOwnRequests, setCanApproveOwnRequests] = useState(false);

  const approverTypeOptions: { id: TierApprover['type']; label: string }[] = [
    { id: 'manager', label: 'Direct Manager' },
    { id: 'department_head', label: 'Department Head' },
    { id: 'role', label: 'Specific Role' },
    { id: 'executive', label: 'Executive' },
    { id: 'user', label: 'Specific User' },
  ];

  const roleOptions = [
    { id: 'finance-manager', label: 'Finance Manager' },
    { id: 'finance-director', label: 'Finance Director' },
    { id: 'operations-director', label: 'Operations Director' },
    { id: 'hr-coordinator', label: 'HR Coordinator' },
    { id: 'hr-manager', label: 'HR Manager' },
    { id: 'safety-officer', label: 'Safety Officer' },
    { id: 'safety-director', label: 'Safety Director' },
    { id: 'plant-manager', label: 'Plant Manager' },
    { id: 'legal-counsel', label: 'Legal Counsel' },
    { id: 'ap-supervisor', label: 'AP Supervisor' },
    { id: 'vp-operations', label: 'VP Operations' },
    { id: 'cfo', label: 'CFO' },
    { id: 'ceo', label: 'CEO' },
  ];

  React.useEffect(() => {
    if (approver) {
      setApproverType(approver.type);
      setSelectedRole(approver.roleId || '');
      setIsRequired(approver.isRequired);
      setMaxApprovalAmount(approver.limits?.maxApprovalAmount?.toString() || '');
      setMinApprovalAmount(approver.limits?.minApprovalAmount?.toString() || '');
      setMaxApprovalsPerDay(approver.limits?.maxApprovalsPerDay?.toString() || '');
      setCanDelegateApproval(approver.limits?.canDelegateApproval ?? true);
      setCanApproveDirectReports(approver.limits?.canApproveDirectReports ?? true);
      setCanApproveOwnRequests(approver.limits?.canApproveOwnRequests ?? false);
    } else {
      setApproverType('role');
      setSelectedRole('');
      setIsRequired(true);
      setMaxApprovalAmount('');
      setMinApprovalAmount('');
      setMaxApprovalsPerDay('');
      setCanDelegateApproval(true);
      setCanApproveDirectReports(true);
      setCanApproveOwnRequests(false);
    }
  }, [approver, visible]);

  const handleSave = () => {
    const roleName = approverType === 'manager' ? 'Direct Manager' :
                     approverType === 'department_head' ? 'Department Head' :
                     roleOptions.find(r => r.id === selectedRole)?.label || selectedRole;

    const limits: ApproverLimit = {
      canApproveOwnRequests,
      canApproveDirectReports,
      canDelegateApproval,
    };

    if (maxApprovalAmount) limits.maxApprovalAmount = parseFloat(maxApprovalAmount);
    if (minApprovalAmount) limits.minApprovalAmount = parseFloat(minApprovalAmount);
    if (maxApprovalsPerDay) limits.maxApprovalsPerDay = parseInt(maxApprovalsPerDay);

    const newApprover: TierApprover = {
      id: approver?.id || `apr-${Date.now()}`,
      type: approverType,
      roleId: approverType === 'role' || approverType === 'executive' ? selectedRole : undefined,
      roleName,
      isRequired,
      order: approver?.order || 1,
      limits,
    };

    onSave(newApprover);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.approverModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {approver ? 'Edit Approver' : 'Add Approver'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.approverModalScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Approver Type *</Text>
            <View style={styles.optionsRow}>
              {approverTypeOptions.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    approverType === opt.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setApproverType(opt.id)}
                >
                  <Text style={[styles.optionChipText, { color: approverType === opt.id ? colors.primary : colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(approverType === 'role' || approverType === 'executive') && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Select Role *</Text>
                <View style={styles.roleList}>
                  {roleOptions.map(role => (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.roleOption,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        selectedRole === role.id && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                      ]}
                      onPress={() => setSelectedRole(role.id)}
                    >
                      <Text style={[styles.roleOptionText, { color: selectedRole === role.id ? colors.primary : colors.text }]}>
                        {role.label}
                      </Text>
                      {selectedRole === role.id && (
                        <Shield size={14} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Required Approver</Text>
                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                  Must approve for tier completion
                </Text>
              </View>
              <Switch
                value={isRequired}
                onValueChange={setIsRequired}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={isRequired ? colors.primary : colors.textSecondary}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Approval Limits</Text>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Min Amount ($)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={minApprovalAmount}
                  onChangeText={setMinApprovalAmount}
                  placeholder="No min"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Max Amount ($)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={maxApprovalAmount}
                  onChangeText={setMaxApprovalAmount}
                  placeholder="No limit"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Max Approvals Per Day</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={maxApprovalsPerDay}
              onChangeText={setMaxApprovalsPerDay}
              placeholder="Unlimited"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Can Delegate Approval</Text>
                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                  Allow delegating to another approver
                </Text>
              </View>
              <Switch
                value={canDelegateApproval}
                onValueChange={setCanDelegateApproval}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={canDelegateApproval ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Approve Direct Reports</Text>
                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                  Can approve requests from direct reports
                </Text>
              </View>
              <Switch
                value={canApproveDirectReports}
                onValueChange={setCanApproveDirectReports}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={canApproveDirectReports ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Approve Own Requests</Text>
                <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
                  Can approve their own requests
                </Text>
              </View>
              <Switch
                value={canApproveOwnRequests}
                onValueChange={setCanApproveOwnRequests}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={canApproveOwnRequests ? colors.primary : colors.textSecondary}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                {approver ? 'Save Changes' : 'Add Approver'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tierLevelBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tierLevelSegment: {
    height: '100%',
  },
  tierLevelLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewToggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tiersContainer: {
    gap: 16,
  },
  categorySection: {
    marginBottom: 8,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tierCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  tierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tierCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierLevelBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierLevelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  tierInfo: {
    gap: 2,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tierCategory: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tierCardRight: {},
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tierDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  tierDetails: {
    gap: 6,
  },
  tierDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierDetailText: {
    fontSize: 12,
  },
  tierCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  tierModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  tierModalScroll: {
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
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
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionText: {
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  levelChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  levelChipText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 20,
    marginBottom: 4,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thresholdInput: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  settingHint: {
    fontSize: 12,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  approverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addApproverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addApproverButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyApprovers: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyApproversText: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyApproversHint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  approversList: {
    gap: 10,
  },
  approverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  approverOrderControls: {
    alignItems: 'center',
    gap: 2,
  },
  orderButton: {
    padding: 4,
  },
  orderButtonDisabled: {
    opacity: 0.3,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  approverInfo: {
    flex: 1,
    gap: 2,
  },
  approverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approverName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  approverType: {
    fontSize: 12,
  },
  approverLimit: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  approverActions: {
    flexDirection: 'row',
    gap: 6,
  },
  approverActionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approverSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 10,
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  approverModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  approverModalScroll: {
    maxHeight: 450,
  },
  roleList: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 14,
  },
});
