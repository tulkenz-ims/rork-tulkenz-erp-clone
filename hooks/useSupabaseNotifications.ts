import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@/types/notifications';

export interface SupabaseNotification {
  id: string;
  organization_id: string;
  employee_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  employee_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
}

function mapSupabaseToNotification(sn: SupabaseNotification): Notification {
  return {
    id: sn.id,
    type: sn.type,
    title: sn.title,
    message: sn.message,
    priority: sn.priority,
    status: sn.status,
    createdAt: sn.created_at,
    readAt: sn.read_at || undefined,
    actionUrl: sn.action_url || undefined,
    actionLabel: sn.action_label || undefined,
    metadata: sn.metadata as Notification['metadata'],
  };
}

export function useNotifications(employeeId?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['notifications', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useNotifications] No organization ID');
        return [];
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useNotifications] Error:', JSON.stringify(error, null, 2));
        console.error('[useNotifications] Error code:', error.code);
        console.error('[useNotifications] Error message:', error.message);
        throw new Error(error.message || 'Failed to fetch notifications');
      }

      console.log(`[useNotifications] Fetched ${data?.length || 0} notifications`);
      return (data || []).map(mapSupabaseToNotification);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

export function useUnreadNotificationsCount(employeeId?: string) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['notifications-unread-count', organizationId, employeeId],
    queryFn: async () => {
      if (!organizationId) {
        return 0;
      }

      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'unread');

      if (employeeId) {
        query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('[useUnreadNotificationsCount] Error:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          organization_id: organizationId,
          employee_id: input.employee_id || null,
          type: input.type,
          title: input.title,
          message: input.message,
          priority: input.priority,
          status: 'unread',
          action_url: input.action_url || null,
          action_label: input.action_label || null,
          metadata: input.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateNotification] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateNotification] Created notification:', data.id);
      return mapSupabaseToNotification(data as SupabaseNotification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', organizationId] });
    },
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('organization_id', organizationId)
        .eq('status', 'unread')
        .select()
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[useMarkNotificationAsRead] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useMarkNotificationAsRead] Marked as read:', notificationId);
      return data ? mapSupabaseToNotification(data as SupabaseNotification) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', organizationId] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (employeeId?: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const now = new Date().toISOString();
      let query = supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: now,
          updated_at: now,
        })
        .eq('organization_id', organizationId)
        .eq('status', 'unread');

      if (employeeId) {
        query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
      }

      const { error } = await query;

      if (error) {
        console.error('[useMarkAllNotificationsAsRead] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useMarkAllNotificationsAsRead] All notifications marked as read');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', organizationId] });
    },
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useArchiveNotification] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useArchiveNotification] Archived notification:', notificationId);
      return mapSupabaseToNotification(data as SupabaseNotification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', organizationId] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[useDeleteNotification] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useDeleteNotification] Deleted notification:', notificationId);
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', organizationId] });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (employeeId?: string) => {
      if (!organizationId) {
        throw new Error('No organization ID');
      }

      let query = supabase
        .from('notifications')
        .delete()
        .eq('organization_id', organizationId);

      if (employeeId) {
        query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
      }

      const { error } = await query;

      if (error) {
        console.error('[useClearAllNotifications] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useClearAllNotifications] Cleared all notifications');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', organizationId] });
    },
  });
}

export function useCreateApprovalRequestNotification() {
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (data: {
      employeeId?: string;
      documentNumber: string;
      documentType: 'po' | 'ses';
      amount: number;
      requesterName: string;
      departmentName: string;
      vendorName?: string;
      documentId?: string;
    }) => {
      const isPO = data.documentType === 'po';
      return createNotification.mutateAsync({
        employee_id: data.employeeId,
        type: 'approval_request',
        title: isPO ? 'PO Approval Required' : 'SES Approval Required',
        message: `${data.documentNumber} from ${data.requesterName} requires your approval. Amount: $${data.amount.toLocaleString()}`,
        priority: data.amount > 10000 ? 'high' : 'medium',
        action_url: '/procurement/poapprovals',
        action_label: 'Review',
        metadata: {
          documentId: data.documentId,
          documentNumber: data.documentNumber,
          documentType: data.documentType,
          amount: data.amount,
          requesterName: data.requesterName,
          departmentName: data.departmentName,
          vendorName: data.vendorName,
        },
      });
    },
  });
}

export function useCreateApprovalResultNotification() {
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (data: {
      employeeId?: string;
      documentNumber: string;
      documentType: 'po' | 'ses';
      approved: boolean;
      reason?: string;
      amount?: number;
    }) => {
      const isPO = data.documentType === 'po';
      const docLabel = isPO ? 'PO' : 'SES';
      
      return createNotification.mutateAsync({
        employee_id: data.employeeId,
        type: data.approved ? 'approval_approved' : 'approval_rejected',
        title: data.approved ? `Your ${docLabel} Has Been Approved` : `${docLabel} Rejected`,
        message: data.approved
          ? `${data.documentNumber} has been approved${isPO ? ' and is ready for receiving' : ''}.`
          : `${data.documentNumber} has been rejected.${data.reason ? ` Reason: ${data.reason}` : ''}`,
        priority: data.approved ? 'medium' : 'high',
        action_url: data.approved ? '/procurement/receive' : undefined,
        action_label: data.approved ? 'View' : undefined,
        metadata: {
          documentNumber: data.documentNumber,
          documentType: data.documentType,
          amount: data.amount,
        },
      });
    },
  });
}

export function useCreateDelegationNotification() {
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (data: {
      employeeId?: string;
      notificationType: 'delegation_assigned' | 'delegation_revoked' | 'delegation_expiring' | 'delegation_activated';
      delegationId: string;
      delegatorName: string;
      delegatorId?: string;
      delegateName: string;
      delegateId?: string;
      delegationType?: string;
      startDate?: string;
      endDate?: string;
      daysRemaining?: number;
      isDelegator?: boolean;
      categories?: string[];
      reason?: string;
    }) => {
      let title = '';
      let message = '';
      let priority: NotificationPriority = 'medium';

      switch (data.notificationType) {
        case 'delegation_assigned':
          const categoryText = data.categories && data.categories.length > 0
            ? ` for ${data.categories.join(', ')}` : '';
          title = 'You Have Been Assigned as Delegate';
          message = `${data.delegatorName} has delegated their approval authority to you${categoryText}. Period: ${data.startDate} to ${data.endDate}.`;
          priority = 'high';
          break;
        case 'delegation_revoked':
          title = 'Delegation Has Been Revoked';
          message = `${data.delegatorName} has revoked your delegation authority.${data.reason ? ` Reason: ${data.reason}` : ''}`;
          priority = 'medium';
          break;
        case 'delegation_expiring':
          title = data.isDelegator
            ? 'Your Delegation is Expiring Soon'
            : 'Delegation Authority Expiring Soon';
          message = data.isDelegator
            ? `Your delegation to ${data.delegateName} expires in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''} (${data.endDate}).`
            : `Your delegation from ${data.delegatorName} expires in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''} (${data.endDate}).`;
          priority = 'medium';
          break;
        case 'delegation_activated':
          title = data.isDelegator
            ? 'Your Delegation is Now Active'
            : 'Delegation Authority Activated';
          message = data.isDelegator
            ? `Your delegation to ${data.delegateName} is now active. They can approve on your behalf.`
            : `You now have active delegation authority from ${data.delegatorName}. You can approve requests on their behalf.`;
          priority = 'medium';
          break;
      }

      return createNotification.mutateAsync({
        employee_id: data.employeeId,
        type: data.notificationType,
        title,
        message,
        priority,
        action_url: '/approvals/delegation',
        action_label: 'View Delegation',
        metadata: {
          delegationId: data.delegationId,
          delegatorName: data.delegatorName,
          delegatorId: data.delegatorId,
          delegateName: data.delegateName,
          delegateId: data.delegateId,
          delegationType: data.delegationType,
          startDate: data.startDate,
          endDate: data.endDate,
        },
      });
    },
  });
}
