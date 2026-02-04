// Service Request Types
export type ServiceRequestType = 'repair' | 'maintenance' | 'installation' | 'inspection' | 'modification' | 'emergency' | 'other';
export type ServiceRequestPriority = 'low' | 'medium' | 'high' | 'critical';
export type ServiceRequestUrgency = 'low' | 'normal' | 'high' | 'urgent';
export type ServiceRequestStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted' | 'cancelled' | 'on_hold';

export interface ServiceRequest {
  id: string;
  organization_id: string;
  request_number: string;
  title: string;
  description: string;
  request_type: ServiceRequestType;
  priority: ServiceRequestPriority;
  urgency: ServiceRequestUrgency;
  status: ServiceRequestStatus;
  requester_id: string;
  requester_name: string;
  requester_department: string | null;
  requester_phone: string | null;
  requester_email: string | null;
  facility_id: string | null;
  facility_name: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_tag: string | null;
  location: string | null;
  room_area: string | null;
  problem_started: string | null;
  is_equipment_down: boolean;
  is_safety_concern: boolean;
  is_production_impact: boolean;
  production_impact_description: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  converted_at: string | null;
  converted_by: string | null;
  converted_by_name: string | null;
  preferred_date: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  availability_notes: string | null;
  estimated_cost: number | null;
  estimated_hours: number | null;
  requires_parts: boolean;
  parts_description: string | null;
  attachments: unknown[];
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Maintenance Alert Types
export type MaintenanceAlertType = 
  | 'pm_due'
  | 'pm_overdue'
  | 'equipment_down'
  | 'equipment_critical'
  | 'meter_threshold'
  | 'warranty_expiring'
  | 'calibration_due'
  | 'inspection_due'
  | 'part_needed'
  | 'safety_concern'
  | 'compliance_deadline'
  | 'work_order_overdue'
  | 'recurring_failure'
  | 'high_downtime'
  | 'budget_threshold'
  | 'custom';

export type MaintenanceAlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceAlertStatus = 'active' | 'acknowledged' | 'snoozed' | 'resolved' | 'dismissed' | 'expired';
export type MaintenanceAlertThresholdType = 'above' | 'below' | 'equal' | 'approaching';

export interface MaintenanceAlert {
  id: string;
  organization_id: string;
  alert_type: MaintenanceAlertType;
  severity: MaintenanceAlertSeverity;
  status: MaintenanceAlertStatus;
  title: string;
  message: string;
  details: Record<string, unknown>;
  facility_id: string | null;
  facility_name: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_tag: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  pm_schedule_id: string | null;
  metric_name: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  threshold_type: MaintenanceAlertThresholdType | null;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  snoozed_until: string | null;
  snoozed_by: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  dismissed_by: string | null;
  dismissed_at: string | null;
  dismiss_reason: string | null;
  notified_users: string[];
  notification_sent_at: string | null;
  escalated: boolean;
  escalated_at: string | null;
  escalated_to: string | null;
  is_auto_generated: boolean;
  generated_by: string | null;
  is_recurring: boolean;
  recurrence_count: number;
  last_occurrence: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Maintenance Activity Log Types
export type MaintenanceActivityType = 
  | 'work_order_created'
  | 'work_order_started'
  | 'work_order_completed'
  | 'work_order_cancelled'
  | 'work_order_assigned'
  | 'work_order_reassigned'
  | 'work_order_updated'
  | 'pm_completed'
  | 'pm_skipped'
  | 'pm_rescheduled'
  | 'equipment_status_change'
  | 'equipment_down'
  | 'equipment_restored'
  | 'part_issued'
  | 'part_returned'
  | 'meter_reading'
  | 'inspection_completed'
  | 'safety_check'
  | 'calibration_completed'
  | 'service_request_submitted'
  | 'service_request_approved'
  | 'service_request_rejected'
  | 'service_request_converted'
  | 'alert_created'
  | 'alert_acknowledged'
  | 'alert_resolved'
  | 'comment_added'
  | 'attachment_added'
  | 'labor_logged'
  | 'cost_recorded'
  | 'other';

export interface MaintenanceActivityLog {
  id: string;
  organization_id: string;
  activity_type: MaintenanceActivityType;
  facility_id: string | null;
  facility_name: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_tag: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  pm_schedule_id: string | null;
  pm_work_order_id: string | null;
  service_request_id: string | null;
  service_request_number: string | null;
  description: string;
  details: Record<string, unknown>;
  previous_value: string | null;
  new_value: string | null;
  performed_by: string;
  performed_by_name: string;
  performed_at: string;
  labor_hours: number | null;
  labor_cost: number | null;
  parts_used: unknown[];
  parts_cost: number | null;
  location: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Equipment Downtime Log Types
export type DowntimeType = 
  | 'breakdown'
  | 'planned_maintenance'
  | 'pm_scheduled'
  | 'emergency_repair'
  | 'waiting_parts'
  | 'waiting_approval'
  | 'operator_error'
  | 'setup_changeover'
  | 'calibration'
  | 'inspection'
  | 'power_outage'
  | 'utility_failure'
  | 'safety_stop'
  | 'quality_issue'
  | 'material_shortage'
  | 'no_operator'
  | 'external_factor'
  | 'unknown'
  | 'other';

export type DowntimeImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type DowntimeStatus = 'ongoing' | 'resolved' | 'pending_parts' | 'pending_approval';

export interface EquipmentDowntimeLog {
  id: string;
  organization_id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  facility_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  downtime_type: DowntimeType;
  reason: string;
  root_cause: string | null;
  impact_level: DowntimeImpactLevel;
  production_impact: boolean;
  production_loss_units: number | null;
  production_loss_cost: number | null;
  work_order_id: string | null;
  work_order_number: string | null;
  service_request_id: string | null;
  repair_actions: string | null;
  parts_replaced: unknown[];
  labor_hours: number | null;
  repair_cost: number | null;
  reported_by: string;
  reported_by_name: string;
  repaired_by: string | null;
  repaired_by_name: string | null;
  failure_code: string | null;
  failure_category: string | null;
  is_recurring: boolean;
  previous_failure_id: string | null;
  status: DowntimeStatus;
  notes: string | null;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
}

// Maintenance Metrics Types
export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface MaintenanceMetrics {
  id: string;
  organization_id: string;
  facility_id: string | null;
  equipment_id: string | null;
  metric_date: string;
  metric_period: MetricPeriod;
  work_orders_created: number;
  work_orders_completed: number;
  work_orders_overdue: number;
  avg_completion_time_hours: number | null;
  pms_scheduled: number;
  pms_completed: number;
  pms_overdue: number;
  pm_compliance_rate: number | null;
  total_downtime_minutes: number;
  planned_downtime_minutes: number;
  unplanned_downtime_minutes: number;
  availability_rate: number | null;
  mtbf_hours: number | null;
  mttr_hours: number | null;
  service_requests_submitted: number;
  service_requests_approved: number;
  service_requests_rejected: number;
  avg_request_response_hours: number | null;
  labor_cost: number;
  parts_cost: number;
  contractor_cost: number;
  total_maintenance_cost: number;
  total_labor_hours: number;
  reactive_labor_hours: number;
  preventive_labor_hours: number;
  alerts_generated: number;
  alerts_acknowledged: number;
  alerts_resolved: number;
  avg_alert_response_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// Labels
export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted to WO',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

export const SERVICE_REQUEST_STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  draft: '#6B7280',
  submitted: '#3B82F6',
  under_review: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  converted: '#8B5CF6',
  cancelled: '#DC2626',
  on_hold: '#F97316',
};

export const MAINTENANCE_ALERT_SEVERITY_COLORS: Record<MaintenanceAlertSeverity, string> = {
  info: '#6B7280',
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};
