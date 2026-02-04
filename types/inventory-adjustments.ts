export interface AdjustmentReason {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  category: 'increase' | 'decrease' | 'transfer' | 'correction' | 'damage' | 'expiration' | 'theft' | 'other';
  requires_approval: boolean;
  approval_threshold: number | null;
  requires_notes: boolean;
  requires_photo: boolean;
  default_gl_account: string | null;
  affects_cost: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryAdjustment {
  id: string;
  organization_id: string;
  adjustment_number: string;
  material_id: string;
  material_number: string;
  material_name: string;
  material_sku: string;
  facility_id: string | null;
  facility_name: string | null;
  location: string | null;
  adjustment_type: 'increase' | 'decrease' | 'correction' | 'write_off' | 'transfer_in' | 'transfer_out';
  reason_id: string | null;
  reason_code: string;
  reason_name: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  unit_of_measure: string;
  unit_cost: number | null;
  total_cost_impact: number | null;
  gl_account: string | null;
  cost_center: string | null;
  status: 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'reversed';
  requires_approval: boolean;
  performed_by: string;
  performed_by_id: string | null;
  performed_at: string;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  posted_at: string | null;
  posted_by: string | null;
  posted_by_id: string | null;
  journal_entry_id: string | null;
  reversed_at: string | null;
  reversed_by: string | null;
  reversed_by_id: string | null;
  reversal_reason: string | null;
  reversal_adjustment_id: string | null;
  count_session_id: string | null;
  work_order_id: string | null;
  photo_url: string | null;
  attachments: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VarianceRecord {
  id: string;
  organization_id: string;
  variance_number: string;
  source_type: 'cycle_count' | 'physical_inventory' | 'spot_check' | 'audit';
  count_session_id: string | null;
  material_id: string;
  material_number: string;
  material_name: string;
  material_sku: string;
  facility_id: string | null;
  facility_name: string | null;
  location: string | null;
  system_quantity: number;
  counted_quantity: number;
  variance_quantity: number;
  variance_percent: number | null;
  unit_of_measure: string;
  unit_cost: number | null;
  variance_cost: number | null;
  variance_type: 'overage' | 'shortage' | 'none';
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  status: 'pending_review' | 'under_investigation' | 'approved' | 'rejected' | 'adjusted' | 'written_off';
  counted_by: string;
  counted_by_id: string | null;
  counted_at: string;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  root_cause: string | null;
  root_cause_category: 'counting_error' | 'system_error' | 'theft' | 'damage' | 'expiration' | 'receiving_error' | 'issuing_error' | 'unknown' | 'other' | null;
  resolution: 'adjust_system' | 'recount' | 'write_off' | 'investigate' | 'no_action' | null;
  adjustment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryReserve {
  id: string;
  organization_id: string;
  reserve_number: string;
  material_id: string;
  material_number: string;
  material_name: string;
  facility_id: string | null;
  facility_name: string | null;
  location: string | null;
  reserve_type: 'quality_hold' | 'customer_allocation' | 'project_allocation' | 'safety_reserve' | 'obsolescence' | 'other';
  quantity: number;
  unit_of_measure: string;
  unit_cost: number | null;
  total_value: number | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  status: 'active' | 'released' | 'expired' | 'cancelled';
  effective_date: string;
  expiration_date: string | null;
  created_by: string;
  created_by_id: string | null;
  released_at: string | null;
  released_by: string | null;
  released_by_id: string | null;
  release_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryAuditTrailEntry {
  id: string;
  organization_id: string;
  material_id: string;
  material_number: string;
  material_name: string;
  material_sku: string;
  facility_id: string | null;
  action_type: 'create' | 'update' | 'delete' | 'receive' | 'issue' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'count' | 'reserve' | 'release' | 'cost_change' | 'location_change' | 'status_change' | 'reorder_point_change' | 'vendor_change' | 'attribute_change';
  action_category: 'quantity' | 'cost' | 'attribute' | 'status' | 'location' | 'reference';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  quantity_before: number | null;
  quantity_after: number | null;
  quantity_change: number | null;
  cost_before: number | null;
  cost_after: number | null;
  cost_change: number | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  performed_by: string;
  performed_by_id: string | null;
  performed_at: string;
  source_system: string;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
}

export type AdjustmentReasonInsert = Omit<AdjustmentReason, 'id' | 'created_at' | 'updated_at'>;
export type AdjustmentReasonUpdate = Partial<AdjustmentReasonInsert>;

export type InventoryAdjustmentInsert = Omit<InventoryAdjustment, 'id' | 'created_at' | 'updated_at'>;
export type InventoryAdjustmentUpdate = Partial<InventoryAdjustmentInsert>;

export type VarianceRecordInsert = Omit<VarianceRecord, 'id' | 'created_at' | 'updated_at'>;
export type VarianceRecordUpdate = Partial<VarianceRecordInsert>;

export type InventoryReserveInsert = Omit<InventoryReserve, 'id' | 'created_at' | 'updated_at'>;
export type InventoryReserveUpdate = Partial<InventoryReserveInsert>;
