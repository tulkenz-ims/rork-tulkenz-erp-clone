import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Department, DepartmentCreateInput, DepartmentUpdateInput, DepartmentWithFacility } from '@/types/department';

export function useDepartments() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['departments', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useDepartments] No organization ID');
        return [];
      }

      console.log('[useDepartments] Fetching departments for org:', organizationId);

      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          facility:facilities(id, name, facility_code, facility_number)
        `)
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })
        .order('department_code', { ascending: true });

      if (error) {
        console.error('[useDepartments] Error fetching departments:', error);
        throw new Error(error.message);
      }

      console.log('[useDepartments] Fetched', data?.length || 0, 'departments');
      return (data || []) as DepartmentWithFacility[];
    },
    enabled: !!organizationId,
  });
}

export function useDepartmentsByFacility(facilityId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['departments', organizationId, 'facility', facilityId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useDepartmentsByFacility] No organization ID');
        return [];
      }

      console.log('[useDepartmentsByFacility] Fetching departments for facility:', facilityId);

      let query = supabase
        .from('departments')
        .select(`
          *,
          facility:facilities(id, name, facility_code, facility_number)
        `)
        .eq('organization_id', organizationId);

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query
        .order('sort_order', { ascending: true })
        .order('department_code', { ascending: true });

      if (error) {
        console.error('[useDepartmentsByFacility] Error fetching departments:', error);
        throw new Error(error.message);
      }

      console.log('[useDepartmentsByFacility] Fetched', data?.length || 0, 'departments');
      return (data || []) as DepartmentWithFacility[];
    },
    enabled: !!organizationId,
  });
}

export function useDepartment(departmentId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['department', departmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !departmentId) {
        return null;
      }

      console.log('[useDepartment] Fetching department:', departmentId);

      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          facility:facilities(id, name, facility_code, facility_number)
        `)
        .eq('id', departmentId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useDepartment] Error fetching department:', error);
        throw new Error(error.message);
      }

      return data as DepartmentWithFacility;
    },
    enabled: !!organizationId && !!departmentId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: Omit<DepartmentCreateInput, 'organization_id'>) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreateDepartment] Creating department:', input.name);

      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...input,
          organization_id: organization.id,
          status: input.status || 'active',
          color: input.color || '#6B7280',
          level: 1,
          actual_headcount: 0,
          ytd_spend: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateDepartment] Error creating department:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateDepartment] Created department:', data.id);
      return data as Department;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DepartmentUpdateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateDepartment] Updating department:', id);

      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateDepartment] Error updating department:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateDepartment] Updated department:', data.id);
      return data as Department;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department', data.id] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (departmentId: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeleteDepartment] Deleting department:', departmentId);

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeleteDepartment] Error deleting department:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteDepartment] Deleted department:', departmentId);
      return departmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useToggleDepartmentStatus() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' | 'archived' }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useToggleDepartmentStatus] Toggling department status:', id, 'to', status);

      const { data, error } = await supabase
        .from('departments')
        .update({ status })
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useToggleDepartmentStatus] Error toggling department:', error);
        throw new Error(error.message);
      }

      console.log('[useToggleDepartmentStatus] Toggled department:', data.id);
      return data as Department;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['department', data.id] });
    },
  });
}

export function useNextDepartmentCode(facilityNumber: number | null) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['next-department-code', organizationId, facilityNumber],
    queryFn: async () => {
      if (!organizationId) {
        return '0001';
      }

      const { data, error } = await supabase
        .from('departments')
        .select('department_code, base_department_code')
        .eq('organization_id', organizationId)
        .order('base_department_code', { ascending: false, nullsFirst: false })
        .limit(1);

      if (error) {
        console.error('[useNextDepartmentCode] Error:', error);
        return '0001';
      }

      const maxBaseCode = data?.[0]?.base_department_code || 0;
      const nextBase = maxBaseCode + 1;
      
      if (facilityNumber && facilityNumber > 0) {
        return `${facilityNumber}${String(nextBase).padStart(3, '0')}`;
      }
      
      return String(nextBase).padStart(4, '0');
    },
    enabled: !!organizationId,
  });
}
