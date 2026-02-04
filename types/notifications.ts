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
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: {
    documentId?: string;
    documentNumber?: string;
    documentType?: 'po' | 'ses' | 'wo' | 'material';
    amount?: number;
    requesterName?: string;
    departmentName?: string;
    vendorName?: string;
    delegationId?: string;
    delegatorName?: string;
    delegatorId?: string;
    delegateName?: string;
    delegateId?: string;
    delegationType?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  approval_request: {
    label: 'Approval Request',
    icon: 'ClipboardCheck',
    color: '#F59E0B',
    bgColor: '#F59E0B15',
  },
  approval_approved: {
    label: 'Approved',
    icon: 'CheckCircle',
    color: '#10B981',
    bgColor: '#10B98115',
  },
  approval_rejected: {
    label: 'Rejected',
    icon: 'XCircle',
    color: '#EF4444',
    bgColor: '#EF444415',
  },
  po_status_change: {
    label: 'PO Update',
    icon: 'FileText',
    color: '#3B82F6',
    bgColor: '#3B82F615',
  },
  ses_submitted: {
    label: 'SES Submitted',
    icon: 'ClipboardList',
    color: '#8B5CF6',
    bgColor: '#8B5CF615',
  },
  receiving_complete: {
    label: 'Received',
    icon: 'Package',
    color: '#10B981',
    bgColor: '#10B98115',
  },
  low_stock_alert: {
    label: 'Low Stock',
    icon: 'AlertTriangle',
    color: '#F59E0B',
    bgColor: '#F59E0B15',
  },
  work_order_assigned: {
    label: 'Work Order',
    icon: 'Wrench',
    color: '#6366F1',
    bgColor: '#6366F115',
  },
  system: {
    label: 'System',
    icon: 'Bell',
    color: '#6B7280',
    bgColor: '#6B728015',
  },
  delegation_assigned: {
    label: 'Delegation Assigned',
    icon: 'UserCheck',
    color: '#10B981',
    bgColor: '#10B98115',
  },
  delegation_revoked: {
    label: 'Delegation Revoked',
    icon: 'UserX',
    color: '#EF4444',
    bgColor: '#EF444415',
  },
  delegation_expiring: {
    label: 'Delegation Expiring',
    icon: 'Clock',
    color: '#F59E0B',
    bgColor: '#F59E0B15',
  },
  delegation_activated: {
    label: 'Delegation Active',
    icon: 'Shield',
    color: '#3B82F6',
    bgColor: '#3B82F615',
  },
};

export const PRIORITY_CONFIG: Record<NotificationPriority, {
  label: string;
  color: string;
  weight: number;
}> = {
  urgent: { label: 'Urgent', color: '#EF4444', weight: 4 },
  high: { label: 'High', color: '#F59E0B', weight: 3 },
  medium: { label: 'Medium', color: '#3B82F6', weight: 2 },
  low: { label: 'Low', color: '#6B7280', weight: 1 },
};
