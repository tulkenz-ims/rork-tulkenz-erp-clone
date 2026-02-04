// NCR Types
export type NCRType = 'product' | 'process' | 'supplier' | 'customer' | 'internal' | 'regulatory';
export type NCRSeverity = 'minor' | 'major' | 'critical';
export type NCRStatus = 'open' | 'investigation' | 'containment' | 'root_cause' | 'corrective_action' | 'verification' | 'closed' | 'rejected';
export type NCRSource = 'incoming_inspection' | 'in_process' | 'final_inspection' | 'customer_complaint' | 'audit' | 'supplier' | 'internal' | 'other';
export type NCRDisposition = 'use_as_is' | 'rework' | 'scrap' | 'return_to_supplier' | 'downgrade' | 'hold' | 'other';

export interface NCRRecord {
  id: string;
  organization_id: string;
  ncr_number: string;
  title: string;
  description: string;
  ncr_type: NCRType;
  severity: NCRSeverity;
  status: NCRStatus;
  source: NCRSource | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  quantity_affected: number | null;
  unit_of_measure: string | null;
  discovered_date: string;
  discovered_by: string;
  discovered_by_id: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  root_cause: string | null;
  root_cause_category: string | null;
  containment_actions: string | null;
  containment_date: string | null;
  corrective_actions: string | null;
  corrective_action_date: string | null;
  preventive_actions: string | null;
  verification_method: string | null;
  verification_date: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  disposition: NCRDisposition | null;
  disposition_notes: string | null;
  cost_impact: number | null;
  customer_notified: boolean;
  customer_notification_date: string | null;
  capa_required: boolean;
  capa_id: string | null;
  attachments: unknown[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// CAPA Types
export type CAPAType = 'corrective' | 'preventive' | 'both';
export type CAPAPriority = 'low' | 'medium' | 'high' | 'critical';
export type CAPAStatus = 'open' | 'investigation' | 'action_planning' | 'implementation' | 'verification' | 'effectiveness_review' | 'closed' | 'cancelled';
export type CAPASource = 'ncr' | 'audit' | 'customer_complaint' | 'near_miss' | 'trend_analysis' | 'management_review' | 'regulatory' | 'other';
export type RootCauseMethod = '5_whys' | 'fishbone' | 'fmea' | 'fault_tree' | 'pareto' | 'other';

export interface CAPAActionItem {
  id: string;
  description: string;
  assigned_to: string;
  assigned_to_id?: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completed_date?: string;
  notes?: string;
}

export interface CAPARecord {
  id: string;
  organization_id: string;
  capa_number: string;
  title: string;
  description: string;
  capa_type: CAPAType;
  priority: CAPAPriority;
  status: CAPAStatus;
  source: CAPASource | null;
  source_reference: string | null;
  source_id: string | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  initiated_date: string;
  initiated_by: string;
  initiated_by_id: string | null;
  owner: string | null;
  owner_id: string | null;
  problem_statement: string | null;
  immediate_containment: string | null;
  root_cause_analysis: string | null;
  root_cause_method: RootCauseMethod | null;
  root_cause_summary: string | null;
  action_plan: CAPAActionItem[];
  target_completion_date: string | null;
  actual_completion_date: string | null;
  verification_plan: string | null;
  verification_results: string | null;
  verification_date: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  effectiveness_criteria: string | null;
  effectiveness_review_date: string | null;
  effectiveness_results: string | null;
  effectiveness_verified_by: string | null;
  effectiveness_verified_by_id: string | null;
  is_effective: boolean | null;
  recurrence_check_date: string | null;
  recurrence_notes: string | null;
  related_ncrs: string[];
  related_capas: string[];
  attachments: unknown[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Temperature Log Types
export type TemperatureLogType = 'cooler' | 'freezer' | 'hot_holding' | 'receiving' | 'cooking' | 'cooling' | 'ambient' | 'storage' | 'transport';
export type TemperatureUnit = 'F' | 'C';

export interface TemperatureLog {
  id: string;
  organization_id: string;
  log_type: TemperatureLogType;
  location_name: string;
  location_id: string | null;
  equipment_name: string | null;
  equipment_id: string | null;
  reading_date: string;
  reading_time: string;
  temperature: number;
  temperature_unit: TemperatureUnit;
  min_limit: number | null;
  max_limit: number | null;
  is_within_limits: boolean | null;
  out_of_range: boolean;
  corrective_action: string | null;
  corrective_action_taken_by: string | null;
  corrective_action_time: string | null;
  recorded_by: string;
  recorded_by_id: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  notes: string | null;
  created_at: string;
}

// Hold Tag Types
export type HoldTagStatus = 'on_hold' | 'released' | 'scrapped' | 'reworked' | 'returned';
export type HoldTagType = 'quality' | 'regulatory' | 'customer' | 'supplier' | 'investigation' | 'recall' | 'other';
export type HoldTagDisposition = 'release' | 'scrap' | 'rework' | 'return_to_supplier' | 'downgrade' | 'other';

export interface HoldTag {
  id: string;
  organization_id: string;
  hold_tag_number: string;
  status: HoldTagStatus;
  hold_type: HoldTagType;
  reason: string;
  product_name: string;
  product_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity: number;
  unit_of_measure: string;
  location: string | null;
  facility_id: string | null;
  hold_date: string;
  held_by: string;
  held_by_id: string | null;
  expected_resolution_date: string | null;
  ncr_id: string | null;
  ncr_number: string | null;
  capa_id: string | null;
  capa_number: string | null;
  disposition: HoldTagDisposition | null;
  disposition_reason: string | null;
  disposition_date: string | null;
  disposition_by: string | null;
  disposition_by_id: string | null;
  disposition_quantity: number | null;
  released_quantity: number | null;
  scrapped_quantity: number | null;
  reworked_quantity: number | null;
  returned_quantity: number | null;
  attachments: unknown[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Quality Inspection Types
export type QualityInspectionType = 'incoming' | 'in_process' | 'final' | 'pre_shipment' | 'first_article' | 'periodic' | 'customer' | 'supplier' | 'audit';
export type QualityInspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type QualityInspectionResult = 'pass' | 'fail' | 'conditional' | 'pending';

export interface QualityInspection {
  id: string;
  organization_id: string;
  inspection_number: string;
  inspection_type: QualityInspectionType;
  status: QualityInspectionStatus;
  result: QualityInspectionResult | null;
  facility_id: string | null;
  department_code: string | null;
  location: string | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  batch_number: string | null;
  quantity_inspected: number | null;
  quantity_accepted: number | null;
  quantity_rejected: number | null;
  sample_size: number | null;
  aql_level: string | null;
  scheduled_date: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_id: string | null;
  template_id: string | null;
  checklist_items: unknown[];
  measurements: unknown[];
  defects_found: unknown[];
  supplier_name: string | null;
  supplier_id: string | null;
  po_number: string | null;
  customer_name: string | null;
  order_number: string | null;
  ncr_required: boolean;
  ncr_id: string | null;
  ncr_number: string | null;
  attachments: unknown[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Customer Complaint Types
export type CustomerComplaintStatus = 'new' | 'acknowledged' | 'investigation' | 'resolution' | 'closed' | 'rejected';
export type CustomerComplaintType = 'product_quality' | 'foreign_material' | 'allergen' | 'labeling' | 'packaging' | 'delivery' | 'service' | 'safety' | 'other';
export type CustomerComplaintReceivedMethod = 'phone' | 'email' | 'letter' | 'social_media' | 'in_person' | 'other';
export type CustomerComplaintResolutionType = 'replacement' | 'refund' | 'credit' | 'apology' | 'no_action' | 'other';

export interface CustomerComplaint {
  id: string;
  organization_id: string;
  complaint_number: string;
  status: CustomerComplaintStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complaint_type: CustomerComplaintType;
  customer_name: string;
  customer_contact: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  received_date: string;
  received_by: string;
  received_by_id: string | null;
  received_method: CustomerComplaintReceivedMethod | null;
  product_name: string | null;
  product_code: string | null;
  lot_number: string | null;
  purchase_date: string | null;
  purchase_location: string | null;
  complaint_description: string;
  sample_available: boolean;
  sample_received_date: string | null;
  illness_reported: boolean;
  injury_reported: boolean;
  medical_attention_sought: boolean;
  regulatory_notification_required: boolean;
  regulatory_notification_date: string | null;
  facility_id: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  investigation_summary: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  customer_response: string | null;
  customer_response_date: string | null;
  resolution_type: CustomerComplaintResolutionType | null;
  resolution_notes: string | null;
  ncr_id: string | null;
  ncr_number: string | null;
  capa_id: string | null;
  capa_number: string | null;
  attachments: unknown[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Deviation Types
export type DeviationType = 'planned' | 'unplanned';
export type DeviationCategory = 'process' | 'equipment' | 'material' | 'environmental' | 'documentation' | 'other';
export type DeviationSeverity = 'minor' | 'major' | 'critical';
export type DeviationStatus = 'open' | 'pending_approval' | 'approved' | 'rejected' | 'implemented' | 'closed';

export interface DeviationRecord {
  id: string;
  organization_id: string;
  deviation_number: string;
  title: string;
  description: string;
  deviation_type: DeviationType;
  category: DeviationCategory | null;
  severity: DeviationSeverity;
  status: DeviationStatus;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  process_affected: string | null;
  product_affected: string | null;
  lot_numbers_affected: string[];
  start_date: string;
  end_date: string | null;
  duration_hours: number | null;
  requested_by: string;
  requested_by_id: string | null;
  justification: string | null;
  risk_assessment: string | null;
  mitigation_measures: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  impact_assessment: string | null;
  capa_required: boolean;
  capa_id: string | null;
  capa_number: string | null;
  attachments: unknown[];
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Labels
export const NCR_STATUS_LABELS: Record<NCRStatus, string> = {
  open: 'Open',
  investigation: 'Investigation',
  containment: 'Containment',
  root_cause: 'Root Cause Analysis',
  corrective_action: 'Corrective Action',
  verification: 'Verification',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const NCR_STATUS_COLORS: Record<NCRStatus, string> = {
  open: '#EF4444',
  investigation: '#F59E0B',
  containment: '#F97316',
  root_cause: '#8B5CF6',
  corrective_action: '#3B82F6',
  verification: '#06B6D4',
  closed: '#10B981',
  rejected: '#6B7280',
};

export const CAPA_STATUS_LABELS: Record<CAPAStatus, string> = {
  open: 'Open',
  investigation: 'Investigation',
  action_planning: 'Action Planning',
  implementation: 'Implementation',
  verification: 'Verification',
  effectiveness_review: 'Effectiveness Review',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const HOLD_TAG_STATUS_LABELS: Record<HoldTagStatus, string> = {
  on_hold: 'On Hold',
  released: 'Released',
  scrapped: 'Scrapped',
  reworked: 'Reworked',
  returned: 'Returned',
};

export const HOLD_TAG_STATUS_COLORS: Record<HoldTagStatus, string> = {
  on_hold: '#EF4444',
  released: '#10B981',
  scrapped: '#6B7280',
  reworked: '#F59E0B',
  returned: '#8B5CF6',
};
