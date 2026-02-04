export type PMFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type EquipmentStatus = 'operational' | 'down' | 'needs_maintenance' | 'retired';
export type PMWorkOrderStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export const FREQUENCY_DAYS: Record<PMFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
};

export interface Equipment {
  id: string;
  name: string;
  tag: string;
  description?: string;
  category: string;
  location: string;
  facility: string;
  status: EquipmentStatus;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyExpiry?: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  last_pm_date?: string;
  next_pm_date?: string;
  createdAt?: string;
}

export interface PMTask {
  id: string;
  description: string;
  estimatedMinutes: number;
  requiresShutdown: boolean;
  safetyNotes?: string;
  tools?: string[];
  parts?: { materialId: string; materialName: string; quantity: number }[];
}

export interface PMSchedule {
  id: string;
  name: string;
  description?: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  frequency: PMFrequency;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours: number;
  tasks: PMTask[];
  assigned_to?: string;
  assigned_name?: string;
  facility_id?: string;
  last_completed?: string;
  next_due: string;
  active: boolean;
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

export interface PMWorkOrder {
  id: string;
  pm_schedule_id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  title: string;
  description?: string;
  status: PMWorkOrderStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  assigned_name?: string;
  tasks: PMTaskCompletion[];
  parts_used?: PMPartUsed[];
  labor_hours?: number;
  completion_notes?: string;
  facility_id?: string;
  created_at: string;
}
