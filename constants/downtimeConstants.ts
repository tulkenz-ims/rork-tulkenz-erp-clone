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
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  start_time: string;
  end_time?: string;
  reason: DowntimeReason;
  reason_detail?: string;
  impact: DowntimeImpact;
  notes?: string;
  work_order_number?: string;
  reported_by: string;
  reported_by_name: string;
  resolved_by?: string;
  resolved_by_name?: string;
  created_at: string;
  updated_at: string;
  status: DowntimeStatus;
  production_stopped?: boolean;
}

export const DOWNTIME_REASONS: { value: DowntimeReason; label: string; color: string }[] = [
  { value: 'breakdown', label: 'Equipment Breakdown', color: '#DC2626' },
  { value: 'planned_maintenance', label: 'Planned Maintenance', color: '#3B82F6' },
  { value: 'changeover', label: 'Changeover/Setup', color: '#8B5CF6' },
  { value: 'no_operator', label: 'No Operator Available', color: '#F59E0B' },
  { value: 'material_shortage', label: 'Material Shortage', color: '#EF4444' },
  { value: 'quality_issue', label: 'Quality Issue', color: '#10B981' },
  { value: 'utility_failure', label: 'Utility Failure', color: '#6366F1' },
  { value: 'safety_stop', label: 'Safety Stop', color: '#DC2626' },
  { value: 'calibration', label: 'Calibration', color: '#14B8A6' },
  { value: 'other', label: 'Other', color: '#6B7280' },
] as const;

export const DOWNTIME_IMPACTS: { value: DowntimeImpact; label: string; color: string }[] = [
  { value: 'production', label: 'Production', color: '#DC2626' },
  { value: 'quality', label: 'Quality', color: '#F59E0B' },
  { value: 'safety', label: 'Safety', color: '#EF4444' },
  { value: 'minor', label: 'Minor', color: '#10B981' },
] as const;

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

export const MOCK_DOWNTIME_EVENTS: DowntimeEvent[] = [
  {
    id: 'dt-001',
    equipment_id: 'eq-001',
    equipment_name: 'Mixer #1',
    equipment_tag: 'MIX-001',
    start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reason: 'breakdown',
    reason_detail: 'Motor overheating - awaiting replacement parts',
    impact: 'production',
    reported_by: 'user-001',
    reported_by_name: 'John Smith',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'ongoing',
    production_stopped: true,
  },
  {
    id: 'dt-002',
    equipment_id: 'eq-003',
    equipment_name: 'Packaging Machine',
    equipment_tag: 'PKG-001',
    start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    reason: 'changeover',
    reason_detail: 'Product changeover for new batch',
    impact: 'minor',
    reported_by: 'user-002',
    reported_by_name: 'Jane Doe',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'ongoing',
    production_stopped: false,
  },
  {
    id: 'dt-003',
    equipment_id: 'eq-002',
    equipment_name: 'Conveyor Belt A',
    equipment_tag: 'CONV-001',
    start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    reason: 'planned_maintenance',
    reason_detail: 'Scheduled belt replacement',
    impact: 'production',
    work_order_number: 'WO-2024-0156',
    reported_by: 'user-001',
    reported_by_name: 'John Smith',
    resolved_by: 'user-003',
    resolved_by_name: 'Mike Johnson',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    production_stopped: true,
  },
  {
    id: 'dt-004',
    equipment_id: 'eq-004',
    equipment_name: 'Refrigeration Unit #2',
    equipment_tag: 'REF-002',
    start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    reason: 'utility_failure',
    reason_detail: 'Power surge caused compressor shutdown',
    impact: 'quality',
    work_order_number: 'WO-2024-0148',
    reported_by: 'user-002',
    reported_by_name: 'Jane Doe',
    resolved_by: 'user-001',
    resolved_by_name: 'John Smith',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    production_stopped: false,
  },
];

export interface EquipmentForDowntime {
  id: string;
  name: string;
  asset_tag: string;
  location: string;
  hierarchy_level: string;
}

export const MOCK_EQUIPMENT_FOR_DOWNTIME: EquipmentForDowntime[] = [
  { id: 'eq-001', name: 'Mixer #1', asset_tag: 'MIX-001', location: 'Production Line 1', hierarchy_level: 'equipment' },
  { id: 'eq-002', name: 'Conveyor Belt A', asset_tag: 'CONV-001', location: 'Production Line 1', hierarchy_level: 'equipment' },
  { id: 'eq-003', name: 'Packaging Machine', asset_tag: 'PKG-001', location: 'Packaging Area', hierarchy_level: 'equipment' },
  { id: 'eq-004', name: 'Refrigeration Unit #2', asset_tag: 'REF-002', location: 'Cold Storage', hierarchy_level: 'equipment' },
  { id: 'eq-005', name: 'Forklift #3', asset_tag: 'FLT-003', location: 'Warehouse', hierarchy_level: 'equipment' },
];
