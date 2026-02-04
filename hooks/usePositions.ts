import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { 
  Position, 
  PositionWithRelations, 
  PositionCreateInput, 
  PositionUpdateInput,
  PositionAssignmentWithEmployee 
} from '@/types/position';

export function usePositions(filters?: {
  departmentCode?: string;
  facilityId?: string;
  status?: string;
  jobLevel?: string;
  jobFamily?: string;
}) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['positions', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[usePositions] No organization ID');
        return [];
      }

      console.log('[usePositions] Fetching positions for org:', organizationId);

      let query = supabase
        .from('positions')
        .select(`
          *,
          facility:facilities(id, name, facility_code)
        `)
        .eq('organization_id', organizationId);

      if (filters?.departmentCode) {
        query = query.eq('department_code', filters.departmentCode);
      }
      if (filters?.facilityId) {
        query = query.eq('facility_id', filters.facilityId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.jobLevel) {
        query = query.eq('job_level', filters.jobLevel);
      }
      if (filters?.jobFamily) {
        query = query.eq('job_family', filters.jobFamily);
      }

      const { data, error } = await query
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true });

      if (error) {
        console.error('[usePositions] Error fetching positions:', error);
        throw new Error(error.message);
      }

      console.log('[usePositions] Fetched', data?.length || 0, 'positions');
      return (data || []) as PositionWithRelations[];
    },
    enabled: !!organizationId,
  });
}

export function usePosition(positionId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['position', organizationId, positionId],
    queryFn: async () => {
      if (!organizationId || !positionId) {
        return null;
      }

      console.log('[usePosition] Fetching position:', positionId);

      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          facility:facilities(id, name, facility_code),
          reports_to_position:positions!positions_reports_to_position_id_fkey(id, title, position_code)
        `)
        .eq('id', positionId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[usePosition] Error fetching position:', error);
        throw new Error(error.message);
      }

      return data as PositionWithRelations;
    },
    enabled: !!organizationId && !!positionId,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (input: Omit<PositionCreateInput, 'organization_id'>) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useCreatePosition] Creating position:', input.title);

      const { data, error } = await supabase
        .from('positions')
        .insert({
          ...input,
          organization_id: organization.id,
          status: input.status || 'active',
          budgeted_headcount: input.budgeted_headcount || 1,
          filled_headcount: 0,
          color: input.color || '#6B7280',
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreatePosition] Error creating position:', error);
        throw new Error(error.message);
      }

      console.log('[useCreatePosition] Created position:', data.id);
      return data as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PositionUpdateInput) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdatePosition] Updating position:', id);

      const { data, error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdatePosition] Error updating position:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdatePosition] Updated position:', data.id);
      return data as Position;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['position', data.id] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (positionId: string) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useDeletePosition] Deleting position:', positionId);

      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', positionId)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('[useDeletePosition] Error deleting position:', error);
        throw new Error(error.message);
      }

      console.log('[useDeletePosition] Deleted position:', positionId);
      return positionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useTogglePositionStatus() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' | 'frozen' | 'archived' }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useTogglePositionStatus] Toggling position status:', id, 'to', status);

      const { data, error } = await supabase
        .from('positions')
        .update({ status })
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useTogglePositionStatus] Error toggling position:', error);
        throw new Error(error.message);
      }

      console.log('[useTogglePositionStatus] Toggled position:', data.id);
      return data as Position;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['position', data.id] });
    },
  });
}

export function usePositionAssignments(positionId: string | undefined) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['position-assignments', organizationId, positionId],
    queryFn: async () => {
      if (!organizationId || !positionId) {
        return [];
      }

      console.log('[usePositionAssignments] Fetching assignments for position:', positionId);

      const { data, error } = await supabase
        .from('position_assignments')
        .select(`
          *,
          employee:employees(id, first_name, last_name, email, employee_code)
        `)
        .eq('position_id', positionId)
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('[usePositionAssignments] Error fetching assignments:', error);
        throw new Error(error.message);
      }

      return (data || []) as PositionAssignmentWithEmployee[];
    },
    enabled: !!organizationId && !!positionId,
  });
}

export function useNextPositionCode() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['next-position-code', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return 'POS-001';
      }

      const { data, error } = await supabase
        .from('positions')
        .select('position_code')
        .eq('organization_id', organizationId)
        .like('position_code', 'POS-%')
        .order('position_code', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[useNextPositionCode] Error:', error);
        return 'POS-001';
      }

      if (!data || data.length === 0) {
        return 'POS-001';
      }

      const lastCode = data[0].position_code;
      const match = lastCode.match(/POS-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `POS-${String(nextNum).padStart(3, '0')}`;
      }

      return 'POS-001';
    },
    enabled: !!organizationId,
  });
}

export function usePositionStats() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['position-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          total: 0,
          active: 0,
          inactive: 0,
          frozen: 0,
          totalBudgeted: 0,
          totalFilled: 0,
          totalOpen: 0,
          criticalRoles: 0,
          supervisoryRoles: 0,
        };
      }

      console.log('[usePositionStats] Fetching position stats');

      const { data, error } = await supabase
        .from('positions')
        .select('status, budgeted_headcount, filled_headcount, is_critical_role, supervisory_role')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[usePositionStats] Error fetching stats:', error);
        throw new Error(error.message);
      }

      const positions = data || [];
      
      return {
        total: positions.length,
        active: positions.filter(p => p.status === 'active').length,
        inactive: positions.filter(p => p.status === 'inactive').length,
        frozen: positions.filter(p => p.status === 'frozen').length,
        totalBudgeted: positions.reduce((sum, p) => sum + (p.budgeted_headcount || 0), 0),
        totalFilled: positions.reduce((sum, p) => sum + (p.filled_headcount || 0), 0),
        totalOpen: positions.reduce((sum, p) => sum + Math.max((p.budgeted_headcount || 0) - (p.filled_headcount || 0), 0), 0),
        criticalRoles: positions.filter(p => p.is_critical_role).length,
        supervisoryRoles: positions.filter(p => p.supervisory_role).length,
      };
    },
    enabled: !!organizationId,
  });
}

export function useJobFamilies() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['job-families', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('positions')
        .select('job_family')
        .eq('organization_id', organizationId)
        .not('job_family', 'is', null);

      if (error) {
        console.error('[useJobFamilies] Error:', error);
        return [];
      }

      const families = [...new Set(data?.map(p => p.job_family).filter(Boolean) || [])];
      return families.sort() as string[];
    },
    enabled: !!organizationId,
  });
}

export function usePayGrades() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['pay-grades', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const { data, error } = await supabase
        .from('positions')
        .select('pay_grade')
        .eq('organization_id', organizationId)
        .not('pay_grade', 'is', null);

      if (error) {
        console.error('[usePayGrades] Error:', error);
        return [];
      }

      const grades = [...new Set(data?.map(p => p.pay_grade).filter(Boolean) || [])];
      return grades.sort() as string[];
    },
    enabled: !!organizationId,
  });
}
