export type MaintenanceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type PMStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'skipped';
export type EquipmentHierarchyLevel = 'facility' | 'area' | 'line' | 'equipment' | 'component';
export type EquipmentStatus = 'operational' | 'needs_maintenance' | 'down' | 'retired';

export interface Equipment {
  id: string;
  name: string;
  asset_tag: string;
  category: string;
  status: EquipmentStatus;
  location: string;
  facility_id: string;
  facility_name: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  install_date?: string;
  last_pm_date?: string;
  next_pm_date?: string;
  meter_reading?: number;
  meter_unit?: string;
  criticality: MaintenancePriority;
  department?: string;
  assigned_technician?: string;
  notes?: string;
  specifications?: Record<string, string>;
  image_url?: string;
  parent_id?: string;
  hierarchy_level: EquipmentHierarchyLevel;
  hierarchy_path?: string;
  has_children?: boolean;
}

export interface PMSafety {
  lotoRequired: boolean;
  lotoSteps: PMLoToStep[];
  permits: string[];
  ppeRequired: string[];
}

export interface PMLoToStep {
  id: string;
  order: number;
  description: string;
  lockColor?: string;
  energySource?: string;
  location?: string;
}

export interface PMSchedule {
  id: string;
  name: string;
  description: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  frequency: MaintenanceFrequency;
  priority: MaintenancePriority;
  estimated_hours: number;
  assigned_to?: string;
  assigned_name?: string;
  tasks: PMTask[];
  parts_required?: PMPart[];
  safety?: PMSafety;
  last_completed?: string;
  next_due: string;
  created_at: string;
  active: boolean;
  facility_id: string;
}

export interface PMTask {
  id: string;
  description: string;
  order: number;
  required: boolean;
}

export interface PMPart {
  material_id: string;
  material_name: string;
  material_sku: string;
  quantity_needed: number;
}

export interface PMWorkOrder {
  id: string;
  pm_schedule_id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  title: string;
  description: string;
  status: PMStatus;
  priority: MaintenancePriority;
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  assigned_name?: string;
  tasks: PMTaskCompletion[];
  parts_used?: PMPartUsed[];
  labor_hours?: number;
  completion_notes?: string;
  technician_signature?: string;
  facility_id: string;
  created_at: string;
}

export interface PMTaskCompletion {
  task_id: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  notes?: string;
}

export interface PMPartUsed {
  material_id: string;
  material_name: string;
  material_sku: string;
  quantity_used: number;
  unit_cost: number;
}

export interface MaintenanceMetrics {
  total_equipment: number;
  operational: number;
  needs_maintenance: number;
  down: number;
  pm_compliance: number;
  upcoming_pms: number;
  overdue_pms: number;
  mtbf: number;
  mttr: number;
}

export const EQUIPMENT_CATEGORIES = [
  'Production Machinery',
  'Material Handling',
  'HVAC',
  'Electrical',
  'Plumbing',
  'Safety Equipment',
  'Vehicles',
  'Office Equipment',
  'Building Systems',
  'Other',
] as const;

export const FREQUENCY_LABELS: Record<MaintenanceFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

export const FREQUENCY_DAYS: Record<MaintenanceFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
};
