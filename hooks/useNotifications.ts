import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

export type NotificationType = 
  | 'approval_request'
  | 'approval_approved'
  | 'approval_rejected'
  | 'po_status_change'
  | 'ses_submitted'
  | 'receiving_complete'
  | 'low_stock_alert'
  | 'work_order_assigned'
  | 'delegation_assigned'
  | 'delegation_revoked'
  | 'delegation_expiring'
  | 'delegation_activated'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  organizationId: string;
  employeeId?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  actionUrl?: string;
  actionLabel?: string;
  metadata: Record<string, any>;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  employeeId?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

interface MutationCallbacks<T = any> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

const mapNotificationFromDb = (row: any): Notification => ({
  id: row.id,
  organizationId: row.organization_id,
  employeeId: row.employee_id,
  title: row.title,
  message: row.message,
  type: row.type,
  priority: row.priority || 'medium',
  status: row.status,
  actionUrl: row.action_url,
  actionLabel: row.action_label,
  metadata: row.metadata || {},
  readAt: row.read_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useNotificationsQuery(options?: {
  status?: NotificationStatus;
  type?: NotificationType;
  limit?: number;
  enabled?: boolean;
}) {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['notifications', organizationId, user?.id, options],
    queryFn: async () => {
      if (!organizationId || !user?.id) return [];

      console.log('[useNotificationsQuery] Fetching notifications');

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Filter by employee_id if the column exists
      query = query.or(`employee_id.eq.${user.id},employee_id.is.null`);

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useNotificationsQuery] Error:', error);
        // If column doesn't exist, return empty array instead of crashing
        if (error.code === '42703') {
          console.warn('[useNotificationsQuery] employee_id column missing - run migration 025_add_notifications_employee_id.sql');
          return [];
        }
        throw error;
      }

      return (data || []).map(mapNotificationFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId && !!user?.id,
  });
}

export function useUnreadNotificationsCount() {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['notifications_count', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .or(`employee_id.eq.${user.id},employee_id.is.null`)
        .eq('status', 'unread');

      if (error) {
        console.error('[useUnreadNotificationsCount] Error:', error);
        // If column doesn't exist, return 0 instead of crashing
        if (error.code === '42703') {
          console.warn('[useUnreadNotificationsCount] employee_id column missing - run migration 025_add_notifications_employee_id.sql');
        }
        return 0;
      }

      return count || 0;
    },
    enabled: !!organizationId && !!user?.id,
  });
}

export function useCreateNotification(callbacks?: MutationCallbacks<Notification>) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useCreateNotification] Creating notification:', input.title);

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          organization_id: organizationId,
          employee_id: input.employeeId || null,
          title: input.title,
          message: input.message,
          type: input.type,
          priority: input.priority || 'medium',
          action_url: input.actionUrl || null,
          action_label: input.actionLabel || null,
          metadata: input.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateNotification] Error:', error);
        throw error;
      }

      return mapNotificationFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('[useCreateNotification] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useCreateBulkNotifications(callbacks?: MutationCallbacks<Notification[]>) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (inputs: CreateNotificationInput[]) => {
      if (!organizationId) throw new Error('No organization selected');

      console.log('[useCreateBulkNotifications] Creating', inputs.length, 'notifications');

      const records = inputs.map(input => ({
        organization_id: organizationId,
        employee_id: input.employeeId || null,
        title: input.title,
        message: input.message,
        type: input.type,
        priority: input.priority || 'medium',
        action_url: input.actionUrl || null,
        action_label: input.actionLabel || null,
        metadata: input.metadata || {},
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(records)
        .select();

      if (error) {
        console.error('[useCreateBulkNotifications] Error:', error);
        throw error;
      }

      return (data || []).map(mapNotificationFromDb);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('[useCreateBulkNotifications] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useMarkNotificationRead(callbacks?: MutationCallbacks<Notification>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('[useMarkNotificationRead] Marking as read:', notificationId);

      const { data, error } = await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.error('[useMarkNotificationRead] Error:', error);
        throw error;
      }

      return mapNotificationFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('[useMarkNotificationRead] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useMarkAllNotificationsRead(callbacks?: MutationCallbacks<number>) {
  const queryClient = useQueryClient();
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async () => {
      if (!organizationId || !user?.id) throw new Error('Missing context');

      console.log('[useMarkAllNotificationsRead] Marking all as read');

      const { data, error } = await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .or(`employee_id.eq.${user.id},employee_id.is.null`)
        .eq('status', 'unread')
        .select();

      if (error) {
        console.error('[useMarkAllNotificationsRead] Error:', error);
        throw error;
      }

      return data?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
      callbacks?.onSuccess?.(count);
    },
    onError: (error: Error) => {
      console.error('[useMarkAllNotificationsRead] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useArchiveNotification(callbacks?: MutationCallbacks<string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('[useArchiveNotification] Archiving:', notificationId);

      const { error } = await supabase
        .from('notifications')
        .update({ status: 'archived' })
        .eq('id', notificationId);

      if (error) {
        console.error('[useArchiveNotification] Error:', error);
        throw error;
      }

      return notificationId;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
      callbacks?.onSuccess?.(id);
    },
    onError: (error: Error) => {
      console.error('[useArchiveNotification] Mutation error:', error);
      callbacks?.onError?.(error);
    },
  });
}

export function useNotificationHelpers() {
  return {
    getNotificationTypeLabel: (type: NotificationType): string => {
      const labels: Record<NotificationType, string> = {
        approval_request: 'Approval Request',
        approval_approved: 'Approved',
        approval_rejected: 'Rejected',
        po_status_change: 'PO Status Change',
        ses_submitted: 'SES Submitted',
        receiving_complete: 'Receiving Complete',
        low_stock_alert: 'Low Stock Alert',
        work_order_assigned: 'Work Order Assigned',
        delegation_assigned: 'Delegation Assigned',
        delegation_revoked: 'Delegation Revoked',
        delegation_expiring: 'Delegation Expiring',
        delegation_activated: 'Delegation Activated',
        system: 'System',
      };
      return labels[type] || type;
    },
    getNotificationTypeColor: (type: NotificationType): string => {
      const colors: Record<NotificationType, string> = {
        approval_request: '#EC4899',
        approval_approved: '#10B981',
        approval_rejected: '#EF4444',
        po_status_change: '#8B5CF6',
        ses_submitted: '#06B6D4',
        receiving_complete: '#10B981',
        low_stock_alert: '#F59E0B',
        work_order_assigned: '#3B82F6',
        delegation_assigned: '#8B5CF6',
        delegation_revoked: '#EF4444',
        delegation_expiring: '#F59E0B',
        delegation_activated: '#10B981',
        system: '#6B7280',
      };
      return colors[type] || '#6B7280';
    },
    getPriorityColor: (priority: NotificationPriority): string => {
      const colors: Record<NotificationPriority, string> = {
        low: '#6B7280',
        medium: '#3B82F6',
        high: '#F59E0B',
        urgent: '#EF4444',
      };
      return colors[priority] || '#6B7280';
    },
  };
}
