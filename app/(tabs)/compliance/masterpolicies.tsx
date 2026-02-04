import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Filter,
  Building2,
  Shield,
  Users,
  Award,
  Leaf,
  Lock,
  DollarSign,
  Settings,
  Monitor,
  Scale,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
  BookOpen,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  MASTER_POLICIES,
  POLICY_CATEGORIES,
  POLICY_STATUS_CONFIG,
  POLICY_PRIORITY_CONFIG,
  MasterPolicy,
  PolicyCategory,
  PolicyStatus,
} from '@/constants/masterPolicies';

const CATEGORY_ICONS: Record<PolicyCategory, React.ComponentType<{ size: number; color: string }>> = {
  corporate: Building2,
  safety: Shield,
  hr: Users,
  quality: Award,
  environmental: Leaf,
  security: Lock,
  financial: DollarSign,
  operations: Settings,
  it: Monitor,
  ethics: Scale,
};

export default function MasterPoliciesScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<MasterPolicy | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['corporate', 'safety']));
  const [filterStatus, setFilterStatus] = useState<PolicyStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const openPolicyDetail = useCallback((policy: MasterPolicy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPolicy(policy);
    setShowDetailModal(true);
  }, []);

  const filteredPolicies = useMemo(() => {
    let policies = MASTER_POLICIES;
    
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      policies = policies.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.policyNumber.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }
    
    if (filterStatus !== 'all') {
      policies = policies.filter(p => p.status === filterStatus);
    }
    
    return policies;
  }, [searchQuery, filterStatus]);

  const policiesByCategory = useMemo(() => {
    const grouped: Record<PolicyCategory, MasterPolicy[]> = {
      corporate: [],
      safety: [],
      hr: [],
      quality: [],
      environmental: [],
      security: [],
      financial: [],
      operations: [],
      it: [],
      ethics: [],
    };
    
    filteredPolicies.forEach(policy => {
      grouped[policy.category].push(policy);
    });
    
    return grouped;
  }, [filteredPolicies]);

  const stats = useMemo(() => {
    const total = MASTER_POLICIES.length;
    const active = MASTER_POLICIES.filter(p => p.status === 'active').length;
    const critical = MASTER_POLICIES.filter(p => p.priority === 'critical').length;
    const needsReview = MASTER_POLICIES.filter(p => {
      const reviewDate = new Date(p.reviewDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return reviewDate <= thirtyDaysFromNow;
    }).length;
    
    return { total, active, critical, needsReview };
  }, []);

  const renderPolicyRow = (policy: MasterPolicy, isLast: boolean) => {
    const statusConfig = POLICY_STATUS_CONFIG[policy.status];
    const priorityConfig = POLICY_PRIORITY_CONFIG[policy.priority];
    
    return (
      <Pressable
        key={policy.id}
        style={({ pressed }) => [
          styles.policyRow,
          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
          { backgroundColor: pressed ? colors.surface : 'transparent' },
        ]}
        onPress={() => openPolicyDetail(policy)}
      >
        <View style={styles.policyRowMain}>
          <View style={styles.policyRowHeader}>
            <Text style={[styles.policyNumber, { color: colors.primary }]}>{policy.policyNumber}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>{priorityConfig.label}</Text>
            </View>
          </View>
          <Text style={[styles.policyTitle, { color: colors.text }]} numberOfLines={1}>{policy.title}</Text>
          <View style={styles.policyRowMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>v{policy.version}</Text>
          </View>
        </View>
        <ChevronRight size={16} color={colors.textSecondary} />
      </Pressable>
    );
  };

  const renderCategorySection = (categoryId: PolicyCategory) => {
    const category = POLICY_CATEGORIES[categoryId];
    const policies = policiesByCategory[categoryId];
    const IconComponent = CATEGORY_ICONS[categoryId];
    const isExpanded = expandedCategories.has(categoryId);
    
    if (policies.length === 0) return null;
    
    return (
      <View key={categoryId} style={styles.categorySection}>
        <Pressable
          style={[styles.categoryHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => toggleCategory(categoryId)}
        >
          <View style={styles.categoryHeaderLeft}>
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
              <IconComponent size={20} color={category.color} />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.label}</Text>
              <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              </Text>
            </View>
          </View>
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={colors.textSecondary} />
          )}
        </Pressable>
        
        {isExpanded && (
          <View style={[styles.policiesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {policies.map((policy, index) => renderPolicyRow(policy, index === policies.length - 1))}
          </View>
        )}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPolicy) return null;
    
    const category = POLICY_CATEGORIES[selectedPolicy.category];
    const statusConfig = POLICY_STATUS_CONFIG[selectedPolicy.status];
    const priorityConfig = POLICY_PRIORITY_CONFIG[selectedPolicy.priority];
    const IconComponent = CATEGORY_ICONS[selectedPolicy.category];
    
    return (
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIcon, { backgroundColor: category.color + '20' }]}>
                <IconComponent size={24} color={category.color} />
              </View>
              <View style={styles.modalHeaderInfo}>
                <Text style={[styles.modalPolicyNumber, { color: colors.primary }]}>{selectedPolicy.policyNumber}</Text>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>{selectedPolicy.title}</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.color + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>
              <View style={[styles.priorityBadgeLarge, { backgroundColor: priorityConfig.color + '20' }]}>
                <Text style={[styles.priorityTextLarge, { color: priorityConfig.color }]}>{priorityConfig.label} Priority</Text>
              </View>
              <View style={[styles.versionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.versionTextLarge, { color: colors.text }]}>v{selectedPolicy.version}</Text>
              </View>
            </View>
            
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: colors.text }]}>{selectedPolicy.description}</Text>
            </View>
            
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Policy Details</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <User size={14} color={colors.textSecondary} />
                  <View style={styles.detailItemContent}>
                    <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Owner</Text>
                    <Text style={[styles.detailItemValue, { color: colors.text }]}>{selectedPolicy.owner}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <CheckCircle2 size={14} color={colors.textSecondary} />
                  <View style={styles.detailItemContent}>
                    <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Approver</Text>
                    <Text style={[styles.detailItemValue, { color: colors.text }]}>{selectedPolicy.approver}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <View style={styles.detailItemContent}>
                    <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Effective Date</Text>
                    <Text style={[styles.detailItemValue, { color: colors.text }]}>{selectedPolicy.effectiveDate}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Clock size={14} color={colors.textSecondary} />
                  <View style={styles.detailItemContent}>
                    <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Review Date</Text>
                    <Text style={[styles.detailItemValue, { color: colors.text }]}>{selectedPolicy.reviewDate}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Applicable To</Text>
              <View style={styles.tagContainer}>
                {selectedPolicy.applicableTo.map((item, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.background }]}>
                    <Text style={[styles.tagText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Key Requirements</Text>
              <View style={styles.requirementsList}>
                {selectedPolicy.keyRequirements.map((req, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <View style={[styles.requirementBullet, { backgroundColor: category.color }]} />
                    <Text style={[styles.requirementText, { color: colors.text }]}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {selectedPolicy.regulatoryReferences && selectedPolicy.regulatoryReferences.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Regulatory References</Text>
                <View style={styles.tagContainer}>
                  {selectedPolicy.regulatoryReferences.map((ref, index) => (
                    <View key={index} style={[styles.refTag, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
                      <BookOpen size={12} color="#3B82F6" />
                      <Text style={[styles.refTagText, { color: '#3B82F6' }]}>{ref}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {selectedPolicy.relatedPolicies && selectedPolicy.relatedPolicies.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Related Policies</Text>
                <View style={styles.tagContainer}>
                  {selectedPolicy.relatedPolicies.map((rel, index) => (
                    <Pressable key={index} style={[styles.relatedTag, { backgroundColor: colors.background }]}>
                      <Text style={[styles.relatedTagText, { color: colors.primary }]}>{rel}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            
            <Pressable
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                console.log('[MasterPolicies] Edit policy:', selectedPolicy.policyNumber);
              }}
            >
              <Edit3 size={18} color="#fff" />
              <Text style={styles.editButtonText}>Edit Policy</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={showFilterModal} animationType="fade" transparent>
      <Pressable style={styles.filterModalOverlay} onPress={() => setShowFilterModal(false)}>
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Status</Text>
          <Pressable
            style={[styles.filterOption, filterStatus === 'all' && { backgroundColor: colors.primary + '15' }]}
            onPress={() => { setFilterStatus('all'); setShowFilterModal(false); }}
          >
            <Text style={[styles.filterOptionText, { color: filterStatus === 'all' ? colors.primary : colors.text }]}>All Statuses</Text>
          </Pressable>
          {Object.entries(POLICY_STATUS_CONFIG).map(([status, config]) => (
            <Pressable
              key={status}
              style={[styles.filterOption, filterStatus === status && { backgroundColor: config.color + '15' }]}
              onPress={() => { setFilterStatus(status as PolicyStatus); setShowFilterModal(false); }}
            >
              <View style={[styles.statusDot, { backgroundColor: config.color }]} />
              <Text style={[styles.filterOptionText, { color: filterStatus === status ? config.color : colors.text }]}>{config.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#7C3AED20' }]}>
          <FileText size={32} color="#7C3AED" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Master Policy Program</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Company-wide policies, procedures, and compliance requirements
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#7C3AED15' }]}>
            <FileText size={18} color="#7C3AED" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Policies</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
            <CheckCircle2 size={18} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#DC262615' }]}>
            <AlertTriangle size={18} color="#DC2626" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.critical}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Critical</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
            <Clock size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.needsReview}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Review Due</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search policies..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Pressable
          style={[styles.filterButton, filterStatus !== 'all' && { backgroundColor: colors.primary + '15' }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={filterStatus !== 'all' ? colors.primary : colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Policies by Category</Text>

      {Object.keys(POLICY_CATEGORIES).map((categoryId) => 
        renderCategorySection(categoryId as PolicyCategory)
      )}

      <View style={styles.bottomPadding} />

      {renderDetailModal()}
      {renderFilterModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterButton: {
    padding: 6,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  policiesContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  policyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 24,
  },
  policyRowMain: {
    flex: 1,
  },
  policyRowHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  policyNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  policyRowMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  versionText: {
    fontSize: 10,
  },
  bottomPadding: {
    height: 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalPolicyNumber: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 4,
  },
  statusBadgeLarge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  statusTextLarge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  priorityBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priorityTextLarge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  versionTextLarge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailItemValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  tagContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  requirementsList: {
    gap: 10,
  },
  requirementItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  requirementBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  requirementText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  refTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  refTagText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  relatedTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  relatedTagText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  editButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  filterModalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
});
