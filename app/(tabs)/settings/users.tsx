import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Search, X, Users, UserCheck, UserX, Clock, Filter, Check,
  Mail, Building2, Shield, Key, MoreVertical, UserPlus, Edit3,
  Power, RefreshCw, CheckSquare, Square, AlertTriangle,
  UserMinus, Minus, Copy, KeyRound, ChevronDown, ChevronRight,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  useUsers, useCreateUser, useUpdateUser, useToggleUserStatus,
  useResetUserPin, useUserDepartments, useUserRoles, useUserStats,
  useBulkToggleUserStatus,
  type SupabaseUser, type UserFilters, type CreateUserInput, type UpdateUserInput,
} from '@/hooks/useSupabaseUsers';
import {
  type Role, type PermissionModule, MODULE_PERMISSION_DEFINITIONS,
} from '@/constants/permissionsConstants';

const MONO = 'monospace';

type ModalMode = 'create' | 'edit' | null;
type StatusFilter = 'all' | 'active' | 'inactive' | 'on_leave';
type RoleAssignmentView = 'select' | 'preview';

interface DepartmentOption { id: string; department_code: string; name: string; color: string; }
interface PositionOption { id: string; position_code: string; title: string; job_level: string; department_code: string; }

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all',      label: 'All Users', color: '#6B7280' },
  { value: 'active',   label: 'Active',    color: '#10B981' },
  { value: 'inactive', label: 'Inactive',  color: '#EF4444' },
  { value: 'on_leave', label: 'On Leave',  color: '#F59E0B' },
];

const BASIC_ROLE_OPTIONS = [
  { value: 'default',    label: 'Default' },
  { value: 'employee',   label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager',    label: 'Manager' },
  { value: 'admin',      label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

const BASIC_ROLE_MAP: Record<string, string> = {
  default: 'default', employee: 'employee', supervisor: 'supervisor',
  manager: 'manager', admin: 'admin', superadmin: 'superadmin',
};

const SYSTEM_ROLES = ['superadmin', 'platform_admin'];

// ── Permission Preview ─────────────────────────────────────────
function PermissionPreview({ role, colors }: { role: Role | null; colors: any }) {
  if (!role) return (
    <View style={[PP.emptyContainer, { backgroundColor: colors.backgroundSecondary }]}>
      <Shield size={32} color={colors.textTertiary} />
      <Text style={[PP.emptyText, { color: colors.textTertiary }]}>Select a role to preview permissions</Text>
    </View>
  );
  const getModuleName = (k: PermissionModule) => MODULE_PERMISSION_DEFINITIONS.find(m => m.module === k)?.name || k;
  const getActionLabel = (k: PermissionModule, a: string) => MODULE_PERMISSION_DEFINITIONS.find(m => m.module === k)?.actions.find(x => x.action === a)?.label || a;
  return (
    <View style={PP.container}>
      <View style={[PP.header, { backgroundColor: role.color + '15', borderColor: role.color + '30' }]}>
        <View style={[PP.dot, { backgroundColor: role.color }]} />
        <View style={PP.headerInfo}>
          <Text style={[PP.roleName, { color: colors.text }]}>{role.name}</Text>
          <Text style={[PP.roleDesc, { color: colors.textSecondary }]}>{role.description}</Text>
        </View>
      </View>
      <ScrollView style={PP.moduleList} showsVerticalScrollIndicator={false}>
        {role.permissions.map(perm => (
          <View key={perm.module} style={[PP.moduleCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Text style={[PP.moduleName, { color: colors.text }]}>{getModuleName(perm.module)}</Text>
            <View style={PP.actionsList}>
              {perm.actions.map(action => (
                <View key={action} style={[PP.actionChip, { backgroundColor: colors.surface }]}>
                  <Check size={10} color={colors.success} />
                  <Text style={[PP.actionChipText, { color: colors.textSecondary }]}>{getActionLabel(perm.module, action)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Role Assignment Modal ──────────────────────────────────────
function RoleAssignmentModal({ visible, user, onClose, onAssign, colors, roles, currentRoleId }: {
  visible: boolean; user: SupabaseUser | null; onClose: () => void;
  onAssign: (id: string) => void; colors: any; roles: Role[]; currentRoleId: string | null;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(currentRoleId);
  const [view, setView] = useState<RoleAssignmentView>('select');
  useEffect(() => { if (visible) { setSelectedRoleId(currentRoleId); setView('select'); } }, [visible, currentRoleId]);
  const selectedRole = roles.find(r => r.id === selectedRoleId) || null;
  if (!user) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[RA.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[RA.container, { backgroundColor: colors.surface }]}>
          <View style={[RA.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={RA.closeBtn}><X size={24} color={colors.text} /></Pressable>
            <Text style={[RA.title, { color: colors.text }]}>Assign Role</Text>
            <View style={RA.closeBtn} />
          </View>
          <View style={[RA.tabBar, { backgroundColor: colors.backgroundSecondary }]}>
            {(['select', 'preview'] as RoleAssignmentView[]).map(v => (
              <Pressable key={v} style={[RA.tab, view === v && { backgroundColor: colors.surface }]} onPress={() => setView(v)}>
                {v === 'select' ? <Shield size={16} color={view === v ? colors.primary : colors.textSecondary} /> : <Key size={16} color={view === v ? colors.primary : colors.textSecondary} />}
                <Text style={[RA.tabText, { color: view === v ? colors.primary : colors.textSecondary }]}>{v === 'select' ? 'Select Role' : 'Permissions'}</Text>
              </Pressable>
            ))}
          </View>
          {view === 'select' ? (
            <ScrollView style={RA.roleList} showsVerticalScrollIndicator={false}>
              {roles.map(role => (
                <Pressable key={role.id} style={[RA.roleCard, { backgroundColor: colors.backgroundSecondary, borderColor: selectedRoleId === role.id ? role.color : colors.border }]} onPress={() => setSelectedRoleId(role.id)}>
                  <View style={RA.roleCardLeft}>
                    {selectedRoleId === role.id
                      ? <View style={[RA.radioSelected, { borderColor: role.color, backgroundColor: role.color }]}><Check size={12} color="#FFF" /></View>
                      : <View style={[RA.radioUnselected, { borderColor: colors.border }]} />}
                    <View style={[RA.roleColor, { backgroundColor: role.color }]} />
                    <View style={RA.roleInfo}>
                      <Text style={[RA.roleName, { color: colors.text }]}>{role.name}</Text>
                      <Text style={[RA.roleDesc, { color: colors.textSecondary }]} numberOfLines={1}>{role.description}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          ) : (
            <View style={RA.previewContainer}><PermissionPreview role={selectedRole} colors={colors} /></View>
          )}
          <View style={[RA.footer, { borderTopColor: colors.border }]}>
            <Pressable style={[RA.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[RA.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[RA.assignBtn, { backgroundColor: selectedRoleId ? colors.primary : colors.textTertiary }]} onPress={() => selectedRoleId && onAssign(selectedRoleId)} disabled={!selectedRoleId}>
              <Shield size={16} color="#FFF" />
              <Text style={RA.assignBtnText}>Assign Role</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Position Picker Modal ──────────────────────────────────────
function PositionPickerModal({ visible, onClose, onSelect, departmentCode, colors, organizationId }: {
  visible: boolean; onClose: () => void;
  onSelect: (pos: PositionOption) => void;
  departmentCode: string; colors: any; organizationId: string;
}) {
  const [search, setSearch] = useState('');
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions-for-picker', organizationId, departmentCode],
    queryFn: async () => {
      if (!organizationId || !departmentCode) return [];
      const { data, error } = await supabase
        .from('positions')
        .select('id, position_code, title, job_level, department_code')
        .eq('organization_id', organizationId)
        .eq('department_code', departmentCode)
        .eq('status', 'active')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PositionOption[];
    },
    enabled: !!organizationId && !!departmentCode && visible,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? positions.filter(p => p.title.toLowerCase().includes(q) || p.position_code.toLowerCase().includes(q)) : positions;
  }, [positions, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={[S.pickerSheet, { backgroundColor: colors.surface }]}>
          <View style={[S.pickerHead, { borderBottomColor: colors.border }]}>
            <Text style={[S.pickerTitle, { color: colors.text }]}>Select Position</Text>
            <Pressable onPress={onClose} hitSlop={12}><X size={20} color={colors.textSecondary} /></Pressable>
          </View>
          <View style={[S.searchBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Search size={15} color={colors.textSecondary} />
            <TextInput
              style={[S.searchInput, { color: colors.text }]}
              placeholder="Search positions..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><X size={13} color={colors.textSecondary} /></Pressable>}
          </View>
          {isLoading ? (
            <View style={S.pickerLoading}><ActivityIndicator color={colors.primary} /></View>
          ) : filtered.length === 0 ? (
            <View style={S.pickerLoading}>
              <Text style={[{ color: colors.textSecondary, fontSize: 13 }]}>
                {departmentCode ? 'No positions found' : 'Select a department first'}
              </Text>
            </View>
          ) : (
            <ScrollView style={S.pickerList} showsVerticalScrollIndicator={false}>
              {filtered.map(pos => (
                <Pressable
                  key={pos.id}
                  style={[S.pickerRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => { onSelect(pos); setSearch(''); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[S.pickerRowTitle, { color: colors.text }]}>{pos.title}</Text>
                    <Text style={[S.pickerRowMeta, { color: colors.textSecondary }]}>
                      {pos.position_code} · {pos.job_level}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </Pressable>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function generateEmployeeCode() { return `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`; }
function generatePin() { return Math.floor(1000 + Math.random() * 9000).toString(); }

function StatusToggle({ isActive, onToggle, disabled, colors }: { isActive: boolean; onToggle: () => void; disabled?: boolean; colors: any }) {
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  useEffect(() => { Animated.spring(anim, { toValue: isActive ? 1 : 0, useNativeDriver: false, tension: 50, friction: 10 }).start(); }, [isActive]);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#EF4444', '#10B981'] });
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  return (
    <Pressable onPress={onToggle} disabled={disabled} style={[S.toggleContainer, disabled && { opacity: 0.5 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={[S.toggleTrack, { backgroundColor: bg }]}>
        <Animated.View style={[S.toggleThumb, { transform: [{ translateX: tx }] }]} />
      </Animated.View>
      <Text style={[S.toggleLabel, { color: isActive ? '#10B981' : '#EF4444' }]}>{isActive ? 'Active' : 'Inactive'}</Text>
    </Pressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function UserManagementScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const { roles: permissionRoles, assignRoleToEmployee, getEmployeeRole } = usePermissions();

  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter]       = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [modalMode, setModalMode]         = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser]   = useState<SupabaseUser | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [deactivationModalVisible, setDeactivationModalVisible] = useState(false);
  const [usersToDeactivate, setUsersToDeactivate] = useState<SupabaseUser[]>([]);
  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<SupabaseUser | null>(null);
  const [generatedPin, setGeneratedPin]   = useState('');
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [pinCopied, setPinCopied]         = useState(false);
  const [roleAssignModalVisible, setRoleAssignModalVisible] = useState(false);
  const [userForRoleAssign, setUserForRoleAssign] = useState<SupabaseUser | null>(null);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  // Form state
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [email, setEmail]           = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin]               = useState('');
  const [positionId, setPositionId] = useState<string | null>(null);
  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole]             = useState('default');
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState<string | null>(null);
  const [status, setStatus]         = useState<'active' | 'inactive' | 'on_leave'>('active');

  const isSystemRole = SYSTEM_ROLES.includes(role);

  const filters: UserFilters = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    department: departmentFilter || undefined,
    role: roleFilter || undefined,
    search: searchQuery || undefined,
  }), [statusFilter, departmentFilter, roleFilter, searchQuery]);

  const { data: users = [], isLoading, refetch, isRefetching } = useUsers(filters);
  const { data: filterDepts = [] } = useUserDepartments();
  const { data: filterRoles = [] } = useUserRoles();
  const { data: stats } = useUserStats();

  // Load departments for picker
  const { data: deptOptions = [] } = useQuery({
    queryKey: ['dept-options', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_code, name, color')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as DepartmentOption[];
    },
    enabled: !!organizationId,
  });

  const createUserMutation      = useCreateUser();
  const updateUserMutation      = useUpdateUser();
  const toggleStatusMutation    = useToggleUserStatus();
  const resetPinMutation        = useResetUserPin();
  const bulkToggleStatusMutation = useBulkToggleUserStatus();

  const selectedUsers       = useMemo(() => users.filter(u => selectedUserIds.has(u.id)), [users, selectedUserIds]);
  const selectedActiveCount = useMemo(() => selectedUsers.filter(u => u.status === 'active').length, [selectedUsers]);
  const selectedInactiveCount = useMemo(() => selectedUsers.filter(u => u.status === 'inactive').length, [selectedUsers]);

  const resetForm = useCallback(() => {
    setFirstName(''); setLastName(''); setEmail('');
    setEmployeeCode(generateEmployeeCode()); setPin(generatePin());
    setPositionId(null); setPositionTitle(''); setDepartment('');
    setRole('default'); setSelectedPermissionRoleId(null); setStatus('active');
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm(); setSelectedUser(null); setModalMode('create'); setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((user: SupabaseUser) => {
    setSelectedUser(user);
    setFirstName(user.first_name); setLastName(user.last_name); setEmail(user.email);
    setEmployeeCode(user.employee_code); setPin('');
    setPositionTitle(user.position || '');
    setPositionId((user as any).position_id || null);
    setDepartment(user.department_code || '');
    const currentPermRole = getEmployeeRole(user.id);
    if (currentPermRole) {
      setSelectedPermissionRoleId(currentPermRole.id);
      const rn = currentPermRole.name.toLowerCase();
      setRole(BASIC_ROLE_MAP[rn] || user.role);
    } else {
      setSelectedPermissionRoleId(null);
      setRole(user.role);
    }
    setStatus(user.status);
    setModalMode('edit'); setModalVisible(true); setShowActionMenu(null);
  }, [getEmployeeRole]);

  const closeModal = useCallback(() => {
    setModalVisible(false); setModalMode(null); setSelectedUser(null); resetForm();
  }, [resetForm]);

  const validateForm = useCallback((): boolean => {
    if (!firstName.trim()) { Alert.alert('Validation Error', 'First name is required'); return false; }
    if (!lastName.trim())  { Alert.alert('Validation Error', 'Last name is required');  return false; }
    if (!email.trim())     { Alert.alert('Validation Error', 'Email is required');       return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alert.alert('Validation Error', 'Invalid email'); return false; }
    if (!employeeCode.trim()) { Alert.alert('Validation Error', 'Employee code is required'); return false; }
    if (modalMode === 'create' && (!pin || pin.length < 4)) { Alert.alert('Validation Error', 'PIN must be at least 4 digits'); return false; }
    if (!isSystemRole && !positionId) { Alert.alert('Validation Error', 'Please select a position'); return false; }
    return true;
  }, [firstName, lastName, email, employeeCode, pin, modalMode, isSystemRole, positionId]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    try {
      if (modalMode === 'create') {
        const input: CreateUserInput & { position_id?: string } = {
          first_name: firstName.trim(), last_name: lastName.trim(),
          email: email.trim().toLowerCase(), employee_code: employeeCode.trim(),
          pin, position: positionTitle.trim() || undefined,
          department_code: department || null, role, status,
        };
        if (positionId) (input as any).position_id = positionId;
        await createUserMutation.mutateAsync(input);
        Alert.alert('Success', 'User created successfully');
      } else if (modalMode === 'edit' && selectedUser) {
        let roleToSave = role;
        if (selectedPermissionRoleId) {
          const pr = permissionRoles.find(r => r.id === selectedPermissionRoleId);
          if (pr) roleToSave = BASIC_ROLE_MAP[pr.name.toLowerCase()] || role;
        }
        const updates: UpdateUserInput & { position_id?: string | null } = {
          first_name: firstName.trim(), last_name: lastName.trim(),
          email: email.trim().toLowerCase(), employee_code: employeeCode.trim(),
          position: positionTitle.trim() || undefined,
          department_code: department || null, role: roleToSave, status,
          position_id: positionId,
        };
        await updateUserMutation.mutateAsync({ id: selectedUser.id, updates });
        if (selectedPermissionRoleId) assignRoleToEmployee(selectedUser.id, selectedPermissionRoleId);
        Alert.alert('Success', 'User updated successfully');
      }
      closeModal();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    }
  }, [modalMode, firstName, lastName, email, employeeCode, pin, positionTitle, positionId, department, role, selectedPermissionRoleId, status, selectedUser, validateForm, createUserMutation, updateUserMutation, closeModal, permissionRoles, assignRoleToEmployee]);

  const handleToggleStatus = useCallback((user: SupabaseUser) => {
    if (user.status === 'active') {
      setUsersToDeactivate([user]); setDeactivationModalVisible(true);
    } else {
      Alert.alert('Activate User', `Activate ${user.first_name} ${user.last_name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Activate', onPress: async () => {
          try { await toggleStatusMutation.mutateAsync({ id: user.id, status: 'active' }); }
          catch (e: any) { Alert.alert('Error', e.message); }
        }},
      ]);
    }
    setShowActionMenu(null);
  }, [toggleStatusMutation]);

  const handleConfirmDeactivation = useCallback(async () => {
    try {
      if (usersToDeactivate.length === 1) {
        await toggleStatusMutation.mutateAsync({ id: usersToDeactivate[0].id, status: 'inactive' });
      } else {
        await bulkToggleStatusMutation.mutateAsync({ userIds: usersToDeactivate.map(u => u.id), status: 'inactive' });
        setSelectionMode(false); setSelectedUserIds(new Set());
      }
      setDeactivationModalVisible(false); setUsersToDeactivate([]);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }, [usersToDeactivate, toggleStatusMutation, bulkToggleStatusMutation]);

  const handleBulkActivate = useCallback(async () => {
    const toActivate = selectedUsers.filter(u => u.status !== 'active');
    if (!toActivate.length) { Alert.alert('Info', 'All selected users are already active'); return; }
    Alert.alert('Activate Users', `Activate ${toActivate.length} user(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: async () => {
        try {
          await bulkToggleStatusMutation.mutateAsync({ userIds: toActivate.map(u => u.id), status: 'active' });
          setSelectionMode(false); setSelectedUserIds(new Set());
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }, [selectedUsers, bulkToggleStatusMutation]);

  const handleBulkDeactivate = useCallback(() => {
    const toDeactivate = selectedUsers.filter(u => u.status === 'active');
    if (!toDeactivate.length) { Alert.alert('Info', 'All selected users are already inactive'); return; }
    setUsersToDeactivate(toDeactivate); setDeactivationModalVisible(true);
  }, [selectedUsers]);

  const handleResetPin = useCallback((user: SupabaseUser) => {
    setGeneratedPin(generatePin()); setUserToResetPassword(user);
    setShowResetSuccess(false); setPinCopied(false);
    setPasswordResetModalVisible(true); setShowActionMenu(null);
  }, []);

  const handleAssignRole = useCallback((roleId: string) => {
    if (!userForRoleAssign) return;
    assignRoleToEmployee(userForRoleAssign.id, roleId);
    const r = permissionRoles.find(r => r.id === roleId);
    Alert.alert('Success', `Role "${r?.name}" assigned`);
    setRoleAssignModalVisible(false); setUserForRoleAssign(null);
  }, [userForRoleAssign, assignRoleToEmployee, permissionRoles]);

  const handleConfirmPasswordReset = useCallback(async (sendEmail: boolean) => {
    if (!userToResetPassword) return;
    try {
      await resetPinMutation.mutateAsync({ id: userToResetPassword.id, newPin: generatedPin });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowResetSuccess(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }, [userToResetPassword, generatedPin, resetPinMutation]);

  const handleCopyPin = useCallback(async () => {
    await Clipboard.setStringAsync(generatedPin);
    setPinCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setPinCopied(false), 3000);
  }, [generatedPin]);

  const getStatusColor = (s: string) => ({ active: '#10B981', inactive: '#EF4444', on_leave: '#F59E0B' }[s] || '#6B7280');
  const getStatusLabel = (s: string) => ({ active: 'Active', inactive: 'Inactive', on_leave: 'On Leave' }[s] || s);
  const activeFiltersCount = [statusFilter !== 'all', !!departmentFilter, !!roleFilter].filter(Boolean).length;
  const isAllSelected = users.length > 0 && selectedUserIds.size === users.length;
  const isSomeSelected = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

  return (
    <>
      <Stack.Screen options={{ title: 'User Management', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      <View style={[S.container, { backgroundColor: colors.background }]}>

        {/* Stats */}
        <View style={S.statsRow}>
          {[
            { icon: Users, color: colors.primary, val: stats?.total || 0, lbl: 'Total' },
            { icon: UserCheck, color: '#10B981', val: stats?.active || 0, lbl: 'Active' },
            { icon: UserX, color: '#EF4444', val: stats?.inactive || 0, lbl: 'Inactive' },
            { icon: Clock, color: '#F59E0B', val: stats?.onLeave || 0, lbl: 'On Leave' },
          ].map(({ icon: Icon, color, val, lbl }) => (
            <View key={lbl} style={[S.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[S.statIcon, { backgroundColor: color + '20' }]}><Icon size={18} color={color} /></View>
              <Text style={[S.statValue, { color: colors.text }]}>{val}</Text>
              <Text style={[S.statLabel, { color: colors.textSecondary }]}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={[S.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput style={[S.searchInput, { color: colors.text }]} placeholder="Search by name, email, or code..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><X size={18} color={colors.textSecondary} /></Pressable>}
          <View style={[S.searchDivider, { backgroundColor: colors.border }]} />
          <Pressable style={S.filterButton} onPress={() => setShowFilters(!showFilters)}>
            <Filter size={20} color={activeFiltersCount > 0 ? colors.primary : colors.textSecondary} />
            {activeFiltersCount > 0 && <View style={[S.filterBadge, { backgroundColor: colors.primary }]}><Text style={S.filterBadgeText}>{activeFiltersCount}</Text></View>}
          </Pressable>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={[S.filtersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={S.filterHeader}>
              <Text style={[S.filterTitle, { color: colors.text }]}>Filters</Text>
              {activeFiltersCount > 0 && <Pressable onPress={() => { setStatusFilter('all'); setDepartmentFilter(''); setRoleFilter(''); }}><Text style={[S.clearFilters, { color: colors.primary }]}>Clear All</Text></Pressable>}
            </View>
            <Text style={[S.filterLabel, { color: colors.textSecondary }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterChipsRow}>
              {STATUS_OPTIONS.map(o => (
                <Pressable key={o.value} style={[S.filterChip, { borderColor: statusFilter === o.value ? o.color : colors.border }, statusFilter === o.value && { backgroundColor: o.color + '15' }]} onPress={() => setStatusFilter(o.value)}>
                  <Text style={[S.filterChipText, { color: statusFilter === o.value ? o.color : colors.textSecondary }]}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action row */}
        <View style={S.actionRow}>
          <Pressable style={[S.createButton, { backgroundColor: colors.primary }]} onPress={openCreateModal}>
            <UserPlus size={20} color="#FFF" />
            <Text style={S.createButtonText}>Add New User</Text>
          </Pressable>
          {!selectionMode
            ? <Pressable style={[S.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setSelectionMode(true)}><CheckSquare size={18} color={colors.textSecondary} /><Text style={[S.selectButtonText, { color: colors.textSecondary }]}>Select</Text></Pressable>
            : <Pressable style={[S.selectButton, { backgroundColor: colors.surface, borderColor: colors.primary }]} onPress={() => { setSelectionMode(false); setSelectedUserIds(new Set()); }}><X size={18} color={colors.primary} /><Text style={[S.selectButtonText, { color: colors.primary }]}>Cancel</Text></Pressable>
          }
        </View>

        {/* User list */}
        {isLoading ? (
          <View style={S.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={[S.loadingText, { color: colors.textSecondary }]}>Loading users...</Text></View>
        ) : (
          <ScrollView style={S.scrollView} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          >
            {users.length === 0 ? (
              <View style={S.emptyContainer}>
                <Users size={48} color={colors.textTertiary} />
                <Text style={[S.emptyTitle, { color: colors.text }]}>No Users Found</Text>
                <Text style={[S.emptyText, { color: colors.textSecondary }]}>Add your first user to get started</Text>
              </View>
            ) : (
              <>
                <Text style={[S.resultCount, { color: colors.textSecondary }]}>{users.length} user{users.length !== 1 ? 's' : ''} found</Text>
                {users.map(user => (
                  <Pressable
                    key={user.id}
                    style={[S.userCard, { backgroundColor: colors.surface, borderColor: colors.border }, selectionMode && selectedUserIds.has(user.id) && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }]}
                    onPress={() => selectionMode ? setSelectedUserIds(prev => { const n = new Set(prev); n.has(user.id) ? n.delete(user.id) : n.add(user.id); return n; }) : openEditModal(user)}
                    onLongPress={() => { if (!selectionMode) { setSelectionMode(true); setSelectedUserIds(new Set([user.id])); } }}
                  >
                    {selectionMode && (
                      <Pressable style={S.checkbox} onPress={() => setSelectedUserIds(prev => { const n = new Set(prev); n.has(user.id) ? n.delete(user.id) : n.add(user.id); return n; })}>
                        {selectedUserIds.has(user.id) ? <CheckSquare size={22} color={colors.primary} /> : <Square size={22} color={colors.textSecondary} />}
                      </Pressable>
                    )}
                    <View style={[S.userAvatar, { backgroundColor: getStatusColor(user.status) + '20' }]}>
                      <Text style={[S.avatarText, { color: getStatusColor(user.status) }]}>{user.first_name[0]}{user.last_name[0]}</Text>
                    </View>
                    <View style={S.userInfo}>
                      <View style={S.userNameRow}>
                        <Text style={[S.userName, { color: colors.text }]}>{user.first_name} {user.last_name}</Text>
                        {!selectionMode && user.status !== 'on_leave' && (
                          <StatusToggle isActive={user.status === 'active'} onToggle={() => handleToggleStatus(user)} disabled={toggleStatusMutation.isPending} colors={colors} />
                        )}
                      </View>
                      <Text style={[S.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                      <View style={S.userMeta}>
                        <View style={[S.metaBadge, { backgroundColor: colors.backgroundSecondary }]}><Text style={[S.metaText, { color: colors.textTertiary }]}>{user.employee_code}</Text></View>
                        {user.position && <View style={[S.metaBadge, { backgroundColor: colors.backgroundSecondary }]}><Text style={[S.metaText, { color: colors.textTertiary }]}>{user.position}</Text></View>}
                        {user.department_code && <View style={[S.metaBadge, { backgroundColor: colors.backgroundSecondary }]}><Building2 size={10} color={colors.textTertiary} /><Text style={[S.metaText, { color: colors.textTertiary }]}>{user.department_code}</Text></View>}
                        {(() => { const ar = getEmployeeRole(user.id); const rc = ar?.color || colors.primary; return <View style={[S.metaBadge, { backgroundColor: rc + '15' }]}><Shield size={10} color={rc} /><Text style={[S.metaText, { color: rc }]}>{ar?.name || user.role}</Text></View>; })()}
                      </View>
                    </View>
                    {!selectionMode && (
                      <Pressable style={S.moreButton} onPress={e => { e.stopPropagation(); setShowActionMenu(showActionMenu === user.id ? null : user.id); }}>
                        <MoreVertical size={20} color={colors.textSecondary} />
                      </Pressable>
                    )}
                    {showActionMenu === user.id && (
                      <View style={[S.actionMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Pressable style={S.actionMenuItem} onPress={() => openEditModal(user)}><Edit3 size={16} color={colors.text} /><Text style={[S.actionMenuText, { color: colors.text }]}>Edit User</Text></Pressable>
                        <Pressable style={S.actionMenuItem} onPress={() => handleToggleStatus(user)}><Power size={16} color={user.status === 'active' ? colors.error : colors.success} /><Text style={[S.actionMenuText, { color: user.status === 'active' ? colors.error : colors.success }]}>{user.status === 'active' ? 'Deactivate' : 'Activate'}</Text></Pressable>
                        <Pressable style={S.actionMenuItem} onPress={() => handleResetPin(user)}><RefreshCw size={16} color={colors.warning} /><Text style={[S.actionMenuText, { color: colors.warning }]}>Reset PIN</Text></Pressable>
                        <View style={[S.actionMenuDivider, { backgroundColor: colors.border }]} />
                        <Pressable style={S.actionMenuItem} onPress={() => { setUserForRoleAssign(user); setRoleAssignModalVisible(true); setShowActionMenu(null); }}><Shield size={16} color={colors.primary} /><Text style={[S.actionMenuText, { color: colors.primary }]}>Assign Role & Permissions</Text></Pressable>
                      </View>
                    )}
                  </Pressable>
                ))}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Bulk action bar */}
        {selectionMode && selectedUserIds.size > 0 && (
          <View style={[S.bulkActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={S.bulkActionInfo}>
              <Text style={[S.bulkActionCount, { color: colors.text }]}>{selectedUserIds.size} selected</Text>
            </View>
            <View style={S.bulkActionButtons}>
              <Pressable style={[S.bulkButton, { backgroundColor: '#10B981' }]} onPress={handleBulkActivate} disabled={bulkToggleStatusMutation.isPending}>
                <UserCheck size={16} color="#FFF" /><Text style={S.bulkButtonText}>Activate</Text>
              </Pressable>
              <Pressable style={[S.bulkButton, { backgroundColor: '#EF4444' }]} onPress={handleBulkDeactivate} disabled={bulkToggleStatusMutation.isPending}>
                <UserX size={16} color="#FFF" /><Text style={S.bulkButtonText}>Deactivate</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Add/Edit Modal ─────────────────────────────────── */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
          <View style={[S.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[S.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable onPress={closeModal} style={S.modalCloseButton}><X size={24} color={colors.text} /></Pressable>
              <Text style={[S.modalTitle, { color: colors.text }]}>{modalMode === 'create' ? 'Add New User' : 'Edit User'}</Text>
              <Pressable onPress={handleSave} style={S.modalSaveButton} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                {(createUserMutation.isPending || updateUserMutation.isPending) ? <ActivityIndicator size="small" color={colors.primary} /> : <Check size={24} color={colors.primary} />}
              </Pressable>
            </View>

            <ScrollView style={S.modalContent} showsVerticalScrollIndicator={false}>

              {/* Basic info */}
              <View style={S.formSection}>
                <Text style={[S.formLabel, { color: colors.textSecondary }]}>BASIC INFORMATION</Text>
                <View style={[S.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={S.inputRow}>
                    <View style={[S.inputGroup, { flex: 1 }]}>
                      <Text style={[S.inputLabel, { color: colors.text }]}>First Name *</Text>
                      <TextInput style={[S.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]} value={firstName} onChangeText={setFirstName} placeholder="John" placeholderTextColor={colors.textTertiary} />
                    </View>
                    <View style={[S.inputGroup, { flex: 1 }]}>
                      <Text style={[S.inputLabel, { color: colors.text }]}>Last Name *</Text>
                      <TextInput style={[S.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]} value={lastName} onChangeText={setLastName} placeholder="Doe" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                  <View style={S.inputGroup}>
                    <Text style={[S.inputLabel, { color: colors.text }]}>Email *</Text>
                    <View style={[S.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <Mail size={18} color={colors.textTertiary} />
                      <TextInput style={[S.inputIconText, { color: colors.text }]} value={email} onChangeText={setEmail} placeholder="john.doe@company.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
                    </View>
                  </View>
                </View>
              </View>

              {/* Credentials */}
              <View style={S.formSection}>
                <Text style={[S.formLabel, { color: colors.textSecondary }]}>CREDENTIALS</Text>
                <View style={[S.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={S.inputRow}>
                    <View style={[S.inputGroup, { flex: 1 }]}>
                      <Text style={[S.inputLabel, { color: colors.text }]}>Employee Code *</Text>
                      <TextInput style={[S.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]} value={employeeCode} onChangeText={setEmployeeCode} placeholder="EMP0001" placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />
                    </View>
                    {modalMode === 'create' && (
                      <View style={[S.inputGroup, { flex: 1 }]}>
                        <Text style={[S.inputLabel, { color: colors.text }]}>PIN *</Text>
                        <View style={[S.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                          <Key size={18} color={colors.textTertiary} />
                          <TextInput style={[S.inputIconText, { color: colors.text }]} value={pin} onChangeText={setPin} placeholder="4+ digits" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" secureTextEntry />
                        </View>
                      </View>
                    )}
                  </View>
                  {modalMode === 'edit' && <Text style={[S.pinNote, { color: colors.textTertiary }]}>Use Reset PIN from the action menu to change the PIN</Text>}
                </View>
              </View>

              {/* Organization — Department + Position picker */}
              <View style={S.formSection}>
                <Text style={[S.formLabel, { color: colors.textSecondary }]}>ORGANIZATION</Text>
                <View style={[S.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

                  {/* Department picker */}
                  {!isSystemRole && (
                    <View style={S.inputGroup}>
                      <Text style={[S.inputLabel, { color: colors.text }]}>Department *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                          {deptOptions.map(d => (
                            <Pressable
                              key={d.department_code}
                              style={[S.deptChip, {
                                borderColor: department === d.department_code ? d.color : colors.border,
                                backgroundColor: department === d.department_code ? d.color + '18' : colors.backgroundSecondary,
                              }]}
                              onPress={() => {
                                setDepartment(d.department_code);
                                // Clear position when dept changes
                                setPositionId(null); setPositionTitle('');
                              }}
                            >
                              <View style={[S.deptChipDot, { backgroundColor: d.color }]} />
                              <Text style={[S.deptChipText, { color: department === d.department_code ? d.color : colors.textSecondary }]}>
                                {d.name}
                              </Text>
                              {department === d.department_code && <Check size={12} color={d.color} />}
                            </Pressable>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Position picker */}
                  {!isSystemRole && (
                    <View style={S.inputGroup}>
                      <Text style={[S.inputLabel, { color: colors.text }]}>Position *</Text>
                      <Pressable
                        style={[S.positionPickerBtn, {
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: positionId ? colors.primary : colors.border,
                        }]}
                        onPress={() => {
                          if (!department) { Alert.alert('Select Department', 'Please select a department first'); return; }
                          setShowPositionPicker(true);
                        }}
                      >
                        <Text style={[S.positionPickerText, { color: positionTitle ? colors.text : colors.textTertiary }]}>
                          {positionTitle || 'Select a position...'}
                        </Text>
                        <ChevronDown size={16} color={colors.textSecondary} />
                      </Pressable>
                      {positionId && (
                        <Pressable onPress={() => { setPositionId(null); setPositionTitle(''); }} style={S.clearPosition}>
                          <X size={12} color={colors.textSecondary} />
                          <Text style={[S.clearPositionText, { color: colors.textSecondary }]}>Clear</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {/* Role */}
                  <View style={S.inputGroup}>
                    <Text style={[S.inputLabel, { color: colors.text }]}>System Role</Text>
                    {modalMode === 'edit' ? (
                      <View style={S.roleGrid}>
                        {permissionRoles.map(pr => (
                          <Pressable key={pr.id} style={[S.roleOption, { borderColor: selectedPermissionRoleId === pr.id ? pr.color : colors.border }, selectedPermissionRoleId === pr.id && { backgroundColor: pr.color + '15' }]} onPress={() => setSelectedPermissionRoleId(pr.id)}>
                            {selectedPermissionRoleId === pr.id && <Check size={14} color={pr.color} />}
                            <Text style={[S.roleOptionText, { color: selectedPermissionRoleId === pr.id ? pr.color : colors.textSecondary }]}>{pr.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <View style={S.roleGrid}>
                        {BASIC_ROLE_OPTIONS.map(o => (
                          <Pressable key={o.value} style={[S.roleOption, { borderColor: role === o.value ? colors.primary : colors.border }, role === o.value && { backgroundColor: colors.primary + '15' }]} onPress={() => setRole(o.value)}>
                            {role === o.value && <Check size={14} color={colors.primary} />}
                            <Text style={[S.roleOptionText, { color: role === o.value ? colors.primary : colors.textSecondary }]}>{o.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Status */}
                  <View style={S.inputGroup}>
                    <Text style={[S.inputLabel, { color: colors.text }]}>Status</Text>
                    <View style={S.statusGrid}>
                      {STATUS_OPTIONS.filter(o => o.value !== 'all').map(o => (
                        <Pressable key={o.value} style={[S.statusOption, { borderColor: status === o.value ? o.color : colors.border }, status === o.value && { backgroundColor: o.color + '15' }]} onPress={() => setStatus(o.value as any)}>
                          <View style={[S.statusOptionDot, { backgroundColor: o.color }]} />
                          <Text style={[S.statusOptionText, { color: status === o.value ? o.color : colors.textSecondary }]}>{o.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                </View>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>

        {/* Position picker modal */}
        {organizationId && (
          <PositionPickerModal
            visible={showPositionPicker}
            onClose={() => setShowPositionPicker(false)}
            onSelect={pos => {
              setPositionId(pos.id);
              setPositionTitle(pos.title);
              setShowPositionPicker(false);
            }}
            departmentCode={department}
            colors={colors}
            organizationId={organizationId}
          />
        )}

        {/* Role assignment modal */}
        <RoleAssignmentModal
          visible={roleAssignModalVisible}
          user={userForRoleAssign}
          onClose={() => { setRoleAssignModalVisible(false); setUserForRoleAssign(null); }}
          onAssign={handleAssignRole}
          colors={colors}
          roles={permissionRoles}
          currentRoleId={userForRoleAssign ? (getEmployeeRole(userForRoleAssign.id)?.id || null) : null}
        />

        {/* Deactivation confirm */}
        <Modal visible={deactivationModalVisible} transparent animationType="fade" onRequestClose={() => setDeactivationModalVisible(false)}>
          <View style={S.confirmModalOverlay}>
            <View style={[S.confirmModalContent, { backgroundColor: colors.surface }]}>
              <View style={[S.confirmModalIcon, { backgroundColor: '#EF444415' }]}><AlertTriangle size={32} color="#EF4444" /></View>
              <Text style={[S.confirmModalTitle, { color: colors.text }]}>{usersToDeactivate.length > 1 ? 'Deactivate Users' : 'Deactivate User'}</Text>
              <Text style={[S.confirmModalMessage, { color: colors.textSecondary }]}>
                {usersToDeactivate.length > 1 ? `Deactivate ${usersToDeactivate.length} users?` : `Deactivate ${usersToDeactivate[0]?.first_name} ${usersToDeactivate[0]?.last_name}?`}
              </Text>
              <View style={S.confirmModalActions}>
                <Pressable style={[S.confirmModalButton, S.confirmModalCancel, { borderColor: colors.border }]} onPress={() => { setDeactivationModalVisible(false); setUsersToDeactivate([]); }}>
                  <Text style={[S.confirmModalButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[S.confirmModalButton, { backgroundColor: '#EF4444' }]} onPress={handleConfirmDeactivation} disabled={toggleStatusMutation.isPending || bulkToggleStatusMutation.isPending}>
                  {toggleStatusMutation.isPending || bulkToggleStatusMutation.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <><Power size={16} color="#FFF" /><Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' as const }}>Deactivate</Text></>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* PIN reset modal */}
        <Modal visible={passwordResetModalVisible} transparent animationType="fade" onRequestClose={() => { setPasswordResetModalVisible(false); setUserToResetPassword(null); }}>
          <View style={S.confirmModalOverlay}>
            <View style={[S.confirmModalContent, { backgroundColor: colors.surface }]}>
              {!showResetSuccess ? (
                <>
                  <View style={[S.confirmModalIcon, { backgroundColor: '#F59E0B15' }]}><KeyRound size={32} color="#F59E0B" /></View>
                  <Text style={[S.confirmModalTitle, { color: colors.text }]}>Reset PIN</Text>
                  <Text style={[S.confirmModalMessage, { color: colors.textSecondary }]}>Generate a new PIN for {userToResetPassword?.first_name} {userToResetPassword?.last_name}?</Text>
                  <View style={S.confirmModalActions}>
                    <Pressable style={[S.confirmModalButton, S.confirmModalCancel, { borderColor: colors.border }]} onPress={() => { setPasswordResetModalVisible(false); setUserToResetPassword(null); }}><Text style={[S.confirmModalButtonText, { color: colors.text }]}>Cancel</Text></Pressable>
                    <Pressable style={[S.confirmModalButton, { backgroundColor: '#F59E0B' }]} onPress={() => handleConfirmPasswordReset(false)} disabled={resetPinMutation.isPending}>
                      {resetPinMutation.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <><RefreshCw size={16} color="#FFF" /><Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' as const }}>Reset PIN</Text></>}
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={[S.confirmModalIcon, { backgroundColor: '#10B98115' }]}><Check size={32} color="#10B981" /></View>
                  <Text style={[S.confirmModalTitle, { color: colors.text }]}>PIN Reset Successful</Text>
                  <View style={[S.pinDisplayContainer, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[S.pinLabel, { color: colors.textSecondary }]}>New Temporary PIN</Text>
                    <View style={S.pinValueRow}>
                      <Text style={[S.pinValue, { color: colors.text }]}>{generatedPin}</Text>
                      <Pressable style={[S.copyButton, { backgroundColor: pinCopied ? '#10B981' : colors.primary }]} onPress={handleCopyPin}>
                        {pinCopied ? <Check size={16} color="#FFF" /> : <Copy size={16} color="#FFF" />}
                      </Pressable>
                    </View>
                    {pinCopied && <Text style={[S.copiedText, { color: '#10B981' }]}>Copied!</Text>}
                  </View>
                  <View style={[S.warningBox, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text style={[S.warningText, { color: '#F59E0B' }]}>Share this PIN securely. It will not be shown again.</Text>
                  </View>
                  <Pressable style={[S.doneButton, { backgroundColor: colors.primary }]} onPress={() => { setPasswordResetModalVisible(false); setUserToResetPassword(null); setShowResetSuccess(false); }}>
                    <Text style={S.doneButtonText}>Done</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>

        {showActionMenu && <Pressable style={S.actionMenuOverlay} onPress={() => setShowActionMenu(null)} />}
      </View>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700' as const },
  statLabel: { fontSize: 11, marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  searchDivider: { width: 1, height: 24 },
  filterButton: { padding: 4 },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '600' as const },
  filtersContainer: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterTitle: { fontSize: 15, fontWeight: '600' as const },
  clearFilters: { fontSize: 13, fontWeight: '500' as const },
  filterLabel: { fontSize: 12, fontWeight: '500' as const, marginBottom: 8, marginTop: 8 },
  filterChipsRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 13, fontWeight: '500' as const },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, gap: 10 },
  createButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  createButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' as const },
  selectButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  selectButtonText: { fontSize: 14, fontWeight: '500' as const },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  resultCount: { fontSize: 13, marginBottom: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' as const },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  checkbox: { marginRight: 10 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600' as const },
  userInfo: { flex: 1, marginLeft: 12 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  userEmail: { fontSize: 13, marginBottom: 4 },
  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, fontWeight: '500' as const },
  moreButton: { padding: 8, marginLeft: 4 },
  actionMenu: { position: 'absolute', top: 50, right: 16, borderRadius: 12, borderWidth: 1, padding: 4, zIndex: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  actionMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  actionMenuText: { fontSize: 14, fontWeight: '500' as const },
  actionMenuDivider: { height: 1, marginHorizontal: 8, marginVertical: 4 },
  actionMenuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleLabel: { fontSize: 11, fontWeight: '600' as const },
  bulkActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1 },
  bulkActionInfo: { flex: 1 },
  bulkActionCount: { fontSize: 15, fontWeight: '600' as const },
  bulkActionButtons: { flexDirection: 'row', gap: 8 },
  bulkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  bulkButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' as const },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalCloseButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalSaveButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  modalContent: { flex: 1, padding: 16 },
  formSection: { marginBottom: 24 },
  formLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 10 },
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, gap: 10 },
  inputIconText: { flex: 1, paddingVertical: 12, fontSize: 15 },
  pinNote: { fontSize: 12, fontStyle: 'italic' as const, marginTop: -8 },
  // Department chip picker
  deptChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  deptChipDot: { width: 8, height: 8, borderRadius: 4 },
  deptChipText: { fontSize: 12, fontWeight: '500' as const },
  // Position picker button
  positionPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1, padding: 12 },
  positionPickerText: { fontSize: 15, flex: 1 },
  clearPosition: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  clearPositionText: { fontSize: 12 },
  // Role / Status
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  roleOptionText: { fontSize: 13, fontWeight: '500' as const },
  statusGrid: { flexDirection: 'row', gap: 10 },
  statusOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  statusOptionDot: { width: 8, height: 8, borderRadius: 4 },
  statusOptionText: { fontSize: 13, fontWeight: '500' as const },
  // Position picker modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' as any },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  pickerTitle: { fontSize: 17, fontWeight: '700' as const },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  pickerLoading: { padding: 40, alignItems: 'center' },
  pickerList: { maxHeight: 400, paddingHorizontal: 12 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  pickerRowTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  pickerRowMeta: { fontSize: 11 },
  // Confirm modals
  confirmModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmModalContent: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 24, alignItems: 'center' },
  confirmModalIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  confirmModalTitle: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  confirmModalMessage: { fontSize: 14, lineHeight: 20, textAlign: 'center' as const, marginBottom: 20 },
  confirmModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmModalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
  confirmModalCancel: { borderWidth: 1 },
  confirmModalButtonText: { fontSize: 15, fontWeight: '600' as const },
  pinDisplayContainer: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  pinLabel: { fontSize: 12, fontWeight: '500' as const, marginBottom: 8 },
  pinValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinValue: { fontSize: 32, fontWeight: '700' as const, letterSpacing: 4 },
  copyButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  copiedText: { fontSize: 12, fontWeight: '500' as const, marginTop: 8 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10, marginBottom: 20, width: '100%' },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  doneButton: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' as const },
});

// ── Sub-component styles ───────────────────────────────────────
const PP = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, borderRadius: 12, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' as const },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  headerInfo: { flex: 1 },
  roleName: { fontSize: 16, fontWeight: '600' as const },
  roleDesc: { fontSize: 13, marginTop: 2 },
  moduleList: { flex: 1, marginTop: 12 },
  moduleCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  moduleName: { fontSize: 14, fontWeight: '600' as const, marginBottom: 6 },
  actionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionChipText: { fontSize: 11 },
});

const RA = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { height: '85%' as any, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600' as const },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 4, borderRadius: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '500' as const },
  roleList: { flex: 1, paddingHorizontal: 16 },
  roleCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  roleCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioSelected: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioUnselected: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  roleColor: { width: 6, height: 40, borderRadius: 3 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontWeight: '600' as const },
  roleDesc: { fontSize: 12, marginTop: 2 },
  previewContainer: { flex: 1, paddingHorizontal: 16 },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' as const },
  assignBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  assignBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' as const },
});
