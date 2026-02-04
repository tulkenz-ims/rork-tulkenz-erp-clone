import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationSummary,
} from '@/types/notifications';
import {
  useNotifications as useSupabaseNotificationsQuery,
  useCreateNotification,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useArchiveNotification,
  useDeleteNotification,
  useClearAllNotifications,
} from '@/hooks/useSupabaseNotifications';
import { useUser } from '@/contexts/UserContext';

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const { user } = useUser();
  const employeeId = user?.id;

  const { data: notifications = [], isLoading } = useSupabaseNotificationsQuery(employeeId);

  const createNotificationMutation = useCreateNotification();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const archiveNotificationMutation = useArchiveNotification();
  const deleteNotificationMutation = useDeleteNotification();
  const clearAllMutation = useClearAllNotifications();

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'status'>) => {
    console.log('Adding notification:', notification.title);
    createNotificationMutation.mutate({
      employee_id: employeeId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      action_url: notification.actionUrl,
      action_label: notification.actionLabel,
      metadata: notification.metadata,
    });
    return {
      ...notification,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'unread' as NotificationStatus,
    };
  }, [createNotificationMutation, employeeId]);

  const markAsRead = useCallback((notificationId: string) => {
    console.log('Marking notification as read:', notificationId);
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    console.log('Marking all notifications as read');
    markAllAsReadMutation.mutate(employeeId);
  }, [markAllAsReadMutation, employeeId]);

  const archiveNotification = useCallback((notificationId: string) => {
    console.log('Archiving notification:', notificationId);
    archiveNotificationMutation.mutate(notificationId);
  }, [archiveNotificationMutation]);

  const deleteNotification = useCallback((notificationId: string) => {
    console.log('Deleting notification:', notificationId);
    deleteNotificationMutation.mutate(notificationId);
  }, [deleteNotificationMutation]);

  const clearAllNotifications = useCallback(() => {
    console.log('Clearing all notifications');
    clearAllMutation.mutate(employeeId);
  }, [clearAllMutation, employeeId]);

  const createApprovalRequestNotification = useCallback((data: {
    documentNumber: string;
    documentType: 'po' | 'ses';
    amount: number;
    requesterName: string;
    departmentName: string;
    vendorName?: string;
    documentId?: string;
  }) => {
    const isPO = data.documentType === 'po';
    return addNotification({
      type: 'approval_request',
      title: isPO ? 'PO Approval Required' : 'SES Approval Required',
      message: `${data.documentNumber} from ${data.requesterName} requires your approval. Amount: $${data.amount.toLocaleString()}`,
      priority: data.amount > 10000 ? 'high' : 'medium',
      actionUrl: '/procurement/poapprovals',
      actionLabel: 'Review',
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
  }, [addNotification]);

  const createApprovalResultNotification = useCallback((data: {
    documentNumber: string;
    documentType: 'po' | 'ses';
    approved: boolean;
    reason?: string;
    amount?: number;
  }) => {
    const isPO = data.documentType === 'po';
    const docLabel = isPO ? 'PO' : 'SES';
    
    return addNotification({
      type: data.approved ? 'approval_approved' : 'approval_rejected',
      title: data.approved ? `Your ${docLabel} Has Been Approved` : `${docLabel} Rejected`,
      message: data.approved
        ? `${data.documentNumber} has been approved${isPO ? ' and is ready for receiving' : ''}.`
        : `${data.documentNumber} has been rejected.${data.reason ? ` Reason: ${data.reason}` : ''}`,
      priority: data.approved ? 'medium' : 'high',
      actionUrl: data.approved ? '/procurement/receive' : undefined,
      actionLabel: data.approved ? 'View' : undefined,
      metadata: {
        documentNumber: data.documentNumber,
        documentType: data.documentType,
        amount: data.amount,
      },
    });
  }, [addNotification]);

  const createReceivingNotification = useCallback((data: {
    documentNumber: string;
    itemCount: number;
    isPartial?: boolean;
  }) => {
    return addNotification({
      type: data.isPartial ? 'po_status_change' : 'receiving_complete',
      title: data.isPartial ? 'PO Partially Received' : 'Material Receipt Complete',
      message: data.isPartial
        ? `${data.documentNumber} has been partially received.`
        : `${data.documentNumber} has been fully received. ${data.itemCount} items added to inventory.`,
      priority: 'low',
      actionUrl: '/inventory',
      actionLabel: 'View Inventory',
      metadata: {
        documentNumber: data.documentNumber,
        documentType: 'po',
      },
    });
  }, [addNotification]);

  const createDelegationAssignedNotification = useCallback((data: {
    delegationId: string;
    delegatorName: string;
    delegatorId: string;
    delegateName: string;
    delegateId: string;
    delegationType: string;
    startDate: string;
    endDate: string;
    categories?: string[];
  }) => {
    const categoryText = data.categories && data.categories.length > 0
      ? ` for ${data.categories.join(', ')}` : '';
    return addNotification({
      type: 'delegation_assigned',
      title: 'You Have Been Assigned as Delegate',
      message: `${data.delegatorName} has delegated their approval authority to you${categoryText}. Period: ${data.startDate} to ${data.endDate}.`,
      priority: 'high',
      actionUrl: '/approvals/delegation',
      actionLabel: 'View Delegation',
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
  }, [addNotification]);

  const createDelegationRevokedNotification = useCallback((data: {
    delegationId: string;
    delegatorName: string;
    delegateName: string;
    reason?: string;
  }) => {
    return addNotification({
      type: 'delegation_revoked',
      title: 'Delegation Has Been Revoked',
      message: `${data.delegatorName} has revoked your delegation authority.${data.reason ? ` Reason: ${data.reason}` : ''}`,
      priority: 'medium',
      actionUrl: '/approvals/delegation',
      actionLabel: 'View Details',
      metadata: {
        delegationId: data.delegationId,
        delegatorName: data.delegatorName,
        delegateName: data.delegateName,
      },
    });
  }, [addNotification]);

  const createDelegationExpiringNotification = useCallback((data: {
    delegationId: string;
    delegatorName: string;
    delegateName: string;
    endDate: string;
    daysRemaining: number;
    isDelegator: boolean;
  }) => {
    const title = data.isDelegator
      ? 'Your Delegation is Expiring Soon'
      : 'Delegation Authority Expiring Soon';
    const message = data.isDelegator
      ? `Your delegation to ${data.delegateName} expires in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''} (${data.endDate}).`
      : `Your delegation from ${data.delegatorName} expires in ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''} (${data.endDate}).`;
    return addNotification({
      type: 'delegation_expiring',
      title,
      message,
      priority: 'medium',
      actionUrl: '/approvals/delegation',
      actionLabel: 'Manage Delegation',
      metadata: {
        delegationId: data.delegationId,
        delegatorName: data.delegatorName,
        delegateName: data.delegateName,
        endDate: data.endDate,
      },
    });
  }, [addNotification]);

  const createDelegationActivatedNotification = useCallback((data: {
    delegationId: string;
    delegatorName: string;
    delegateName: string;
    isDelegator: boolean;
  }) => {
    const title = data.isDelegator
      ? 'Your Delegation is Now Active'
      : 'Delegation Authority Activated';
    const message = data.isDelegator
      ? `Your delegation to ${data.delegateName} is now active. They can approve on your behalf.`
      : `You now have active delegation authority from ${data.delegatorName}. You can approve requests on their behalf.`;
    return addNotification({
      type: 'delegation_activated',
      title,
      message,
      priority: 'medium',
      actionUrl: '/approvals/delegation',
      actionLabel: 'View Delegation',
      metadata: {
        delegationId: data.delegationId,
        delegatorName: data.delegatorName,
        delegateName: data.delegateName,
      },
    });
  }, [addNotification]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => n.status === 'unread').length,
  [notifications]);

  const unreadNotifications = useMemo(() =>
    notifications.filter(n => n.status === 'unread'),
  [notifications]);

  const readNotifications = useMemo(() =>
    notifications.filter(n => n.status === 'read'),
  [notifications]);

  const activeNotifications = useMemo(() =>
    notifications.filter(n => n.status !== 'archived'),
  [notifications]);

  const pendingApprovalCount = useMemo(() =>
    notifications.filter(n => 
      n.status === 'unread' && n.type === 'approval_request'
    ).length,
  [notifications]);

  const summary: NotificationSummary = useMemo(() => {
    const byType = {} as Record<NotificationType, number>;
    const byPriority = {} as Record<NotificationPriority, number>;

    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      if (n.status === 'unread') {
        byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
      }
    });

    return {
      total: notifications.length,
      unread: unreadCount,
      byType,
      byPriority,
    };
  }, [notifications, unreadCount]);

  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const getRecentNotifications = useCallback((limit: number = 10) => {
    return activeNotifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [activeNotifications]);

  return {
    notifications,
    isLoading,
    unreadCount,
    unreadNotifications,
    readNotifications,
    activeNotifications,
    pendingApprovalCount,
    summary,
    addNotification,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    clearAllNotifications,
    createApprovalRequestNotification,
    createApprovalResultNotification,
    createReceivingNotification,
    createDelegationAssignedNotification,
    createDelegationRevokedNotification,
    createDelegationExpiringNotification,
    createDelegationActivatedNotification,
    getNotificationsByType,
    getRecentNotifications,
  };
});
