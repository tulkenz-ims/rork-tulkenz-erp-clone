import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type PermissionAction = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'adjust_quantity'
  | 'adjust_time'
  | 'manage_settings'
  | 'process_payment'
  | 'post_entries'
  | 'run_payroll'
  | 'file_taxes'
  | 'manage_vendors'
  | 'manage_customers'
  | 'review'
  | 'verify';

export type PermissionModule = 
  | 'inventory'
  | 'work_orders'
  | 'preventive_maintenance'
  | 'procurement'
  | 'approvals'
  | 'employees'
  | 'reports'
  | 'settings'
  | 'vendors'
  | 'hr'
  | 'finance'
  | 'finance_ap'
  | 'finance_ar'
  | 'finance_gl'
  | 'payroll'
  | 'budgeting'
  | 'taxes'
  | 'inspections'
  | 'compliance'
  | 'task_feed'
  | 'recycling'
  | 'portal'
  | 'lms'
  | 'quality'
  | 'safety';

export interface ModulePermission {
  module: PermissionModule;
  actions: PermissionAction[];
}

export interface SupabaseRole {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  permissions: ModulePermission[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEmployeeRole {
  id: string;
  organization_id: string;
  employee_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  color: string;
  is_system?: boolean;
  permissions: ModulePermission[];
  created_by?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  color?: string;
  permissions?: ModulePermission[];
}

const DEFAULT_ROLE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#6366F1', '#DC2626', '#059669',
];

export function useRoles() {
  const { organizationId } = useOrganization();

  console.log('[useRoles] Hook called, organizationId:', organizationId);

  return useQuery({
    queryKey: ['roles', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useRoles] No organization ID - returning empty array');
        return [];
      }

      console.log('[useRoles] Fetching roles for org:', organizationId);

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[useRoles] Error fetching roles:', JSON.stringify(error, null, 2));
        console.error('[useRoles] Error code:', error.code);
        console.error('[useRoles] Error message:', error.message);
        console.error('[useRoles] Error details:', error.details);
        throw new Error(error.message || 'Failed to fetch roles');
      }

      console.log('[useRoles] Raw data from Supabase:', JSON.stringify(data, null, 2));
      console.log(`[useRoles] Fetched ${data?.length || 0} roles for org ${organizationId}`);
      
      const rolesWithDefaults = (data || []).map((role, index) => ({
        ...role,
        color: role.color || DEFAULT_ROLE_COLORS[index % DEFAULT_ROLE_COLORS.length],
        permissions: role.permissions || [],
      })) as SupabaseRole[];
      
      return rolesWithDefaults;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRole(roleId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['role', roleId, organizationId],
    queryFn: async () => {
      if (!organizationId || !roleId) {
        return null;
      }

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useRole] Error:', error);
        throw error;
      }

      console.log(`[useRole] Fetched role: ${roleId}`);
      return data as SupabaseRole | null;
    },
    enabled: !!organizationId && !!roleId,
  });
}

export function useEmployeeRoles() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-roles', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useEmployeeRoles] No organization ID');
        return [];
      }

      const { data, error } = await supabase
        .from('employee_roles')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useEmployeeRoles] Error:', JSON.stringify(error, null, 2));
        console.error('[useEmployeeRoles] Error code:', error.code);
        console.error('[useEmployeeRoles] Error message:', error.message);
        throw new Error(error.message || 'Failed to fetch employee roles');
      }

      console.log(`[useEmployeeRoles] Fetched ${data?.length || 0} employee role assignments`);
      return (data || []) as SupabaseEmployeeRole[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployeeRole(employeeId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['employee-role', employeeId, organizationId],
    queryFn: async () => {
      if (!organizationId || !employeeId) {
        return null;
      }

      const { data, error } = await supabase
        .from('employee_roles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[useEmployeeRole] Error:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      console.log(`[useEmployeeRole] Fetched employee role for: ${employeeId}`);
      return {
        assignment: data as SupabaseEmployeeRole,
        role: (data as any).role as SupabaseRole,
      };
    },
    enabled: !!organizationId && !!employeeId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('roles')
        .insert({
          organization_id: organizationId,
          name: input.name,
          description: input.description || null,
          color: input.color,
          is_system: input.is_system || false,
          permissions: input.permissions,
          created_by: input.created_by || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateRole] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateRole] Created role:', data.id);
      return data as SupabaseRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', organizationId] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateRoleInput }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('roles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateRole] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateRole] Updated role:', id);
      return data as SupabaseRole;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['role', variables.id, organizationId] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (roleId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: role, error: fetchError } = await supabase
        .from('roles')
        .select('is_system')
        .eq('id', roleId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) {
        throw new Error('Role not found');
      }

      if (role?.is_system) {
        throw new Error('Cannot delete system role');
      }

      await supabase
        .from('employee_roles')
        .delete()
        .eq('role_id', roleId)
        .eq('organization_id', organizationId);

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteRole] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteRole] Deleted role:', roleId);
      return roleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-roles', organizationId] });
    },
  });
}

export function useAssignRoleToEmployee() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, roleId, assignedBy }: { employeeId: string; roleId: string; assignedBy?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      console.log('[useAssignRoleToEmployee] Assigning role:', { employeeId, roleId, organizationId, assignedBy });

      const { data: existing, error: existingError } = await supabase
        .from('employee_roles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existingError) {
        console.error('[useAssignRoleToEmployee] Error checking existing:', existingError.code, existingError.message, existingError.details, existingError.hint);
      }

      if (existing) {
        console.log('[useAssignRoleToEmployee] Updating existing assignment:', existing.id);
        const { data, error } = await supabase
          .from('employee_roles')
          .update({
            role_id: roleId,
            assigned_by: assignedBy || null,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('[useAssignRoleToEmployee] Update error - code:', error.code, 'message:', error.message, 'details:', error.details, 'hint:', error.hint);
          throw new Error(error.message || 'Failed to update role assignment');
        }

        console.log('[useAssignRoleToEmployee] Updated employee role:', employeeId);
        return data as SupabaseEmployeeRole;
      } else {
        console.log('[useAssignRoleToEmployee] Creating new assignment');
        const insertData = {
          organization_id: organizationId,
          employee_id: employeeId,
          role_id: roleId,
          assigned_by: assignedBy || null,
          assigned_at: new Date().toISOString(),
        };
        console.log('[useAssignRoleToEmployee] Insert data:', insertData);
        
        const { data, error } = await supabase
          .from('employee_roles')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('[useAssignRoleToEmployee] Insert error - code:', error.code, 'message:', error.message, 'details:', error.details, 'hint:', error.hint);
          throw new Error(error.message || 'Failed to assign role');
        }

        console.log('[useAssignRoleToEmployee] Assigned role to employee:', employeeId);
        return data as SupabaseEmployeeRole;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-roles', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-role', variables.employeeId, organizationId] });
    },
  });
}

export function useRemoveRoleFromEmployee() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { error } = await supabase
        .from('employee_roles')
        .delete()
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId);

      if (error) {
        console.error('[useRemoveRoleFromEmployee] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useRemoveRoleFromEmployee] Removed role from employee:', employeeId);
      return employeeId;
    },
    onSuccess: (employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['employee-roles', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['employee-role', employeeId, organizationId] });
    },
  });
}

export function useDuplicateRole() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ roleId, newName, createdBy }: { roleId: string; newName: string; createdBy?: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data: existingRole, error: fetchError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !existingRole) {
        throw new Error('Role not found');
      }

      const { data, error } = await supabase
        .from('roles')
        .insert({
          organization_id: organizationId,
          name: newName,
          description: existingRole.description,
          color: existingRole.color,
          is_system: false,
          permissions: existingRole.permissions,
          created_by: createdBy || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useDuplicateRole] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDuplicateRole] Duplicated role:', roleId, '-> ', data.id);
      return data as SupabaseRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', organizationId] });
    },
  });
}
