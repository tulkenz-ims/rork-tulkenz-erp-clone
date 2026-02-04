import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  X,
  ChevronRight,
  Users,
  DollarSign,
  GraduationCap,
  Building2,
  Clock,
  Star,
  UserCog,
  AlertCircle,
  Check,
  Edit3,
  Trash2,
  MoreVertical,
  Layers,
  TrendingUp,
  MapPin,
  Award,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDepartments } from '@/hooks/useDepartments';
import { useFacilities } from '@/hooks/useFacilities';
import {
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  usePositionStats,
  useNextPositionCode,
  useJobFamilies,
  usePayGrades,
} from '@/hooks/usePositions';
import type { 
  Position, 
  PositionWithRelations, 
  PositionCreateInput,
  JobLevel,
  EmploymentType,
  FLSAStatus,
} from '@/types/position';
import {
  JOB_LEVEL_LABELS,
  JOB_LEVEL_COLORS,
  EMPLOYMENT_TYPE_LABELS,
  FLSA_STATUS_LABELS,
  POSITION_STATUS_LABELS,
  POSITION_STATUS_COLORS,
} from '@/types/position';

const JOB_LEVELS: JobLevel[] = ['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contract', 'temporary', 'intern'];

interface PositionFormData {
  position_code: string;
  title: string;
  short_title: string;
  description: string;
  job_family: string;
  job_level: JobLevel | '';
  employment_type: EmploymentType;
  flsa_status: FLSAStatus;
  department_code: string;
  facility_id: string;
  pay_grade: string;
  min_salary: string;
  max_salary: string;
  budgeted_headcount: string;
  education_required: string;
  experience_years_min: string;
  skills_required: string;
  is_critical_role: boolean;
  supervisory_role: boolean;
  is_remote_eligible: boolean;
}

const initialFormData: PositionFormData = {
  position_code: '',
  title: '',
  short_title: '',
  description: '',
  job_family: '',
  job_level: '',
  employment_type: 'full_time',
  flsa_status: 'non_exempt',
  department_code: '',
  facility_id: '',
  pay_grade: '',
  min_salary: '',
  max_salary: '',
  budgeted_headcount: '1',
  education_required: '',
  experience_years_min: '0',
  skills_required: '',
  is_critical_role: false,
  supervisory_role: false,
  is_remote_eligible: false,
};

export default function PositionsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionWithRelations | null>(null);
  const [editingPosition, setEditingPosition] = useState<PositionWithRelations | null>(null);
  const [formData, setFormData] = useState<PositionFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'critical'>('all');

  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterFacility, setFilterFacility] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterJobLevel, setFilterJobLevel] = useState<string | null>(null);

  const { data: departments = [] } = useDepartments();
  const { data: facilities = [] } = useFacilities();
  const { data: nextCode } = useNextPositionCode();
  const { data: jobFamilies = [] } = useJobFamilies();
  const { data: payGrades = [] } = usePayGrades();

  const {
    data: positions = [],
    isLoading,
    refetch,
    isRefetching,
  } = usePositions({
    departmentCode: filterDepartment || undefined,
    facilityId: filterFacility || undefined,
    status: filterStatus || undefined,
    jobLevel: filterJobLevel || undefined,
  });

  const { data: stats } = usePositionStats();

  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const filteredPositions = useMemo(() => {
    let result = positions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        pos =>
          pos.title.toLowerCase().includes(query) ||
          pos.position_code.toLowerCase().includes(query) ||
          (pos.job_family && pos.job_family.toLowerCase().includes(query)) ||
          (pos.department_name && pos.department_name.toLowerCase().includes(query))
      );
    }

    if (activeTab === 'open') {
      result = result.filter(pos => (pos.budgeted_headcount - pos.filled_headcount) > 0);
    } else if (activeTab === 'critical') {
      result = result.filter(pos => pos.is_critical_role);
    }

    return result;
  }, [positions, searchQuery, activeTab]);

  const hasFilters = filterDepartment || filterFacility || filterStatus || filterJobLevel;

  const clearFilters = useCallback(() => {
    setFilterDepartment(null);
    setFilterFacility(null);
    setFilterStatus(null);
    setFilterJobLevel(null);
    setSearchQuery('');
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingPosition(null);
    setFormData({
      ...initialFormData,
      position_code: nextCode || 'POS-001',
    });
    setShowForm(true);
  }, [nextCode]);

  const openEditForm = useCallback((position: PositionWithRelations) => {
    setEditingPosition(position);
    setFormData({
      position_code: position.position_code,
      title: position.title,
      short_title: position.short_title || '',
      description: position.description || '',
      job_family: position.job_family || '',
      job_level: position.job_level || '',
      employment_type: position.employment_type,
      flsa_status: position.flsa_status,
      department_code: position.department_code || '',
      facility_id: position.facility_id || '',
      pay_grade: position.pay_grade || '',
      min_salary: position.min_salary?.toString() || '',
      max_salary: position.max_salary?.toString() || '',
      budgeted_headcount: position.budgeted_headcount.toString(),
      education_required: position.education_required || '',
      experience_years_min: position.experience_years_min.toString(),
      skills_required: position.skills_required?.join(', ') || '',
      is_critical_role: position.is_critical_role,
      supervisory_role: position.supervisory_role,
      is_remote_eligible: position.is_remote_eligible,
    });
    setShowDetails(false);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Position title is required');
      return;
    }
    if (!formData.position_code.trim()) {
      Alert.alert('Error', 'Position code is required');
      return;
    }

    const dept = departments.find(d => d.department_code === formData.department_code);
    const fac = facilities.find(f => f.id === formData.facility_id);

    const positionData: PositionCreateInput = {
      position_code: formData.position_code.trim(),
      title: formData.title.trim(),
      short_title: formData.short_title.trim() || undefined,
      description: formData.description.trim() || undefined,
      job_family: formData.job_family.trim() || undefined,
      job_level: formData.job_level || undefined,
      employment_type: formData.employment_type,
      flsa_status: formData.flsa_status,
      department_code: formData.department_code || undefined,
      department_name: dept?.name || undefined,
      facility_id: formData.facility_id || undefined,
      facility_name: fac?.name || undefined,
      pay_grade: formData.pay_grade.trim() || undefined,
      min_salary: formData.min_salary ? parseFloat(formData.min_salary) : undefined,
      max_salary: formData.max_salary ? parseFloat(formData.max_salary) : undefined,
      budgeted_headcount: parseInt(formData.budgeted_headcount, 10) || 1,
      education_required: formData.education_required.trim() || undefined,
      experience_years_min: parseInt(formData.experience_years_min, 10) || 0,
      skills_required: formData.skills_required
        ? formData.skills_required.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      is_critical_role: formData.is_critical_role,
      supervisory_role: formData.supervisory_role,
      is_remote_eligible: formData.is_remote_eligible,
    };

    try {
      if (editingPosition) {
        await updatePosition.mutateAsync({ id: editingPosition.id, ...positionData });
        Alert.alert('Success', 'Position updated successfully');
      } else {
        await createPosition.mutateAsync(positionData);
        Alert.alert('Success', 'Position created successfully');
      }
      setShowForm(false);
      setEditingPosition(null);
      setFormData(initialFormData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save position');
    }
  }, [formData, editingPosition, departments, facilities, createPosition, updatePosition]);

  const handleDelete = useCallback(async (position: PositionWithRelations) => {
    Alert.alert(
      'Delete Position',
      `Are you sure you want to delete "${position.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePosition.mutateAsync(position.id);
              setShowDetails(false);
              setSelectedPosition(null);
              Alert.alert('Success', 'Position deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete position');
            }
          },
        },
      ]
    );
  }, [deletePosition]);

  const openDetails = useCallback((position: PositionWithRelations) => {
    setSelectedPosition(position);
    setShowDetails(true);
  }, []);

  const getDepartmentName = (code: string | null) => {
    if (!code) return 'Not Assigned';
    const dept = departments.find(d => d.department_code === code);
    return dept?.name || code;
  };

  const getFacilityName = (id: string | null) => {
    if (!id) return 'All Facilities';
    const fac = facilities.find(f => f.id === id);
    return fac?.name || 'Unknown';
  };

  const formatSalary = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderPositionCard = (position: PositionWithRelations) => {
    const levelColor = position.job_level ? JOB_LEVEL_COLORS[position.job_level] : colors.textSecondary;
    const statusColor = POSITION_STATUS_COLORS[position.status];
    const openCount = position.budgeted_headcount - position.filled_headcount;

    return (
      <Pressable
        key={position.id}
        style={[styles.positionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openDetails(position)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>
              {position.job_level ? JOB_LEVEL_LABELS[position.job_level] : 'Unclassified'}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {position.is_critical_role && (
              <View style={[styles.criticalBadge, { backgroundColor: colors.errorBg }]}>
                <Star size={12} color={colors.error} />
              </View>
            )}
            {position.supervisory_role && (
              <View style={[styles.supervisorBadge, { backgroundColor: colors.primaryLight }]}>
                <UserCog size={12} color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.positionTitle, { color: colors.text }]} numberOfLines={1}>
          {position.title}
        </Text>
        <Text style={[styles.positionCode, { color: colors.textSecondary }]}>
          {position.position_code}
        </Text>

        <View style={styles.cardMeta}>
          {position.department_name && (
            <View style={styles.metaItem}>
              <Building2 size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {position.department_name}
              </Text>
            </View>
          )}
          {position.pay_grade && (
            <View style={styles.metaItem}>
              <DollarSign size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {position.pay_grade}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.headcountSection}>
            <View style={styles.headcountItem}>
              <Text style={[styles.headcountValue, { color: colors.text }]}>
                {position.filled_headcount}
              </Text>
              <Text style={[styles.headcountLabel, { color: colors.textTertiary }]}>Filled</Text>
            </View>
            <View style={[styles.headcountDivider, { backgroundColor: colors.border }]} />
            <View style={styles.headcountItem}>
              <Text style={[styles.headcountValue, { color: colors.text }]}>
                {position.budgeted_headcount}
              </Text>
              <Text style={[styles.headcountLabel, { color: colors.textTertiary }]}>Budgeted</Text>
            </View>
            {openCount > 0 && (
              <>
                <View style={[styles.headcountDivider, { backgroundColor: colors.border }]} />
                <View style={styles.headcountItem}>
                  <Text style={[styles.headcountValue, { color: colors.warning }]}>
                    {openCount}
                  </Text>
                  <Text style={[styles.headcountLabel, { color: colors.textTertiary }]}>Open</Text>
                </View>
              </>
            )}
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Position Management',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={openCreateForm} style={styles.headerButton}>
              <Plus size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search positions..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        <Pressable
          style={[
            styles.filterButton,
            { backgroundColor: hasFilters ? colors.primary + '20' : colors.backgroundSecondary },
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={16} color={hasFilters ? colors.primary : colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
                <Briefcase size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Positions</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.successBg }]}>
                <Users size={18} color={colors.success} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalFilled}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Filled</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.warningBg }]}>
                <AlertCircle size={18} color={colors.warning} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalOpen}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.errorBg }]}>
                <Star size={18} color={colors.error} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.criticalRoles}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Critical</Text>
            </View>
          </View>
        )}

        <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundSecondary }]}>
          {(['all', 'open', 'critical'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.surface },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab === 'all' ? 'All' : tab === 'open' ? 'Open' : 'Critical'}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading positions...
            </Text>
          </View>
        ) : filteredPositions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Briefcase size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Positions Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {hasFilters || searchQuery
                ? 'Try adjusting your filters'
                : 'Create your first position to get started'}
            </Text>
            {(hasFilters || searchQuery) && (
              <Pressable
                style={[styles.clearFiltersButton, { backgroundColor: colors.primary }]}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.positionsList}>
            {filteredPositions.map(renderPositionCard)}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
          <View style={[styles.filtersModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.filtersHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.filtersTitle, { color: colors.text }]}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.filtersContent}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Department</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    !filterDepartment && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setFilterDepartment(null)}
                >
                  <Text style={[styles.filterOptionText, { color: !filterDepartment ? colors.primary : colors.text }]}>
                    All
                  </Text>
                </Pressable>
                {departments.filter(d => d.status === 'active').map(dept => (
                  <Pressable
                    key={dept.id}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      filterDepartment === dept.department_code && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setFilterDepartment(dept.department_code)}
                  >
                    <Text style={[styles.filterOptionText, { color: filterDepartment === dept.department_code ? colors.primary : colors.text }]}>
                      {dept.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Job Level</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    !filterJobLevel && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setFilterJobLevel(null)}
                >
                  <Text style={[styles.filterOptionText, { color: !filterJobLevel ? colors.primary : colors.text }]}>
                    All
                  </Text>
                </Pressable>
                {JOB_LEVELS.map(level => (
                  <Pressable
                    key={level}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      filterJobLevel === level && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setFilterJobLevel(level)}
                  >
                    <Text style={[styles.filterOptionText, { color: filterJobLevel === level ? colors.primary : colors.text }]}>
                      {JOB_LEVEL_LABELS[level]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: null, label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'frozen', label: 'Frozen' },
                ].map(opt => (
                  <Pressable
                    key={opt.value ?? 'all'}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      filterStatus === opt.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setFilterStatus(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, { color: filterStatus === opt.value ? colors.primary : colors.text }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.filtersFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.filtersClearBtn, { borderColor: colors.border }]}
                onPress={clearFilters}
              >
                <Text style={[styles.filtersClearText, { color: colors.textSecondary }]}>Clear All</Text>
              </Pressable>
              <Pressable
                style={[styles.filtersApplyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.filtersApplyText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Position Form Modal */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={[styles.formModal, { backgroundColor: colors.surface }]}>
          <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingPosition ? 'Edit Position' : 'New Position'}
            </Text>
            <Pressable onPress={() => setShowForm(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Basic Information</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Position Code *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.position_code}
              onChangeText={(text) => setFormData(prev => ({ ...prev, position_code: text }))}
              placeholder="POS-001"
              placeholderTextColor={colors.textTertiary}
              editable={!editingPosition}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., Senior Software Engineer"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Short Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.short_title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, short_title: text }))}
              placeholder="e.g., Sr. SWE"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Position description..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Classification</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Job Family</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.job_family}
              onChangeText={(text) => setFormData(prev => ({ ...prev, job_family: text }))}
              placeholder="e.g., Engineering, Operations"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Job Level</Text>
            <View style={styles.chipContainer}>
              {JOB_LEVELS.map(level => (
                <Pressable
                  key={level}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    formData.job_level === level && { backgroundColor: JOB_LEVEL_COLORS[level] + '20', borderColor: JOB_LEVEL_COLORS[level] },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, job_level: level }))}
                >
                  <Text style={[styles.chipText, { color: formData.job_level === level ? JOB_LEVEL_COLORS[level] : colors.text }]}>
                    {JOB_LEVEL_LABELS[level]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Employment Type</Text>
            <View style={styles.chipContainer}>
              {EMPLOYMENT_TYPES.map(type => (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    formData.employment_type === type && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, employment_type: type }))}
                >
                  <Text style={[styles.chipText, { color: formData.employment_type === type ? colors.primary : colors.text }]}>
                    {EMPLOYMENT_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FLSA Status</Text>
            <View style={styles.chipContainer}>
              {(['exempt', 'non_exempt'] as FLSAStatus[]).map(status => (
                <Pressable
                  key={status}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    formData.flsa_status === status && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, flsa_status: status }))}
                >
                  <Text style={[styles.chipText, { color: formData.flsa_status === status ? colors.primary : colors.text }]}>
                    {FLSA_STATUS_LABELS[status]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Organization</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <Pressable
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  !formData.department_code && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, department_code: '' }))}
              >
                <Text style={[styles.chipText, { color: !formData.department_code ? colors.primary : colors.text }]}>
                  None
                </Text>
              </Pressable>
              {departments.filter(d => d.status === 'active').map(dept => (
                <Pressable
                  key={dept.id}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    formData.department_code === dept.department_code && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, department_code: dept.department_code }))}
                >
                  <Text style={[styles.chipText, { color: formData.department_code === dept.department_code ? colors.primary : colors.text }]}>
                    {dept.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Compensation</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pay Grade</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.pay_grade}
              onChangeText={(text) => setFormData(prev => ({ ...prev, pay_grade: text }))}
              placeholder="e.g., G5, Band 3"
              placeholderTextColor={colors.textTertiary}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min Salary</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={formData.min_salary}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, min_salary: text }))}
                  placeholder="50000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max Salary</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={formData.max_salary}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, max_salary: text }))}
                  placeholder="80000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Headcount</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Budgeted Headcount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.budgeted_headcount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, budgeted_headcount: text }))}
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Requirements</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Education Required</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.education_required}
              onChangeText={(text) => setFormData(prev => ({ ...prev, education_required: text }))}
              placeholder="e.g., Bachelor's Degree"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min Experience (Years)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.experience_years_min}
              onChangeText={(text) => setFormData(prev => ({ ...prev, experience_years_min: text }))}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Required Skills (comma separated)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={formData.skills_required}
              onChangeText={(text) => setFormData(prev => ({ ...prev, skills_required: text }))}
              placeholder="e.g., Leadership, Communication, Excel"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.formSectionTitle, { color: colors.textSecondary }]}>Attributes</Text>

            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => setFormData(prev => ({ ...prev, is_critical_role: !prev.is_critical_role }))}
            >
              <View style={styles.toggleInfo}>
                <Star size={18} color={formData.is_critical_role ? colors.error : colors.textSecondary} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Critical Role</Text>
              </View>
              <View style={[styles.toggleSwitch, formData.is_critical_role && { backgroundColor: colors.error }]}>
                {formData.is_critical_role && <Check size={14} color="#FFF" />}
              </View>
            </Pressable>

            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => setFormData(prev => ({ ...prev, supervisory_role: !prev.supervisory_role }))}
            >
              <View style={styles.toggleInfo}>
                <UserCog size={18} color={formData.supervisory_role ? colors.primary : colors.textSecondary} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Supervisory Role</Text>
              </View>
              <View style={[styles.toggleSwitch, formData.supervisory_role && { backgroundColor: colors.primary }]}>
                {formData.supervisory_role && <Check size={14} color="#FFF" />}
              </View>
            </Pressable>

            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => setFormData(prev => ({ ...prev, is_remote_eligible: !prev.is_remote_eligible }))}
            >
              <View style={styles.toggleInfo}>
                <MapPin size={18} color={formData.is_remote_eligible ? colors.success : colors.textSecondary} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Remote Eligible</Text>
              </View>
              <View style={[styles.toggleSwitch, formData.is_remote_eligible && { backgroundColor: colors.success }]}>
                {formData.is_remote_eligible && <Check size={14} color="#FFF" />}
              </View>
            </Pressable>

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={[styles.formFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable
              style={[styles.formCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowForm(false)}
            >
              <Text style={[styles.formCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.formSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={createPosition.isPending || updatePosition.isPending}
            >
              {(createPosition.isPending || updatePosition.isPending) ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.formSaveText}>{editingPosition ? 'Update' : 'Create'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Position Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={[styles.detailsModal, { backgroundColor: colors.surface }]}>
          {selectedPosition && (
            <>
              <View style={[styles.detailsHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.detailsHeaderLeft}>
                  <Pressable onPress={() => setShowDetails(false)} style={styles.backButton}>
                    <X size={24} color={colors.text} />
                  </Pressable>
                </View>
                <View style={styles.detailsHeaderRight}>
                  <Pressable
                    style={[styles.headerIconBtn, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => openEditForm(selectedPosition)}
                  >
                    <Edit3 size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.headerIconBtn, { backgroundColor: colors.errorBg }]}
                    onPress={() => handleDelete(selectedPosition)}
                  >
                    <Trash2 size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>

              <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailsTop}>
                  <View style={[
                    styles.detailsLevelBadge,
                    { backgroundColor: selectedPosition.job_level ? JOB_LEVEL_COLORS[selectedPosition.job_level] + '20' : colors.backgroundSecondary }
                  ]}>
                    <Text style={[
                      styles.detailsLevelText,
                      { color: selectedPosition.job_level ? JOB_LEVEL_COLORS[selectedPosition.job_level] : colors.textSecondary }
                    ]}>
                      {selectedPosition.job_level ? JOB_LEVEL_LABELS[selectedPosition.job_level] : 'Unclassified'}
                    </Text>
                  </View>
                  <Text style={[styles.detailsTitle, { color: colors.text }]}>
                    {selectedPosition.title}
                  </Text>
                  <Text style={[styles.detailsCode, { color: colors.textSecondary }]}>
                    {selectedPosition.position_code}
                  </Text>

                  <View style={styles.detailsBadges}>
                    <View style={[styles.statusBadge, { backgroundColor: POSITION_STATUS_COLORS[selectedPosition.status] + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: POSITION_STATUS_COLORS[selectedPosition.status] }]}>
                        {POSITION_STATUS_LABELS[selectedPosition.status]}
                      </Text>
                    </View>
                    {selectedPosition.is_critical_role && (
                      <View style={[styles.attrBadge, { backgroundColor: colors.errorBg }]}>
                        <Star size={12} color={colors.error} />
                        <Text style={[styles.attrBadgeText, { color: colors.error }]}>Critical</Text>
                      </View>
                    )}
                    {selectedPosition.supervisory_role && (
                      <View style={[styles.attrBadge, { backgroundColor: colors.primaryLight }]}>
                        <UserCog size={12} color={colors.primary} />
                        <Text style={[styles.attrBadgeText, { color: colors.primary }]}>Supervisory</Text>
                      </View>
                    )}
                    {selectedPosition.is_remote_eligible && (
                      <View style={[styles.attrBadge, { backgroundColor: colors.successBg }]}>
                        <MapPin size={12} color={colors.success} />
                        <Text style={[styles.attrBadgeText, { color: colors.success }]}>Remote</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.headcountCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.headcountCardItem}>
                    <Text style={[styles.headcountCardValue, { color: colors.success }]}>
                      {selectedPosition.filled_headcount}
                    </Text>
                    <Text style={[styles.headcountCardLabel, { color: colors.textSecondary }]}>Filled</Text>
                  </View>
                  <View style={[styles.headcountCardDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.headcountCardItem}>
                    <Text style={[styles.headcountCardValue, { color: colors.text }]}>
                      {selectedPosition.budgeted_headcount}
                    </Text>
                    <Text style={[styles.headcountCardLabel, { color: colors.textSecondary }]}>Budgeted</Text>
                  </View>
                  <View style={[styles.headcountCardDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.headcountCardItem}>
                    <Text style={[
                      styles.headcountCardValue,
                      { color: (selectedPosition.budgeted_headcount - selectedPosition.filled_headcount) > 0 ? colors.warning : colors.textSecondary }
                    ]}>
                      {selectedPosition.budgeted_headcount - selectedPosition.filled_headcount}
                    </Text>
                    <Text style={[styles.headcountCardLabel, { color: colors.textSecondary }]}>Open</Text>
                  </View>
                </View>

                {selectedPosition.description && (
                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.textSecondary }]}>Description</Text>
                    <Text style={[styles.descriptionText, { color: colors.text }]}>
                      {selectedPosition.description}
                    </Text>
                  </View>
                )}

                <View style={styles.detailsSection}>
                  <Text style={[styles.detailsSectionTitle, { color: colors.textSecondary }]}>Details</Text>
                  
                  {selectedPosition.department_name && (
                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Building2 size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Department</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPosition.department_name}</Text>
                      </View>
                    </View>
                  )}

                  {selectedPosition.job_family && (
                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Layers size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Job Family</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPosition.job_family}</Text>
                      </View>
                    </View>
                  )}

                  <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Clock size={16} color={colors.textSecondary} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Employment Type</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {EMPLOYMENT_TYPE_LABELS[selectedPosition.employment_type]}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Award size={16} color={colors.textSecondary} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>FLSA Status</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {FLSA_STATUS_LABELS[selectedPosition.flsa_status]}
                      </Text>
                    </View>
                  </View>
                </View>

                {(selectedPosition.pay_grade || selectedPosition.min_salary || selectedPosition.max_salary) && (
                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.textSecondary }]}>Compensation</Text>
                    
                    {selectedPosition.pay_grade && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <TrendingUp size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Pay Grade</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPosition.pay_grade}</Text>
                        </View>
                      </View>
                    )}

                    {(selectedPosition.min_salary || selectedPosition.max_salary) && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <DollarSign size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Salary Range</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {formatSalary(selectedPosition.min_salary)} - {formatSalary(selectedPosition.max_salary)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {(selectedPosition.education_required || selectedPosition.experience_years_min > 0) && (
                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.textSecondary }]}>Requirements</Text>
                    
                    {selectedPosition.education_required && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <GraduationCap size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Education</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPosition.education_required}</Text>
                        </View>
                      </View>
                    )}

                    {selectedPosition.experience_years_min > 0 && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <Clock size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Min Experience</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {selectedPosition.experience_years_min} year{selectedPosition.experience_years_min !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {selectedPosition.skills_required && selectedPosition.skills_required.length > 0 && (
                  <View style={styles.detailsSection}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.textSecondary }]}>Required Skills</Text>
                    <View style={styles.skillsContainer}>
                      {selectedPosition.skills_required.map((skill, index) => (
                        <View key={index} style={[styles.skillChip, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.skillChipText, { color: colors.text }]}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ height: 100 }} />
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: 8,
    padding: 4,
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
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  clearFiltersText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  positionsList: {
    gap: 12,
  },
  positionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    gap: 6,
  },
  criticalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supervisorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  positionCode: {
    fontSize: 13,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  headcountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headcountItem: {
    alignItems: 'center',
  },
  headcountValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  headcountLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  headcountDivider: {
    width: 1,
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filtersModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filtersContent: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filtersFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  filtersClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  filtersClearText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  filtersApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  filtersApplyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  formModal: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  formContent: {
    flex: 1,
    padding: 20,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  toggleSwitch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  formSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  formSaveText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  detailsModal: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  detailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  detailsHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContent: {
    flex: 1,
  },
  detailsTop: {
    padding: 20,
    alignItems: 'center',
  },
  detailsLevelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailsLevelText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  detailsCode: {
    fontSize: 14,
    marginBottom: 16,
  },
  detailsBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  attrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  attrBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  headcountCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  headcountCardItem: {
    flex: 1,
    alignItems: 'center',
  },
  headcountCardValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  headcountCardLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  headcountCardDivider: {
    width: 1,
    height: '100%',
  },
  detailsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
