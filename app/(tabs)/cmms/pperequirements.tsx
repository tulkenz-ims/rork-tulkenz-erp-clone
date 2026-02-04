import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePPERequirementsQuery, usePPEAssignmentsQuery } from '@/hooks/useCMMSSafetyCompliance';
import { PPERequirement, PPE_CATEGORIES } from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Shield,
  HardHat,
  Eye,
  Ear,
  Wind,
  Hand,
  Shirt,
  Footprints,
  Link,
  HelpCircle,
  Filter,
  ArrowUpDown,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  FileText,
  GraduationCap,
  Clock,
  Wrench,
  Building,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type PPECategory = keyof typeof PPE_CATEGORIES;

const CATEGORY_ICONS: Record<PPECategory, React.ElementType> = {
  head: HardHat,
  eye_face: Eye,
  hearing: Ear,
  respiratory: Wind,
  hand: Hand,
  body: Shirt,
  foot: Footprints,
  fall_protection: Link,
  other: HelpCircle,
};

const CATEGORY_COLORS: Record<PPECategory, { color: string; bgColor: string }> = {
  head: { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  eye_face: { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  hearing: { color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  respiratory: { color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  hand: { color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  body: { color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  foot: { color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.15)' },
  fall_protection: { color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  other: { color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

type CategoryFilter = 'all' | PPECategory;
type StatusFilter = 'all' | 'active' | 'inactive';
type SortField = 'name' | 'category' | 'code';
type SortDirection = 'asc' | 'desc';

export default function PPERequirementsScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCategoryFilterModal, setShowCategoryFilterModal] = useState(false);
  const [showStatusFilterModal, setShowStatusFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedPPE, setSelectedPPE] = useState<PPERequirement | null>(null);

  const { data: ppeRequirements = [], isLoading, refetch } = usePPERequirementsQuery({
    facilityId: facilityId || undefined,
  });

  const { data: ppeAssignments = [] } = usePPEAssignmentsQuery({
    status: 'active',
  });

  const filteredPPE = useMemo(() => {
    let filtered = [...ppeRequirements];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(p => p.isActive === isActive);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.categoryName.localeCompare(b.categoryName);
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [ppeRequirements, categoryFilter, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = ppeRequirements.length;
    const active = ppeRequirements.filter(p => p.isActive).length;
    const inactive = ppeRequirements.filter(p => !p.isActive).length;
    const trainingRequired = ppeRequirements.filter(p => p.trainingRequired).length;
    const totalAssignments = ppeAssignments.length;

    return { total, active, inactive, trainingRequired, totalAssignments };
  }, [ppeRequirements, ppeAssignments]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    ppeRequirements.forEach(p => {
      stats[p.category] = (stats[p.category] || 0) + 1;
    });
    return stats;
  }, [ppeRequirements]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePPEPress = useCallback((ppe: PPERequirement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPPE(ppe);
    setShowDetailModal(true);
  }, []);

  const handleCategoryFilterSelect = useCallback((category: CategoryFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter(category);
    setShowCategoryFilterModal(false);
  }, []);

  const handleStatusFilterSelect = useCallback((status: StatusFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(status);
    setShowStatusFilterModal(false);
  }, []);

  const handleSortSelect = useCallback((field: SortField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortModal(false);
  }, [sortField]);

  const getAssignmentCount = (ppeId: string) => {
    return ppeAssignments.filter(a => a.ppeRequirementId === ppeId).length;
  };

  const renderPPECard = (ppe: PPERequirement) => {
    const CategoryIcon = CATEGORY_ICONS[ppe.category as PPECategory] || HelpCircle;
    const categoryColor = CATEGORY_COLORS[ppe.category as PPECategory] || CATEGORY_COLORS.other;
    const assignmentCount = getAssignmentCount(ppe.id);

    return (
      <TouchableOpacity
        key={ppe.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handlePPEPress(ppe)}
        activeOpacity={0.7}
        testID={`ppe-card-${ppe.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.categoryIcon, { backgroundColor: categoryColor.bgColor }]}>
              <CategoryIcon size={20} color={categoryColor.color} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.ppeCode, { color: colors.primary }]}>
                {ppe.code}
              </Text>
              <Text style={[styles.ppeName, { color: colors.text }]} numberOfLines={1}>
                {ppe.name}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.ppeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {ppe.description}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor.bgColor }]}>
              <Text style={[styles.categoryText, { color: categoryColor.color }]}>
                {ppe.categoryName}
              </Text>
            </View>
            {ppe.trainingRequired && (
              <View style={[styles.trainingBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <GraduationCap size={12} color="#8B5CF6" />
              </View>
            )}
          </View>
          <View style={styles.footerRight}>
            {assignmentCount > 0 && (
              <View style={styles.assignmentCount}>
                <Users size={12} color={colors.textSecondary} />
                <Text style={[styles.assignmentText, { color: colors.textSecondary }]}>
                  {assignmentCount}
                </Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              { backgroundColor: ppe.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)' }
            ]}>
              {ppe.isActive ? (
                <CheckCircle2 size={12} color="#10B981" />
              ) : (
                <XCircle size={12} color="#6B7280" />
              )}
              <Text style={[styles.statusText, { color: ppe.isActive ? '#10B981' : '#6B7280' }]}>
                {ppe.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPPE) return null;

    const CategoryIcon = CATEGORY_ICONS[selectedPPE.category as PPECategory] || HelpCircle;
    const categoryColor = CATEGORY_COLORS[selectedPPE.category as PPECategory] || CATEGORY_COLORS.other;
    const assignmentCount = getAssignmentCount(selectedPPE.id);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>PPE Requirement</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeaderTop}>
                <View style={[styles.categoryIconLarge, { backgroundColor: categoryColor.bgColor }]}>
                  <CategoryIcon size={32} color={categoryColor.color} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailCode, { color: colors.primary }]}>
                    {selectedPPE.code}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedPPE.name}
                  </Text>
                  <Text style={[styles.detailCategory, { color: categoryColor.color }]}>
                    {selectedPPE.categoryName}
                  </Text>
                </View>
              </View>
              <View style={styles.detailHeaderBadges}>
                <View style={[
                  styles.statusBadgeLarge,
                  { backgroundColor: selectedPPE.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)' }
                ]}>
                  {selectedPPE.isActive ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <XCircle size={16} color="#6B7280" />
                  )}
                  <Text style={[styles.statusTextLarge, { color: selectedPPE.isActive ? '#10B981' : '#6B7280' }]}>
                    {selectedPPE.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {selectedPPE.trainingRequired && (
                  <View style={[styles.trainingBadgeLarge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                    <GraduationCap size={16} color="#8B5CF6" />
                    <Text style={[styles.trainingTextLarge, { color: '#8B5CF6' }]}>
                      Training Required
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {selectedPPE.description}
              </Text>
            </View>

            {selectedPPE.specifications && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Specifications</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {selectedPPE.specifications}
                </Text>
              </View>
            )}

            {selectedPPE.standardReference && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Standard Reference</Text>
                <View style={[styles.standardBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <FileText size={18} color={colors.primary} />
                  <Text style={[styles.standardText, { color: colors.text }]}>
                    {selectedPPE.standardReference}
                  </Text>
                </View>
              </View>
            )}

            {selectedPPE.applicableAreas.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Applicable Areas ({selectedPPE.applicableAreas.length})
                </Text>
                <View style={styles.tagsContainer}>
                  {selectedPPE.applicableAreas.map((area, index) => (
                    <View key={index} style={[styles.tagBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <MapPin size={12} color={colors.primary} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{area}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedPPE.applicableTaskTypes.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Applicable Tasks ({selectedPPE.applicableTaskTypes.length})
                </Text>
                <View style={styles.tagsContainer}>
                  {selectedPPE.applicableTaskTypes.map((task, index) => (
                    <View key={index} style={[styles.tagBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <Wrench size={12} color={colors.primary} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{task}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedPPE.applicableHazards.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Applicable Hazards ({selectedPPE.applicableHazards.length})
                </Text>
                <View style={styles.tagsContainer}>
                  {selectedPPE.applicableHazards.map((hazard, index) => (
                    <View key={index} style={[styles.tagBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <AlertTriangle size={12} color="#EF4444" />
                      <Text style={[styles.tagText, { color: colors.text }]}>{hazard}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Maintenance</Text>
              {selectedPPE.inspectionFrequency && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Inspection Frequency</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPPE.inspectionFrequency}</Text>
                </View>
              )}
              {selectedPPE.replacementCriteria && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Replacement Criteria</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPPE.replacementCriteria}</Text>
                </View>
              )}
              {!selectedPPE.inspectionFrequency && !selectedPPE.replacementCriteria && (
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  No maintenance information specified
                </Text>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Assignment Statistics</Text>
              <View style={[styles.statsBox, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={styles.statBoxItem}>
                  <Users size={20} color={colors.primary} />
                  <Text style={[styles.statBoxValue, { color: colors.text }]}>{assignmentCount}</Text>
                  <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Active Assignments</Text>
                </View>
              </View>
            </View>

            {selectedPPE.facilityName && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Facility</Text>
                <View style={styles.detailRow}>
                  <Building size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailValue, { color: colors.text, marginLeft: 8 }]}>
                    {selectedPPE.facilityName}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderCategoryFilterModal = () => (
    <Modal
      visible={showCategoryFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCategoryFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Category</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleCategoryFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Categories</Text>
            {categoryFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(PPE_CATEGORIES).map(([key, label]) => {
            const Icon = CATEGORY_ICONS[key as PPECategory];
            const catColor = CATEGORY_COLORS[key as PPECategory];
            const count = categoryStats[key] || 0;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleCategoryFilterSelect(key as PPECategory)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.filterIcon, { backgroundColor: catColor.bgColor }]}>
                    <Icon size={16} color={catColor.color} />
                  </View>
                  <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.filterCount, { color: colors.textSecondary }]}>({count})</Text>
                </View>
                {categoryFilter === key && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderStatusFilterModal = () => (
    <Modal
      visible={showStatusFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowStatusFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Status</Text>
          <TouchableOpacity
            onPress={() => setShowStatusFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {[
            { key: 'all', label: 'All', icon: Shield, color: colors.primary, bgColor: colors.backgroundSecondary },
            { key: 'active', label: 'Active', icon: CheckCircle2, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
            { key: 'inactive', label: 'Inactive', icon: XCircle, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
          ].map(({ key, label, icon: Icon, color, bgColor }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterOption, { borderBottomColor: colors.border }]}
              onPress={() => handleStatusFilterSelect(key as StatusFilter)}
            >
              <View style={styles.filterOptionContent}>
                <View style={[styles.filterIcon, { backgroundColor: bgColor }]}>
                  <Icon size={16} color={color} />
                </View>
                <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
              </View>
              {statusFilter === key && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
          <TouchableOpacity
            onPress={() => setShowSortModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {[
            { field: 'name' as SortField, label: 'Name' },
            { field: 'category' as SortField, label: 'Category' },
            { field: 'code' as SortField, label: 'Code' },
          ].map(({ field, label }) => (
            <TouchableOpacity
              key={field}
              style={[styles.filterOption, { borderBottomColor: colors.border }]}
              onPress={() => handleSortSelect(field)}
            >
              <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
              {sortField === field && (
                <View style={styles.sortIndicator}>
                  <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Text>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'PPE Requirements',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{statistics.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{statistics.trainingRequired}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Training</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.totalAssignments}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assigned</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search PPE..."
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

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowCategoryFilterModal(true)}
          >
            <Shield size={16} color={categoryFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: categoryFilter !== 'all' ? colors.primary : colors.textSecondary }]}>
              {categoryFilter !== 'all' ? PPE_CATEGORIES[categoryFilter] : 'Category'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowStatusFilterModal(true)}
          >
            <Filter size={16} color={statusFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: statusFilter !== 'all' ? colors.primary : colors.textSecondary }]}>
              {statusFilter !== 'all' ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Status'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowSortModal(true)}
          >
            <ArrowUpDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading PPE requirements...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredPPE.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Shield size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No PPE Requirements Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'PPE requirements will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredPPE.length} requirement{filteredPPE.length !== 1 ? 's' : ''}
              </Text>
              {filteredPPE.map(renderPPECard)}
            </>
          )}
        </ScrollView>
      )}

      {renderDetailModal()}
      {renderCategoryFilterModal()}
      {renderStatusFilterModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsText: {
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  ppeCode: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  ppeName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  ppeDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  trainingBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentText: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 16,
  },
  filterCount: {
    fontSize: 14,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailHeader: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderInfo: {
    marginLeft: 14,
    flex: 1,
  },
  detailCode: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  detailCategory: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 4,
  },
  detailHeaderBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  trainingBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  trainingTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  standardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  standardText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  statsBox: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  statBoxItem: {
    alignItems: 'center',
    gap: 6,
  },
  statBoxValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  statBoxLabel: {
    fontSize: 12,
  },
});
