import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  supabase, 
  Tables, 
  QueryOptions, 
  fetchById, 
  deleteRecord 
} from '@/lib/supabase';

type ServiceRequest = Tables['service_requests'];
type MaintenanceAlert = Tables['maintenance_alerts'];
type EquipmentDowntimeLog = Tables['equipment_downtime_log'];

export type ServiceRequestStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted' | 'cancelled' | 'on_hold';
export type ServiceRequestType = 'repair' | 'maintenance' | 'inspection' | 'installation' | 'modification' | 'safety' | 'cleaning' | 'other';
export type ServiceRequestPriority = 'low' | 'medium' | 'high' | 'critical';
export type ServiceRequestUrgency = 'low' | 'normal' | 'high' | 'urgent';

export type AlertType = 'pm_due' | 'pm_overdue' | 'equipment_down' | 'equipment_critical' | 'meter_threshold' | 'warranty_expiring' | 'calibration_due' | 'inspection_due' | 'part_needed' | 'safety_concern' | 'compliance_deadline' | 'work_order_overdue' | 'recurring_failure' | 'high_downtime' | 'budget_threshold' | 'custom';
export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'snoozed' | 'resolved' | 'dismissed' | 'expired';

export type DowntimeType = 'breakdown' | 'planned_maintenance' | 'pm_scheduled' | 'emergency_repair' | 'waiting_parts' | 'waiting_approval' | 'operator_error' | 'setup_changeover' | 'calibration' | 'inspection' | 'power_outage' | 'utility_failure' | 'safety_stop' | 'quality_issue' | 'material_shortage' | 'no_operator' | 'external_factor' | 'unknown' | 'other';
export type DowntimeStatus = 'ongoing' | 'resolved' | 'pending_parts' | 'pending_approval';

export type ExtendedServiceRequest = ServiceRequest;

export type ExtendedMaintenanceAlert = MaintenanceAlert;

export type ExtendedEquipmentDowntime = EquipmentDowntimeLog;

// ============== SERVICE REQUESTS QUERIES ==============

export function useServiceRequestsQuery(options?: QueryOptions<ServiceRequest> & { 
  enabled?: boolean;
  status?: ServiceRequestStatus | ServiceRequestStatus[];
  type?: ServiceRequestType | ServiceRequestType[];
  priority?: ServiceRequestPriority | ServiceRequestPriority[];
  urgency?: ServiceRequestUrgency;
  requesterId?: string;
  facilityId?: string;
  equipmentId?: string;
  isEquipmentDown?: boolean;
  isSafetyConcern?: boolean;
}) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'service_requests', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.status,
      options?.type,
      options?.priority,
      options?.urgency,
      options?.requesterId,
      options?.facilityId,
      options?.equipmentId,
      options?.isEquipmentDown,
      options?.isSafetyConcern,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('service_requests')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.type) {
        if (Array.isArray(options.type)) {
          query = query.in('request_type', options.type);
        } else {
          query = query.eq('request_type', options.type);
        }
      }
      
      if (options?.priority) {
        if (Array.isArray(options.priority)) {
          query = query.in('priority', options.priority);
        } else {
          query = query.eq('priority', options.priority);
        }
      }
      
      if (options?.urgency) {
        query = query.eq('urgency', options.urgency);
      }
      
      if (options?.requesterId) {
        query = query.eq('requester_id', options.requesterId);
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.isEquipmentDown !== undefined) {
        query = query.eq('is_equipment_down', options.isEquipmentDown);
      }
      
      if (options?.isSafetyConcern !== undefined) {
        query = query.eq('is_safety_concern', options.isSafetyConcern);
      }
      
      if (filters) {
        for (const filter of filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'gt': query = query.gt(col, filter.value); break;
            case 'gte': query = query.gte(col, filter.value); break;
            case 'lt': query = query.lt(col, filter.value); break;
            case 'lte': query = query.lte(col, filter.value); break;
            case 'like': query = query.like(col, filter.value as string); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
            case 'is': query = query.is(col, filter.value); break;
          }
        }
      }
      
      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useServiceRequestsQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useServiceRequestsQuery] Fetched:', data?.length || 0, 'service requests');
      return (data || []) as unknown as ExtendedServiceRequest[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useServiceRequestById(id: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['service_requests', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;
      const result = await fetchById('service_requests', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useServiceRequestById] Fetched service request:', id);
      return result.data as ExtendedServiceRequest | null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useServiceRequestsByRequester(requesterId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['service_requests', 'byRequester', requesterId, organizationId],
    queryFn: async () => {
      if (!organizationId || !requesterId) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('requester_id', requesterId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useServiceRequestsByRequester] Fetched:', data?.length || 0, 'requests');
      return (data || []) as unknown as ExtendedServiceRequest[];
    },
    enabled: !!organizationId && !!requesterId,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePendingServiceRequests() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['service_requests', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['submitted', 'under_review'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      console.log('[usePendingServiceRequests] Fetched:', data?.length || 0, 'pending requests');
      return (data || []) as unknown as ExtendedServiceRequest[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useUrgentServiceRequests() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['service_requests', 'urgent', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['submitted', 'under_review', 'approved'])
        .or('priority.eq.critical,priority.eq.high,is_equipment_down.eq.true,is_safety_concern.eq.true')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useUrgentServiceRequests] Fetched:', data?.length || 0, 'urgent requests');
      return (data || []) as unknown as ExtendedServiceRequest[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

// ============== MAINTENANCE ALERTS QUERIES ==============

export function useMaintenanceAlertsQuery(options?: QueryOptions<MaintenanceAlert> & { 
  enabled?: boolean;
  alertType?: AlertType | AlertType[];
  severity?: AlertSeverity | AlertSeverity[];
  status?: AlertStatus | AlertStatus[];
  facilityId?: string;
  equipmentId?: string;
  activeOnly?: boolean;
}) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'maintenance_alerts', 
      organizationId, 
      filters, 
      orderBy, 
      limit, 
      offset, 
      select,
      options?.alertType,
      options?.severity,
      options?.status,
      options?.facilityId,
      options?.equipmentId,
      options?.activeOnly,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('maintenance_alerts')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.alertType) {
        if (Array.isArray(options.alertType)) {
          query = query.in('alert_type', options.alertType);
        } else {
          query = query.eq('alert_type', options.alertType);
        }
      }
      
      if (options?.severity) {
        if (Array.isArray(options.severity)) {
          query = query.in('severity', options.severity);
        } else {
          query = query.eq('severity', options.severity);
        }
      }
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.activeOnly) {
        query = query.eq('status', 'active');
      }
      
      if (filters) {
        for (const filter of filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'gt': query = query.gt(col, filter.value); break;
            case 'gte': query = query.gte(col, filter.value); break;
            case 'lt': query = query.lt(col, filter.value); break;
            case 'lte': query = query.lte(col, filter.value); break;
            case 'like': query = query.like(col, filter.value as string); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
            case 'is': query = query.is(col, filter.value); break;
          }
        }
      }
      
      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useMaintenanceAlertsQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useMaintenanceAlertsQuery] Fetched:', data?.length || 0, 'alerts');
      return (data || []) as unknown as ExtendedMaintenanceAlert[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 1,
  });
}

export function useActiveMaintenanceAlerts() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['maintenance_alerts', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useActiveMaintenanceAlerts] Fetched:', data?.length || 0, 'active alerts');
      return (data || []) as unknown as ExtendedMaintenanceAlert[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

export function useCriticalAlerts() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['maintenance_alerts', 'critical', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'acknowledged'])
        .in('severity', ['critical', 'high'])
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useCriticalAlerts] Fetched:', data?.length || 0, 'critical alerts');
      return (data || []) as unknown as ExtendedMaintenanceAlert[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
  });
}

export function useAlertsByEquipment(equipmentId: string | undefined | null) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['maintenance_alerts', 'byEquipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as unknown as ExtendedMaintenanceAlert[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============== EQUIPMENT DOWNTIME QUERIES ==============

export function useEquipmentDowntimeQuery(options?: QueryOptions<EquipmentDowntimeLog> & {
  enabled?: boolean;
  status?: DowntimeStatus | DowntimeStatus[];
  downtimeType?: DowntimeType | DowntimeType[];
  equipmentId?: string;
  facilityId?: string;
  ongoingOnly?: boolean;
}) {
  const { organizationId } = useOrganization();
  const filters = options?.filters;
  const orderBy = options?.orderBy;
  const limit = options?.limit;
  const offset = options?.offset;
  const select = options?.select;
  const enabled = options?.enabled;
  
  return useQuery({
    queryKey: [
      'equipment_downtime_log',
      organizationId,
      filters,
      orderBy,
      limit,
      offset,
      select,
      options?.status,
      options?.downtimeType,
      options?.equipmentId,
      options?.facilityId,
      options?.ongoingOnly,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('equipment_downtime_log')
        .select(select || '*')
        .eq('organization_id', organizationId);
      
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }
      
      if (options?.downtimeType) {
        if (Array.isArray(options.downtimeType)) {
          query = query.in('downtime_type', options.downtimeType);
        } else {
          query = query.eq('downtime_type', options.downtimeType);
        }
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.ongoingOnly) {
        query = query.eq('status', 'ongoing');
      }
      
      if (filters) {
        for (const filter of filters) {
          const col = filter.column as string;
          switch (filter.operator) {
            case 'eq': query = query.eq(col, filter.value); break;
            case 'neq': query = query.neq(col, filter.value); break;
            case 'gt': query = query.gt(col, filter.value); break;
            case 'gte': query = query.gte(col, filter.value); break;
            case 'lt': query = query.lt(col, filter.value); break;
            case 'lte': query = query.lte(col, filter.value); break;
            case 'like': query = query.like(col, filter.value as string); break;
            case 'ilike': query = query.ilike(col, filter.value as string); break;
            case 'in': query = query.in(col, filter.value as unknown[]); break;
            case 'is': query = query.is(col, filter.value); break;
          }
        }
      }
      
      if (orderBy) {
        query = query.order(orderBy.column as string, { ascending: orderBy.ascending ?? true });
      } else {
        query = query.order('start_time', { ascending: false });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useEquipmentDowntimeQuery] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useEquipmentDowntimeQuery] Fetched:', data?.length || 0, 'downtime records');
      return (data || []) as unknown as ExtendedEquipmentDowntime[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useOngoingDowntime() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['equipment_downtime_log', 'ongoing', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('equipment_downtime_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'ongoing')
        .order('start_time', { ascending: false });
      if (error) throw new Error(error.message);
      console.log('[useOngoingDowntime] Fetched:', data?.length || 0, 'ongoing downtime');
      return (data || []) as unknown as ExtendedEquipmentDowntime[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });
}

// ============== MAINTENANCE ACTIVITY LOG QUERIES ==============

export function useMaintenanceActivityLog(options?: {
  enabled?: boolean;
  facilityId?: string;
  equipmentId?: string;
  workOrderId?: string;
  serviceRequestId?: string;
  activityType?: string;
  limit?: number;
}) {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: [
      'maintenance_activity_log',
      organizationId,
      options?.facilityId,
      options?.equipmentId,
      options?.workOrderId,
      options?.serviceRequestId,
      options?.activityType,
      options?.limit,
    ],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('maintenance_activity_log')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }
      
      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }
      
      if (options?.workOrderId) {
        query = query.eq('work_order_id', options.workOrderId);
      }
      
      if (options?.serviceRequestId) {
        query = query.eq('service_request_id', options.serviceRequestId);
      }
      
      if (options?.activityType) {
        query = query.eq('activity_type', options.activityType);
      }
      
      query = query.order('performed_at', { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useMaintenanceActivityLog] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useMaintenanceActivityLog] Fetched:', data?.length || 0, 'activities');
      return data || [];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

// ============== SERVICE REQUEST MUTATIONS ==============

export interface CreateServiceRequestInput {
  request_type: ServiceRequestType;
  title: string;
  description: string;
  priority?: ServiceRequestPriority;
  urgency?: ServiceRequestUrgency;
  requester_id: string;
  requester_name: string;
  requester_department?: string;
  requester_phone?: string;
  requester_email?: string;
  facility_id?: string;
  facility_name?: string;
  equipment_id?: string;
  equipment_name?: string;
  equipment_tag?: string;
  location?: string;
  room_area?: string;
  problem_started?: string;
  is_equipment_down?: boolean;
  is_safety_concern?: boolean;
  is_production_impact?: boolean;
  production_impact_description?: string;
  preferred_date?: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  availability_notes?: string;
  estimated_hours?: number;
  requires_parts?: boolean;
  parts_description?: string;
  attachments?: unknown[];
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: CreateServiceRequestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const requestNumber = `SR-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          organization_id: organizationId,
          request_number: requestNumber,
          status: 'submitted',
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateServiceRequest] Created service request:', data.id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_activity_log'] });
    },
  });
}

export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceRequest> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateServiceRequest] Updated service request:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
      queryClient.invalidateQueries({ queryKey: ['service_requests', 'byId', data.id] });
    },
  });
}

export function useSubmitServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update({ status: 'submitted' })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useSubmitServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useSubmitServiceRequest] Submitted service request:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

export interface ReviewServiceRequestInput {
  id: string;
  reviewedBy: string;
  reviewedByName: string;
  reviewNotes?: string;
}

export function useReviewServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, reviewedBy, reviewedByName, reviewNotes }: ReviewServiceRequestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update({
          status: 'under_review',
          reviewed_by: reviewedBy,
          reviewed_by_name: reviewedByName,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useReviewServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useReviewServiceRequest] Reviewed service request:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

export interface ApproveServiceRequestInput {
  id: string;
  approvedBy: string;
  approvedByName: string;
  estimatedCost?: number;
  estimatedHours?: number;
}

export function useApproveServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName, estimatedCost, estimatedHours }: ApproveServiceRequestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_by_name: approvedByName,
          approved_at: new Date().toISOString(),
          estimated_cost: estimatedCost,
          estimated_hours: estimatedHours,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useApproveServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useApproveServiceRequest] Approved service request:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

export interface RejectServiceRequestInput {
  id: string;
  rejectedBy: string;
  rejectedByName: string;
  rejectionReason: string;
}

export function useRejectServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, rejectedBy, rejectedByName, rejectionReason }: RejectServiceRequestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update({
          status: 'rejected',
          rejected_by: rejectedBy,
          rejected_by_name: rejectedByName,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useRejectServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useRejectServiceRequest] Rejected service request:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

export interface ConvertToWorkOrderInput {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  convertedBy: string;
  convertedByName: string;
}

export function useConvertToWorkOrder() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, workOrderId, workOrderNumber, convertedBy, convertedByName }: ConvertToWorkOrderInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update({
          status: 'converted',
          work_order_id: workOrderId,
          work_order_number: workOrderNumber,
          converted_at: new Date().toISOString(),
          converted_by: convertedBy,
          converted_by_name: convertedByName,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useConvertToWorkOrder] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useConvertToWorkOrder] Converted service request to work order:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
    },
  });
}

export function useCancelServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('service_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useCancelServiceRequest] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCancelServiceRequest] Cancelled service request:', id);
      return data as ExtendedServiceRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const result = await deleteRecord('service_requests', id, organizationId);
      if (result.error) throw result.error;
      console.log('[useDeleteServiceRequest] Deleted service request:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });
}

// ============== MAINTENANCE ALERT MUTATIONS ==============

export interface CreateAlertInput {
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  facility_id?: string;
  facility_name?: string;
  equipment_id?: string;
  equipment_name?: string;
  equipment_tag?: string;
  work_order_id?: string;
  work_order_number?: string;
  pm_schedule_id?: string;
  metric_name?: string;
  metric_value?: number;
  threshold_value?: number;
  threshold_type?: 'above' | 'below' | 'equal' | 'approaching';
  expires_at?: string;
}

export function useCreateMaintenanceAlert() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .insert({
          organization_id: organizationId,
          status: 'active',
          is_auto_generated: false,
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateMaintenanceAlert] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateMaintenanceAlert] Created alert:', data.id);
      return data as ExtendedMaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export interface AcknowledgeAlertInput {
  id: string;
  acknowledgedBy: string;
  acknowledgedByName: string;
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, acknowledgedBy, acknowledgedByName }: AcknowledgeAlertInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: acknowledgedBy,
          acknowledged_by_name: acknowledgedByName,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useAcknowledgeAlert] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useAcknowledgeAlert] Acknowledged alert:', id);
      return data as ExtendedMaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export interface SnoozeAlertInput {
  id: string;
  snoozedBy: string;
  snoozedUntil: string;
}

export function useSnoozeAlert() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, snoozedBy, snoozedUntil }: SnoozeAlertInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .update({
          status: 'snoozed',
          snoozed_by: snoozedBy,
          snoozed_until: snoozedUntil,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useSnoozeAlert] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useSnoozeAlert] Snoozed alert:', id);
      return data as ExtendedMaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export interface ResolveAlertInput {
  id: string;
  resolvedBy: string;
  resolvedByName: string;
  resolutionNotes?: string;
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, resolvedBy, resolvedByName, resolutionNotes }: ResolveAlertInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .update({
          status: 'resolved',
          resolved_by: resolvedBy,
          resolved_by_name: resolvedByName,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useResolveAlert] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useResolveAlert] Resolved alert:', id);
      return data as ExtendedMaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

export interface DismissAlertInput {
  id: string;
  dismissedBy: string;
  dismissReason?: string;
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, dismissedBy, dismissReason }: DismissAlertInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .update({
          status: 'dismissed',
          dismissed_by: dismissedBy,
          dismissed_at: new Date().toISOString(),
          dismiss_reason: dismissReason,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useDismissAlert] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useDismissAlert] Dismissed alert:', id);
      return data as ExtendedMaintenanceAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_alerts'] });
    },
  });
}

// ============== EQUIPMENT DOWNTIME MUTATIONS ==============

export interface CreateDowntimeInput {
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  facility_id?: string;
  start_time: string;
  downtime_type: DowntimeType;
  reason: string;
  root_cause?: string;
  impact_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  production_impact?: boolean;
  production_impact_description?: string;
  reported_by: string;
  reported_by_name: string;
  notes?: string;
}

export function useCreateDowntime() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: CreateDowntimeInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('equipment_downtime_log')
        .insert({
          organization_id: organizationId,
          status: 'ongoing',
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateDowntime] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useCreateDowntime] Created downtime record:', data.id);
      return data as ExtendedEquipmentDowntime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_downtime_log'] });
    },
  });
}

export interface ResolveDowntimeInput {
  id: string;
  end_time: string;
  repaired_by?: string;
  repaired_by_name?: string;
  repair_actions?: string;
  parts_replaced?: unknown[];
  labor_hours?: number;
  repair_cost?: number;
  failure_code?: string;
  failure_category?: string;
}

export function useResolveDowntime() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, end_time, ...input }: ResolveDowntimeInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data: existing, error: fetchError } = await supabase
        .from('equipment_downtime_log')
        .select('start_time')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      const startTime = new Date(existing.start_time);
      const endTime = new Date(end_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('equipment_downtime_log')
        .update({
          status: 'resolved',
          end_time,
          duration_minutes: durationMinutes,
          ...input,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useResolveDowntime] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useResolveDowntime] Resolved downtime:', id);
      return data as ExtendedEquipmentDowntime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_downtime_log'] });
    },
  });
}

export function useUpdateDowntime() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentDowntimeLog> & { id: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('equipment_downtime_log')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) {
        console.error('[useUpdateDowntime] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useUpdateDowntime] Updated downtime:', id);
      return data as ExtendedEquipmentDowntime;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment_downtime_log'] });
    },
  });
}

// ============== MAINTENANCE ACTIVITY LOG MUTATION ==============

export interface LogActivityInput {
  activity_type: string;
  description: string;
  details?: Record<string, unknown>;
  facility_id?: string;
  facility_name?: string;
  equipment_id?: string;
  equipment_name?: string;
  equipment_tag?: string;
  work_order_id?: string;
  work_order_number?: string;
  service_request_id?: string;
  service_request_number?: string;
  performed_by: string;
  performed_by_name: string;
  labor_hours?: number;
  labor_cost?: number;
  parts_used?: unknown[];
  parts_cost?: number;
  location?: string;
  previous_value?: string;
  new_value?: string;
}

export function useLogMaintenanceActivity() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  
  return useMutation({
    mutationFn: async (input: LogActivityInput) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('maintenance_activity_log')
        .insert({
          organization_id: organizationId,
          performed_at: new Date().toISOString(),
          ...input,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useLogMaintenanceActivity] Error:', error);
        throw new Error(error.message);
      }
      
      console.log('[useLogMaintenanceActivity] Logged activity:', data.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_activity_log'] });
    },
  });
}

// ============== SERVICE METRICS QUERIES ==============

export function useServiceRequestStats() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['service_requests', 'stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('service_requests')
        .select('status, priority, is_equipment_down, is_safety_concern')
        .eq('organization_id', organizationId);
      
      if (error) throw new Error(error.message);
      
      const requests = data || [];
      
      const stats = {
        total: requests.length,
        byStatus: {
          draft: 0,
          submitted: 0,
          under_review: 0,
          approved: 0,
          rejected: 0,
          converted: 0,
          cancelled: 0,
          on_hold: 0,
        } as Record<string, number>,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        } as Record<string, number>,
        equipmentDown: 0,
        safetyConcern: 0,
        pending: 0,
      };
      
      for (const req of requests) {
        if (req.status) {
          stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;
        }
        if (req.priority) {
          stats.byPriority[req.priority] = (stats.byPriority[req.priority] || 0) + 1;
        }
        if (req.is_equipment_down) stats.equipmentDown++;
        if (req.is_safety_concern) stats.safetyConcern++;
      }
      
      stats.pending = stats.byStatus.submitted + stats.byStatus.under_review;
      
      console.log('[useServiceRequestStats] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAlertStats() {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ['maintenance_alerts', 'stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('maintenance_alerts')
        .select('status, severity, alert_type')
        .eq('organization_id', organizationId);
      
      if (error) throw new Error(error.message);
      
      const alerts = data || [];
      
      const stats = {
        total: alerts.length,
        active: 0,
        acknowledged: 0,
        resolved: 0,
        bySeverity: {
          info: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        } as Record<string, number>,
        byType: {} as Record<string, number>,
      };
      
      for (const alert of alerts) {
        if (alert.status === 'active') stats.active++;
        if (alert.status === 'acknowledged') stats.acknowledged++;
        if (alert.status === 'resolved') stats.resolved++;
        if (alert.severity) {
          stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        }
        if (alert.alert_type) {
          stats.byType[alert.alert_type] = (stats.byType[alert.alert_type] || 0) + 1;
        }
      }
      
      console.log('[useAlertStats] Stats:', stats);
      return stats;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}
