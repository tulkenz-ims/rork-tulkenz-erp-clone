import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Plus,
  X,
  Shield,
  Users,
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  Check,
  Lock,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  usePermissions,
  MODULE_PERMISSION_DEFINITIONS,
  type Role,
} from '@/contexts/PermissionsContext';
import type { PermissionModule, PermissionAction } from '@/hooks/useSupabasePermissions';
import { ROLE_COLORS } from '@/constants/permissionsConstants';

type ModalMode = 'create' | 'edit' | 'view' | 'duplicate' | null;

export default function RolesScreen() {
  const { colors } = useTheme();
  const { organizationId, organization } = useOrganization();
  const {
    roles,
    stats,
    isLoading,
    addRole,
    updateRole,
    deleteRole,
    duplicateRole,
    roleHasPermission,
    setRolePermission,
    setModulePermissions,
    isSuperAdmin,
  } = usePermissions();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedModules, setExpandedModules] = useState<PermissionModule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState(ROLE_COLORS[0]);
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setRoleName('');
    setRoleDescription('');
    setRoleColor(ROLE_COLORS[0]);
    setExpandedModules([]);
    setDuplicateSourceId(null);
  }, []);

  const openCreateModal = useCallback(() => {
    console.log('[RolesScreen] Opening create modal');
    resetForm();
    setSelectedRole(null);
    setModalMode('create');
    setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((role: Role) => {
    console.log('[RolesScreen] Opening edit modal for role:', role.name, 'isSuperAdmin:', isSuperAdmin);
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRoleColor(role.color);
    setModalMode(role.isSystem && !isSuperAdmin ? 'view' : 'edit');
    setModalVisible(true);
  }, [isSuperAdmin]);

  const openDuplicateModal = useCallback((role: Role) => {
    console.log('[RolesScreen] Opening duplicate modal for role:', role.name);
    setDuplicateSourceId(role.id);
    setRoleName(`${role.name} (Copy)`);
    setRoleDescription(role.description);
    setRoleColor(role.color);
    setSelectedRole(null);
    setModalMode('duplicate');
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalMode(null);
    setSelectedRole(null);
    resetForm();
    setIsSaving(false);
  }, [resetForm]);

  const handleSaveRole = useCallback(async () => {
    if (!roleName.trim()) {
      Alert.alert('Error', 'Please enter a role name');
      return;
    }

    setIsSaving(true);
    console.log('[RolesScreen] Saving role, mode:', modalMode);

    try {
      if (modalMode === 'create') {
        addRole({
          name: roleName.trim(),
          description: roleDescription.trim(),
          color: roleColor,
          isSystem: false,
          permissions: [],
          created_by: 'Admin',
        });
        Alert.alert('Success', 'Role created successfully. You can now edit permissions by tapping on the role.');
      } else if (modalMode === 'duplicate' && duplicateSourceId) {
        duplicateRole(duplicateSourceId, roleName.trim());
        Alert.alert('Success', 'Role duplicated successfully');
      } else if (modalMode === 'edit' && selectedRole) {
        updateRole(selectedRole.id, {
          name: roleName.trim(),
          description: roleDescription.trim(),
          color: roleColor,
        });
        Alert.alert('Success', 'Role updated successfully');
      }
      closeModal();
    } catch (error: any) {
      console.error('[RolesScreen] Error saving role:', error);
      Alert.alert('Error', error?.message || 'Failed to save role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [modalMode, roleName, roleDescription, roleColor, selectedRole, duplicateSourceId, addRole, updateRole, duplicateRole, closeModal]);

  const handleDeleteRole = useCallback((role: Role) => {
    if (role.isSystem) {
      Alert.alert('Cannot Delete', 'System roles cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${role.name}"? This action cannot be undone and will remove the role from all assigned employees.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('[RolesScreen] Deleting role:', role.id);
            deleteRole(role.id);
          },
        },
      ]
    );
  }, [deleteRole]);

  const toggleModule = useCallback((module: PermissionModule) => {
    setExpandedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  }, []);

  const handlePermissionToggle = useCallback((
    roleId: string,
    module: PermissionModule,
    action: PermissionAction,
    currentValue: boolean
  ) => {
    const role = roles.find(r => r.id === roleId);
    const canEditSystem = isSuperAdmin && role?.isSystem;
    console.log('[RolesScreen] Toggling permission:', module, action, !currentValue, 'canEditSystem:', canEditSystem);
    setRolePermission(roleId, module, action, !currentValue, canEditSystem);
  }, [setRolePermission, roles, isSuperAdmin]);

  const handleEnableAllForModule = useCallback((
    roleId: string,
    moduleDef: typeof MODULE_PERMISSION_DEFINITIONS[0],
    enable: boolean
  ) => {
    const role = roles.find(r => r.id === roleId);
    const canEditSystem = isSuperAdmin && role?.isSystem;
    if (role?.isSystem && !canEditSystem) return;
    
    const allActions = moduleDef.actions.map(a => a.action);
    console.log('[RolesScreen] Enable all for module:', moduleDef.module, enable ? 'ON' : 'OFF');
    setModulePermissions(roleId, moduleDef.module, enable ? allActions : [], canEditSystem);
  }, [roles, isSuperAdmin, setModulePermissions]);

  const getPermissionCount = useCallback((role: Role) => {
    return role.permissions.reduce((count, p) => count + p.actions.length, 0);
  }, []);

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Roles & Permissions',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerBackVisible: true,
            headerBackTitle: 'Settings',
          }}
        />
        <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading roles...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Roles & Permissions',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Settings',
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
                <Shield size={20} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalRoles}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Roles</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: '#10B981' + '20' }]}>
                <Users size={20} color="#10B981" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.customRoles}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Custom</Text>
            </View>
          </View>

          {/* Info Notice */}
          <View style={[styles.infoNotice, { backgroundColor: colors.info + '12', borderColor: colors.info + '30' }]}>
            <AlertCircle size={18} color={colors.info} />
            <Text style={[styles.infoNoticeText, { color: colors.info }]}>
              Create roles to define what modules and actions employees can access. Assign roles to employees in the Employees module.
            </Text>
          </View>

          {/* Create Role Button */}
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={openCreateModal}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create New Role</Text>
          </Pressable>

          {/* Roles List */}
          <View style={styles.rolesSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ALL ROLES</Text>
            {sortedRoles.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Shield size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Roles Yet</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Create your first role to start managing permissions
                </Text>
              </View>
            ) : (
              sortedRoles.map((role) => (
                <Pressable
                  key={role.id}
                  style={[styles.roleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openEditModal(role)}
                >
                  <View style={[styles.roleColorBar, { backgroundColor: role.color }]} />
                  <View style={styles.roleContent}>
                    <View style={styles.roleHeader}>
                      <View style={styles.roleTitleRow}>
                        <Text style={[styles.roleName, { color: colors.text }]}>{role.name}</Text>
                        {role.isSystem && (
                          <View style={[styles.systemBadge, { backgroundColor: colors.warning + '20' }]}>
                            <Lock size={10} color={colors.warning} />
                            <Text style={[styles.systemBadgeText, { color: colors.warning }]}>System</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.roleDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                        {role.description || 'No description'}
                      </Text>
                    </View>
                    <View style={styles.roleFooter}>
                      <View style={[styles.permissionCount, { backgroundColor: colors.backgroundSecondary }]}>
                        <Text style={[styles.permissionCountText, { color: colors.textSecondary }]}>
                          {getPermissionCount(role)} permissions
                        </Text>
                      </View>
                      <View style={styles.roleActions}>
                        {!role.isSystem && (
                          <Pressable
                            style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role);
                            }}
                          >
                            <Trash2 size={16} color={colors.error} />
                          </Pressable>
                        )}
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            openDuplicateModal(role);
                          }}
                        >
                          <Copy size={16} color={colors.primary} />
                        </Pressable>
                        <ChevronRight size={18} color={colors.textTertiary} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>

        {/* Create/Edit/Duplicate Modal */}
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
                {modalMode === 'create' ? 'Create Role' : 
                 modalMode === 'duplicate' ? 'Duplicate Role' :
                 modalMode === 'view' ? 'View Role' : 'Edit Role'}
              </Text>
              {modalMode !== 'view' ? (
                <Pressable 
                  onPress={handleSaveRole} 
                  style={styles.modalSaveButton}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Check size={24} color={colors.primary} />
                  )}
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Basic Info */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>ROLE DETAILS</Text>
                <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Name *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={roleName}
                      onChangeText={setRoleName}
                      placeholder="Enter role name"
                      placeholderTextColor={colors.textTertiary}
                      editable={modalMode !== 'view'}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={roleDescription}
                      onChangeText={setRoleDescription}
                      placeholder="Describe this role's responsibilities"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={3}
                      editable={modalMode !== 'view'}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Color</Text>
                    <View style={styles.colorGrid}>
                      {ROLE_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            roleColor === color && styles.colorOptionSelected,
                          ]}
                          onPress={() => modalMode !== 'view' && setRoleColor(color)}
                        >
                          {roleColor === color && <Check size={16} color="#FFFFFF" />}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Permissions - Only show for edit/view mode with existing role */}
              {selectedRole && (modalMode === 'edit' || modalMode === 'view') && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>PERMISSIONS</Text>
                  {selectedRole.isSystem && !isSuperAdmin && (
                    <View style={[styles.systemNotice, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
                      <Lock size={16} color={colors.warning} />
                      <Text style={[styles.systemNoticeText, { color: colors.warning }]}>
                        System role permissions cannot be modified
                      </Text>
                    </View>
                  )}
                  {selectedRole.isSystem && isSuperAdmin && (
                    <View style={[styles.systemNotice, { backgroundColor: colors.info + '15', borderColor: colors.info + '30' }]}>
                      <Shield size={16} color={colors.info} />
                      <Text style={[styles.systemNoticeText, { color: colors.info }]}>
                        You have Super Admin access to modify system role permissions
                      </Text>
                    </View>
                  )}
                  {MODULE_PERMISSION_DEFINITIONS.map((moduleDef) => {
                    const isExpanded = expandedModules.includes(moduleDef.module);
                    const enabledCount = moduleDef.actions.filter(a =>
                      roleHasPermission(selectedRole.id, moduleDef.module, a.action)
                    ).length;
                    const allEnabled = enabledCount === moduleDef.actions.length;
                    const canEdit = !selectedRole.isSystem || isSuperAdmin;

                    return (
                      <View
                        key={moduleDef.module}
                        style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Pressable
                          style={styles.moduleHeader}
                          onPress={() => toggleModule(moduleDef.module)}
                        >
                          <View style={styles.moduleInfo}>
                            <Text style={[styles.moduleName, { color: colors.text }]}>{moduleDef.name}</Text>
                            <Text style={[styles.moduleCount, { color: colors.textSecondary }]}>
                              {enabledCount} of {moduleDef.actions.length} enabled
                            </Text>
                          </View>
                          <View style={styles.moduleHeaderRight}>
                            {canEdit && (
                              <Pressable
                                style={[styles.enableAllButton, { backgroundColor: allEnabled ? colors.success + '20' : colors.backgroundSecondary }]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleEnableAllForModule(selectedRole.id, moduleDef, !allEnabled);
                                }}
                              >
                                {allEnabled ? (
                                  <ToggleRight size={16} color={colors.success} />
                                ) : (
                                  <ToggleLeft size={16} color={colors.textSecondary} />
                                )}
                                <Text style={[styles.enableAllText, { color: allEnabled ? colors.success : colors.textSecondary }]}>
                                  {allEnabled ? 'All On' : 'Enable All'}
                                </Text>
                              </Pressable>
                            )}
                            {isExpanded ? (
                              <ChevronDown size={20} color={colors.textSecondary} />
                            ) : (
                              <ChevronRight size={20} color={colors.textSecondary} />
                            )}
                          </View>
                        </Pressable>

                        {isExpanded && (
                          <View style={[styles.permissionsList, { borderTopColor: colors.border }]}>
                            {moduleDef.actions.map((actionDef) => {
                              const hasPermission = roleHasPermission(selectedRole.id, moduleDef.module, actionDef.action);
                              return (
                                <View
                                  key={actionDef.action}
                                  style={[styles.permissionRow, { borderBottomColor: colors.border }]}
                                >
                                  <View style={styles.permissionInfo}>
                                    <Text style={[styles.permissionLabel, { color: colors.text }]}>
                                      {actionDef.label}
                                    </Text>
                                    <Text style={[styles.permissionDescription, { color: colors.textTertiary }]}>
                                      {actionDef.description}
                                    </Text>
                                  </View>
                                  <Switch
                                    value={hasPermission}
                                    onValueChange={() => {
                                      if (canEdit) {
                                        handlePermissionToggle(selectedRole.id, moduleDef.module, actionDef.action, hasPermission);
                                      }
                                    }}
                                    disabled={!canEdit}
                                    trackColor={{ false: colors.border, true: colors.primary + '60' }}
                                    thumbColor={hasPermission ? colors.primary : colors.textTertiary}
                                  />
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Info for new roles */}
              {(modalMode === 'create' || modalMode === 'duplicate') && (
                <View style={[styles.infoNotice, { backgroundColor: colors.info + '12', borderColor: colors.info + '30' }]}>
                  <AlertCircle size={18} color={colors.info} />
                  <Text style={[styles.infoNoticeText, { color: colors.info }]}>
                    {modalMode === 'create' 
                      ? 'After creating the role, tap on it to configure permissions.'
                      : 'The new role will have the same permissions as the original. You can modify them after creation.'}
                  </Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  rolesSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emptyState: {
    padding: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
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
  roleCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  roleColorBar: {
    width: 5,
  },
  roleContent: {
    flex: 1,
    padding: 14,
  },
  roleHeader: {
    marginBottom: 10,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  roleDescription: {
    fontSize: 13,
  },
  roleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  permissionCountText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  roleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  systemNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  systemNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  moduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  enableAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enableAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  moduleCount: {
    fontSize: 12,
  },
  permissionsList: {
    borderTopWidth: 1,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 12,
  },
});
