import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  UserMinus,
  Search,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  Building2,
  Filter,
  Users,
  Award,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useOffboardings,
  useOffboardingStats,
  OFFBOARDING_STATUS_CONFIG,
  SEPARATION_TYPE_CONFIG,
  OFFBOARDING_STAGES,
  TASK_CATEGORY_CONFIG,
} from '@/hooks/useSupabaseOffboarding';
import {
  type OffboardingStatus,
} from '@/constants/offboardingConstants';

type SeparationType = 'resignation' | 'termination' | 'retirement' | 'layoff' | 'contract_end' | 'mutual_agreement';
type OffboardingStage = 'notification' | 'knowledge_transfer' | 'exit_interview' | 'equipment_return' | 'access_revocation' | 'final_settlement';

interface OffboardingEquipment {
  id: string;
  name: string;
  assetTag?: string;
  returnedAt?: string;
}

interface OffboardingTask {
  id: string;
  category: string;
  status: 'pending' | 'completed' | 'skipped';
}

interface EmployeeOffboarding {
  id: string;
  employeeName: string;
  employeeCode: string;
  position: string;
  department: string;
  facilityName: string;
  separationDate: string;
  hireDate: string;
  yearsOfService: number;
  noticeDate: string;
  lastWorkingDay: string;
  status: OffboardingStatus;
  separationType: SeparationType;
  separationReason?: string;
  currentStage: OffboardingStage;
  progress: number;
  tasks: OffboardingTask[];
  equipment: OffboardingEquipment[];
  supervisorName?: string;
  hrContactName?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'active' | 'completed' | 'all';
type FilterStatus = 'all' | OffboardingStatus;
type FilterSeparationType = 'all' | SeparationType;

export default function OffboardingScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [separationTypeFilter, setSeparationTypeFilter] = useState<FilterSeparationType>('all');
  const [selectedOffboarding, setSelectedOffboarding] = useState<EmployeeOffboarding | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { data: offboardings = [], isLoading, refetch, isRefetching } = useOffboardings();
  const stats = useOffboardingStats();

  const filteredOffboardings = useMemo(() => {
    return offboardings.filter(o => {
      const matchesSearch = 
        o.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesViewMode = 
        viewMode === 'all' ||
        (viewMode === 'active' && (o.status === 'in_progress' || o.status === 'pending' || o.status === 'on_hold')) ||
        (viewMode === 'completed' && o.status === 'completed');

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesSeparationType = separationTypeFilter === 'all' || o.separationType === separationTypeFilter;

      return matchesSearch && matchesViewMode && matchesStatus && matchesSeparationType;
    }).sort((a, b) => new Date(a.separationDate).getTime() - new Date(b.separationDate).getTime());
  }, [offboardings, searchQuery, viewMode, statusFilter, separationTypeFilter]);

  const onRefresh = useCallback(() => {
    console.log('Refreshing offboarding data...');
    refetch();
  }, [refetch]);

  const openDetailModal = useCallback((offboarding: EmployeeOffboarding) => {
    console.log('Opening detail modal for:', offboarding.employeeName);
    setSelectedOffboarding(offboarding);
    setDetailModalVisible(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedOffboarding(null);
  }, []);

  const getDaysUntilSeparation = (separationDate: string) => {
    const today = new Date();
    const sepDate = new Date(separationDate);
    const diffTime = sepDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStageColor = (stage: OffboardingStage) => {
    const stageConfig = OFFBOARDING_STAGES.find(s => s.id === stage);
    return stageConfig?.color || colors.textSecondary;
  };

  const getStageName = (stage: OffboardingStage) => {
    const stageConfig = OFFBOARDING_STAGES.find(s => s.id === stage);
    return stageConfig?.name || stage;
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderOffboardingCard = (offboarding: EmployeeOffboarding) => {
    const daysUntil = getDaysUntilSeparation(offboarding.separationDate);
    const statusConfig = OFFBOARDING_STATUS_CONFIG[offboarding.status];
    const separationConfig = SEPARATION_TYPE_CONFIG[offboarding.separationType];
    const isUrgent = daysUntil <= 7 && daysUntil >= 0 && offboarding.status !== 'completed';
    const isPast = daysUntil < 0 && offboarding.status !== 'completed';

    return (
      <Pressable
        key={offboarding.id}
        style={[
          styles.offboardingCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: isUrgent ? '#EF4444' : isPast ? '#F59E0B' : colors.border,
            borderWidth: isUrgent || isPast ? 2 : 1,
          },
        ]}
        onPress={() => openDetailModal(offboarding)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <View style={[styles.avatar, { backgroundColor: `${separationConfig.color}20` }]}>
              <Text style={[styles.avatarText, { color: separationConfig.color }]}>
                {offboarding.employeeName.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.employeeDetails}>
              <Text style={[styles.employeeName, { color: colors.text }]}>
                {offboarding.employeeName}
              </Text>
              <Text style={[styles.employeePosition, { color: colors.textSecondary }]}>
                {offboarding.position}
              </Text>
              <Text style={[styles.employeeCode, { color: colors.textTertiary }]}>
                {offboarding.employeeCode} • {offboarding.department}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Calendar size={14} color={colors.textTertiary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {formatDate(offboarding.separationDate)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Building2 size={14} color={colors.textTertiary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {offboarding.facilityName}
              </Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: `${statusConfig.color}15` }]}>
              <View style={[styles.tagDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.tagText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: `${separationConfig.color}15` }]}>
              <Text style={[styles.tagText, { color: separationConfig.color }]}>
                {separationConfig.label}
              </Text>
            </View>
            {isUrgent && (
              <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
                <AlertCircle size={12} color="#EF4444" />
                <Text style={[styles.tagText, { color: '#EF4444' }]}>
                  {daysUntil === 0 ? 'Today' : `${daysUntil}d left`}
                </Text>
              </View>
            )}
            {isPast && offboarding.status !== 'completed' && (
              <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
                <AlertCircle size={12} color="#F59E0B" />
                <Text style={[styles.tagText, { color: '#F59E0B' }]}>
                  Overdue
                </Text>
              </View>
            )}
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Progress
              </Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>
                {offboarding.progress}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: offboarding.progress === 100 ? '#10B981' : colors.primary,
                    width: `${offboarding.progress}%`,
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderDetailModal = () => {
    if (!selectedOffboarding) return null;

    const statusConfig = OFFBOARDING_STATUS_CONFIG[selectedOffboarding.status];
    const separationConfig = SEPARATION_TYPE_CONFIG[selectedOffboarding.separationType];
    const daysUntil = getDaysUntilSeparation(selectedOffboarding.separationDate);

    const tasksByCategory = selectedOffboarding.tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, typeof selectedOffboarding.tasks>);

    const completedTasks = selectedOffboarding.tasks.filter(t => t.status === 'completed').length;
    const totalTasks = selectedOffboarding.tasks.length;

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetailModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderContent}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Offboarding Details
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedOffboarding.employeeName}
              </Text>
            </View>
            <Pressable 
              onPress={closeDetailModal}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.employeeHeaderDetail}>
                <View style={[styles.avatarLarge, { backgroundColor: `${separationConfig.color}20` }]}>
                  <Text style={[styles.avatarTextLarge, { color: separationConfig.color }]}>
                    {selectedOffboarding.employeeName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.employeeHeaderInfo}>
                  <Text style={[styles.employeeNameLarge, { color: colors.text }]}>
                    {selectedOffboarding.employeeName}
                  </Text>
                  <Text style={[styles.employeePositionLarge, { color: colors.textSecondary }]}>
                    {selectedOffboarding.position}
                  </Text>
                  <Text style={[styles.employeeCodeLarge, { color: colors.textTertiary }]}>
                    {selectedOffboarding.employeeCode}
                  </Text>
                </View>
              </View>

              <View style={styles.detailTagsRow}>
                <View style={[styles.detailTag, { backgroundColor: `${statusConfig.color}15` }]}>
                  <View style={[styles.tagDot, { backgroundColor: statusConfig.color }]} />
                  <Text style={[styles.detailTagText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
                <View style={[styles.detailTag, { backgroundColor: `${separationConfig.color}15` }]}>
                  <Text style={[styles.detailTagText, { color: separationConfig.color }]}>
                    {separationConfig.label}
                  </Text>
                </View>
                <View style={[styles.detailTag, { backgroundColor: `${getStageColor(selectedOffboarding.currentStage)}15` }]}>
                  <Text style={[styles.detailTagText, { color: getStageColor(selectedOffboarding.currentStage) }]}>
                    {getStageName(selectedOffboarding.currentStage)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Separation Details</Text>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Department</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{selectedOffboarding.department}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Facility</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{selectedOffboarding.facilityName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Hire Date</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(selectedOffboarding.hireDate)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Years of Service</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{selectedOffboarding.yearsOfService.toFixed(1)} years</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Notice Date</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(selectedOffboarding.noticeDate)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Separation Date</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(selectedOffboarding.separationDate)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Last Working Day</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(selectedOffboarding.lastWorkingDay)}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Days Until</Text>
                  <Text style={[
                    styles.infoValue, 
                    { color: daysUntil <= 0 ? '#EF4444' : daysUntil <= 7 ? '#F59E0B' : colors.text }
                  ]}>
                    {daysUntil === 0 ? 'Today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `${daysUntil} days`}
                  </Text>
                </View>
              </View>

              {selectedOffboarding.separationReason && (
                <View style={styles.reasonContainer}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Reason for Separation</Text>
                  <Text style={[styles.reasonText, { color: colors.text }]}>
                    {selectedOffboarding.separationReason}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Progress</Text>
              
              <View style={styles.taskProgressHeader}>
                <Text style={[styles.taskProgressText, { color: colors.textSecondary }]}>
                  {completedTasks} of {totalTasks} tasks completed
                </Text>
                <Text style={[styles.taskProgressPercent, { color: colors.primary }]}>
                  {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                </Text>
              </View>
              <View style={[styles.progressBarLarge, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFillLarge, 
                    { 
                      backgroundColor: completedTasks === totalTasks ? '#10B981' : colors.primary,
                      width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                    }
                  ]} 
                />
              </View>

              <View style={styles.categoryBreakdown}>
                {Object.entries(tasksByCategory).map(([category, tasks]) => {
                  const catConfig = TASK_CATEGORY_CONFIG[category as keyof typeof TASK_CATEGORY_CONFIG];
                  const catCompleted = tasks.filter(t => t.status === 'completed').length;
                  return (
                    <View key={category} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <View style={[styles.categoryDot, { backgroundColor: catConfig.color }]} />
                        <Text style={[styles.categoryName, { color: colors.text }]}>
                          {catConfig.label}
                        </Text>
                      </View>
                      <Text style={[styles.categoryProgress, { color: colors.textSecondary }]}>
                        {catCompleted}/{tasks.length}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {selectedOffboarding.equipment.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment to Return</Text>
                {selectedOffboarding.equipment.map((item) => (
                  <View key={item.id} style={[styles.equipmentItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.equipmentInfo}>
                      <Text style={[styles.equipmentName, { color: colors.text }]}>{item.name}</Text>
                      {item.assetTag && (
                        <Text style={[styles.equipmentTag, { color: colors.textTertiary }]}>
                          Asset: {item.assetTag}
                        </Text>
                      )}
                    </View>
                    <View style={[
                      styles.conditionBadge, 
                      { backgroundColor: item.returnedAt ? '#D1FAE5' : '#FEF3C7' }
                    ]}>
                      <Text style={[
                        styles.conditionText, 
                        { color: item.returnedAt ? '#059669' : '#D97706' }
                      ]}>
                        {item.returnedAt ? 'Returned' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {(selectedOffboarding.supervisorName || selectedOffboarding.hrContactName) && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Contacts</Text>
                {selectedOffboarding.supervisorName && (
                  <View style={styles.contactItem}>
                    <Text style={[styles.contactLabel, { color: colors.textTertiary }]}>Supervisor</Text>
                    <Text style={[styles.contactName, { color: colors.text }]}>
                      {selectedOffboarding.supervisorName}
                    </Text>
                  </View>
                )}
                {selectedOffboarding.hrContactName && (
                  <View style={styles.contactItem}>
                    <Text style={[styles.contactLabel, { color: colors.textTertiary }]}>HR Contact</Text>
                    <Text style={[styles.contactName, { color: colors.text }]}>
                      {selectedOffboarding.hrContactName}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
          <Pressable 
            onPress={() => setFilterModalVisible(false)}
            style={[styles.closeButton, { backgroundColor: colors.background }]}
          >
            <X size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Status</Text>
            <View style={styles.filterOptions}>
              {(['all', ...Object.keys(OFFBOARDING_STATUS_CONFIG)] as FilterStatus[]).map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: statusFilter === status ? colors.primary : colors.surface,
                      borderColor: statusFilter === status ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: statusFilter === status ? '#FFFFFF' : colors.text }
                  ]}>
                    {status === 'all' ? 'All Statuses' : OFFBOARDING_STATUS_CONFIG[status].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Separation Type</Text>
            <View style={styles.filterOptions}>
              {(['all', ...Object.keys(SEPARATION_TYPE_CONFIG)] as FilterSeparationType[]).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.filterOption,
                    { 
                      backgroundColor: separationTypeFilter === type ? colors.primary : colors.surface,
                      borderColor: separationTypeFilter === type ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSeparationTypeFilter(type)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: separationTypeFilter === type ? '#FFFFFF' : colors.text }
                  ]}>
                    {type === 'all' ? 'All Types' : SEPARATION_TYPE_CONFIG[type].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.clearFiltersButton, { borderColor: colors.border }]}
            onPress={() => {
              setStatusFilter('all');
              setSeparationTypeFilter('all');
            }}
          >
            <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear All Filters</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (separationTypeFilter !== 'all' ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Active',
            stats.activeCount,
            <Users size={20} color="#3B82F6" />,
            '#3B82F6',
          )}
          {renderStatCard(
            'Completed',
            stats.completedCount,
            <CheckCircle size={20} color="#10B981" />,
            '#10B981',
          )}
          {renderStatCard(
            'Resignations',
            stats.byType.resignation,
            <UserMinus size={20} color="#8B5CF6" />,
            '#8B5CF6',
          )}
          {renderStatCard(
            'Avg Service',
            `${stats.avgYearsOfService}y`,
            <Award size={20} color="#F59E0B" />,
            '#F59E0B',
          )}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search employees..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable
            style={[
              styles.filterButton,
              { 
                backgroundColor: activeFiltersCount > 0 ? colors.primary : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Filter size={16} color={activeFiltersCount > 0 ? '#FFFFFF' : colors.textSecondary} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.viewModeContainer}>
          {(['active', 'completed', 'all'] as ViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.viewModeButton,
                { 
                  backgroundColor: viewMode === mode ? colors.primary : colors.surface,
                  borderColor: viewMode === mode ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[
                styles.viewModeText,
                { color: viewMode === mode ? '#FFFFFF' : colors.textSecondary }
              ]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredOffboardings.length} {filteredOffboardings.length === 1 ? 'result' : 'results'}
          </Text>
        </View>

        <View style={styles.offboardingList}>
          {isLoading ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text, marginTop: 16 }]}>Loading...</Text>
            </View>
          ) : filteredOffboardings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <UserMinus size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Offboardings Found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : 'No employees currently in offboarding process'}
              </Text>
            </View>
          ) : (
            filteredOffboardings.map(renderOffboardingCard)
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {renderDetailModal()}
      {renderFilterModal()}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  offboardingList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  offboardingCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  employeePosition: {
    fontSize: 14,
    marginBottom: 2,
  },
  employeeCode: {
    fontSize: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 14,
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
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
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
    padding: 16,
  },
  detailSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  employeeHeaderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarTextLarge: {
    fontSize: 22,
    fontWeight: '600',
  },
  employeeHeaderInfo: {
    flex: 1,
  },
  employeeNameLarge: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  employeePositionLarge: {
    fontSize: 15,
    marginBottom: 2,
  },
  employeeCodeLarge: {
    fontSize: 13,
  },
  detailTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  detailTagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: '45%',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  reasonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  taskProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskProgressText: {
    fontSize: 14,
  },
  taskProgressPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarLarge: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: 4,
  },
  categoryBreakdown: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 14,
  },
  categoryProgress: {
    fontSize: 14,
    fontWeight: '500',
  },
  equipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  equipmentTag: {
    fontSize: 12,
  },
  conditionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactItem: {
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
