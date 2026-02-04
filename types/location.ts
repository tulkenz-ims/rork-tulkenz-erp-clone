export type LocationType = 
  | 'building'
  | 'floor'
  | 'wing'
  | 'room'
  | 'area'
  | 'zone'
  | 'line'
  | 'cell'
  | 'workstation'
  | 'storage'
  | 'dock'
  | 'yard'
  | 'other';

export type LocationStatus = 
  | 'active'
  | 'inactive'
  | 'under_construction'
  | 'maintenance'
  | 'restricted'
  | 'archived';

export interface Location {
  id: string;
  organization_id: string;
  facility_id: string;
  department_id: string | null;
  
  location_code: string;
  name: string;
  description: string | null;
  
  location_type: LocationType;
  
  parent_location_id: string | null;
  level: number;
  path: string | null;
  
  building: string | null;
  floor_number: string | null;
  room_number: string | null;
  area_name: string | null;
  square_footage: number | null;
  
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  
  status: LocationStatus;
  is_storage: boolean;
  is_production: boolean;
  is_hazardous: boolean;
  is_climate_controlled: boolean;
  is_restricted: boolean;
  
  max_occupancy: number | null;
  current_occupancy: number;
  
  temperature_monitored: boolean;
  min_temperature: number | null;
  max_temperature: number | null;
  humidity_controlled: boolean;
  
  fire_zone: string | null;
  emergency_assembly_point: string | null;
  safety_requirements: string[];
  ppe_required: string[];
  
  inventory_zone: string | null;
  bin_location: string | null;
  default_gl_account: string | null;
  default_cost_center: string | null;
  
  equipment_count: number;
  
  barcode: string | null;
  qr_code: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
  
  notes: string | null;
  created_by: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationFormData {
  name: string;
  location_code: string;
  facility_id: string;
  department_id?: string | null;
  description?: string;
  location_type: LocationType;
  parent_location_id?: string | null;
  building?: string;
  floor_number?: string;
  room_number?: string;
  area_name?: string;
  square_footage?: number | null;
  status?: LocationStatus;
  is_storage?: boolean;
  is_production?: boolean;
  is_hazardous?: boolean;
  is_climate_controlled?: boolean;
  is_restricted?: boolean;
  max_occupancy?: number | null;
  temperature_monitored?: boolean;
  min_temperature?: number | null;
  max_temperature?: number | null;
  humidity_controlled?: boolean;
  fire_zone?: string;
  emergency_assembly_point?: string;
  safety_requirements?: string[];
  ppe_required?: string[];
  inventory_zone?: string;
  bin_location?: string;
  default_gl_account?: string;
  default_cost_center?: string;
  color?: string;
  notes?: string;
}

export interface LocationCreateInput extends LocationFormData {
  organization_id: string;
}

export interface LocationUpdateInput extends Partial<LocationFormData> {
  id: string;
}

export interface LocationWithFacility extends Location {
  facility?: {
    id: string;
    name: string;
    facility_code: string;
    facility_number: number;
  } | null;
  department?: {
    id: string;
    name: string;
    department_code: string;
  } | null;
  parent_location?: {
    id: string;
    name: string;
    location_code: string;
  } | null;
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  building: 'Building',
  floor: 'Floor',
  wing: 'Wing',
  room: 'Room',
  area: 'Area',
  zone: 'Zone',
  line: 'Production Line',
  cell: 'Work Cell',
  workstation: 'Workstation',
  storage: 'Storage Area',
  dock: 'Dock',
  yard: 'Yard',
  other: 'Other',
};

export const LOCATION_STATUS_LABELS: Record<LocationStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_construction: 'Under Construction',
  maintenance: 'Under Maintenance',
  restricted: 'Restricted',
  archived: 'Archived',
};

export const LOCATION_TYPE_ICONS: Record<LocationType, string> = {
  building: 'Building2',
  floor: 'Layers',
  wing: 'LayoutGrid',
  room: 'DoorOpen',
  area: 'Square',
  zone: 'MapPin',
  line: 'Activity',
  cell: 'Grid3x3',
  workstation: 'Monitor',
  storage: 'Package',
  dock: 'Truck',
  yard: 'TreePine',
  other: 'CircleDot',
};
