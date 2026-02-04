import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  Calendar,
  User,
  Shield,
  Thermometer,
  Bug,
  Droplets,
  Package,
  Edit2,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type PlanStatus = 'active' | 'draft' | 'under_review' | 'archived';
type HazardCategory = 'biological' | 'chemical' | 'physical' | 'allergen' | 'radiological';

interface HazardSummary {
  id: string;
  processStep: string;
  hazardCategory: HazardCategory;
  hazardDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'certain';
  controlMeasure: string;
  isPreventiveControl: boolean;
}

interface PreventiveControl {
  id: string;
  type: 'process' | 'allergen' | 'sanitation' | 'supply_chain' | 'recall';
  name: string;
  description: string;
  criticalLimits: string;
  monitoringProcedure: string;
  monitoringFrequency: string;
  correctiveAction: string;
  verificationActivity: string;
  responsiblePerson: string;
}

interface FoodSafetyPlan {
  id: string;
  planName: string;
  version: string;
  status: PlanStatus;
  facilityName: string;
  productCategory: string;
  lastReviewDate: string;
  nextReviewDate: string;
  pcqiName: string;
  pcqiTrainingDate: string;
  hazardSummaries: HazardSummary[];
  preventiveControls: PreventiveControl[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  draft: { label: 'Draft', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
  under_review: { label: 'Under Review', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  archived: { label: 'Archived', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
};

const HAZARD_ICONS: Record<HazardCategory, React.ComponentType<{ size: number; color: string }>> = {
  biological: Bug,
  chemical: Droplets,
  physical: Package,
  allergen: AlertTriangle,
  radiological: Thermometer,
};

const MOCK_PLANS: FoodSafetyPlan[] = [
  {
    id: '1',
    planName: 'Ready-to-Eat Salads Food Safety Plan',
    version: '3.2',
    status: 'active',
    facilityName: 'Main Production Facility',
    productCategory: 'Ready-to-Eat Fresh Produce',
    lastReviewDate: '2025-12-15',
    nextReviewDate: '2026-06-15',
    pcqiName: 'Sarah Johnson',
    pcqiTrainingDate: '2024-03-10',
    hazardSummaries: [
      {
        id: 'h1',
        processStep: 'Receiving',
        hazardCategory: 'biological',
        hazardDescription: 'Pathogenic bacteria (Salmonella, E. coli O157:H7, Listeria)',
        severity: 'critical',
        likelihood: 'possible',
        controlMeasure: 'Supplier verification, COA review, temperature monitoring',
        isPreventiveControl: true,
      },
      {
        id: 'h2',
        processStep: 'Washing',
        hazardCategory: 'biological',
        hazardDescription: 'Cross-contamination from equipment or water',
        severity: 'high',
        likelihood: 'unlikely',
        controlMeasure: 'Sanitizer concentration monitoring, equipment sanitation',
        isPreventiveControl: true,
      },
    ],
    preventiveControls: [
      {
        id: 'pc1',
        type: 'process',
        name: 'Wash Water Sanitation',
        description: 'Maintain adequate sanitizer levels in wash water',
        criticalLimits: 'Free chlorine: 50-200 ppm, pH: 6.0-7.5',
        monitoringProcedure: 'Test strip verification of chlorine and pH',
        monitoringFrequency: 'Every 2 hours during production',
        correctiveAction: 'Adjust sanitizer concentration, retest, segregate affected product',
        verificationActivity: 'Daily review of monitoring records, weekly calibration',
        responsiblePerson: 'QA Technician',
      },
    ],
    createdAt: '2024-01-15',
    updatedAt: '2025-12-15',
  },
  {
    id: '2',
    planName: 'Deli Meat Processing Food Safety Plan',
    version: '2.1',
    status: 'under_review',
    facilityName: 'Processing Plant B',
    productCategory: 'Ready-to-Eat Meat Products',
    lastReviewDate: '2025-11-01',
    nextReviewDate: '2026-05-01',
    pcqiName: 'Michael Chen',
    pcqiTrainingDate: '2023-08-22',
    hazardSummaries: [],
    preventiveControls: [],
    createdAt: '2023-06-10',
    updatedAt: '2025-11-01',
  },
];

export default function FoodSafetyPlanScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<FoodSafetyPlan[]>(MOCK_PLANS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FoodSafetyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'hazards' | 'controls'>('overview');

  const [newPlan, setNewPlan] = useState({
    planName: '',
    facilityName: '',
    productCategory: '',
    pcqiName: '',
    pcqiTrainingDate: '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesSearch = !searchQuery ||
        plan.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.facilityName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || plan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: plans.length,
    active: plans.filter(p => p.status === 'active').length,
    underReview: plans.filter(p => p.status === 'under_review').length,
    hazards: plans.reduce((sum, p) => sum + p.hazardSummaries.length, 0),
  }), [plans]);

  const handleAddPlan = useCallback(() => {
    if (!newPlan.planName || !newPlan.facilityName) {
      Alert.alert('Required Fields', 'Please fill in plan name and facility.');
      return;
    }

    const plan: FoodSafetyPlan = {
      id: Date.now().toString(),
      planName: newPlan.planName,
      version: '1.0',
      status: 'draft',
      facilityName: newPlan.facilityName,
      productCategory: newPlan.productCategory,
      lastReviewDate: new Date().toISOString().split('T')[0],
      nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pcqiName: newPlan.pcqiName,
      pcqiTrainingDate: newPlan.pcqiTrainingDate,
      hazardSummaries: [],
      preventiveControls: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setPlans(prev => [plan, ...prev]);
    setShowAddModal(false);
    setNewPlan({ planName: '', facilityName: '', productCategory: '', pcqiName: '', pcqiTrainingDate: '' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newPlan]);

  const openDetail = useCallback((plan: FoodSafetyPlan) => {
    setSelectedPlan(plan);
    setActiveTab('overview');
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      default: return '#10B981';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#6366F1' + '20' }]}>
            <FileText size={28} color="#6366F1" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Food Safety Plan</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FSMA PCHF compliant food safety documentation
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Plans</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.underReview}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Review</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.hazards}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hazards</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search plans..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: !statusFilter ? colors.primary : colors.border },
              !statusFilter && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setStatusFilter(null)}
          >
            <Text style={[styles.filterText, { color: !statusFilter ? colors.primary : colors.text }]}>All</Text>
          </Pressable>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Pressable
              key={key}
              style={[
                styles.filterChip,
                { borderColor: statusFilter === key ? config.color : colors.border },
                statusFilter === key && { backgroundColor: config.bgColor },
              ]}
              onPress={() => setStatusFilter(statusFilter === key ? null : key as PlanStatus)}
            >
              <Text style={[styles.filterText, { color: statusFilter === key ? config.color : colors.text }]}>
                {config.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Food Safety Plans ({filteredPlans.length})
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#6366F1' }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Plan</Text>
          </Pressable>
        </View>

        {filteredPlans.map(plan => {
          const statusConfig = STATUS_CONFIG[plan.status];
          return (
            <Pressable
              key={plan.id}
              style={({ pressed }) => [
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: statusConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(plan)}
            >
              <View style={styles.planHeader}>
                <View style={styles.planTitleArea}>
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.planName}</Text>
                  <Text style={[styles.planFacility, { color: colors.textSecondary }]}>
                    {plan.facilityName} • v{plan.version}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  {plan.status === 'active' && <CheckCircle size={12} color={statusConfig.color} />}
                  {plan.status === 'under_review' && <Clock size={12} color={statusConfig.color} />}
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>

              <View style={styles.planDetails}>
                <View style={styles.detailItem}>
                  <User size={12} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textTertiary }]}>PCQI: {plan.pcqiName}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Calendar size={12} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textTertiary }]}>Review: {plan.nextReviewDate}</Text>
                </View>
              </View>

              <View style={styles.planStats}>
                <View style={[styles.planStatItem, { backgroundColor: colors.background }]}>
                  <AlertTriangle size={14} color="#F59E0B" />
                  <Text style={[styles.planStatText, { color: colors.text }]}>
                    {plan.hazardSummaries.length} Hazards
                  </Text>
                </View>
                <View style={[styles.planStatItem, { backgroundColor: colors.background }]}>
                  <Shield size={14} color="#10B981" />
                  <Text style={[styles.planStatText, { color: colors.text }]}>
                    {plan.preventiveControls.length} Controls
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {filteredPlans.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Food Safety Plans</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create your first FSMA-compliant food safety plan
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Food Safety Plan</Text>
            <Pressable onPress={handleAddPlan}>
              <Text style={[styles.saveButton, { color: '#6366F1' }]}>Create</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Plan Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Ready-to-Eat Salads Food Safety Plan"
              placeholderTextColor={colors.textTertiary}
              value={newPlan.planName}
              onChangeText={(text) => setNewPlan(prev => ({ ...prev, planName: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Facility Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Production facility name"
              placeholderTextColor={colors.textTertiary}
              value={newPlan.facilityName}
              onChangeText={(text) => setNewPlan(prev => ({ ...prev, facilityName: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Product Category</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Ready-to-Eat Fresh Produce"
              placeholderTextColor={colors.textTertiary}
              value={newPlan.productCategory}
              onChangeText={(text) => setNewPlan(prev => ({ ...prev, productCategory: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>PCQI Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Preventive Controls Qualified Individual"
              placeholderTextColor={colors.textTertiary}
              value={newPlan.pcqiName}
              onChangeText={(text) => setNewPlan(prev => ({ ...prev, pcqiName: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>PCQI Training Date</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={newPlan.pcqiTrainingDate}
              onChangeText={(text) => setNewPlan(prev => ({ ...prev, pcqiTrainingDate: text }))}
            />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Plan Details</Text>
            <Pressable>
              <Edit2 size={20} color={colors.primary} />
            </Pressable>
          </View>

          {selectedPlan && (
            <>
              <View style={styles.tabBar}>
                {(['overview', 'hazards', 'controls'] as const).map(tab => (
                  <Pressable
                    key={tab}
                    style={[
                      styles.tab,
                      activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[
                      styles.tabText,
                      { color: activeTab === tab ? colors.primary : colors.textSecondary },
                    ]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView style={styles.modalContent}>
                {activeTab === 'overview' && (
                  <>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.detailCardTitle, { color: colors.text }]}>{selectedPlan.planName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedPlan.status].bgColor, alignSelf: 'flex-start' as const, marginTop: 8 }]}>
                        <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedPlan.status].color }]}>
                          {STATUS_CONFIG[selectedPlan.status].label}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Plan Information</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Version</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.version}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.facilityName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product Category</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.productCategory}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Review</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.lastReviewDate}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next Review</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.nextReviewDate}</Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>PCQI Information</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Name</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.pcqiName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Training Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPlan.pcqiTrainingDate}</Text>
                      </View>
                    </View>
                  </>
                )}

                {activeTab === 'hazards' && (
                  <>
                    <View style={styles.listHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Hazard Analysis ({selectedPlan.hazardSummaries.length})
                      </Text>
                      <Pressable style={[styles.addButton, { backgroundColor: '#F59E0B' }]}>
                        <Plus size={16} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    </View>

                    {selectedPlan.hazardSummaries.map(hazard => {
                      const HazardIcon = HAZARD_ICONS[hazard.hazardCategory];
                      return (
                        <View
                          key={hazard.id}
                          style={[styles.hazardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                          <View style={styles.hazardHeader}>
                            <View style={[styles.hazardIcon, { backgroundColor: getSeverityColor(hazard.severity) + '20' }]}>
                              <HazardIcon size={18} color={getSeverityColor(hazard.severity)} />
                            </View>
                            <View style={styles.hazardTitleArea}>
                              <Text style={[styles.hazardStep, { color: colors.text }]}>{hazard.processStep}</Text>
                              <Text style={[styles.hazardCategory, { color: colors.textSecondary }]}>
                                {hazard.hazardCategory.charAt(0).toUpperCase() + hazard.hazardCategory.slice(1)} Hazard
                              </Text>
                            </View>
                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(hazard.severity) + '20' }]}>
                              <Text style={[styles.severityText, { color: getSeverityColor(hazard.severity) }]}>
                                {hazard.severity.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.hazardDescription, { color: colors.text }]}>
                            {hazard.hazardDescription}
                          </Text>
                          <View style={[styles.controlMeasureBox, { backgroundColor: colors.background }]}>
                            <Shield size={14} color="#10B981" />
                            <Text style={[styles.controlMeasureText, { color: colors.textSecondary }]}>
                              {hazard.controlMeasure}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                    {selectedPlan.hazardSummaries.length === 0 && (
                      <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <AlertTriangle size={36} color={colors.textTertiary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Hazards Documented</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                          Add hazard analysis for each process step
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {activeTab === 'controls' && (
                  <>
                    <View style={styles.listHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Preventive Controls ({selectedPlan.preventiveControls.length})
                      </Text>
                      <Pressable style={[styles.addButton, { backgroundColor: '#10B981' }]}>
                        <Plus size={16} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    </View>

                    {selectedPlan.preventiveControls.map(control => (
                      <View
                        key={control.id}
                        style={[styles.controlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={styles.controlHeader}>
                          <View style={[styles.controlTypeBadge, { backgroundColor: '#10B981' + '20' }]}>
                            <Text style={[styles.controlTypeText, { color: '#10B981' }]}>
                              {control.type.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.controlName, { color: colors.text }]}>{control.name}</Text>
                        </View>
                        
                        <Text style={[styles.controlDescription, { color: colors.textSecondary }]}>
                          {control.description}
                        </Text>

                        <View style={styles.controlDetails}>
                          <View style={styles.controlDetailItem}>
                            <Text style={[styles.controlDetailLabel, { color: colors.textTertiary }]}>Critical Limits</Text>
                            <Text style={[styles.controlDetailValue, { color: colors.text }]}>{control.criticalLimits}</Text>
                          </View>
                          <View style={styles.controlDetailItem}>
                            <Text style={[styles.controlDetailLabel, { color: colors.textTertiary }]}>Monitoring</Text>
                            <Text style={[styles.controlDetailValue, { color: colors.text }]}>{control.monitoringFrequency}</Text>
                          </View>
                          <View style={styles.controlDetailItem}>
                            <Text style={[styles.controlDetailLabel, { color: colors.textTertiary }]}>Responsible</Text>
                            <Text style={[styles.controlDetailValue, { color: colors.text }]}>{control.responsiblePerson}</Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    {selectedPlan.preventiveControls.length === 0 && (
                      <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Shield size={36} color={colors.textTertiary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Preventive Controls</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                          Add preventive controls for identified hazards
                        </Text>
                      </View>
                    )}
                  </>
                )}

                <View style={styles.bottomPadding} />
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  filterRow: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  planCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  planHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  planTitleArea: { flex: 1, marginRight: 8 },
  planName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  planFacility: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  planDetails: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 10,
  },
  detailItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  detailText: { fontSize: 11 },
  planStats: { flexDirection: 'row' as const, gap: 8 },
  planStatItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  planStatText: { fontSize: 12, fontWeight: '500' as const },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8, marginTop: 16 },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  detailCardTitle: { fontSize: 18, fontWeight: '700' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  hazardCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  hazardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  hazardIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  hazardTitleArea: { flex: 1 },
  hazardStep: { fontSize: 14, fontWeight: '600' as const },
  hazardCategory: { fontSize: 11 },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: { fontSize: 10, fontWeight: '700' as const },
  hazardDescription: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  controlMeasureBox: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  controlMeasureText: { flex: 1, fontSize: 12, lineHeight: 16 },
  controlCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  controlHeader: { marginBottom: 8 },
  controlTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start' as const,
    marginBottom: 6,
  },
  controlTypeText: { fontSize: 10, fontWeight: '700' as const },
  controlName: { fontSize: 15, fontWeight: '600' as const },
  controlDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  controlDetails: { gap: 8 },
  controlDetailItem: { gap: 2 },
  controlDetailLabel: { fontSize: 11 },
  controlDetailValue: { fontSize: 13, fontWeight: '500' as const },
});
