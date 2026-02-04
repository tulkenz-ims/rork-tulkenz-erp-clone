export interface ReorderPointSetting {
  id: string;
  organization_id: string;
  material_id: string;
  material_number: string;
  material_name: string;
  facility_id: string | null;
  reorder_point: number;
  reorder_quantity: number;
  safety_stock: number;
  safety_stock_days: number;
  lead_time_days: number;
  vendor_lead_time_days: number | null;
  eoq_enabled: boolean;
  annual_demand: number | null;
  ordering_cost: number | null;
  holding_cost_percent: number | null;
  calculated_eoq: number | null;
  min_level: number;
  max_level: number;
  auto_replenish_enabled: boolean;
  auto_replenish_trigger: 'reorder_point' | 'safety_stock' | 'min_level' | 'schedule';
  auto_replenish_vendor_id: string | null;
  auto_replenish_vendor_name: string | null;
  calculation_method: 'manual' | 'historical' | 'forecast' | 'eoq';
  review_period_days: number;
  service_level_percent: number;
  status: 'active' | 'inactive' | 'review_needed';
  last_calculated_at: string | null;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  notes: string | null;
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReplenishmentSuggestion {
  id: string;
  organization_id: string;
  suggestion_number: string;
  material_id: string;
  material_number: string;
  material_name: string;
  material_sku: string;
  facility_id: string | null;
  facility_name: string | null;
  current_on_hand: number;
  current_on_order: number;
  current_allocated: number;
  available_quantity: number;
  reorder_point: number;
  safety_stock: number;
  min_level: number;
  max_level: number;
  suggested_quantity: number;
  suggested_order_date: string;
  expected_delivery_date: string | null;
  trigger_reason: 'below_reorder_point' | 'below_safety_stock' | 'below_min' | 'stockout' | 'forecast' | 'schedule' | 'manual';
  suggested_vendor_id: string | null;
  suggested_vendor_name: string | null;
  estimated_unit_cost: number | null;
  estimated_total_cost: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'converted' | 'expired' | 'cancelled';
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_by_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  converted_to_po: boolean;
  po_id: string | null;
  po_number: string | null;
  converted_at: string | null;
  converted_by: string | null;
  converted_by_id: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReplenishmentPlan {
  id: string;
  organization_id: string;
  plan_number: string;
  plan_name: string;
  facility_id: string | null;
  facility_name: string | null;
  week_start_date: string;
  week_end_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  total_items: number;
  total_quantity: number;
  total_estimated_cost: number;
  line_items: WeeklyReplenishmentLineItem[];
  submitted_by: string | null;
  submitted_by_id: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReplenishmentLineItem {
  id: string;
  material_id: string;
  material_number: string;
  material_name: string;
  material_sku: string;
  current_on_hand: number;
  reorder_point: number;
  suggested_quantity: number;
  approved_quantity: number | null;
  vendor_id: string | null;
  vendor_name: string | null;
  unit_cost: number;
  total_cost: number;
  day_of_week: string;
  status: 'pending' | 'approved' | 'rejected' | 'ordered';
  notes: string | null;
}

export type ReorderPointSettingInsert = Omit<ReorderPointSetting, 'id' | 'created_at' | 'updated_at'>;
export type ReorderPointSettingUpdate = Partial<ReorderPointSettingInsert>;

export type ReplenishmentSuggestionInsert = Omit<ReplenishmentSuggestion, 'id' | 'created_at' | 'updated_at'>;
export type ReplenishmentSuggestionUpdate = Partial<ReplenishmentSuggestionInsert>;

export type WeeklyReplenishmentPlanInsert = Omit<WeeklyReplenishmentPlan, 'id' | 'created_at' | 'updated_at'>;
export type WeeklyReplenishmentPlanUpdate = Partial<WeeklyReplenishmentPlanInsert>;
