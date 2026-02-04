export interface Material {
  id: string;
  name: string;
  sku: string;
  materialNumber: string;
  description?: string;
  category: string;
  subcategory?: string;
  unit_of_measure: string;
  unit_price: number;
  on_hand: number;
  min_level: number;
  max_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  facility_name: string;
  location?: string;
  bin_location?: string;
  barcode?: string;
  qrCode?: string;
  labels?: string[];
  supplier?: string;
  lead_time_days?: number;
  last_counted?: string;
  last_adjusted?: string;
  createdAt?: string;
  associated_asset_id?: string;
  inventoryDepartment?: number;
  classification?: 'standard' | 'chargeable' | 'consumable' | 'critical';
  lotTracked?: boolean;
  serialTracked?: boolean;
}

export interface InventoryLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

export interface InventoryHistory {
  id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  action: 'create' | 'adjustment' | 'receive' | 'issue' | 'transfer' | 'count' | 'delete';
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reason: string;
  performed_by: string;
  timestamp: string;
  notes?: string;
}

export interface CountSessionItem {
  material_id: string;
  material_name: string;
  material_sku: string;
  expected_quantity: number;
  counted_quantity?: number;
  variance?: number;
  counted: boolean;
  counted_at?: string;
  counted_by?: string;
  notes?: string;
}

export interface CountSession {
  id: string;
  name: string;
  facility: string;
  category?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  items: CountSessionItem[];
  total_items: number;
  counted_items: number;
  variance_count: number;
  notes?: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_tag: string;
  description?: string;
  category: string;
  status: 'active' | 'maintenance' | 'retired' | 'disposed';
  location: string;
  facility: string;
  serial_number?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiry?: string;
  barcode?: string;
  qrCode?: string;
  assigned_to?: string;
  last_maintenance?: string;
  next_maintenance?: string;
}

export interface PartUsage {
  id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  asset_id: string;
  asset_name: string;
  asset_tag: string;
  quantity_used: number;
  used_by: string;
  used_at: string;
  work_order_id?: string;
  notes?: string;
}
