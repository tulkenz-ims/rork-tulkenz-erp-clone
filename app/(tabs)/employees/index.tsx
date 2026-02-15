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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Search,
  UserPlus,
  ChevronRight,
  UserCheck,
  Clock,
  Shield,
  X,
  Check,
  ChevronDown,
  Calendar,
  TrendingUp,
  AlertCircle,
  Building2,
  Key,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { 
  useEmployees, 
  useFacilities, 
  useLaborMetrics,
  useUpdateEmployeeAvailability,
  useCreateEmployee,
  useUpdateEmployee,
} from '@/hooks/useSupabaseEmployees';
import type { Role } from '@/constants/permissionsConstants';

type StatusFilter = 'all' | 'active' | 'inactive' | 'on_leave';
type RoleFilter = 'all' | 'assigned' | 'unassigned';

interface NewEmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  useCustomId: boolean;
}

interface DayAvailability {
  available: boolean;
  startTime?: string;
  endTime?: string;
}

interface EmployeeAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
  maxHoursPerWeek: number;
  preferredShift?: string;
}

const statusColors = {
  active: '#10B981',
  inactive: '#6B7280',
  on_leave: '#F59E0B',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_AVAILABILITY: EmployeeAvailability = {
  monday: { available: true, startTime: '08:00', endTime: '17:00' },
  tuesday: { available: true, startTime: '08:00', endTime: '17:00' },
  wednesday: { available: true, startTime: '08:00', endTime: '17:00' },
  thursday: { available: true, startTime: '08:00', endTime: '17:00' },
  friday: { available: true, startTime: '08:00', endTime: '17:00' },
  saturday: { available: false },
  sunday: { available: false },
  maxHoursPerWeek: 40,
  preferredShift: 'morning',
};

export default function EmployeesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const { 
    data: employees = [], 
    isLoading: employeesLoading, 
    error: employeesError,
    refetch: refetchEmployees,
  } = useEmployees();
  
  const updateAvailabilityMutation = useUpdateEmployeeAvailability();
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  
  const {
    roles,
    employeeRoleAssignments,
    getEmployeeRole,
    assignRoleToEmployee,
    removeRoleFromEmployee,
  } = usePermissions();
  
  const { canView, canCreate, canAssign, hasAccess } = useModulePermissions('employees');

  const { data: facilities = [], refetch: refetchFacilities } = useFacilities();
  const { data: laborMetrics, refetch: refetchMetrics } = useLaborMetrics();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<EmployeeAvailability | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [facilityDropdownOpen, setFacilityDropdownOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    useCustomId: false,
  });

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employees]);

  const selectedEmployeeRole = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return getEmployeeRole(selectedEmployeeId);
  }, [selectedEmployeeId, getEmployeeRole]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      
      const hasRole = !!employeeRoleAssignments[emp.id];
      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'assigned' && hasRole) ||
        (roleFilter === 'unassigned' && !hasRole);
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [searchQuery, statusFilter, roleFilter, employeeRoleAssignments, employees]);

  const roleStats = useMemo(() => {
    const assigned = employees.filter(e => !!employeeRoleAssignments[e.id]).length;
    return {
      total: employees.length,
      assigned,
      unassigned: employees.length - assigned,
    };
  }, [employees, employeeRoleAssignments]);

  const getFacilityName = (facilityId?: string | null) => {
    if (!facilityId) return 'Unassigned';
    const facility = facilities.find((f) => f.id === facilityId);
    return facility?.name || 'Unassigned';
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[EmployeesScreen] Refreshing data...');
    try {
      await Promise.all([
        refetchEmployees(),
        refetchFacilities(),
        refetchMetrics(),
      ]);
      console.log('[EmployeesScreen] Refresh complete');
    } catch (error) {
      console.error('[EmployeesScreen] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEmployees, refetchFacilities, refetchMetrics]);

  const openRoleModal = useCallback((employeeId: string) => {
    if (!canView) {
      Alert.alert('Access Denied', 'You do not have permission to view employee details.');
      return;
    }
    const emp = employees.find(e => e.id === employeeId);
    setSelectedEmployeeId(employeeId);
    setRoleDropdownOpen(false);
    setFacilityDropdownOpen(false);
    setShowAvailability(false);
    const empAvailability = emp?.availability as EmployeeAvailability | null;
    setEditingAvailability(empAvailability || DEFAULT_AVAILABILITY);
    setSelectedFacilityId(emp?.facility_id || null);
    setRoleModalVisible(true);
    console.log('[EmployeesScreen] Opening role modal for employee:', employeeId);
  }, [canView, employees]);

  const closeRoleModal = useCallback(() => {
    setRoleModalVisible(false);
    setSelectedEmployeeId(null);
    setRoleDropdownOpen(false);
    setFacilityDropdownOpen(false);
    setShowAvailability(false);
    setEditingAvailability(null);
    setSelectedFacilityId(null);
  }, []);

  const generateEmployeeId = useCallback(() => {
    const prefix = 'EMP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp.slice(-4)}${random}`;
  }, []);

  const generatePin = useCallback(() => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }, []);

  const openAddModal = useCallback(() => {
    if (!canCreate) {
      Alert.alert('Access Denied', 'You do not have permission to add employees.');
      return;
    }
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      employeeId: '',
      useCustomId: false,
    });
    setAddModalVisible(true);
    console.log('[EmployeesScreen] Opening add employee modal');
  }, [canCreate]);

  const closeAddModal = useCallback(() => {
    setAddModalVisible(false);
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      employeeId: '',
      useCustomId: false,
    });
  }, []);

  const handleCreateEmployee = useCallback(async () => {
    const { firstName, lastName, email, employeeId, useCustomId } = newEmployee;
    
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter a first name.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Required', 'Please enter a last name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter an email address.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (useCustomId && !employeeId.trim()) {
      Alert.alert('Required', 'Please enter an employee ID or uncheck "Use Custom ID".');
      return;
    }

    const finalEmployeeId = useCustomId ? employeeId.trim() : generateEmployeeId();
    const pin = generatePin();

    try {
      console.log('[EmployeesScreen] Creating employee:', { firstName, lastName, email, employeeId: finalEmployeeId });
      
      await createEmployeeMutation.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        employee_code: finalEmployeeId,
        pin,
        position: 'Employee',
        status: 'active',
      });

      Alert.alert(
        'Employee Added',
        `${firstName} ${lastName} has been added.\n\nEmployee ID: ${finalEmployeeId}\nPIN: ${pin}\n\nPlease share the PIN securely with the employee.`,
        [{ text: 'OK', onPress: closeAddModal }]
      );
      
      console.log('[EmployeesScreen] Employee created successfully');
    } catch (error: any) {
      console.error('[EmployeesScreen] Error creating employee:', error);
      Alert.alert('Error', error?.message || 'Failed to create employee. Please try again.');
    }
  }, [newEmployee, generateEmployeeId, generatePin, createEmployeeMutation, closeAddModal]);

  const handleSaveAvailability = useCallback(async () => {
    if (!selectedEmployeeId || !editingAvailability) return;
    
    try {
      console.log('[EmployeesScreen] Saving availability for:', selectedEmployeeId);
      await updateAvailabilityMutation.mutateAsync({
        id: selectedEmployeeId,
        availability: editingAvailability as unknown as Record<string, unknown>,
      });
      Alert.alert('Saved', 'Employee availability has been updated.');
    } catch (error) {
      console.error('[EmployeesScreen] Error saving availability:', error);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    }
  }, [selectedEmployeeId, editingAvailability, updateAvailabilityMutation]);

  const handleUpdateFacility = useCallback(async (facilityId: string | null) => {
    if (!selectedEmployeeId) return;
    
    try {
      console.log('[EmployeesScreen] Updating facility for:', selectedEmployeeId, 'to:', facilityId);
      await updateEmployeeMutation.mutateAsync({
        id: selectedEmployeeId,
        updates: { facility_id: facilityId },
      });
      setSelectedFacilityId(facilityId);
      setFacilityDropdownOpen(false);
      const facilityName = facilityId ? facilities.find(f => f.id === facilityId)?.name : 'Unassigned';
      Alert.alert('Updated', `Employee facility has been updated to ${facilityName}.`);
    } catch (error) {
      console.error('[EmployeesScreen] Error updating facility:', error);
      Alert.alert('Error', 'Failed to update facility. Please try again.');
    }
  }, [selectedEmployeeId, updateEmployeeMutation, facilities]);

  const toggleDayAvailability = useCallback((day: typeof DAYS[number]) => {
    if (!editingAvailability) return;
    setEditingAvailability(prev => {
      if (!prev) return prev;
      const current = prev[day];
      if (current.available) {
        return { ...prev, [day]: { available: false } };
      } else {
        return { ...prev, [day]: { available: true, startTime: '08:00', endTime: '17:00' } };
      }
    });
  }, [editingAvailability]);

  const updateDayTime = useCallback((day: typeof DAYS[number], field: 'startTime' | 'endTime', value: string) => {
    if (!editingAvailability) return;
    setEditingAvailability(prev => {
      if (!prev) return prev;
      return { ...prev, [day]: { ...prev[day], [field]: value } };
    });
  }, [editingAvailability]);

  const handleAssignRole = useCallback((role: Role) => {
    if (!selectedEmployeeId) return;
    
    if (!canAssign) {
      Alert.alert('Access Denied', 'You do not have permission to assign roles.');
      return;
    }
    
    assignRoleToEmployee(selectedEmployeeId, role.id);
    setRoleDropdownOpen(false);
    Alert.alert(
      'Role Assigned',
      `${selectedEmployee?.first_name} ${selectedEmployee?.last_name} has been assigned the "${role.name}" role.`
    );
    console.log('Role assigned:', role.name, 'to employee:', selectedEmployeeId);
  }, [selectedEmployeeId, selectedEmployee, assignRoleToEmployee, canAssign]);

  const handleRemoveRole = useCallback(() => {
    if (!selectedEmployeeId || !selectedEmployeeRole) return;
    
    if (!canAssign) {
      Alert.alert('Access Denied', 'You do not have permission to remove roles.');
      return;
    }
    
    Alert.alert(
      'Remove Role',
      `Are you sure you want to remove the "${selectedEmployeeRole.name}" role from ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeRoleFromEmployee(selectedEmployeeId);
            console.log('Role removed from employee:', selectedEmployeeId);
          },
        },
      ]
    );
  }, [selectedEmployeeId, selectedEmployee, selectedEmployeeRole, removeRoleFromEmployee, canAssign]);

  const styles = createStyles(colors);

  if (!hasAccess) {
    return (
      <View style={[styles.container, styles.accessDeniedContainer]}>
        <Shield size={48} color={colors.textTertiary} />
        <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>Access Restricted</Text>
        <Text style={[styles.accessDeniedText, { color: colors.textSecondary }]}>
          You do not have permission to access the Employees module.
        </Text>
      </View>
    );
  }

  if (employeesLoading) {
    return <LoadingState colors={colors} />;
  }

  if (employeesError) {
    return (
      <ErrorState 
        colors={colors} 
        error={employeesError.message || 'Unable to load employees'} 
        onRetry={() => refetchEmployees()} 
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Module Completion Banner */}
        <View style={[styles.completionBanner, { backgroundColor: colors.info + '12', borderColor: colors.info + '30' }]}>
          <View style={styles.completionLeft}>
            <TrendingUp size={18} color={colors.info} />
            <Text style={[styles.completionLabel, { color: colors.info }]}>Module Completion</Text>
          </View>
          <View style={styles.completionRight}>
            <View style={[styles.completionBarBg, { backgroundColor: colors.info + '25' }]}>
              <View style={[styles.completionBarFill, { backgroundColor: colors.info, width: '68%' }]} />
            </View>
            <Text style={[styles.completionPercent, { color: colors.info }]}>68%</Text>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{laborMetrics?.totalEmployees ?? employees.length}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <UserCheck size={20} color={colors.success} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{roleStats.assigned}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>With Role</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={20} color={colors.warning} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{roleStats.unassigned}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>No Role</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search employees..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Rows */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['all', 'active', 'inactive', 'on_leave'] as StatusFilter[]).map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.filterChip,
                    { backgroundColor: statusFilter === status ? colors.primary : colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[styles.filterText, { color: statusFilter === status ? '#FFFFFF' : colors.textSecondary }]}>
                    {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Role Assignment</Text>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['all', 'assigned', 'unassigned'] as RoleFilter[]).map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterChip,
                    { backgroundColor: roleFilter === filter ? colors.primary : colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setRoleFilter(filter)}
                >
                  <Text style={[styles.filterText, { color: roleFilter === filter ? '#FFFFFF' : colors.textSecondary }]}>
                    {filter === 'all' ? 'All Employees' : filter === 'assigned' ? 'Has Role' : 'No Role'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
{canCreate && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable 
                style={[styles.addButton, { backgroundColor: '#8B5CF6' }]}
                onPress={() => router.push('/employees/signaturepin')}
              >
                <Key size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable 
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={openAddModal}
              >
                <UserPlus size={18} color="#FFFFFF" />
              </Pressable>
            </View>
            )}
          </View>
        </View>

        {/* Employee List */}
        <View style={styles.employeeList}>
          {filteredEmployees.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Users size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Employees Found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            filteredEmployees.map((employee) => {
              const employeeRole = getEmployeeRole(employee.id);
              
              return (
                <Pressable
                  key={employee.id}
                  style={[styles.employeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openRoleModal(employee.id)}
                >
                  <View style={styles.employeeHeader}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {employee.first_name[0]}{employee.last_name[0]}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={[styles.employeeName, { color: colors.text }]}>
                        {employee.first_name} {employee.last_name}
                      </Text>
                      <Text style={[styles.employeePosition, { color: colors.textSecondary }]}>
                        {employee.position}
                      </Text>
                    </View>
                    <View style={styles.employeeRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColors[employee.status] + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColors[employee.status] }]} />
                        <Text style={[styles.statusText, { color: statusColors[employee.status] }]}>
                          {employee.status.replace('_', ' ')}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.textTertiary} />
                    </View>
                  </View>
                  
                  <View style={[styles.employeeDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Code</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{employee.employee_code}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Facility</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{getFacilityName(employee.facility_id)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Role</Text>
                      {employeeRole ? (
                        <View style={styles.roleDisplay}>
                          <View style={[styles.roleColorDot, { backgroundColor: employeeRole.color }]} />
                          <Text style={[styles.detailValue, { color: employeeRole.color }]} numberOfLines={1}>
                            {employeeRole.name}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.detailValue, { color: colors.textTertiary, fontStyle: 'italic' as const }]}>
                          Not Assigned
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Role Assignment Modal */}
      <Modal
        visible={roleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeRoleModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={closeRoleModal} style={styles.modalCloseButton}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Assign Role</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedEmployee && (
              <>
                {/* Employee Info Card */}
                <View style={[styles.employeeInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.modalAvatarText, { color: colors.primary }]}>
                      {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                    </Text>
                  </View>
                  <View style={styles.modalEmployeeInfo}>
                    <Text style={[styles.modalEmployeeName, { color: colors.text }]}>
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </Text>
                    <Text style={[styles.modalEmployeePosition, { color: colors.textSecondary }]}>
                      {selectedEmployee.position} • {selectedEmployee.employee_code}
                    </Text>
                  </View>
                </View>

                {/* Facility Assignment Section */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FACILITY ASSIGNMENT</Text>
                  <Pressable
                    style={[styles.facilityDropdownTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setFacilityDropdownOpen(!facilityDropdownOpen)}
                  >
                    <Building2 size={20} color={colors.primary} />
                    <View style={styles.facilityDropdownContent}>
                      <Text style={[styles.facilityDropdownLabel, { color: colors.textSecondary }]}>Current Facility</Text>
                      <Text style={[styles.facilityDropdownValue, { color: colors.text }]}>
                        {selectedFacilityId 
                          ? facilities.find(f => f.id === selectedFacilityId)?.name || 'Unknown'
                          : 'Unassigned'}
                      </Text>
                    </View>
                    <ChevronDown 
                      size={20} 
                      color={colors.textSecondary}
                      style={{ transform: [{ rotate: facilityDropdownOpen ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>

                  {facilityDropdownOpen && (
                    <View style={[styles.facilityDropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Pressable
                        style={[
                          styles.facilityOption,
                          { borderBottomColor: colors.border },
                          !selectedFacilityId && { backgroundColor: colors.primary + '10' },
                        ]}
                        onPress={() => handleUpdateFacility(null)}
                      >
                        <View style={[styles.facilityOptionIcon, { backgroundColor: colors.textTertiary + '20' }]}>
                          <Building2 size={16} color={colors.textTertiary} />
                        </View>
                        <Text style={[styles.facilityOptionName, { color: colors.text }]}>Unassigned</Text>
                        {!selectedFacilityId && (
                          <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                            <Check size={12} color={colors.success} />
                          </View>
                        )}
                      </Pressable>
                      {facilities.map((facility) => {
                        const isSelected = selectedFacilityId === facility.id;
                        return (
                          <Pressable
                            key={facility.id}
                            style={[
                              styles.facilityOption,
                              { borderBottomColor: colors.border },
                              isSelected && { backgroundColor: colors.primary + '10' },
                            ]}
                            onPress={() => handleUpdateFacility(facility.id)}
                          >
                            <View style={[styles.facilityOptionIcon, { backgroundColor: colors.primary + '15' }]}>
                              <Building2 size={16} color={colors.primary} />
                            </View>
                            <View style={styles.facilityOptionText}>
                              <Text style={[styles.facilityOptionName, { color: colors.text }]}>{facility.name}</Text>
                              <Text style={[styles.facilityOptionCode, { color: colors.textTertiary }]}>{facility.facility_code}</Text>
                            </View>
                            {isSelected && (
                              <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                                <Check size={12} color={colors.success} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                      {updateEmployeeMutation.isPending && (
                        <View style={styles.facilityLoadingOverlay}>
                          <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Current Role Section */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CURRENT ROLE</Text>
                  <View style={[styles.currentRoleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {selectedEmployeeRole ? (
                      <View style={styles.currentRoleContent}>
                        <View style={styles.currentRoleInfo}>
                          <View style={[styles.roleColorBar, { backgroundColor: selectedEmployeeRole.color }]} />
                          <View style={styles.roleTextInfo}>
                            <Text style={[styles.currentRoleName, { color: colors.text }]}>
                              {selectedEmployeeRole.name}
                            </Text>
                            <Text style={[styles.currentRoleDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                              {selectedEmployeeRole.description}
                            </Text>
                          </View>
                        </View>
{canAssign && (
                        <Pressable
                          style={[styles.removeRoleButton, { backgroundColor: colors.error + '15' }]}
                          onPress={handleRemoveRole}
                        >
                          <X size={16} color={colors.error} />
                          <Text style={[styles.removeRoleText, { color: colors.error }]}>Remove</Text>
                        </Pressable>
                        )}
                      </View>
                    ) : (
                      <View style={styles.noRoleContent}>
                        <Shield size={32} color={colors.textTertiary} />
                        <Text style={[styles.noRoleText, { color: colors.textSecondary }]}>
                          No role assigned
                        </Text>
                        <Text style={[styles.noRoleSubtext, { color: colors.textTertiary }]}>
                          Select a role below to assign permissions
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

{canAssign && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {selectedEmployeeRole ? 'CHANGE ROLE' : 'SELECT ROLE'}
                  </Text>
                  
                  {/* Role Dropdown */}
                  <Pressable
                    style={[styles.roleDropdownTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  >
                    <Shield size={20} color={colors.primary} />
                    <Text style={[styles.roleDropdownText, { color: colors.text }]}>
                      Select a role to assign
                    </Text>
                    <ChevronDown 
                      size={20} 
                      color={colors.textSecondary}
                      style={{ transform: [{ rotate: roleDropdownOpen ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>

                  {roleDropdownOpen && (
                    <View style={[styles.roleDropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {roles.map((role) => {
                        const isCurrentRole = selectedEmployeeRole?.id === role.id;
                        const permissionCount = role.permissions.reduce((count, p) => count + p.actions.length, 0);
                        
                        return (
                          <Pressable
                            key={role.id}
                            style={[
                              styles.roleOption,
                              { borderBottomColor: colors.border },
                              isCurrentRole && { backgroundColor: colors.primary + '10' },
                            ]}
                            onPress={() => !isCurrentRole && handleAssignRole(role)}
                            disabled={isCurrentRole}
                          >
                            <View style={[styles.roleOptionColorBar, { backgroundColor: role.color }]} />
                            <View style={styles.roleOptionContent}>
                              <View style={styles.roleOptionHeader}>
                                <Text style={[styles.roleOptionName, { color: colors.text }]}>
                                  {role.name}
                                </Text>
                                {isCurrentRole && (
                                  <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                                    <Check size={12} color={colors.success} />
                                    <Text style={[styles.currentBadgeText, { color: colors.success }]}>Current</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.roleOptionDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                {role.description}
                              </Text>
                              <Text style={[styles.roleOptionPermissions, { color: colors.textTertiary }]}>
                                {permissionCount} permissions
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
                )}

                {/* Availability Section */}
                <View style={styles.section}>
                  <Pressable
                    style={[styles.availabilityToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setShowAvailability(!showAvailability)}
                  >
                    <Calendar size={20} color={colors.primary} />
                    <Text style={[styles.availabilityToggleText, { color: colors.text }]}>Availability & Schedule</Text>
                    <ChevronDown
                      size={20}
                      color={colors.textSecondary}
                      style={{ transform: [{ rotate: showAvailability ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>

                  {showAvailability && editingAvailability && (
                    <View style={[styles.availabilityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.availabilityLabel, { color: colors.textSecondary }]}>WEEKLY AVAILABILITY</Text>
                      {DAYS.map((day, idx) => {
                        const dayData = editingAvailability[day];
                        return (
                          <View key={day} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
                            <Pressable
                              style={[styles.dayCheckbox, dayData.available && { backgroundColor: colors.primary }]}
                              onPress={() => toggleDayAvailability(day)}
                            >
                              {dayData.available && <Check size={14} color="#FFFFFF" />}
                            </Pressable>
                            <Text style={[styles.dayLabel, { color: colors.text }]}>{DAY_LABELS[idx]}</Text>
                            {dayData.available ? (
                              <View style={styles.timeInputs}>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                  value={dayData.startTime || '08:00'}
                                  onChangeText={(v) => updateDayTime(day, 'startTime', v)}
                                  placeholder="08:00"
                                  placeholderTextColor={colors.textTertiary}
                                />
                                <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>-</Text>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                  value={dayData.endTime || '17:00'}
                                  onChangeText={(v) => updateDayTime(day, 'endTime', v)}
                                  placeholder="17:00"
                                  placeholderTextColor={colors.textTertiary}
                                />
                              </View>
                            ) : (
                              <Text style={[styles.offText, { color: colors.textTertiary }]}>Off</Text>
                            )}
                          </View>
                        );
                      })}

                      <View style={styles.preferenceRow}>
                        <Text style={[styles.preferenceLabel, { color: colors.textSecondary }]}>Max Hours/Week</Text>
                        <TextInput
                          style={[styles.hoursInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          value={String(editingAvailability.maxHoursPerWeek)}
                          onChangeText={(v) => setEditingAvailability(prev => prev ? { ...prev, maxHoursPerWeek: parseInt(v) || 40 } : prev)}
                          keyboardType="numeric"
                        />
                      </View>

                      <Pressable
                        style={[styles.saveAvailabilityButton, { backgroundColor: colors.success }]}
                        onPress={handleSaveAvailability}
                      >
                        <Check size={18} color="#FFFFFF" />
                        <Text style={styles.saveAvailabilityText}>Save Availability</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Info Notice */}
                <View style={[styles.infoNotice, { backgroundColor: colors.info + '15', borderColor: colors.info + '30' }]}>
                  <Shield size={18} color={colors.info} />
                  <Text style={[styles.infoNoticeText, { color: colors.info }]}>
                    Assigned roles determine what modules and actions this employee can access in the system.
                  </Text>
                </View>
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Add Employee Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={closeAddModal} style={styles.modalCloseButton}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Employee</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.addFormNotice, { backgroundColor: colors.info + '12', borderColor: colors.info + '30' }]}>
              <Shield size={18} color={colors.info} />
              <Text style={[styles.addFormNoticeText, { color: colors.info }]}>
                OPS Tier: Only essential data is stored. No personal information beyond name and email.
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>BASIC INFORMATION</Text>
              
              <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>First Name *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text }]}
                  value={newEmployee.firstName}
                  onChangeText={(text) => setNewEmployee(prev => ({ ...prev, firstName: text }))}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Last Name *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text }]}
                  value={newEmployee.lastName}
                  onChangeText={(text) => setNewEmployee(prev => ({ ...prev, lastName: text }))}
                  placeholder="Enter last name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text }]}
                  value={newEmployee.email}
                  onChangeText={(text) => setNewEmployee(prev => ({ ...prev, email: text }))}
                  placeholder="employee@company.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>EMPLOYEE ID</Text>
              
              <Pressable
                style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setNewEmployee(prev => ({ ...prev, useCustomId: !prev.useCustomId }))}
              >
                <View style={styles.toggleLeft}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Use Custom ID</Text>
                  <Text style={[styles.toggleSubtext, { color: colors.textTertiary }]}>
                    {newEmployee.useCustomId ? 'Enter your own ID (e.g., from payroll)' : 'System will auto-generate an ID'}
                  </Text>
                </View>
                <View style={[
                  styles.toggleSwitch,
                  { backgroundColor: newEmployee.useCustomId ? colors.primary : colors.border }
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: newEmployee.useCustomId ? 20 : 2 }] }
                  ]} />
                </View>
              </Pressable>

              {newEmployee.useCustomId && (
                <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Employee ID *</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text }]}
                    value={newEmployee.employeeId}
                    onChangeText={(text) => setNewEmployee(prev => ({ ...prev, employeeId: text }))}
                    placeholder="e.g., 12345 or EMP-001"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {!newEmployee.useCustomId && (
                <View style={[styles.autoIdPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.autoIdLabel, { color: colors.textTertiary }]}>ID will be auto-generated:</Text>
                  <Text style={[styles.autoIdExample, { color: colors.primary }]}>EMP-XXXX</Text>
                </View>
              )}
            </View>

            <View style={[styles.pinNotice, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
              <AlertCircle size={18} color={colors.warning} />
              <Text style={[styles.pinNoticeText, { color: colors.warning }]}>
                A 4-digit PIN will be auto-generated for time clock access. Share it securely with the employee.
              </Text>
            </View>

            <Pressable
              style={[
                styles.createButton,
                { backgroundColor: colors.primary },
                createEmployeeMutation.isPending && { opacity: 0.6 }
              ]}
              onPress={handleCreateEmployee}
              disabled={createEmployeeMutation.isPending}
            >
              {createEmployeeMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Add Employee</Text>
                </>
              )}
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function LoadingState({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, color: colors.textSecondary, fontSize: 16 }}>Loading employees...</Text>
    </View>
  );
}

function ErrorState({ colors, error, onRetry }: { colors: any; error: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background }}>
      <AlertCircle size={48} color={colors.error} />
      <Text style={{ marginTop: 16, color: colors.text, fontSize: 18, fontWeight: '600' as const }}>Failed to Load</Text>
      <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 14, textAlign: 'center' as const }}>{error}</Text>
      <Pressable
        style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        onPress={onRetry}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' as const }}>Retry</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      gap: 6,
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      padding: 0,
    },
    filterSection: {
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 8,
      marginLeft: 4,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    filterScroll: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    addButton: {
      padding: 10,
      borderRadius: 10,
    },
    employeeList: {
      gap: 12,
      marginTop: 8,
    },
    emptyState: {
      padding: 40,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    emptyStateText: {
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center' as const,
    },
    accessDeniedContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    accessDeniedTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    accessDeniedText: {
      fontSize: 14,
      textAlign: 'center' as const,
      marginTop: 8,
      lineHeight: 20,
    },
    completionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    completionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    completionLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    completionRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    completionBarBg: {
      width: 80,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    completionBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    completionPercent: {
      fontSize: 13,
      fontWeight: '700' as const,
      minWidth: 36,
      textAlign: 'right' as const,
    },
    employeeCard: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    employeeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    employeeInfo: {
      flex: 1,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    employeePosition: {
      fontSize: 13,
      marginTop: 2,
    },
    employeeRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
      textTransform: 'capitalize' as const,
    },
    employeeDetails: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    detailItem: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    roleDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    roleColorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    employeeInfoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 24,
      gap: 14,
    },
    modalAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalAvatarText: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    modalEmployeeInfo: {
      flex: 1,
    },
    modalEmployeeName: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalEmployeePosition: {
      fontSize: 14,
      marginTop: 4,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    currentRoleCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    currentRoleContent: {
      padding: 14,
    },
    currentRoleInfo: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    roleColorBar: {
      width: 4,
      borderRadius: 2,
      marginRight: 12,
    },
    roleTextInfo: {
      flex: 1,
    },
    currentRoleName: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    currentRoleDesc: {
      fontSize: 13,
      lineHeight: 18,
    },
    removeRoleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 10,
      borderRadius: 10,
    },
    removeRoleText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    noRoleContent: {
      padding: 30,
      alignItems: 'center',
    },
    noRoleText: {
      fontSize: 16,
      fontWeight: '500' as const,
      marginTop: 12,
    },
    noRoleSubtext: {
      fontSize: 13,
      marginTop: 6,
      textAlign: 'center' as const,
    },
    roleDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    roleDropdownText: {
      flex: 1,
      fontSize: 15,
    },
    roleDropdownList: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    roleOption: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    roleOptionColorBar: {
      width: 4,
    },
    roleOptionContent: {
      flex: 1,
      padding: 14,
    },
    roleOptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    roleOptionName: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    currentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    currentBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    roleOptionDesc: {
      fontSize: 13,
      marginBottom: 4,
    },
    roleOptionPermissions: {
      fontSize: 11,
    },
    facilityDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    facilityDropdownContent: {
      flex: 1,
    },
    facilityDropdownLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
      marginBottom: 2,
    },
    facilityDropdownValue: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    facilityDropdownList: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    facilityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      gap: 12,
    },
    facilityOptionIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    facilityOptionText: {
      flex: 1,
    },
    facilityOptionName: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    facilityOptionCode: {
      fontSize: 12,
      marginTop: 2,
    },
    facilityLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 8,
    },
    infoNoticeText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    availabilityToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    availabilityToggleText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500' as const,
    },
    availabilityCard: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    availabilityLabel: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      gap: 10,
    },
    dayCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dayLabel: {
      width: 40,
      fontSize: 14,
      fontWeight: '500' as const,
    },
    timeInputs: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    timeInput: {
      width: 70,
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      fontSize: 13,
      textAlign: 'center' as const,
    },
    timeSeparator: {
      fontSize: 14,
    },
    offText: {
      flex: 1,
      textAlign: 'right' as const,
      fontSize: 13,
      fontStyle: 'italic' as const,
    },
    preferenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
    },
    preferenceLabel: {
      fontSize: 14,
    },
    hoursInput: {
      width: 60,
      padding: 8,
      borderRadius: 6,
      borderWidth: 1,
      fontSize: 14,
      textAlign: 'center' as const,
    },
    saveAvailabilityButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 10,
      marginTop: 16,
      gap: 8,
    },
    saveAvailabilityText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    addFormNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 20,
    },
    addFormNoticeText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    formSection: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    inputGroup: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginBottom: 6,
    },
    formInput: {
      fontSize: 16,
      padding: 0,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    toggleLeft: {
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    toggleSubtext: {
      fontSize: 12,
      marginTop: 2,
    },
    toggleSwitch: {
      width: 48,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
    },
    toggleKnob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    },
    autoIdPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    autoIdLabel: {
      fontSize: 14,
    },
    autoIdExample: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    pinNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 20,
    },
    pinNoticeText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 10,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
  });
