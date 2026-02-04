import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Search,
  X,
  Users,
  UserCheck,
  UserX,
  Clock,
  Filter,
  Check,
  Mail,

  Building2,
  Shield,
  Key,
  MoreVertical,
  UserPlus,
  Edit3,
  Power,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  UserMinus,
  Minus,
  Copy,
  KeyRound,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useToggleUserStatus,
  useResetUserPin,
  useUserDepartments,
  useUserRoles,
  useUserStats,
  useBulkToggleUserStatus,
  type SupabaseUser,
  type UserFilters,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/hooks/useSupabaseUsers';
import {
  type Role,
  type PermissionModule,
  MODULE_PERMISSION_DEFINITIONS,
} from '@/constants/permissionsConstants';


type ModalMode = 'create' | 'edit' | null;
type StatusFilter = 'all' | 'active' | 'inactive' | 'on_leave';
type RoleAssignmentView = 'select' | 'preview';

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Users', color: '#6B7280' },
  { value: 'active', label: 'Active', color: '#10B981' },
  { value: 'inactive', label: 'Inactive', color: '#EF4444' },
  { value: 'on_leave', label: 'On Leave', color: '#F59E0B' },
];

const BASIC_ROLE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'employee', label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

const BASIC_ROLE_MAP: Record<string, string> = {
  'default': 'default',
  'employee': 'employee',
  'supervisor': 'supervisor',
  'manager': 'manager',
  'admin': 'admin',
  'superadmin': 'superadmin',
};

interface PermissionPreviewProps {
  role: Role | null;
  colors: ReturnType<typeof useTheme>['colors'];
}

function PermissionPreview({ role, colors }: PermissionPreviewProps) {
  if (!role) {
    return (
      <View style={[permPreviewStyles.emptyContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Shield size={32} color={colors.textTertiary} />
        <Text style={[permPreviewStyles.emptyText, { color: colors.textTertiary }]}>
          Select a role to preview permissions
        </Text>
      </View>
    );
  }

  const getModuleName = (moduleKey: PermissionModule): string => {
    const def = MODULE_PERMISSION_DEFINITIONS.find(m => m.module === moduleKey);
    return def?.name || moduleKey;
  };

  const getActionLabel = (moduleKey: PermissionModule, action: string): string => {
    const def = MODULE_PERMISSION_DEFINITIONS.find(m => m.module === moduleKey);
    const actionDef = def?.actions.find(a => a.action === action);
    return actionDef?.label || action;
  };

  const permissionCount = role.permissions.reduce((sum, p) => sum + p.actions.length, 0);
  const moduleCount = role.permissions.length;

  return (
    <View style={permPreviewStyles.container}>
      <View style={[permPreviewStyles.header, { backgroundColor: role.color + '15', borderColor: role.color + '30' }]}>
        <View style={[permPreviewStyles.roleColorDot, { backgroundColor: role.color }]} />
        <View style={permPreviewStyles.headerInfo}>
          <Text style={[permPreviewStyles.roleName, { color: colors.text }]}>{role.name}</Text>
          <Text style={[permPreviewStyles.roleDesc, { color: colors.textSecondary }]}>{role.description}</Text>
        </View>
        {role.isSystem && (
          <View style={[permPreviewStyles.systemBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[permPreviewStyles.systemBadgeText, { color: colors.warning }]}>System</Text>
          </View>
        )}
      </View>

      <View style={[permPreviewStyles.statsRow, { borderColor: colors.border }]}>
        <View style={permPreviewStyles.stat}>
          <Text style={[permPreviewStyles.statValue, { color: colors.primary }]}>{moduleCount}</Text>
          <Text style={[permPreviewStyles.statLabel, { color: colors.textSecondary }]}>Modules</Text>
        </View>
        <View style={[permPreviewStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={permPreviewStyles.stat}>
          <Text style={[permPreviewStyles.statValue, { color: colors.success }]}>{permissionCount}</Text>
          <Text style={[permPreviewStyles.statLabel, { color: colors.textSecondary }]}>Permissions</Text>
        </View>
      </View>

      <ScrollView style={permPreviewStyles.moduleList} showsVerticalScrollIndicator={false}>
        {role.permissions.length === 0 ? (
          <View style={[permPreviewStyles.noPermsContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[permPreviewStyles.noPermsText, { color: colors.textTertiary }]}>
              No permissions assigned to this role
            </Text>
          </View>
        ) : (
          role.permissions.map((perm) => (
            <View key={perm.module} style={[permPreviewStyles.moduleCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <View style={permPreviewStyles.moduleHeader}>
                <Text style={[permPreviewStyles.moduleName, { color: colors.text }]}>
                  {getModuleName(perm.module)}
                </Text>
                <View style={[permPreviewStyles.actionCount, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[permPreviewStyles.actionCountText, { color: colors.primary }]}>
                    {perm.actions.length}
                  </Text>
                </View>
              </View>
              <View style={permPreviewStyles.actionsList}>
                {perm.actions.map((action) => (
                  <View key={action} style={[permPreviewStyles.actionChip, { backgroundColor: colors.surface }]}>
                    <Check size={10} color={colors.success} />
                    <Text style={[permPreviewStyles.actionChipText, { color: colors.textSecondary }]}>
                      {getActionLabel(perm.module, action)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface RoleAssignmentModalProps {
  visible: boolean;
  user: SupabaseUser | null;
  onClose: () => void;
  onAssign: (roleId: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  roles: Role[];
  currentRoleId: string | null;
}

function RoleAssignmentModal({
  visible,
  user,
  onClose,
  onAssign,
  colors,
  roles,
  currentRoleId,
}: RoleAssignmentModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(currentRoleId);
  const [view, setView] = useState<RoleAssignmentView>('select');

  useEffect(() => {
    if (visible) {
      setSelectedRoleId(currentRoleId);
      setView('select');
    }
  }, [visible, currentRoleId]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || null;

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[roleAssignStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[roleAssignStyles.container, { backgroundColor: colors.surface }]}>
          <View style={[roleAssignStyles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={roleAssignStyles.closeBtn}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[roleAssignStyles.title, { color: colors.text }]}>Assign Role</Text>
            <View style={roleAssignStyles.closeBtn} />
          </View>

          <View style={[roleAssignStyles.userInfo, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[roleAssignStyles.userAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[roleAssignStyles.userInitials, { color: colors.primary }]}>
                {user.first_name[0]}{user.last_name[0]}
              </Text>
            </View>
            <View style={roleAssignStyles.userDetails}>
              <Text style={[roleAssignStyles.userName, { color: colors.text }]}>
                {user.first_name} {user.last_name}
              </Text>
              <Text style={[roleAssignStyles.userEmail, { color: colors.textSecondary }]}>
                {user.email}
              </Text>
            </View>
          </View>

          <View style={[roleAssignStyles.tabBar, { backgroundColor: colors.backgroundSecondary }]}>
            <Pressable
              style={[
                roleAssignStyles.tab,
                view === 'select' && { backgroundColor: colors.surface },
              ]}
              onPress={() => setView('select')}
            >
              <Shield size={16} color={view === 'select' ? colors.primary : colors.textSecondary} />
              <Text style={[roleAssignStyles.tabText, { color: view === 'select' ? colors.primary : colors.textSecondary }]}>
                Select Role
              </Text>
            </Pressable>
            <Pressable
              style={[
                roleAssignStyles.tab,
                view === 'preview' && { backgroundColor: colors.surface },
              ]}
              onPress={() => setView('preview')}
            >
              <Key size={16} color={view === 'preview' ? colors.primary : colors.textSecondary} />
              <Text style={[roleAssignStyles.tabText, { color: view === 'preview' ? colors.primary : colors.textSecondary }]}>
                Permissions
              </Text>
            </Pressable>
          </View>

          {view === 'select' ? (
            <ScrollView style={roleAssignStyles.roleList} showsVerticalScrollIndicator={false}>
              {roles.map((role) => (
                <Pressable
                  key={role.id}
                  style={[
                    roleAssignStyles.roleCard,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    selectedRoleId === role.id && { borderColor: role.color, backgroundColor: role.color + '08' },
                  ]}
                  onPress={() => setSelectedRoleId(role.id)}
                >
                  <View style={roleAssignStyles.roleCardLeft}>
                    {selectedRoleId === role.id ? (
                      <View style={[roleAssignStyles.radioSelected, { borderColor: role.color, backgroundColor: role.color }]}>
                        <Check size={12} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={[roleAssignStyles.radioUnselected, { borderColor: colors.border }]} />
                    )}
                    <View style={[roleAssignStyles.roleColor, { backgroundColor: role.color }]} />
                    <View style={roleAssignStyles.roleInfo}>
                      <View style={roleAssignStyles.roleNameRow}>
                        <Text style={[roleAssignStyles.roleName, { color: colors.text }]}>{role.name}</Text>
                        {role.isSystem && (
                          <View style={[roleAssignStyles.systemTag, { backgroundColor: colors.warning + '20' }]}>
                            <Text style={[roleAssignStyles.systemTagText, { color: colors.warning }]}>System</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[roleAssignStyles.roleDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {role.description}
                      </Text>
                      <View style={roleAssignStyles.roleStats}>
                        <Text style={[roleAssignStyles.roleStatText, { color: colors.textTertiary }]}>
                          {role.permissions.length} modules • {role.permissions.reduce((s, p) => s + p.actions.length, 0)} permissions
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          ) : (
            <View style={roleAssignStyles.previewContainer}>
              <PermissionPreview role={selectedRole} colors={colors} />
            </View>
          )}

          <View style={[roleAssignStyles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              style={[roleAssignStyles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[roleAssignStyles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                roleAssignStyles.assignBtn,
                { backgroundColor: selectedRoleId ? colors.primary : colors.textTertiary },
              ]}
              onPress={() => selectedRoleId && onAssign(selectedRoleId)}
              disabled={!selectedRoleId}
            >
              <Shield size={16} color="#FFFFFF" />
              <Text style={roleAssignStyles.assignBtnText}>Assign Role</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function generateEmployeeCode(): string {
  const prefix = 'EMP';
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${random}`;
}

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

interface StatusToggleProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function StatusToggle({ isActive, onToggle, disabled, colors }: StatusToggleProps) {
  const animatedValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }, [isActive, animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EF4444', '#10B981'],
  });

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[styles.toggleContainer, disabled && { opacity: 0.5 }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.toggleTrack, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.toggleThumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
      <Text style={[styles.toggleLabel, { color: isActive ? '#10B981' : '#EF4444' }]}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </Pressable>
  );
}

interface DeactivationModalProps {
  visible: boolean;
  users: SupabaseUser[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

interface PasswordResetModalProps {
  visible: boolean;
  user: SupabaseUser | null;
  onConfirm: (sendEmail: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
  newPin: string;
  showSuccess: boolean;
  onCopyPin: () => void;
  pinCopied: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function PasswordResetModal({
  visible,
  user,
  onConfirm,
  onCancel,
  isLoading,
  newPin,
  showSuccess,
  onCopyPin,
  pinCopied,
  colors,
}: PasswordResetModalProps) {
  const [sendEmail, setSendEmail] = useState(false);

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={[styles.confirmModalContent, { backgroundColor: colors.surface }]}>
          {!showSuccess ? (
            <>
              <View style={[styles.confirmModalIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                <KeyRound size={32} color="#F59E0B" />
              </View>
              
              <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
                Reset Password
              </Text>
              
              <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                Generate a new temporary PIN for {user.first_name} {user.last_name}?
              </Text>

              <View style={[styles.userPreviewCard, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.userPreviewAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.userPreviewInitials, { color: colors.primary }]}>
                    {user.first_name[0]}{user.last_name[0]}
                  </Text>
                </View>
                <View style={styles.userPreviewInfo}>
                  <Text style={[styles.userPreviewName, { color: colors.text }]}>
                    {user.first_name} {user.last_name}
                  </Text>
                  <Text style={[styles.userPreviewEmail, { color: colors.textSecondary }]}>
                    {user.email}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.emailToggle, { borderColor: sendEmail ? colors.primary : colors.border }]}
                onPress={() => setSendEmail(!sendEmail)}
              >
                {sendEmail ? (
                  <CheckSquare size={20} color={colors.primary} />
                ) : (
                  <Square size={20} color={colors.textSecondary} />
                )}
                <View style={styles.emailToggleText}>
                  <Text style={[styles.emailToggleLabel, { color: colors.text }]}>
                    Send notification email
                  </Text>
                  <Text style={[styles.emailToggleDesc, { color: colors.textTertiary }]}>
                    Notify user about their new PIN
                  </Text>
                </View>
              </Pressable>

              <View style={styles.confirmModalActions}>
                <Pressable
                  style={[styles.confirmModalButton, styles.confirmModalCancel, { borderColor: colors.border }]}
                  onPress={onCancel}
                  disabled={isLoading}
                >
                  <Text style={[styles.confirmModalButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmModalButton, styles.resetButton]}
                  onPress={() => onConfirm(sendEmail)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <RefreshCw size={16} color="#FFFFFF" />
                      <Text style={styles.resetButtonText}>Reset PIN</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.confirmModalIcon, { backgroundColor: '#10B981' + '15' }]}>
                <Check size={32} color="#10B981" />
              </View>
              
              <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
                PIN Reset Successful
              </Text>
              
              <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
                A new temporary PIN has been generated for {user.first_name}.
              </Text>

              <View style={[styles.pinDisplayContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.pinLabel, { color: colors.textSecondary }]}>New Temporary PIN</Text>
                <View style={styles.pinValueRow}>
                  <Text style={[styles.pinValue, { color: colors.text }]}>{newPin}</Text>
                  <Pressable
                    style={[styles.copyButton, { backgroundColor: pinCopied ? '#10B981' : colors.primary }]}
                    onPress={onCopyPin}
                  >
                    {pinCopied ? (
                      <Check size={16} color="#FFFFFF" />
                    ) : (
                      <Copy size={16} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
                {pinCopied && (
                  <Text style={[styles.copiedText, { color: '#10B981' }]}>Copied to clipboard!</Text>
                )}
              </View>

              <View style={[styles.warningBox, { backgroundColor: '#F59E0B' + '10', borderColor: '#F59E0B' + '30' }]}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                  Please share this PIN securely with the user. It will not be shown again.
                </Text>
              </View>

              <Pressable
                style={[styles.doneButton, { backgroundColor: colors.primary }]}
                onPress={onCancel}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DeactivationModal({ visible, users, onConfirm, onCancel, isLoading, colors }: DeactivationModalProps) {
  const isBulk = users.length > 1;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={[styles.confirmModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.confirmModalIcon, { backgroundColor: '#EF4444' + '15' }]}>
            <AlertTriangle size={32} color="#EF4444" />
          </View>
          
          <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
            {isBulk ? 'Deactivate Users' : 'Deactivate User'}
          </Text>
          
          <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
            {isBulk
              ? `Are you sure you want to deactivate ${users.length} users? They will lose access to the system until reactivated.`
              : `Are you sure you want to deactivate ${users[0]?.first_name} ${users[0]?.last_name}? They will lose access to the system until reactivated.`
            }
          </Text>

          {isBulk && (
            <View style={[styles.userListPreview, { backgroundColor: colors.backgroundSecondary }]}>
              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {users.slice(0, 5).map((user) => (
                  <View key={user.id} style={styles.userListItem}>
                    <UserMinus size={14} color={colors.textSecondary} />
                    <Text style={[styles.userListName, { color: colors.text }]}>
                      {user.first_name} {user.last_name}
                    </Text>
                  </View>
                ))}
                {users.length > 5 && (
                  <Text style={[styles.userListMore, { color: colors.textTertiary }]}>
                    +{users.length - 5} more users
                  </Text>
                )}
              </ScrollView>
            </View>
          )}

          <View style={styles.confirmModalActions}>
            <Pressable
              style={[styles.confirmModalButton, styles.confirmModalCancel, { borderColor: colors.border }]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={[styles.confirmModalButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmModalButton, styles.confirmModalDeactivate]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Power size={16} color="#FFFFFF" />
                  <Text style={styles.confirmModalDeactivateText}>Deactivate</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function UserManagementScreen() {
  const { colors } = useTheme();
  const { roles: permissionRoles, assignRoleToEmployee, getEmployeeRole } = usePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [deactivationModalVisible, setDeactivationModalVisible] = useState(false);
  const [usersToDeactivate, setUsersToDeactivate] = useState<SupabaseUser[]>([]);
  
  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<SupabaseUser | null>(null);
  const [generatedPin, setGeneratedPin] = useState('');
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  
  const [roleAssignModalVisible, setRoleAssignModalVisible] = useState(false);
  const [userForRoleAssign, setUserForRoleAssign] = useState<SupabaseUser | null>(null);
  
  const [firstName, setFirstName] = useState('');  
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('default');
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState<string | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive' | 'on_leave'>('active');

  const filters: UserFilters = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    department: departmentFilter || undefined,
    role: roleFilter || undefined,
    search: searchQuery || undefined,
  }), [statusFilter, departmentFilter, roleFilter, searchQuery]);

  const { data: users = [], isLoading, refetch, isRefetching } = useUsers(filters);
  const { data: departments = [] } = useUserDepartments();
  const { data: roles = [] } = useUserRoles();
  const { data: stats } = useUserStats();
  
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const toggleStatusMutation = useToggleUserStatus();
  const resetPinMutation = useResetUserPin();
  const bulkToggleStatusMutation = useBulkToggleUserStatus();

  const selectedUsers = useMemo(() => 
    users.filter(u => selectedUserIds.has(u.id)),
    [users, selectedUserIds]
  );

  const selectedActiveCount = useMemo(() => 
    selectedUsers.filter(u => u.status === 'active').length,
    [selectedUsers]
  );

  const selectedInactiveCount = useMemo(() => 
    selectedUsers.filter(u => u.status === 'inactive').length,
    [selectedUsers]
  );

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setEmail('');

    setEmployeeCode(generateEmployeeCode());
    setPin(generatePin());
    setPosition('');
    setDepartment('');
    setRole('default');
    setSelectedPermissionRoleId(null);
    setStatus('active');
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setSelectedUser(null);
    setModalMode('create');
    setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((user: SupabaseUser) => {
    setSelectedUser(user);
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);

    setEmployeeCode(user.employee_code);
    setPin('');
    setPosition(user.position || '');
    setDepartment(user.department_code || '');
    
    // Get the actual permission role if assigned
    const currentPermRole = getEmployeeRole(user.id);
    if (currentPermRole) {
      setSelectedPermissionRoleId(currentPermRole.id);
      // Map permission role to basic role level if applicable
      const roleName = currentPermRole.name.toLowerCase();
      if (BASIC_ROLE_MAP[roleName]) {
        setRole(BASIC_ROLE_MAP[roleName]);
      } else {
        setRole(user.role);
      }
    } else {
      setSelectedPermissionRoleId(null);
      setRole(user.role);
    }
    
    setStatus(user.status);
    setModalMode('edit');
    setModalVisible(true);
    setShowActionMenu(null);
  }, [getEmployeeRole]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalMode(null);
    setSelectedUser(null);
    resetForm();
  }, [resetForm]);

  const validateForm = useCallback((): boolean => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Last name is required');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!employeeCode.trim()) {
      Alert.alert('Validation Error', 'Employee code is required');
      return false;
    }
    if (modalMode === 'create' && (!pin || pin.length < 4)) {
      Alert.alert('Validation Error', 'PIN must be at least 4 characters');
      return false;
    }
    return true;
  }, [firstName, lastName, email, employeeCode, pin, modalMode]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const input: CreateUserInput = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          employee_code: employeeCode.trim(),
          pin: pin,
          position: position.trim() || undefined,
          department_code: department || null,
          role: role,
          status: status,
        };
        await createUserMutation.mutateAsync(input);
        Alert.alert('Success', 'User created successfully');
      } else if (modalMode === 'edit' && selectedUser) {
        // Determine the role to save based on permission role selection
        let roleToSave = role;
        if (selectedPermissionRoleId) {
          const selectedPermRole = permissionRoles.find(r => r.id === selectedPermissionRoleId);
          if (selectedPermRole) {
            // Map permission role name to basic role if possible, otherwise use the role name
            const roleName = selectedPermRole.name.toLowerCase();
            if (BASIC_ROLE_MAP[roleName]) {
              roleToSave = BASIC_ROLE_MAP[roleName];
            }
          }
        }
        
        const updates: UpdateUserInput = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          employee_code: employeeCode.trim(),
          position: position.trim() || undefined,
          department_code: department || null,
          role: roleToSave,
          status: status,
        };
        await updateUserMutation.mutateAsync({ id: selectedUser.id, updates });
        
        // Also update the permission role assignment
        if (selectedPermissionRoleId) {
          assignRoleToEmployee(selectedUser.id, selectedPermissionRoleId);
        }
        
        Alert.alert('Success', 'User updated successfully');
      }
      closeModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', message);
    }
  }, [modalMode, firstName, lastName, email, employeeCode, pin, position, department, role, selectedPermissionRoleId, status, selectedUser, validateForm, createUserMutation, updateUserMutation, closeModal, permissionRoles, assignRoleToEmployee]);

  const handleToggleStatus = useCallback((user: SupabaseUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    if (newStatus === 'inactive') {
      setUsersToDeactivate([user]);
      setDeactivationModalVisible(true);
    } else {
      Alert.alert(
        'Activate User',
        `Activate ${user.first_name} ${user.last_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate',
            onPress: async () => {
              try {
                await toggleStatusMutation.mutateAsync({ id: user.id, status: 'active' });
                Alert.alert('Success', 'User activated successfully');
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'An error occurred';
                Alert.alert('Error', message);
              }
            },
          },
        ]
      );
    }
    setShowActionMenu(null);
  }, [toggleStatusMutation]);

  const handleConfirmDeactivation = useCallback(async () => {
    try {
      if (usersToDeactivate.length === 1) {
        await toggleStatusMutation.mutateAsync({ id: usersToDeactivate[0].id, status: 'inactive' });
        Alert.alert('Success', 'User deactivated successfully');
      } else {
        await bulkToggleStatusMutation.mutateAsync({
          userIds: usersToDeactivate.map(u => u.id),
          status: 'inactive',
        });
        Alert.alert('Success', `${usersToDeactivate.length} users deactivated successfully`);
        setSelectionMode(false);
        setSelectedUserIds(new Set());
      }
      setDeactivationModalVisible(false);
      setUsersToDeactivate([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', message);
    }
  }, [usersToDeactivate, toggleStatusMutation, bulkToggleStatusMutation]);

  const handleBulkActivate = useCallback(async () => {
    const usersToActivate = selectedUsers.filter(u => u.status !== 'active');
    if (usersToActivate.length === 0) {
      Alert.alert('Info', 'All selected users are already active');
      return;
    }

    Alert.alert(
      'Activate Users',
      `Activate ${usersToActivate.length} user${usersToActivate.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              await bulkToggleStatusMutation.mutateAsync({
                userIds: usersToActivate.map(u => u.id),
                status: 'active',
              });
              Alert.alert('Success', `${usersToActivate.length} users activated successfully`);
              setSelectionMode(false);
              setSelectedUserIds(new Set());
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'An error occurred';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  }, [selectedUsers, bulkToggleStatusMutation]);

  const handleBulkDeactivate = useCallback(() => {
    const usersToDeactivateList = selectedUsers.filter(u => u.status === 'active');
    if (usersToDeactivateList.length === 0) {
      Alert.alert('Info', 'All selected users are already inactive');
      return;
    }
    setUsersToDeactivate(usersToDeactivateList);
    setDeactivationModalVisible(true);
  }, [selectedUsers]);

  const handleResetPin = useCallback((user: SupabaseUser) => {
    const newPin = generatePin();
    setGeneratedPin(newPin);
    setUserToResetPassword(user);
    setShowResetSuccess(false);
    setPinCopied(false);
    setPasswordResetModalVisible(true);
    setShowActionMenu(null);
  }, []);

  const handleOpenRoleAssign = useCallback((user: SupabaseUser) => {
    setUserForRoleAssign(user);
    setRoleAssignModalVisible(true);
    setShowActionMenu(null);
  }, []);

  const handleAssignRole = useCallback((roleId: string) => {
    if (!userForRoleAssign) return;
    assignRoleToEmployee(userForRoleAssign.id, roleId);
    const selectedRole = permissionRoles.find(r => r.id === roleId);
    Alert.alert('Success', `Role "${selectedRole?.name}" assigned to ${userForRoleAssign.first_name}`);
    setRoleAssignModalVisible(false);
    setUserForRoleAssign(null);
  }, [userForRoleAssign, assignRoleToEmployee, permissionRoles]);

  const getCurrentUserRoleId = useCallback((userId: string): string | null => {
    const role = getEmployeeRole(userId);
    return role?.id || null;
  }, [getEmployeeRole]);

  const handleConfirmPasswordReset = useCallback(async (sendEmail: boolean) => {
    if (!userToResetPassword) return;

    try {
      await resetPinMutation.mutateAsync({ id: userToResetPassword.id, newPin: generatedPin });
      console.log(`[PasswordReset] PIN reset for ${userToResetPassword.email}, sendEmail: ${sendEmail}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowResetSuccess(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', message);
    }
  }, [userToResetPassword, generatedPin, resetPinMutation]);

  const handleCopyPin = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(generatedPin);
      setPinCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setPinCopied(false), 3000);
    } catch (error) {
      console.error('[PasswordReset] Failed to copy PIN:', error);
    }
  }, [generatedPin]);

  const closePasswordResetModal = useCallback(() => {
    setPasswordResetModalVisible(false);
    setUserToResetPassword(null);
    setGeneratedPin('');
    setShowResetSuccess(false);
    setPinCopied(false);
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  }, [users, selectedUserIds.size]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedUserIds(new Set());
  }, []);

  const getStatusColor = (userStatus: string) => {
    switch (userStatus) {
      case 'active': return '#10B981';
      case 'inactive': return '#EF4444';
      case 'on_leave': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (userStatus: string) => {
    switch (userStatus) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'on_leave': return 'On Leave';
      default: return userStatus;
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (departmentFilter) count++;
    if (roleFilter) count++;
    return count;
  }, [statusFilter, departmentFilter, roleFilter]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setDepartmentFilter('');
    setRoleFilter('');
  }, []);

  const isAllSelected = users.length > 0 && selectedUserIds.size === users.length;
  const isSomeSelected = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'User Management',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Users size={18} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#10B981' + '20' }]}>
              <UserCheck size={18} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.active || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#EF4444' + '20' }]}>
              <UserX size={18} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.inactive || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inactive</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Clock size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.onLeave || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>On Leave</Text>
          </View>
        </View>

        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, email, or code..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          )}
          <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={activeFiltersCount > 0 ? colors.primary : colors.textSecondary} />
            {activeFiltersCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {showFilters && (
          <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
              {activeFiltersCount > 0 && (
                <Pressable onPress={clearFilters}>
                  <Text style={[styles.clearFilters, { color: colors.primary }]}>Clear All</Text>
                </Pressable>
              )}
            </View>
            
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
              {STATUS_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterChip,
                    { borderColor: statusFilter === option.value ? option.color : colors.border },
                    statusFilter === option.value && { backgroundColor: option.color + '15' },
                  ]}
                  onPress={() => setStatusFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: statusFilter === option.value ? option.color : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {departments.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { borderColor: !departmentFilter ? colors.primary : colors.border },
                      !departmentFilter && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setDepartmentFilter('')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: !departmentFilter ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {departments.map((dept) => (
                    <Pressable
                      key={dept}
                      style={[
                        styles.filterChip,
                        { borderColor: departmentFilter === dept ? colors.primary : colors.border },
                        departmentFilter === dept && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setDepartmentFilter(dept)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: departmentFilter === dept ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {dept}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {roles.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { borderColor: !roleFilter ? colors.primary : colors.border },
                      !roleFilter && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setRoleFilter('')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: !roleFilter ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>
                  {roles.map((r) => (
                    <Pressable
                      key={r}
                      style={[
                        styles.filterChip,
                        { borderColor: roleFilter === r ? colors.primary : colors.border },
                        roleFilter === r && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setRoleFilter(r)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: roleFilter === r ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={openCreateModal}
          >
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Add New User</Text>
          </Pressable>
          
          {!selectionMode ? (
            <Pressable
              style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectionMode(true)}
            >
              <CheckSquare size={18} color={colors.textSecondary} />
              <Text style={[styles.selectButtonText, { color: colors.textSecondary }]}>Select</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={exitSelectionMode}
            >
              <X size={18} color={colors.primary} />
              <Text style={[styles.selectButtonText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          )}
        </View>

        {selectionMode && users.length > 0 && (
          <View style={[styles.selectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable style={styles.selectAllButton} onPress={toggleSelectAll}>
              {isAllSelected ? (
                <CheckSquare size={20} color={colors.primary} />
              ) : isSomeSelected ? (
                <View style={[styles.partialCheckbox, { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]}>
                  <Minus size={12} color={colors.primary} />
                </View>
              ) : (
                <Square size={20} color={colors.textSecondary} />
              )}
              <Text style={[styles.selectAllText, { color: colors.text }]}>
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </Pressable>
            <Text style={[styles.selectionCount, { color: colors.textSecondary }]}>
              {selectedUserIds.size} of {users.length} selected
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading users...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, selectionMode && selectedUserIds.size > 0 && { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          >
            {users.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Users Found</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery || activeFiltersCount > 0
                    ? 'Try adjusting your search or filters'
                    : 'Add your first user to get started'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                  {users.length} user{users.length !== 1 ? 's' : ''} found
                </Text>
                {users.map((user) => (
                  <Pressable
                    key={user.id}
                    style={[
                      styles.userCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectionMode && selectedUserIds.has(user.id) && { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
                    ]}
                    onPress={() => selectionMode ? toggleUserSelection(user.id) : openEditModal(user)}
                    onLongPress={() => {
                      if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedUserIds(new Set([user.id]));
                      }
                    }}
                  >
                    {selectionMode && (
                      <Pressable
                        style={styles.checkbox}
                        onPress={() => toggleUserSelection(user.id)}
                      >
                        {selectedUserIds.has(user.id) ? (
                          <CheckSquare size={22} color={colors.primary} />
                        ) : (
                          <Square size={22} color={colors.textSecondary} />
                        )}
                      </Pressable>
                    )}
                    
                    <View style={[styles.userAvatar, { backgroundColor: getStatusColor(user.status) + '20' }]}>
                      <Text style={[styles.avatarText, { color: getStatusColor(user.status) }]}>
                        {user.first_name[0]}{user.last_name[0]}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                          {user.first_name} {user.last_name}
                        </Text>
                        {!selectionMode && user.status !== 'on_leave' && (
                          <StatusToggle
                            isActive={user.status === 'active'}
                            onToggle={() => handleToggleStatus(user)}
                            disabled={toggleStatusMutation.isPending}
                            colors={colors}
                          />
                        )}
                        {user.status === 'on_leave' && (
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) + '15' }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
                            <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                              {getStatusLabel(user.status)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>

                      <View style={styles.userMeta}>
                        <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.metaText, { color: colors.textTertiary }]}>{user.employee_code}</Text>
                        </View>
                        {user.department_code && (
                          <View style={[styles.metaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <Building2 size={10} color={colors.textTertiary} />
                            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{user.department_code}</Text>
                          </View>
                        )}
                        {(() => {
                          const assignedRole = getEmployeeRole(user.id);
                          const roleColor = assignedRole?.color || colors.primary;
                          const roleName = assignedRole?.name || user.role;
                          return (
                            <View style={[styles.metaBadge, { backgroundColor: roleColor + '15' }]}>
                              <Shield size={10} color={roleColor} />
                              <Text style={[styles.metaText, { color: roleColor }]}>{roleName}</Text>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                    {!selectionMode && (
                      <Pressable
                        style={styles.moreButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(showActionMenu === user.id ? null : user.id);
                        }}
                      >
                        <MoreVertical size={20} color={colors.textSecondary} />
                      </Pressable>
                    )}

                    {showActionMenu === user.id && (
                      <View style={[styles.actionMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Pressable
                          style={styles.actionMenuItem}
                          onPress={() => openEditModal(user)}
                        >
                          <Edit3 size={16} color={colors.text} />
                          <Text style={[styles.actionMenuText, { color: colors.text }]}>Edit User</Text>
                        </Pressable>
                        <Pressable
                          style={styles.actionMenuItem}
                          onPress={() => handleToggleStatus(user)}
                        >
                          <Power size={16} color={user.status === 'active' ? colors.error : colors.success} />
                          <Text style={[styles.actionMenuText, { color: user.status === 'active' ? colors.error : colors.success }]}>
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.actionMenuItem}
                          onPress={() => handleResetPin(user)}
                        >
                          <RefreshCw size={16} color={colors.warning} />
                          <Text style={[styles.actionMenuText, { color: colors.warning }]}>Reset PIN</Text>
                        </Pressable>
                        <View style={[styles.actionMenuDivider, { backgroundColor: colors.border }]} />
                        <Pressable
                          style={styles.actionMenuItem}
                          onPress={() => handleOpenRoleAssign(user)}
                        >
                          <Shield size={16} color={colors.primary} />
                          <Text style={[styles.actionMenuText, { color: colors.primary }]}>Assign Role & Permissions</Text>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                ))}
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {selectionMode && selectedUserIds.size > 0 && (
          <View style={[styles.bulkActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.bulkActionInfo}>
              <Text style={[styles.bulkActionCount, { color: colors.text }]}>
                {selectedUserIds.size} selected
              </Text>
              <View style={styles.bulkActionStats}>
                {selectedActiveCount > 0 && (
                  <View style={[styles.bulkStatBadge, { backgroundColor: '#10B981' + '15' }]}>
                    <View style={[styles.bulkStatDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.bulkStatText, { color: '#10B981' }]}>{selectedActiveCount} active</Text>
                  </View>
                )}
                {selectedInactiveCount > 0 && (
                  <View style={[styles.bulkStatBadge, { backgroundColor: '#EF4444' + '15' }]}>
                    <View style={[styles.bulkStatDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.bulkStatText, { color: '#EF4444' }]}>{selectedInactiveCount} inactive</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.bulkActionButtons}>
              <Pressable
                style={[styles.bulkButton, styles.bulkActivateButton]}
                onPress={handleBulkActivate}
                disabled={bulkToggleStatusMutation.isPending}
              >
                {bulkToggleStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <UserCheck size={16} color="#FFFFFF" />
                    <Text style={styles.bulkButtonText}>Activate</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.bulkButton, styles.bulkDeactivateButton]}
                onPress={handleBulkDeactivate}
                disabled={bulkToggleStatusMutation.isPending}
              >
                {bulkToggleStatusMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <UserX size={16} color="#FFFFFF" />
                    <Text style={styles.bulkButtonText}>Deactivate</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeModal}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable onPress={closeModal} style={styles.modalCloseButton}>
                <X size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {modalMode === 'create' ? 'Add New User' : 'Edit User'}
              </Text>
              <Pressable
                onPress={handleSave}
                style={styles.modalSaveButton}
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
              >
                {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Check size={24} color={colors.primary} />
                )}
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>BASIC INFORMATION</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>First Name *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="John"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Doe"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Email *</Text>
                    <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                      <Mail size={18} color={colors.textTertiary} />
                      <TextInput
                        style={[styles.inputIconText, { color: colors.text }]}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="john.doe@company.com"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Position</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={position}
                      onChangeText={setPosition}
                      placeholder="e.g., Maintenance Technician"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>CREDENTIALS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Employee Code *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={employeeCode}
                        onChangeText={setEmployeeCode}
                        placeholder="EMP0001"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="characters"
                      />
                    </View>
                    {modalMode === 'create' && (
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>PIN *</Text>
                        <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                          <Key size={18} color={colors.textTertiary} />
                          <TextInput
                            style={[styles.inputIconText, { color: colors.text }]}
                            value={pin}
                            onChangeText={setPin}
                            placeholder="4+ digits"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="number-pad"
                            secureTextEntry
                          />
                        </View>
                      </View>
                    )}
                  </View>
                  {modalMode === 'edit' && (
                    <Text style={[styles.pinNote, { color: colors.textTertiary }]}>
                      Use the Reset PIN option from the action menu to change the PIN
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>ORGANIZATION</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Department</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={department}
                      onChangeText={setDepartment}
                      placeholder="e.g., Maintenance"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Role</Text>
                    {modalMode === 'edit' ? (
                      <>
                        <View style={styles.roleGrid}>
                          {permissionRoles.map((permRole) => (
                            <Pressable
                              key={permRole.id}
                              style={[
                                styles.roleOption,
                                { borderColor: selectedPermissionRoleId === permRole.id ? permRole.color : colors.border },
                                selectedPermissionRoleId === permRole.id && { backgroundColor: permRole.color + '15' },
                              ]}
                              onPress={() => setSelectedPermissionRoleId(permRole.id)}
                            >
                              {selectedPermissionRoleId === permRole.id && <Check size={14} color={permRole.color} />}
                              <Text
                                style={[
                                  styles.roleOptionText,
                                  { color: selectedPermissionRoleId === permRole.id ? permRole.color : colors.textSecondary },
                                ]}
                              >
                                {permRole.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Text style={[styles.roleHint, { color: colors.textTertiary }]}>
                          Select a role to assign permissions to this user.
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.roleGrid}>
                          {BASIC_ROLE_OPTIONS.map((option) => (
                            <Pressable
                              key={option.value}
                              style={[
                                styles.roleOption,
                                { borderColor: role === option.value ? colors.primary : colors.border },
                                role === option.value && { backgroundColor: colors.primary + '15' },
                              ]}
                              onPress={() => setRole(option.value)}
                            >
                              {role === option.value && <Check size={14} color={colors.primary} />}
                              <Text
                                style={[
                                  styles.roleOptionText,
                                  { color: role === option.value ? colors.primary : colors.textSecondary },
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Text style={[styles.roleHint, { color: colors.textTertiary }]}>
                          For detailed permissions, use Assign Role & Permissions from the action menu after creating the user.
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Status</Text>
                    <View style={styles.statusGrid}>
                      {STATUS_OPTIONS.filter(o => o.value !== 'all').map((option) => (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.statusOption,
                            { borderColor: status === option.value ? option.color : colors.border },
                            status === option.value && { backgroundColor: option.color + '15' },
                          ]}
                          onPress={() => setStatus(option.value as 'active' | 'inactive' | 'on_leave')}
                        >
                          <View style={[styles.statusOptionDot, { backgroundColor: option.color }]} />
                          <Text
                            style={[
                              styles.statusOptionText,
                              { color: status === option.value ? option.color : colors.textSecondary },
                            ]}
                          >
                            {option.label}
                          </Text>
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

        <DeactivationModal
          visible={deactivationModalVisible}
          users={usersToDeactivate}
          onConfirm={handleConfirmDeactivation}
          onCancel={() => {
            setDeactivationModalVisible(false);
            setUsersToDeactivate([]);
          }}
          isLoading={toggleStatusMutation.isPending || bulkToggleStatusMutation.isPending}
          colors={colors}
        />

        <PasswordResetModal
          visible={passwordResetModalVisible}
          user={userToResetPassword}
          onConfirm={handleConfirmPasswordReset}
          onCancel={closePasswordResetModal}
          isLoading={resetPinMutation.isPending}
          newPin={generatedPin}
          showSuccess={showResetSuccess}
          onCopyPin={handleCopyPin}
          pinCopied={pinCopied}
          colors={colors}
        />

        <RoleAssignmentModal
          visible={roleAssignModalVisible}
          user={userForRoleAssign}
          onClose={() => {
            setRoleAssignModalVisible(false);
            setUserForRoleAssign(null);
          }}
          onAssign={handleAssignRole}
          colors={colors}
          roles={permissionRoles}
          currentRoleId={userForRoleAssign ? getCurrentUserRoleId(userForRoleAssign.id) : null}
        />

        {showActionMenu && (
          <Pressable
            style={styles.actionMenuOverlay}
            onPress={() => setShowActionMenu(null)}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchDivider: {
    width: 1,
    height: 24,
  },
  filterButton: {
    padding: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  filtersContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  clearFilters: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 8,
    marginTop: 8,
  },
  filterChipsRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  selectionCount: {
    fontSize: 13,
  },
  partialCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  resultCount: {
    fontSize: 13,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 10,
  },
  userAvatar: {
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
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  moreButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  actionMenuDivider: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  actionMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bulkActionInfo: {
    flex: 1,
  },
  bulkActionCount: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  bulkActionStats: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bulkStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulkStatText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bulkActivateButton: {
    backgroundColor: '#10B981',
  },
  bulkDeactivateButton: {
    backgroundColor: '#EF4444',
  },
  bulkButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confirmModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  confirmModalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  userListPreview: {
    width: '100%',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  userListName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  userListMore: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmModalCancel: {
    borderWidth: 1,
  },
  confirmModalDeactivate: {
    backgroundColor: '#EF4444',
  },
  confirmModalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  confirmModalDeactivateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resetButton: {
    backgroundColor: '#F59E0B',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  userPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  userPreviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPreviewInitials: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  userPreviewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userPreviewName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  userPreviewEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
    gap: 12,
  },
  emailToggleText: {
    flex: 1,
  },
  emailToggleLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  emailToggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  pinDisplayContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  pinValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 4,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copiedText: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  doneButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
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
  modalSaveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  inputIconText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  pinNote: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: -8,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  roleHint: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 8,
    lineHeight: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});

const permPreviewStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  roleColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  roleDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  systemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  systemBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
  },
  moduleList: {
    flex: 1,
    marginTop: 12,
  },
  noPermsContainer: {
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  noPermsText: {
    fontSize: 14,
  },
  moduleCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  actionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  actionCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionChipText: {
    fontSize: 11,
  },
});

const roleAssignStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  roleList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  roleCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  roleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  roleColor: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  roleInfo: {
    flex: 1,
  },
  roleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  systemTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  roleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  roleStats: {
    marginTop: 4,
  },
  roleStatText: {
    fontSize: 11,
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  assignBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
