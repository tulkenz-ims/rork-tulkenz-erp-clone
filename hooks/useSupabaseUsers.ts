import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, fetchById, updateRecord } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface SupabaseUser {
  id: string;
  organization_id: string;
  facility_id: string | null;
  employee_code: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string;

  role: string;
  position: string | null;
  hire_date: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  hourly_rate: number | null;
  pto_balance: number | null;
  department_code: string | null;
  cost_center: string | null;
  gl_account: string | null;
  manager_id: string | null;
  profile: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  status?: 'active' | 'inactive' | 'on_leave' | 'all';
  department?: string;
  role?: string;
  facilityId?: string;
  search?: string;
}

export interface CreateUserInput {
  employee_code: string;
  pin: string;
  first_name: string;
  last_name: string;
  email: string;

  role?: string;
  position?: string;
  department_code?: string | null;
  facility_id?: string | null;
  status?: 'active' | 'inactive' | 'on_leave';
  hire_date?: string;
  hourly_rate?: number | null;
  manager_id?: string | null;
  cost_center?: string | null;
  gl_account?: string | null;
}

export interface UpdateUserInput {
  employee_code?: string;
  pin?: string;
  first_name?: string;
  last_name?: string;
  email?: string;

  role?: string;
  position?: string;
  department_code?: string | null;
  facility_id?: string | null;
  status?: 'active' | 'inactive' | 'on_leave';
  hire_date?: string;
  hourly_rate?: number | null;
  manager_id?: string | null;
  cost_center?: string | null;
  gl_account?: string | null;
}

export function useUsers(filters?: UserFilters) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['users', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useUsers] No organization ID');
        return [];
      }

      let query = supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .order('last_name', { ascending: true });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.department) {
        query = query.eq('department_code', filters.department);
      }

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.facilityId) {
        query = query.eq('facility_id', filters.facilityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useUsers] Error:', error);
        throw new Error(error.message);
      }

      let users = (data || []) as SupabaseUser[];

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        users = users.filter(
          (user) =>
            user.first_name.toLowerCase().includes(searchLower) ||
            user.last_name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.employee_code.toLowerCase().includes(searchLower)
        );
      }

      console.log(`[useUsers] Fetched ${users.length} users`);
      return users;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUser(userId: string | undefined) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['user', userId, organizationId],
    queryFn: async () => {
      if (!organizationId || !userId) {
        return null;
      }

      const { data, error } = await fetchById('employees', userId, organizationId);

      if (error) {
        console.error('[useUser] Error:', error);
        throw error;
      }

      console.log(`[useUser] Fetched user: ${userId}`);
      return data as SupabaseUser | null;
    },
    enabled: !!organizationId && !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const existingEmail = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', input.email)
        .single();

      if (existingEmail.data) {
        throw new Error('A user with this email already exists');
      }

      const existingCode = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_code', input.employee_code)
        .single();

      if (existingCode.data) {
        throw new Error('A user with this employee code already exists');
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({
          organization_id: organizationId,
          employee_code: input.employee_code,
          pin: input.pin,
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          role: input.role || 'default',
          position: input.position || '',

          department_code: input.department_code || null,
          facility_id: input.facility_id || null,
          status: input.status || 'active',
          hire_date: input.hire_date || new Date().toISOString().split('T')[0],
          hourly_rate: input.hourly_rate || null,
          manager_id: input.manager_id || null,
          cost_center: input.cost_center || null,
          gl_account: input.gl_account || null,
          pto_balance: 0,
          profile: {},
          availability: {},
          time_off_balances: {},
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateUser] Error:', error);
        throw error;
      }

      console.log('[useCreateUser] Created user:', data?.id);
      return data as SupabaseUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateUserInput }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      if (updates.email) {
        const existingEmail = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('email', updates.email)
          .neq('id', id)
          .single();

        if (existingEmail.data) {
          throw new Error('A user with this email already exists');
        }
      }

      if (updates.employee_code) {
        const existingCode = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('employee_code', updates.employee_code)
          .neq('id', id)
          .single();

        if (existingCode.data) {
          throw new Error('A user with this employee code already exists');
        }
      }

      const { data, error } = await updateRecord('employees', id, updates, organizationId);

      if (error) {
        console.error('[useUpdateUser] Error:', error);
        throw error;
      }

      console.log('[useUpdateUser] Updated user:', id);
      return data as unknown as SupabaseUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['user', data?.id] });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' | 'on_leave' }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await updateRecord('employees', id, { status }, organizationId);

      if (error) {
        console.error('[useToggleUserStatus] Error:', error);
        throw error;
      }

      console.log('[useToggleUserStatus] Updated user status:', id, status);
      return data as unknown as SupabaseUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['user', data?.id] });
    },
  });
}

export function useResetUserPin() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, newPin }: { id: string; newPin: string }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      if (newPin.length < 4) {
        throw new Error('PIN must be at least 4 characters');
      }

      const { data, error } = await updateRecord('employees', id, { pin: newPin }, organizationId);

      if (error) {
        console.error('[useResetUserPin] Error:', error);
        throw error;
      }

      console.log('[useResetUserPin] Reset PIN for user:', id);
      return data as unknown as SupabaseUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data?.id] });
    },
  });
}

export function useUserDepartments() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['user-departments', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('department_code')
        .eq('organization_id', organizationId)
        .not('department_code', 'is', null);

      if (error) {
        console.error('[useUserDepartments] Error:', error);
        throw new Error(error.message);
      }

      const departments = [...new Set(data?.map((d) => d.department_code).filter((d): d is string => d !== null && d !== undefined))];
      console.log(`[useUserDepartments] Found ${departments.length} departments`);
      return departments.sort();
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUserRoles() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['user-roles', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('role')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useUserRoles] Error:', error);
        throw new Error(error.message);
      }

      const roles = [...new Set(data?.map((d) => d.role).filter(Boolean))] as string[];
      console.log(`[useUserRoles] Found ${roles.length} roles`);
      return roles.sort();
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUserStats() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['user-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { total: 0, active: 0, inactive: 0, onLeave: 0 };
      }

      const { data, error } = await supabase
        .from('employees')
        .select('status')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useUserStats] Error:', error);
        throw new Error(error.message);
      }

      const stats = {
        total: data?.length || 0,
        active: data?.filter((d) => d.status === 'active').length || 0,
        inactive: data?.filter((d) => d.status === 'inactive').length || 0,
        onLeave: data?.filter((d) => d.status === 'on_leave').length || 0,
      };

      console.log('[useUserStats] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBulkToggleUserStatus() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ userIds, status }: { userIds: string[]; status: 'active' | 'inactive' }) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      if (userIds.length === 0) {
        throw new Error('No users selected');
      }

      console.log(`[useBulkToggleUserStatus] Updating ${userIds.length} users to ${status}`);

      const { data, error } = await supabase
        .from('employees')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .in('id', userIds)
        .select();

      if (error) {
        console.error('[useBulkToggleUserStatus] Error:', error);
        throw error;
      }

      console.log(`[useBulkToggleUserStatus] Successfully updated ${data?.length || 0} users`);
      return data as SupabaseUser[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
}
