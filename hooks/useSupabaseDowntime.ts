import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export type DowntimeReason = 
  | 'breakdown'
  | 'planned_maintenance'
  | 'changeover'
  | 'no_operator'
  | 'material_shortage'
  | 'quality_issue'
  | 'utility_failure'
  | 'safety_stop'
  | 'calibration'
  | 'other';

export type DowntimeImpact = 'production' | 'quality' | 'safety' | 'minor';

export type DowntimeStatus = 'ongoing' | 'completed';

export interface DowntimeEvent {
  id: string;
  organization_id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  start_time: string;
  end_time?: string;
  reason: DowntimeReason;
  reason_detail?: string;
  impact: DowntimeImpact;
  notes?: string;
  work_order_id?: string;
  work_order_number?: string;
  reported_by: string;
  reported_by_name: string;
  resolved_by?: string;
  resolved_by_name?: string;
  room_line?: string;
  room_line_name?: string;
  stopped_at?: string;
  resumed_at?: string;
  duration_minutes?: number;
  status: DowntimeStatus;
  production_stopped?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DowntimeFilters {
  status?: DowntimeStatus;
  reason?: DowntimeReason;
  impact?: DowntimeImpact;
  equipmentId?: string;
  roomLine?: string;
  workOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  productionStopped?: boolean;
}

export interface DowntimeStats {
  totalEvents: number;
  ongoingCount: number;
  completedCount: number;
  totalDowntimeMinutes: number;
  avgDowntimeMinutes: number;
  productionStoppedCount: number;
  byReason: Record<DowntimeReason, number>;
  byImpact: Record<DowntimeImpact, number>;
}

export function useDowntimeEventsQuery(filters?: DowntimeFilters & { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('downtime_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_time', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.reason) {
        query = query.eq('reason', filters.reason);
      }
      
      if (filters?.impact) {
        query = query.eq('impact', filters.impact);
      }
      
      if (filters?.equipmentId) {
        query = query.eq('equipment_id', filters.equipmentId);
      }
      
      if (filters?.roomLine) {
        query = query.eq('room_line', filters.roomLine);
      }
      
      if (filters?.workOrderId) {
        query = query.eq('work_order_id', filters.workOrderId);
      }
      
      if (filters?.productionStopped !== undefined) {
        query = query.eq('production_stopped', filters.productionStopped);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('start_time', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('start_time', filters.dateTo);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      console.log('[useDowntimeEventsQuery] Fetched:', data?.length || 0, 'events');
      return (data || []) as DowntimeEvent[];
    },
    enabled: !!organizationId && (filters?.enabled !== false),
    staleTime: 1000 * 60,
  });
}

export function useActiveDowntimeQuery() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('downtime_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'ongoing')
        .order('start_time', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      console.log('[useActiveDowntimeQuery] Fetched:', data?.length || 0, 'active events');
      return (data || []) as DowntimeEvent[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useDowntimeEventQuery(eventId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', 'detail', eventId, organizationId],
    queryFn: async () => {
      if (!organizationId || !eventId) return null;
      
      const { data, error } = await supabase
        .from('downtime_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', eventId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      
      console.log('[useDowntimeEventQuery] Fetched event:', eventId);
      return data as DowntimeEvent;
    },
    enabled: !!organizationId && !!eventId,
    staleTime: 1000 * 30,
  });
}

export function useEquipmentDowntimeQuery(equipmentId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', 'equipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      
      const { data, error } = await supabase
        .from('downtime_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .order('start_time', { ascending: false })
        .limit(50);
      
      if (error) throw new Error(error.message);
      
      console.log('[useEquipmentDowntimeQuery] Fetched:', data?.length || 0, 'events for equipment:', equipmentId);
      return (data || []) as DowntimeEvent[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkOrderDowntimeQuery(workOrderId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', 'work_order', workOrderId, organizationId],
    queryFn: async () => {
      if (!organizationId || !workOrderId) return null;
      
      const { data, error } = await supabase
        .from('downtime_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('work_order_id', workOrderId)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw new Error(error.message);
      
      console.log('[useWorkOrderDowntimeQuery] Fetched downtime for WO:', workOrderId);
      return data as DowntimeEvent | null;
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: 1000 * 60,
  });
}

export function useDowntimeStatsQuery(filters?: { dateFrom?: string; dateTo?: string }) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', 'stats', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        return {
          totalEvents: 0,
          ongoingCount: 0,
          completedCount: 0,
          totalDowntimeMinutes: 0,
          avgDowntimeMinutes: 0,
          productionStoppedCount: 0,
          byReason: {} as Record<DowntimeReason, number>,
          byImpact: {} as Record<DowntimeImpact, number>,
        } as DowntimeStats;
      }
      
      let query = supabase
        .from('downtime_events')
        .select('status, reason, impact, duration_minutes, production_stopped')
        .eq('organization_id', organizationId);
      
      if (filters?.dateFrom) {
        query = query.gte('start_time', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('start_time', filters.dateTo);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      const events = data || [];
      const completed = events.filter(e => e.status === 'completed');
      const totalMinutes = completed.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      
      const byReason = events.reduce((acc, e) => {
        acc[e.reason as DowntimeReason] = (acc[e.reason as DowntimeReason] || 0) + 1;
        return acc;
      }, {} as Record<DowntimeReason, number>);
      
      const byImpact = events.reduce((acc, e) => {
        acc[e.impact as DowntimeImpact] = (acc[e.impact as DowntimeImpact] || 0) + 1;
        return acc;
      }, {} as Record<DowntimeImpact, number>);
      
      const stats: DowntimeStats = {
        totalEvents: events.length,
        ongoingCount: events.filter(e => e.status === 'ongoing').length,
        completedCount: completed.length,
        totalDowntimeMinutes: totalMinutes,
        avgDowntimeMinutes: completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
        productionStoppedCount: events.filter(e => e.production_stopped).length,
        byReason,
        byImpact,
      };
      
      console.log('[useDowntimeStatsQuery] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductionStoppedStatus() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['downtime_events', 'production_stopped', organizationId],
    queryFn: async () => {
      if (!organizationId) return { isStopped: false, events: [] };
      
      const { data, error } = await supabase
        .from('downtime_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'ongoing')
        .eq('production_stopped', true)
        .order('start_time', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      const events = (data || []) as DowntimeEvent[];
      console.log('[useProductionStoppedStatus] Production stopped events:', events.length);
      
      return {
        isStopped: events.length > 0,
        events,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useCreateDowntimeEvent(options?: {
  onSuccess?: (data: DowntimeEvent) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: {
      equipmentId: string;
      equipmentName: string;
      equipmentTag: string;
      reason: DowntimeReason;
      reasonDetail?: string;
      impact: DowntimeImpact;
      notes?: string;
      workOrderId?: string;
      workOrderNumber?: string;
      reportedBy: string;
      reportedByName: string;
      roomLine?: string;
      roomLineName?: string;
      productionStopped?: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('downtime_events')
        .insert({
          organization_id: organizationId,
          equipment_id: event.equipmentId,
          equipment_name: event.equipmentName,
          equipment_tag: event.equipmentTag,
          start_time: now,
          reason: event.reason,
          reason_detail: event.reasonDetail || null,
          impact: event.impact,
          notes: event.notes || null,
          work_order_id: event.workOrderId || null,
          work_order_number: event.workOrderNumber || null,
          reported_by: event.reportedBy,
          reported_by_name: event.reportedByName,
          room_line: event.roomLine || null,
          room_line_name: event.roomLineName || null,
          stopped_at: now,
          status: 'ongoing',
          production_stopped: event.productionStopped ?? false,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useCreateDowntimeEvent] Created event:', data.id);
      return data as DowntimeEvent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['downtime_events'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateDowntimeEvent] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateDowntimeEvent(options?: {
  onSuccess?: (data: DowntimeEvent) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<{
        reason: DowntimeReason;
        reasonDetail: string;
        impact: DowntimeImpact;
        notes: string;
        workOrderId: string;
        workOrderNumber: string;
        roomLine: string;
        roomLineName: string;
        productionStopped: boolean;
      }>;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const updateData: Record<string, unknown> = {};
      
      if (params.updates.reason !== undefined) updateData.reason = params.updates.reason;
      if (params.updates.reasonDetail !== undefined) updateData.reason_detail = params.updates.reasonDetail;
      if (params.updates.impact !== undefined) updateData.impact = params.updates.impact;
      if (params.updates.notes !== undefined) updateData.notes = params.updates.notes;
      if (params.updates.workOrderId !== undefined) updateData.work_order_id = params.updates.workOrderId;
      if (params.updates.workOrderNumber !== undefined) updateData.work_order_number = params.updates.workOrderNumber;
      if (params.updates.roomLine !== undefined) updateData.room_line = params.updates.roomLine;
      if (params.updates.roomLineName !== undefined) updateData.room_line_name = params.updates.roomLineName;
      if (params.updates.productionStopped !== undefined) updateData.production_stopped = params.updates.productionStopped;
      
      const { data, error } = await supabase
        .from('downtime_events')
        .update(updateData)
        .eq('organization_id', organizationId)
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useUpdateDowntimeEvent] Updated event:', params.id);
      return data as DowntimeEvent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['downtime_events'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateDowntimeEvent] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useResolveDowntimeEvent(options?: {
  onSuccess?: (data: DowntimeEvent) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      resolvedBy: string;
      resolvedByName: string;
      endTime?: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: existingEvent, error: fetchError } = await supabase
        .from('downtime_events')
        .select('start_time')
        .eq('organization_id', organizationId)
        .eq('id', params.id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      const endTime = params.endTime || new Date().toISOString();
      const startTime = new Date(existingEvent.start_time).getTime();
      const endTimeMs = new Date(endTime).getTime();
      const durationMinutes = Math.round((endTimeMs - startTime) / (1000 * 60));
      
      const updateData: Record<string, unknown> = {
        end_time: endTime,
        resumed_at: endTime,
        status: 'completed',
        resolved_by: params.resolvedBy,
        resolved_by_name: params.resolvedByName,
        duration_minutes: durationMinutes,
      };
      
      if (params.notes) {
        updateData.notes = params.notes;
      }
      
      const { data, error } = await supabase
        .from('downtime_events')
        .update(updateData)
        .eq('organization_id', organizationId)
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      console.log('[useResolveDowntimeEvent] Resolved event:', params.id, 'duration:', durationMinutes, 'min');
      return data as DowntimeEvent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['downtime_events'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useResolveDowntimeEvent] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useLinkWorkOrderToDowntime(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      downtimeId: string;
      workOrderId: string;
      workOrderNumber: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('downtime_events')
        .update({
          work_order_id: params.workOrderId,
          work_order_number: params.workOrderNumber,
        })
        .eq('organization_id', organizationId)
        .eq('id', params.downtimeId);
      
      if (error) throw new Error(error.message);
      
      console.log('[useLinkWorkOrderToDowntime] Linked WO:', params.workOrderNumber, 'to downtime:', params.downtimeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime_events'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useLinkWorkOrderToDowntime] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useDeleteDowntimeEvent(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('downtime_events')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', eventId);
      
      if (error) throw new Error(error.message);
      
      console.log('[useDeleteDowntimeEvent] Deleted event:', eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime_events'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error('[useDeleteDowntimeEvent] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function calculateDowntimeDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  return (end - start) / (1000 * 60 * 60);
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getReasonInfo(reason: DowntimeReason): { label: string; color: string } {
  const reasons: Record<DowntimeReason, { label: string; color: string }> = {
    breakdown: { label: 'Equipment Breakdown', color: '#DC2626' },
    planned_maintenance: { label: 'Planned Maintenance', color: '#3B82F6' },
    changeover: { label: 'Changeover/Setup', color: '#8B5CF6' },
    no_operator: { label: 'No Operator Available', color: '#F59E0B' },
    material_shortage: { label: 'Material Shortage', color: '#EF4444' },
    quality_issue: { label: 'Quality Issue', color: '#10B981' },
    utility_failure: { label: 'Utility Failure', color: '#6366F1' },
    safety_stop: { label: 'Safety Stop', color: '#DC2626' },
    calibration: { label: 'Calibration', color: '#14B8A6' },
    other: { label: 'Other', color: '#6B7280' },
  };
  return reasons[reason] || { label: reason, color: '#6B7280' };
}

export function getImpactInfo(impact: DowntimeImpact): { label: string; color: string } {
  const impacts: Record<DowntimeImpact, { label: string; color: string }> = {
    production: { label: 'Production', color: '#DC2626' },
    quality: { label: 'Quality', color: '#F59E0B' },
    safety: { label: 'Safety', color: '#EF4444' },
    minor: { label: 'Minor', color: '#10B981' },
  };
  return impacts[impact] || { label: impact, color: '#6B7280' };
}

export function getStatusInfo(status: DowntimeStatus): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'ongoing':
      return { label: 'Ongoing', color: '#DC2626', bgColor: '#DC262615' };
    case 'completed':
      return { label: 'Completed', color: '#10B981', bgColor: '#10B98115' };
    default:
      return { label: status, color: '#6B7280', bgColor: '#6B728015' };
  }
}
