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
  Network,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Building2,
  Search,
  Filter,
  X,
  UserCog,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Check,
  AlertCircle,
  TrendingUp,
  Layers,
  GitBranch,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDepartments } from '@/hooks/useDepartments';
import { useFacilities } from '@/hooks/useFacilities';
import {
  useOrgHierarchy,
  useOrgTree,
  useUpdateManager,
  getHierarchyStats,
  OrgEmployee,
  OrgNode,
} from '@/hooks/useOrgHierarchy';

const ROLE_COLORS: Record<string, string> = {
  superadmin: '#EF4444',
  admin: '#F59E0B',
  manager: '#8B5CF6',
  supervisor: '#3B82F6',
  employee: '#10B981',
  contractor: '#6B7280',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  inactive: '#6B7280',
  on_leave: '#F59E0B',
};

export default function OrgHierarchyScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgEmployee | null>(null);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: departments = [] } = useDepartments();
  const { data: facilities = [] } = useFacilities();
  
  const {
    data: employees = [],
    isLoading,
    refetch,
    isRefetching,
  } = useOrgHierarchy({
    facilityId: selectedFacility || undefined,
    departmentCode: selectedDepartment || undefined,
    status: selectedStatus || undefined,
  });

  const updateManager = useUpdateManager();

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      emp =>
        emp.full_name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.employee_code.toLowerCase().includes(query) ||
        (emp.position && emp.position.toLowerCase().includes(query))
    );
  }, [employees, searchQuery]);

  const orgTree = useOrgTree(filteredEmployees);
  const stats = useMemo(() => getHierarchyStats(employees), [employees]);

  const toggleNode = useCallback((nodeId: string) => {
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

  const expandAll = useCallback(() => {
    const allIds = new Set(employees.map(e => e.id));
    setExpandedNodes(allIds);
  }, [employees]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const handleSelectManager = useCallback(async (managerId: string | null) => {
    if (!selectedEmployee) return;

    if (managerId === selectedEmployee.id) {
      Alert.alert('Error', 'An employee cannot be their own manager');
      return;
    }

    try {
      await updateManager.mutateAsync({
        employeeId: selectedEmployee.id,
        managerId,
      });
      setShowManagerPicker(false);
      setSelectedEmployee(null);
      Alert.alert('Success', 'Manager updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update manager');
    }
  }, [selectedEmployee, updateManager]);

  const clearFilters = useCallback(() => {
    setSelectedFacility(null);
    setSelectedDepartment(null);
    setSelectedStatus(null);
    setSearchQuery('');
  }, []);

  const hasFilters = selectedFacility || selectedDepartment || selectedStatus || searchQuery;

  const renderTreeNode = (node: OrgNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const roleColor = ROLE_COLORS[node.role] || colors.textSecondary;
    const statusColor = STATUS_COLORS[node.status] || colors.textTertiary;

    return (
      <View key={node.id}>
        <Pressable
          style={[
            styles.treeNode,
            { 
              backgroundColor: colors.surface,
              marginLeft: depth * 20,
              borderLeftColor: roleColor,
            },
          ]}
          onPress={() => setSelectedEmployee(node)}
        >
          <View style={styles.nodeLeft}>
            {hasChildren ? (
              <Pressable
                style={[styles.expandButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => toggleNode(node.id)}
              >
                {isExpanded ? (
                  <ChevronDown size={14} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={14} color={colors.textSecondary} />
                )}
              </Pressable>
            ) : (
              <View style={styles.expandPlaceholder} />
            )}

            <View style={[styles.avatar, { backgroundColor: roleColor + '20' }]}>
              <Text style={[styles.avatarText, { color: roleColor }]}>
                {node.first_name[0]}{node.last_name[0]}
              </Text>
            </View>

            <View style={styles.nodeInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.nodeName, { color: colors.text }]} numberOfLines={1}>
                  {node.full_name}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              </View>
              <Text style={[styles.nodePosition, { color: colors.textSecondary }]} numberOfLines={1}>
                {node.position || node.role}
              </Text>
            </View>
          </View>

          <View style={styles.nodeRight}>
            {hasChildren && (
              <View style={[styles.reportsBadge, { backgroundColor: colors.primaryLight }]}>
                <Users size={12} color={colors.primary} />
                <Text style={[styles.reportsCount, { color: colors.primary }]}>
                  {node.direct_reports_count}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {isExpanded && hasChildren && (
          <View style={styles.childrenContainer}>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const getDepartmentName = (code: string | null) => {
    if (!code) return 'No Department';
    const dept = departments.find(d => d.department_code === code);
    return dept?.name || code;
  };

  const getFacilityName = (id: string | null) => {
    if (!id) return 'No Facility';
    const fac = facilities.find(f => f.id === id);
    return fac?.name || 'Unknown';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Org Hierarchy',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
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
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
              <Users size={18} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalEmployees}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Employees</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.successBg }]}>
              <UserCog size={18} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.managers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Managers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.warningBg }]}>
              <Layers size={18} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.maxLevel}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Levels</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.infoBg }]}>
              <TrendingUp size={18} color={colors.info} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgSpanOfControl}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Span</Text>
          </View>
        </View>

        <View style={styles.treeHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Organization Tree ({filteredEmployees.length})
          </Text>
          <View style={styles.treeActions}>
            <Pressable
              style={[styles.treeAction, { backgroundColor: colors.backgroundSecondary }]}
              onPress={expandAll}
            >
              <Text style={[styles.treeActionText, { color: colors.textSecondary }]}>Expand</Text>
            </Pressable>
            <Pressable
              style={[styles.treeAction, { backgroundColor: colors.backgroundSecondary }]}
              onPress={collapseAll}
            >
              <Text style={[styles.treeActionText, { color: colors.textSecondary }]}>Collapse</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading organization...
            </Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Network size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Employees Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Add employees to see the organizational hierarchy'}
            </Text>
            {hasFilters && (
              <Pressable
                style={[styles.clearFiltersButton, { backgroundColor: colors.primary }]}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.treeContainer}>
            {orgTree.map(node => renderTreeNode(node, 0))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

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
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Facility</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    !selectedFacility && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedFacility(null)}
                >
                  <Text style={[styles.filterOptionText, { color: !selectedFacility ? colors.primary : colors.text }]}>
                    All
                  </Text>
                </Pressable>
                {facilities.map(fac => (
                  <Pressable
                    key={fac.id}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      selectedFacility === fac.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedFacility(fac.id)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedFacility === fac.id ? colors.primary : colors.text }]}>
                      {fac.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Department</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { borderColor: colors.border },
                    !selectedDepartment && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedDepartment(null)}
                >
                  <Text style={[styles.filterOptionText, { color: !selectedDepartment ? colors.primary : colors.text }]}>
                    All
                  </Text>
                </Pressable>
                {departments.filter(d => d.status === 'active').map(dept => (
                  <Pressable
                    key={dept.id}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      selectedDepartment === dept.department_code && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedDepartment(dept.department_code)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedDepartment === dept.department_code ? colors.primary : colors.text }]}>
                      {dept.name}
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
                  { value: 'on_leave', label: 'On Leave' },
                ].map(opt => (
                  <Pressable
                    key={opt.value ?? 'all'}
                    style={[
                      styles.filterOption,
                      { borderColor: colors.border },
                      selectedStatus === opt.value && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedStatus(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, { color: selectedStatus === opt.value ? colors.primary : colors.text }]}>
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

      <Modal
        visible={!!selectedEmployee}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
            {selectedEmployee && (
              <>
                <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                  <Pressable onPress={() => setSelectedEmployee(null)} style={styles.modalCloseBtn}>
                    <X size={24} color={colors.text} />
                  </Pressable>
                </View>

                <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.profileSection}>
                    <View style={[styles.profileAvatar, { backgroundColor: (ROLE_COLORS[selectedEmployee.role] || colors.primary) + '20' }]}>
                      <Text style={[styles.profileAvatarText, { color: ROLE_COLORS[selectedEmployee.role] || colors.primary }]}>
                        {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                      </Text>
                    </View>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {selectedEmployee.full_name}
                    </Text>
                    <Text style={[styles.profilePosition, { color: colors.textSecondary }]}>
                      {selectedEmployee.position || selectedEmployee.role}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[selectedEmployee.status] || colors.textTertiary) + '20' }]}>
                      <View style={[styles.statusDotLarge, { backgroundColor: STATUS_COLORS[selectedEmployee.status] }]} />
                      <Text style={[styles.statusText, { color: STATUS_COLORS[selectedEmployee.status] }]}>
                        {selectedEmployee.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Details</Text>
                    
                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Mail size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Email</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEmployee.email}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Briefcase size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Role</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEmployee.role}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                        <Building2 size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Department</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {getDepartmentName(selectedEmployee.department_code)}
                        </Text>
                      </View>
                    </View>

                    {selectedEmployee.hire_date && (
                      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                          <Calendar size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.detailInfo}>
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Hire Date</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                      Reporting Structure
                    </Text>
                    
                    <Pressable
                      style={[styles.managerCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                      onPress={() => setShowManagerPicker(true)}
                    >
                      <View style={styles.managerInfo}>
                        <Text style={[styles.managerLabel, { color: colors.textTertiary }]}>Reports To</Text>
                        {selectedEmployee.manager ? (
                          <Text style={[styles.managerName, { color: colors.text }]}>
                            {selectedEmployee.manager.first_name} {selectedEmployee.manager.last_name}
                          </Text>
                        ) : (
                          <Text style={[styles.noManager, { color: colors.textSecondary }]}>
                            No manager assigned
                          </Text>
                        )}
                      </View>
                      <GitBranch size={20} color={colors.primary} />
                    </Pressable>

                    {selectedEmployee.direct_reports_count > 0 && (
                      <View style={[styles.reportsCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
                        <Users size={20} color={colors.primary} />
                        <Text style={[styles.reportsLabel, { color: colors.primary }]}>
                          {selectedEmployee.direct_reports_count} Direct Report{selectedEmployee.direct_reports_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showManagerPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManagerPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowManagerPicker(false)}>
          <View style={[styles.pickerModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Manager</Text>
              <Pressable onPress={() => setShowManagerPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList}>
              <Pressable
                style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectManager(null)}
              >
                <View style={styles.pickerOptionInfo}>
                  <Text style={[styles.pickerOptionName, { color: colors.textSecondary }]}>
                    No Manager (Top Level)
                  </Text>
                </View>
                {!selectedEmployee?.manager_id && <Check size={20} color={colors.primary} />}
              </Pressable>
              {employees
                .filter(e => e.id !== selectedEmployee?.id && e.status === 'active')
                .map(emp => (
                  <Pressable
                    key={emp.id}
                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectManager(emp.id)}
                  >
                    <View style={[styles.pickerAvatar, { backgroundColor: (ROLE_COLORS[emp.role] || colors.primary) + '20' }]}>
                      <Text style={[styles.pickerAvatarText, { color: ROLE_COLORS[emp.role] || colors.primary }]}>
                        {emp.first_name[0]}{emp.last_name[0]}
                      </Text>
                    </View>
                    <View style={styles.pickerOptionInfo}>
                      <Text style={[styles.pickerOptionName, { color: colors.text }]}>{emp.full_name}</Text>
                      <Text style={[styles.pickerOptionRole, { color: colors.textSecondary }]}>
                        {emp.position || emp.role}
                      </Text>
                    </View>
                    {selectedEmployee?.manager_id === emp.id && <Check size={20} color={colors.primary} />}
                  </Pressable>
                ))}
            </ScrollView>
          </View>
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
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
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
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  treeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  treeAction: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  treeActionText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
  treeContainer: {
    gap: 8,
  },
  treeNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  expandButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandPlaceholder: {
    width: 24,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  nodeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeName: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodePosition: {
    fontSize: 13,
    marginTop: 2,
  },
  nodeRight: {
    marginLeft: 8,
  },
  reportsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reportsCount: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  childrenContainer: {
    marginTop: 8,
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
  detailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  detailContent: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '600' as const,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  profilePosition: {
    fontSize: 15,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  detailSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 16,
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
  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  managerInfo: {
    flex: 1,
  },
  managerLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  managerName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  noManager: {
    fontSize: 15,
    fontStyle: 'italic' as const,
  },
  reportsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  reportsLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  pickerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  pickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAvatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pickerOptionInfo: {
    flex: 1,
  },
  pickerOptionName: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  pickerOptionRole: {
    fontSize: 13,
    marginTop: 2,
  },
});
