import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import {
  useRoles,
  useEmployeeRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useDuplicateRole,
  useAssignRoleToEmployee,
  useRemoveRoleFromEmployee,
  type SupabaseRole,
  type ModulePermission,
  type PermissionModule,
  type PermissionAction,
} from '@/hooks/useSupabasePermissions';
import { useUser } from '@/contexts/UserContext';
import { isSuperAdminRole } from '@/constants/roles';

export interface ModulePermissionDef {
  module: PermissionModule;
  name: string;
  description: string;
  actions: {
    action: PermissionAction;
    label: string;
    description: string;
  }[];
}

export const MODULE_PERMISSION_DEFINITIONS: ModulePermissionDef[] = [
  {
    module: 'inventory',
    name: 'Inventory',
    description: 'Manage parts, materials, and stock levels',
    actions: [
      { action: 'view', label: 'View Inventory', description: 'View parts and materials list' },
      { action: 'create', label: 'Add Parts', description: 'Create new parts and materials' },
      { action: 'edit', label: 'Edit Parts', description: 'Modify part details and information' },
      { action: 'delete', label: 'Delete Parts', description: 'Remove parts from inventory' },
      { action: 'adjust_quantity', label: 'Adjust Quantities', description: 'Modify stock levels and perform counts' },
      { action: 'export', label: 'Export Data', description: 'Export inventory reports and data' },
      { action: 'import', label: 'Import Data', description: 'Bulk import parts and materials' },
      { action: 'manage_settings', label: 'Manage Labels/Categories', description: 'Create and manage labels and categories' },
    ],
  },
  {
    module: 'work_orders',
    name: 'Work Orders',
    description: 'Service requests and maintenance work',
    actions: [
      { action: 'view', label: 'View Work Orders', description: 'View work order list and details' },
      { action: 'create', label: 'Create Work Orders', description: 'Create new work orders' },
      { action: 'edit', label: 'Edit Work Orders', description: 'Modify work order details' },
      { action: 'delete', label: 'Delete Work Orders', description: 'Remove work orders' },
      { action: 'assign', label: 'Assign Technicians', description: 'Assign work orders to employees' },
      { action: 'adjust_time', label: 'Adjust Time Entries', description: 'Modify time spent on work orders' },
      { action: 'export', label: 'Export Work Orders', description: 'Export work order reports' },
    ],
  },
  {
    module: 'preventive_maintenance',
    name: 'Preventive Maintenance',
    description: 'Scheduled maintenance and PM tasks',
    actions: [
      { action: 'view', label: 'View PMs', description: 'View PM schedules and tasks' },
      { action: 'create', label: 'Create PMs', description: 'Create new PM schedules' },
      { action: 'edit', label: 'Edit PMs', description: 'Modify PM schedules and details' },
      { action: 'delete', label: 'Delete PMs', description: 'Remove PM schedules' },
      { action: 'assign', label: 'Assign PMs', description: 'Assign PM tasks to employees' },
      { action: 'export', label: 'Export PMs', description: 'Export PM reports' },
    ],
  },
  {
    module: 'procurement',
    name: 'Procurement',
    description: 'Purchase orders, vendor management, budgets, and GL accounts',
    actions: [
      { action: 'view', label: 'View Purchase Orders', description: 'View PO list and details' },
      { action: 'create', label: 'Create Purchase Orders', description: 'Create new purchase orders' },
      { action: 'edit', label: 'Edit Purchase Orders', description: 'Modify purchase order details' },
      { action: 'delete', label: 'Delete Purchase Orders', description: 'Remove purchase orders' },
      { action: 'approve', label: 'Approve Purchase Orders', description: 'Approve POs for processing' },
      { action: 'reject', label: 'Reject Purchase Orders', description: 'Reject POs' },
      { action: 'export', label: 'Export PO Data', description: 'Export procurement reports' },
      { action: 'manage_settings', label: 'Manage Budgets & GL Accounts', description: 'Create and edit department budgets and chart of accounts' },
    ],
  },
  {
    module: 'approvals',
    name: 'Approvals',
    description: 'Approval workflows and requests',
    actions: [
      { action: 'view', label: 'View Approvals', description: 'View approval requests' },
      { action: 'create', label: 'Submit Requests', description: 'Submit items for approval' },
      { action: 'approve', label: 'Approve Requests', description: 'Approve pending requests' },
      { action: 'reject', label: 'Reject Requests', description: 'Reject pending requests' },
      { action: 'export', label: 'Export Approvals', description: 'Export approval reports' },
    ],
  },
  {
    module: 'employees',
    name: 'Labor Tracking',
    description: 'Employee labor tracking and room assignments',
    actions: [
      { action: 'view', label: 'View Labor', description: 'View labor tracking and room assignments' },
      { action: 'create', label: 'Add Entries', description: 'Create labor tracking entries' },
      { action: 'edit', label: 'Edit Entries', description: 'Modify labor tracking entries' },
      { action: 'delete', label: 'Delete Entries', description: 'Remove labor tracking entries' },
      { action: 'assign', label: 'Assign Rooms', description: 'Assign employees to rooms' },
      { action: 'export', label: 'Export Labor Data', description: 'Export labor reports' },
    ],
  },
  {
    module: 'users',
    name: 'Users',
    description: 'People management, roles, and permissions',
    actions: [
      { action: 'view', label: 'View Users', description: 'View employee list and profiles' },
      { action: 'create', label: 'Add Users', description: 'Create new employee accounts' },
      { action: 'edit', label: 'Edit Users', description: 'Modify employee information' },
      { action: 'delete', label: 'Remove Users', description: 'Deactivate or remove employees' },
      { action: 'assign', label: 'Assign Roles', description: 'Assign roles to employees' },
      { action: 'manage_settings', label: 'Manage Roles & Permissions', description: 'Create and manage roles and permissions' },
      { action: 'export', label: 'Export User Data', description: 'Export employee reports' },
    ],
  },
  {
    module: 'reports',
    name: 'Reports',
    description: 'System reports and analytics',
    actions: [
      { action: 'view', label: 'View Reports', description: 'Access system reports' },
      { action: 'create', label: 'Create Custom Reports', description: 'Build custom report templates' },
      { action: 'export', label: 'Export Reports', description: 'Export and download reports' },
    ],
  },
  {
    module: 'settings',
    name: 'System Settings',
    description: 'System configuration and administration',
    actions: [
      { action: 'view', label: 'View Settings', description: 'View system configuration' },
      { action: 'edit', label: 'Modify Settings', description: 'Change system settings' },
      { action: 'manage_settings', label: 'Manage System Config', description: 'Configure appearance and organization settings' },
    ],
  },
  {
    module: 'vendors',
    name: 'Vendor Management',
    description: 'Manage vendors and supplier relationships',
    actions: [
      { action: 'view', label: 'View Vendors', description: 'View vendor list and details' },
      { action: 'create', label: 'Add Vendors', description: 'Create new vendor records' },
      { action: 'edit', label: 'Edit Vendors', description: 'Modify vendor information' },
      { action: 'delete', label: 'Remove Vendors', description: 'Deactivate or remove vendors' },
      { action: 'approve', label: 'Approve Vendors', description: 'Approve new vendors' },
      { action: 'manage_vendors', label: 'Manage Price Agreements', description: 'Create and manage pricing' },
      { action: 'export', label: 'Export Vendor Data', description: 'Export vendor reports' },
    ],
  },
  {
    module: 'inspections',
    name: 'Inspections',
    description: 'Quality inspections and tracking',
    actions: [
      { action: 'view', label: 'View Inspections', description: 'View inspection records' },
      { action: 'create', label: 'Perform Inspections', description: 'Create inspection records' },
      { action: 'edit', label: 'Edit Inspections', description: 'Modify inspection details' },
      { action: 'delete', label: 'Delete Inspections', description: 'Remove inspection records' },
      { action: 'manage_settings', label: 'Manage Templates', description: 'Create inspection templates' },
      { action: 'export', label: 'Export Inspection Data', description: 'Export inspection reports' },
    ],
  },
  {
    module: 'compliance',
    name: 'Compliance',
    description: 'HACCP, SDS, OPLs, policies, and procedures',
    actions: [
      { action: 'view', label: 'View Documents', description: 'View compliance documents' },
      { action: 'create', label: 'Create Documents', description: 'Create new documents' },
      { action: 'edit', label: 'Edit Documents', description: 'Modify documents' },
      { action: 'delete', label: 'Archive Documents', description: 'Archive or delete documents' },
      { action: 'approve', label: 'Approve Documents', description: 'Approve for publication' },
      { action: 'export', label: 'Export Documents', description: 'Export compliance reports' },
    ],
  },
  {
    module: 'documents',
    name: 'Documents',
    description: 'General document storage and management',
    actions: [
      { action: 'view', label: 'View Documents', description: 'View document library' },
      { action: 'create', label: 'Upload Documents', description: 'Upload new documents' },
      { action: 'edit', label: 'Edit Documents', description: 'Modify document details' },
      { action: 'delete', label: 'Delete Documents', description: 'Remove documents' },
      { action: 'approve', label: 'Approve Documents', description: 'Approve documents for publication' },
      { action: 'export', label: 'Export Documents', description: 'Export and download documents' },
    ],
  },
  {
    module: 'task_feed',
    name: 'Task Feed',
    description: 'Task verification and activity feed',
    actions: [
      { action: 'view', label: 'View Task Feed', description: 'View task verifications' },
      { action: 'create', label: 'Post Tasks', description: 'Create task verifications' },
      { action: 'edit', label: 'Edit Tasks', description: 'Modify task entries' },
      { action: 'delete', label: 'Delete Tasks', description: 'Remove task entries' },
      { action: 'review', label: 'Review Tasks', description: 'Review and flag tasks' },
      { action: 'verify', label: 'Verify Tasks', description: 'Mark tasks as verified' },
      { action: 'export', label: 'Export Task Data', description: 'Export task reports' },
    ],
  },
  {
    module: 'recycling',
    name: 'Recycling',
    description: 'Environmental recycling tracking',
    actions: [
      { action: 'view', label: 'View Recycling', description: 'View recycling records' },
      { action: 'create', label: 'Add Records', description: 'Create recycling entries' },
      { action: 'edit', label: 'Edit Records', description: 'Modify recycling records' },
      { action: 'delete', label: 'Delete Records', description: 'Remove recycling records' },
      { action: 'export', label: 'Export Recycling Data', description: 'Export recycling reports' },
    ],
  },
  {
    module: 'sanitation',
    name: 'Sanitation',
    description: 'Sanitation schedules, EMP, and SSOP management',
    actions: [
      { action: 'view', label: 'View Sanitation', description: 'View sanitation records and schedules' },
      { action: 'create', label: 'Create Records', description: 'Create sanitation entries' },
      { action: 'edit', label: 'Edit Records', description: 'Modify sanitation records' },
      { action: 'delete', label: 'Delete Records', description: 'Remove sanitation records' },
      { action: 'approve', label: 'Approve Records', description: 'Approve sanitation completions' },
      { action: 'manage_settings', label: 'Manage SSOPs', description: 'Create and manage SSOP library' },
      { action: 'export', label: 'Export Data', description: 'Export sanitation reports' },
    ],
  },
  {
    module: 'production',
    name: 'Production',
    description: 'Production operations, inventory, and work orders',
    actions: [
      { action: 'view', label: 'View Production', description: 'View production records and schedules' },
      { action: 'create', label: 'Create Records', description: 'Create production entries and work orders' },
      { action: 'edit', label: 'Edit Records', description: 'Modify production records' },
      { action: 'delete', label: 'Delete Records', description: 'Remove production records' },
      { action: 'approve', label: 'Approve Records', description: 'Approve production records' },
      { action: 'manage_settings', label: 'Manage Production Settings', description: 'Configure production lines and settings' },
      { action: 'export', label: 'Export Data', description: 'Export production reports' },
    ],
  },
  {
    module: 'portal',
    name: 'Employee Portal',
    description: 'Employee self-service portal',
    actions: [
      { action: 'view', label: 'Access Portal', description: 'Access employee portal' },
      { action: 'create', label: 'Submit Requests', description: 'Submit work requests' },
      { action: 'edit', label: 'Update Profile', description: 'Update personal information' },
      { action: 'manage_settings', label: 'Manage Bulletin', description: 'Manage bulletin board' },
    ],
  },
  {
    module: 'lms',
    name: 'Learning Management',
    description: 'Training courses and certifications',
    actions: [
      { action: 'view', label: 'View Courses', description: 'View course catalog and enrollments' },
      { action: 'create', label: 'Create Courses', description: 'Create new courses and content' },
      { action: 'edit', label: 'Edit Courses', description: 'Modify course content and settings' },
      { action: 'delete', label: 'Delete Courses', description: 'Remove courses from catalog' },
      { action: 'assign', label: 'Assign Training', description: 'Assign courses to employees' },
      { action: 'approve', label: 'Approve Certifications', description: 'Approve certification completions' },
      { action: 'manage_settings', label: 'Manage Learning Paths', description: 'Create and manage learning paths' },
      { action: 'export', label: 'Export Training Data', description: 'Export training reports' },
    ],
  },
  {
    module: 'quality',
    name: 'Quality Management',
    description: 'Quality control and assurance',
    actions: [
      { action: 'view', label: 'View Quality', description: 'View quality records' },
      { action: 'create', label: 'Create Records', description: 'Create quality records' },
      { action: 'edit', label: 'Edit Records', description: 'Modify quality records' },
      { action: 'delete', label: 'Delete Records', description: 'Remove quality records' },
      { action: 'approve', label: 'Approve Records', description: 'Approve quality records' },
      { action: 'export', label: 'Export Data', description: 'Export quality reports' },
    ],
  },
  {
    module: 'safety',
    name: 'Safety Management',
    description: 'Safety incidents and compliance',
    actions: [
      { action: 'view', label: 'View Safety', description: 'View safety records' },
      { action: 'create', label: 'Create Records', description: 'Create safety records' },
      { action: 'edit', label: 'Edit Records', description: 'Modify safety records' },
      { action: 'delete', label: 'Delete Records', description: 'Remove safety records' },
      { action: 'approve', label: 'Approve Records', description: 'Approve safety records' },
      { action: 'export', label: 'Export Data', description: 'Export safety reports' },
    ],
  },
];

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  permissions: ModulePermission[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

const mapSupabaseRoleToRole = (supabaseRole: SupabaseRole): Role => ({
  id: supabaseRole.id,
  name: supabaseRole.name,
  description: supabaseRole.description || '',
  color: supabaseRole.color,
  isSystem: supabaseRole.is_system,
  permissions: supabaseRole.permissions || [],
  created_at: supabaseRole.created_at,
  updated_at: supabaseRole.updated_at,
  created_by: supabaseRole.created_by || 'System',
});

export const [PermissionsProvider, usePermissions] = createContextHook(() => {
  const { userProfile, isEmployee, isPlatformAdmin } = useUser();

  const { data: supabaseRoles = [], isLoading: rolesLoading, error: rolesError } = useRoles();
  const { data: employeeRoleAssignmentsData = [], isLoading: assignmentsLoading } = useEmployeeRoles();

  console.log('[PermissionsContext] supabaseRoles:', supabaseRoles.length, 'rolesLoading:', rolesLoading, 'rolesError:', rolesError);

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();
  const duplicateRoleMutation = useDuplicateRole();
  const assignRoleMutation = useAssignRoleToEmployee();
  const removeRoleMutation = useRemoveRoleFromEmployee();

  const isLoading = rolesLoading || assignmentsLoading;

  const roles = useMemo(() => {
    return supabaseRoles.map(mapSupabaseRoleToRole);
  }, [supabaseRoles]);

  const employeeRoleAssignments = useMemo(() => {
    const assignments: Record<string, string> = {};
    employeeRoleAssignmentsData.forEach((assignment) => {
      assignments[assignment.employee_id] = assignment.role_id;
    });
    return assignments;
  }, [employeeRoleAssignmentsData]);

  const addRole = useCallback((role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => {
    createRoleMutation.mutate({
      name: role.name,
      description: role.description,
      color: role.color,
      is_system: role.isSystem,
      permissions: role.permissions,
      created_by: role.created_by,
    });
    console.log('Role creation initiated:', role.name);
    return null;
  }, [createRoleMutation]);

  const updateRole = useCallback((id: string, updates: Partial<Omit<Role, 'id' | 'created_at'>>, forceUpdate = false) => {
    const role = roles.find(r => r.id === id);
    if (!role) {
      console.error('Role not found:', id);
      return;
    }
    if (role.isSystem && updates.permissions && !forceUpdate) {
      console.warn('Cannot modify system role permissions without forceUpdate flag');
      return;
    }

    updateRoleMutation.mutate({
      id,
      updates: {
        name: updates.name,
        description: updates.description,
        color: updates.color,
        permissions: updates.permissions,
      },
    });
    console.log('Role update initiated:', id);
  }, [roles, updateRoleMutation]);

  const deleteRole = useCallback((id: string) => {
    const role = roles.find(r => r.id === id);
    if (!role) {
      console.error('Role not found:', id);
      return false;
    }
    if (role.isSystem) {
      console.warn('Cannot delete system role');
      return false;
    }

    deleteRoleMutation.mutate(id);
    console.log('Role deletion initiated:', id);
    return true;
  }, [roles, deleteRoleMutation]);

  const duplicateRole = useCallback((id: string, newName: string) => {
    const role = roles.find(r => r.id === id);
    if (!role) {
      console.error('Role not found:', id);
      return null;
    }

    duplicateRoleMutation.mutate({
      roleId: id,
      newName,
      createdBy: userProfile?.id,
    });
    console.log('Role duplication initiated:', newName);
    return null;
  }, [roles, duplicateRoleMutation, userProfile]);

  const setRolePermission = useCallback((
    roleId: string,
    module: PermissionModule,
    action: PermissionAction,
    enabled: boolean,
    canEditSystem = false
  ) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    if (role.isSystem && !canEditSystem) return;

    let updatedPermissions = [...role.permissions];
    const moduleIndex = updatedPermissions.findIndex(p => p.module === module);

    if (moduleIndex === -1) {
      if (enabled) {
        updatedPermissions.push({ module, actions: [action] });
      }
    } else {
      const modulePerms = { ...updatedPermissions[moduleIndex] };
      if (enabled) {
        if (!modulePerms.actions.includes(action)) {
          modulePerms.actions = [...modulePerms.actions, action];
        }
      } else {
        modulePerms.actions = modulePerms.actions.filter(a => a !== action);
      }

      if (modulePerms.actions.length === 0) {
        updatedPermissions = updatedPermissions.filter(p => p.module !== module);
      } else {
        updatedPermissions[moduleIndex] = modulePerms;
      }
    }

    updateRole(roleId, { permissions: updatedPermissions }, canEditSystem);
  }, [roles, updateRole]);

  const setModulePermissions = useCallback((
    roleId: string,
    module: PermissionModule,
    actions: PermissionAction[],
    canEditSystem = false
  ) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    if (role.isSystem && !canEditSystem) return;

    let updatedPermissions = role.permissions.filter(p => p.module !== module);
    if (actions.length > 0) {
      updatedPermissions.push({ module, actions });
    }

    updateRole(roleId, { permissions: updatedPermissions }, canEditSystem);
  }, [roles, updateRole]);

  const assignRoleToEmployee = useCallback((employeeId: string, roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) {
      console.error('Role not found:', roleId);
      return;
    }

    assignRoleMutation.mutate({
      employeeId,
      roleId,
      assignedBy: userProfile?.id,
    });
    console.log('Role assignment initiated:', employeeId, roleId);
  }, [roles, assignRoleMutation, userProfile]);

  const removeRoleFromEmployee = useCallback((employeeId: string) => {
    removeRoleMutation.mutate(employeeId);
    console.log('Role removal initiated:', employeeId);
  }, [removeRoleMutation]);

  const getEmployeeRole = useCallback((employeeId: string): Role | null => {
    const roleId = employeeRoleAssignments[employeeId];
    if (!roleId) return null;
    return roles.find(r => r.id === roleId) || null;
  }, [roles, employeeRoleAssignments]);

  const hasPermission = useCallback((module: PermissionModule, action: PermissionAction): boolean => {
    if (!userProfile) return false;

    if (isPlatformAdmin) return true;

    const roleId = employeeRoleAssignments[userProfile.id];
    if (!roleId) {
      if (!isEmployee && isSuperAdminRole(userProfile.role)) return true;
      return false;
    }

    const role = roles.find(r => r.id === roleId);
    if (!role) {
      if (!isEmployee && isSuperAdminRole(userProfile.role)) return true;
      return false;
    }

    if (role.name === 'Super Admin' || role.name === 'Administrator') return true;

    const modulePerms = role.permissions.find(p => p.module === module);
    return modulePerms?.actions.includes(action) || false;
  }, [userProfile, isPlatformAdmin, isEmployee, roles, employeeRoleAssignments]);

  const hasAnyPermission = useCallback((module: PermissionModule): boolean => {
    if (!userProfile) return false;

    if (isPlatformAdmin) return true;

    const roleId = employeeRoleAssignments[userProfile.id];
    if (!roleId) {
      if (!isEmployee && isSuperAdminRole(userProfile.role)) return true;
      console.log('[hasAnyPermission] No role assignment for user:', userProfile.id, 'module:', module);
      return false;
    }

    const role = roles.find(r => r.id === roleId);
    if (!role) {
      if (!isEmployee && isSuperAdminRole(userProfile.role)) return true;
      console.log('[hasAnyPermission] Role not found:', roleId, 'for user:', userProfile.id);
      return false;
    }

    if (role.name === 'Super Admin' || role.name === 'Administrator') return true;

    const hasAccess = role.permissions.some(p => p.module === module && p.actions.length > 0);
    console.log('[hasAnyPermission] User:', userProfile.id, 'Role:', role.name, 'Module:', module, 'Access:', hasAccess);
    return hasAccess;
  }, [userProfile, isPlatformAdmin, isEmployee, roles, employeeRoleAssignments]);

  const getRolePermissions = useCallback((roleId: string): ModulePermission[] => {
    const role = roles.find(r => r.id === roleId);
    return role?.permissions || [];
  }, [roles]);

  const roleHasPermission = useCallback((
    roleId: string,
    module: PermissionModule,
    action: PermissionAction
  ): boolean => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return false;
    const modulePerms = role.permissions.find(p => p.module === module);
    return modulePerms?.actions.includes(action) || false;
  }, [roles]);

  const currentUserRole = useMemo((): Role | null => {
    if (!userProfile) return null;
    return getEmployeeRole(userProfile.id);
  }, [userProfile, getEmployeeRole]);

  const isSuperAdmin = useMemo(() => {
    if (!userProfile) return false;
    if (isPlatformAdmin) return true;
    const role = currentUserRole;
    if (role) {
      if (role.name === 'Super Admin' || role.name === 'Administrator') return true;
      if (role.isSystem && role.name?.toLowerCase().includes('super')) return true;
    }
    if (!isEmployee && isSuperAdminRole(userProfile.role)) return true;
    return false;
  }, [userProfile, isPlatformAdmin, isEmployee, currentUserRole]);

  const stats = useMemo(() => ({
    totalRoles: roles.length,
    customRoles: roles.filter(r => !r.isSystem).length,
    systemRoles: roles.filter(r => r.isSystem).length,
    assignedEmployees: Object.keys(employeeRoleAssignments).length,
  }), [roles, employeeRoleAssignments]);

  return {
    roles,
    employeeRoleAssignments,
    isLoading,
    stats,
    moduleDefinitions: MODULE_PERMISSION_DEFINITIONS,
    currentUserRole,
    isSuperAdmin,
    addRole,
    updateRole,
    deleteRole,
    duplicateRole,
    setRolePermission,
    setModulePermissions,
    getRolePermissions,
    roleHasPermission,
    assignRoleToEmployee,
    removeRoleFromEmployee,
    getEmployeeRole,
    hasPermission,
    hasAnyPermission,
  };
});

export type { PermissionModule, PermissionAction, ModulePermission };
