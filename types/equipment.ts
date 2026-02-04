export type EquipmentStatus = 'operational' | 'down' | 'needs_maintenance' | 'retired';
export type EquipmentCriticality = 'critical' | 'high' | 'medium' | 'low';

export interface EquipmentSpecifications {
  [key: string]: string | number | boolean;
}

export interface Equipment {
  id: string;
  organization_id: string;
  facility_id: string;
  name: string;
  equipment_tag: string;
  category: string;
  status: EquipmentStatus;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  warranty_expiry: string | null;
  criticality: EquipmentCriticality;
  last_pm_date: string | null;
  next_pm_date: string | null;
  specifications: EquipmentSpecifications;
  created_at: string;
  updated_at: string;
}

export interface EquipmentFormData {
  name: string;
  equipment_tag: string;
  category: string;
  facility_id: string;
  status?: EquipmentStatus;
  location?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  install_date?: string;
  warranty_expiry?: string;
  criticality?: EquipmentCriticality;
  specifications?: EquipmentSpecifications;
}

export interface EquipmentCreateInput extends EquipmentFormData {
  organization_id: string;
}

export interface EquipmentUpdateInput extends Partial<EquipmentFormData> {
  id: string;
}

export interface EquipmentWithFacility extends Equipment {
  facility?: {
    id: string;
    name: string;
    facility_code: string;
  } | null;
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  operational: 'Operational',
  down: 'Down',
  needs_maintenance: 'Needs Maintenance',
  retired: 'Retired',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  operational: '#10B981',
  down: '#EF4444',
  needs_maintenance: '#F59E0B',
  retired: '#6B7280',
};

export const EQUIPMENT_CRITICALITY_LABELS: Record<EquipmentCriticality, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const EQUIPMENT_CRITICALITY_COLORS: Record<EquipmentCriticality, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

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
  'Refrigeration',
  'Packaging',
  'Conveyor',
  'Compressor',
  'Boiler',
  'Other',
] as const;
