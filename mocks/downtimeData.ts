export type DowntimeType = 'unplanned' | 'planned' | 'changeover' | 'maintenance';
export type DowntimeStatus = 'active' | 'resolved' | 'cancelled';

export interface DowntimeEvent {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentTag: string;
  workOrderId?: string;
  workOrderNumber?: string;
  downtimeType: DowntimeType;
  status: DowntimeStatus;
  failureCodeId?: string;
  failureCodeName?: string;
  rootCause?: string;
  description: string;
  started_at: string;
  resumed_at?: string;
  duration_minutes?: number;
  reportedBy: string;
  reportedByName: string;
  resolvedBy?: string;
  resolvedByName?: string;
  notes?: string;
  productionImpact?: number;
  createdAt: string;
  updatedAt?: string;
}

export const DOWNTIME_TYPE_COLORS: Record<DowntimeType, string> = {
  unplanned: '#EF4444',
  planned: '#3B82F6',
  changeover: '#F59E0B',
  maintenance: '#10B981',
};

export const DOWNTIME_STATUS_COLORS: Record<DowntimeStatus, string> = {
  active: '#EF4444',
  resolved: '#10B981',
  cancelled: '#6B7280',
};
