// Permit Types
export type PermitType = 
  | 'loto' 
  | 'confined_space' 
  | 'hot_work' 
  | 'fall_protection' 
  | 'electrical' 
  | 'line_break' 
  | 'excavation' 
  | 'roof_access' 
  | 'chemical_handling' 
  | 'temporary_equipment';

export type PermitStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'active' 
  | 'completed' 
  | 'cancelled' 
  | 'expired';

export type PermitPriority = 'low' | 'medium' | 'high' | 'critical';

// LOTO Specific Types
export type EnergySourceType = 
  | 'electrical' 
  | 'pneumatic' 
  | 'hydraulic' 
  | 'mechanical' 
  | 'thermal' 
  | 'chemical' 
  | 'gravitational' 
  | 'stored_energy'
  | 'radiation'
  | 'other';

export interface LockoutPoint {
  id: string;
  location: string;
  energy_type: EnergySourceType;
  isolation_method: string;
  lock_number: string;
  tag_number: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface LOTOPermitData {
  equipment_name: string;
  equipment_id: string;
  equipment_tag: string;
  work_description: string;
  energy_sources: EnergySourceType[];
  lockout_points: LockoutPoint[];
  isolation_procedure: string;
  verification_procedure: string;
  zero_energy_verified: boolean;
  zero_energy_verified_by?: string;
  zero_energy_verified_at?: string;
  group_lockout: boolean;
  group_lockout_box_number?: string;
  affected_employees: string[];
  restoration_procedure: string;
}

// Confined Space Specific Types
export type ConfinedSpaceClass = 'permit_required' | 'non_permit' | 'alternate_entry';
export type AtmosphericHazard = 'oxygen_deficiency' | 'oxygen_enrichment' | 'flammable' | 'toxic' | 'none';

export interface AtmosphericReading {
  id: string;
  reading_time: string;
  oxygen_percent: number;
  lel_percent: number;
  h2s_ppm: number;
  co_ppm: number;
  other_gas?: string;
  other_reading?: number;
  location: string;
  taken_by: string;
  acceptable: boolean;
}

export interface ConfinedSpacePermitData {
  space_name: string;
  space_location: string;
  space_class: ConfinedSpaceClass;
  purpose_of_entry: string;
  hazards_identified: string[];
  atmospheric_hazards: AtmosphericHazard[];
  physical_hazards: string[];
  atmospheric_readings: AtmosphericReading[];
  continuous_monitoring: boolean;
  monitoring_equipment: string;
  ventilation_required: boolean;
  ventilation_method?: string;
  entrants: string[];
  attendants: string[];
  entry_supervisor: string;
  rescue_team: string;
  rescue_equipment: string[];
  communication_method: string;
  communication_signals: string;
  entry_procedures: string;
  exit_procedures: string;
  emergency_procedures: string;
}

// Hot Work Specific Types
export type HotWorkType = 'welding' | 'cutting' | 'brazing' | 'soldering' | 'grinding' | 'burning' | 'other';

export interface HotWorkPermitData {
  hot_work_type: HotWorkType[];
  work_location: string;
  work_description: string;
  fire_hazards_identified: string[];
  combustibles_within_35ft: boolean;
  combustibles_removed: boolean;
  combustibles_protected: boolean;
  protection_method?: string;
  fire_watch_required: boolean;
  fire_watch_name?: string;
  fire_watch_duration_minutes: number;
  fire_extinguisher_type: string;
  fire_extinguisher_location: string;
  sprinkler_system_active: boolean;
  fire_alarm_notified: boolean;
  smoke_detectors_covered: boolean;
  ventilation_adequate: boolean;
  confined_space_permit_required: boolean;
  confined_space_permit_number?: string;
  hot_surface_warning_posted: boolean;
  welding_screens_in_place: boolean;
  gas_cylinders_secured: boolean;
  flashback_arrestors_installed: boolean;
  post_work_inspection_time?: string;
}

// Fall Protection Specific Types
export type FallProtectionMethod = 
  | 'guardrails' 
  | 'safety_nets' 
  | 'personal_fall_arrest' 
  | 'positioning_system' 
  | 'travel_restraint'
  | 'controlled_access_zone'
  | 'warning_line';

export interface FallProtectionPermitData {
  work_location: string;
  work_height_feet: number;
  work_description: string;
  fall_hazards: string[];
  protection_methods: FallProtectionMethod[];
  anchor_points: string[];
  anchor_point_capacity_lbs: number;
  harness_inspection_completed: boolean;
  lanyard_inspection_completed: boolean;
  srl_inspection_completed: boolean;
  rescue_plan: string;
  rescue_equipment: string[];
  workers_trained: boolean;
  training_dates: string[];
  guardrail_specifications?: string;
  safety_net_specifications?: string;
  leading_edge_work: boolean;
  hole_covers_secured: boolean;
}

// Electrical Safe Work Specific Types
export type VoltageClass = 'low' | 'medium' | 'high' | 'extra_high';
export type ElectricalWorkType = 'energized' | 'de_energized' | 'testing' | 'troubleshooting';

export interface ElectricalPermitData {
  equipment_name: string;
  equipment_id: string;
  voltage_class: VoltageClass;
  voltage_level: number;
  work_type: ElectricalWorkType;
  work_description: string;
  arc_flash_boundary_inches: number;
  limited_approach_inches: number;
  restricted_approach_inches: number;
  prohibited_approach_inches: number;
  ppe_category: number;
  arc_flash_suit_required: boolean;
  face_shield_required: boolean;
  insulated_gloves_class: string;
  insulated_tools_required: boolean;
  voltage_test_performed: boolean;
  voltage_test_result: string;
  grounds_installed: boolean;
  ground_locations: string[];
  energized_work_justified: boolean;
  energized_work_justification?: string;
  shock_hazard_analysis_completed: boolean;
  arc_flash_analysis_completed: boolean;
}

// Line Break Specific Types
export type LineContent = 'water' | 'steam' | 'chemicals' | 'compressed_air' | 'natural_gas' | 'oil' | 'refrigerant' | 'other';

export interface LineBreakPermitData {
  line_description: string;
  line_location: string;
  line_content: LineContent;
  line_content_other?: string;
  line_size_inches: number;
  line_pressure_psi: number;
  line_temperature_f: number;
  isolation_points: string[];
  drain_points: string[];
  vent_points: string[];
  line_flushed: boolean;
  line_depressurized: boolean;
  line_drained: boolean;
  line_vented: boolean;
  blind_installed: boolean;
  blind_location?: string;
  hazardous_material: boolean;
  sds_reviewed: boolean;
  spill_containment: boolean;
  containment_method?: string;
  respiratory_required: boolean;
  respiratory_type?: string;
}

// Excavation Specific Types
export type SoilClassification = 'stable_rock' | 'type_a' | 'type_b' | 'type_c';
export type ShoringMethod = 'sloping' | 'benching' | 'shoring' | 'shielding' | 'none_required';

export interface ExcavationPermitData {
  excavation_location: string;
  excavation_purpose: string;
  excavation_depth_feet: number;
  excavation_width_feet: number;
  excavation_length_feet: number;
  soil_classification: SoilClassification;
  soil_tested_by: string;
  soil_test_date: string;
  shoring_method: ShoringMethod;
  shoring_specifications?: string;
  underground_utilities_marked: boolean;
  utility_locate_ticket_number: string;
  utilities_present: string[];
  water_accumulation_controls: boolean;
  water_removal_method?: string;
  access_egress_points: string[];
  spoil_pile_distance_feet: number;
  traffic_control_required: boolean;
  traffic_control_method?: string;
  atmospheric_testing_required: boolean;
  protective_system_inspected: boolean;
  inspection_frequency: string;
}

// Roof Access Specific Types
export interface RoofAccessPermitData {
  building_name: string;
  roof_location: string;
  access_point: string;
  work_description: string;
  roof_type: string;
  roof_condition: string;
  fall_hazards: string[];
  fall_protection_method: FallProtectionMethod[];
  skylights_protected: boolean;
  roof_openings_protected: boolean;
  weather_conditions_acceptable: boolean;
  wind_speed_mph: number;
  max_wind_speed_allowed: number;
  wet_conditions: boolean;
  lightning_risk: boolean;
  materials_secured: boolean;
  tools_tethered: boolean;
  emergency_access_route: string;
  communication_method: string;
}

// Chemical Handling Specific Types
export type ChemicalHazardClass = 'flammable' | 'corrosive' | 'toxic' | 'oxidizer' | 'reactive' | 'compressed_gas' | 'carcinogen';

export interface ChemicalHandlingPermitData {
  chemical_name: string;
  chemical_cas_number?: string;
  sds_number: string;
  sds_reviewed: boolean;
  quantity: number;
  quantity_unit: string;
  hazard_classes: ChemicalHazardClass[];
  handling_procedure: string;
  storage_location: string;
  storage_requirements: string[];
  incompatible_materials: string[];
  ppe_required: string[];
  ventilation_required: boolean;
  ventilation_type?: string;
  spill_kit_location: string;
  spill_procedure: string;
  fire_extinguisher_type: string;
  first_aid_procedures: string;
  emergency_shower_location: string;
  eyewash_location: string;
  disposal_method: string;
  waste_classification: string;
}

// Temporary Equipment Specific Types
export type TempEquipmentType = 'scaffold' | 'ladder' | 'lift' | 'crane' | 'hoist' | 'temporary_power' | 'temporary_lighting' | 'other';

export interface TempEquipmentPermitData {
  equipment_type: TempEquipmentType;
  equipment_description: string;
  equipment_location: string;
  installation_date: string;
  expected_removal_date: string;
  load_capacity: string;
  actual_load: string;
  inspection_completed: boolean;
  inspection_date: string;
  inspected_by: string;
  manufacturer_guidelines_followed: boolean;
  grounding_required: boolean;
  grounding_verified: boolean;
  guardrails_required: boolean;
  guardrails_installed: boolean;
  access_restrictions: string[];
  warning_signs_posted: boolean;
  daily_inspection_required: boolean;
  inspection_checklist: string[];
}

// Main Permit Interface
export interface SafetyPermit {
  id: string;
  organization_id: string;
  permit_number: string;
  permit_type: PermitType;
  status: PermitStatus;
  priority: PermitPriority;
  facility_id: string | null;
  location: string | null;
  department_code: string | null;
  department_name: string | null;
  work_description: string;
  hazards_identified: string[];
  precautions_required: string[];
  ppe_required: string[];
  start_date: string;
  start_time: string | null;
  end_date: string;
  end_time: string | null;
  valid_hours: number;
  requested_by: string;
  requested_by_id: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  supervisor_name: string | null;
  supervisor_id: string | null;
  contractor_name: string | null;
  contractor_company: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  workers: string[];
  permit_data: 
    | LOTOPermitData 
    | ConfinedSpacePermitData 
    | HotWorkPermitData 
    | FallProtectionPermitData
    | ElectricalPermitData
    | LineBreakPermitData
    | ExcavationPermitData
    | RoofAccessPermitData
    | ChemicalHandlingPermitData
    | TempEquipmentPermitData
    | null;
  completed_by: string | null;
  completed_by_id: string | null;
  completed_date: string | null;
  completion_notes: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_date: string | null;
  attachments: unknown[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Labels and Colors
export const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  loto: 'LOTO (Lockout/Tagout)',
  confined_space: 'Confined Space Entry',
  hot_work: 'Hot Work',
  fall_protection: 'Fall Protection',
  electrical: 'Electrical Safe Work',
  line_break: 'Line Break',
  excavation: 'Excavation',
  roof_access: 'Roof Access',
  chemical_handling: 'Chemical Handling',
  temporary_equipment: 'Temporary Equipment',
};

export const PERMIT_TYPE_COLORS: Record<PermitType, string> = {
  loto: '#DC2626',
  confined_space: '#7C3AED',
  hot_work: '#F97316',
  fall_protection: '#0891B2',
  electrical: '#EAB308',
  line_break: '#6366F1',
  excavation: '#84CC16',
  roof_access: '#14B8A6',
  chemical_handling: '#EC4899',
  temporary_equipment: '#8B5CF6',
};

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const PERMIT_STATUS_COLORS: Record<PermitStatus, string> = {
  draft: '#6B7280',
  pending_approval: '#F59E0B',
  approved: '#3B82F6',
  active: '#10B981',
  completed: '#059669',
  cancelled: '#EF4444',
  expired: '#DC2626',
};

export const ENERGY_SOURCE_LABELS: Record<EnergySourceType, string> = {
  electrical: 'Electrical',
  pneumatic: 'Pneumatic (Air)',
  hydraulic: 'Hydraulic',
  mechanical: 'Mechanical',
  thermal: 'Thermal (Heat/Cold)',
  chemical: 'Chemical',
  gravitational: 'Gravitational (Potential)',
  stored_energy: 'Stored Energy',
  radiation: 'Radiation',
  other: 'Other',
};

export const PPE_OPTIONS = [
  { id: 'hard_hat', label: 'Hard Hat' },
  { id: 'safety_glasses', label: 'Safety Glasses' },
  { id: 'face_shield', label: 'Face Shield' },
  { id: 'hearing_protection', label: 'Hearing Protection' },
  { id: 'safety_shoes', label: 'Safety Shoes' },
  { id: 'steel_toe_boots', label: 'Steel Toe Boots' },
  { id: 'gloves_leather', label: 'Leather Gloves' },
  { id: 'gloves_nitrile', label: 'Nitrile Gloves' },
  { id: 'gloves_insulated', label: 'Insulated Gloves' },
  { id: 'gloves_chemical', label: 'Chemical Resistant Gloves' },
  { id: 'coveralls', label: 'Coveralls' },
  { id: 'tyvek_suit', label: 'Tyvek Suit' },
  { id: 'arc_flash_suit', label: 'Arc Flash Suit' },
  { id: 'fire_resistant', label: 'Fire Resistant Clothing' },
  { id: 'high_visibility', label: 'High Visibility Vest' },
  { id: 'fall_harness', label: 'Fall Protection Harness' },
  { id: 'respirator_n95', label: 'N95 Respirator' },
  { id: 'respirator_half', label: 'Half-Face Respirator' },
  { id: 'respirator_full', label: 'Full-Face Respirator' },
  { id: 'scba', label: 'SCBA' },
  { id: 'welding_helmet', label: 'Welding Helmet' },
  { id: 'welding_gloves', label: 'Welding Gloves' },
  { id: 'apron', label: 'Protective Apron' },
] as const;

export const HAZARD_OPTIONS = [
  { id: 'electrical_shock', label: 'Electrical Shock' },
  { id: 'arc_flash', label: 'Arc Flash' },
  { id: 'moving_parts', label: 'Moving Parts' },
  { id: 'stored_energy', label: 'Stored Energy' },
  { id: 'falls', label: 'Falls from Height' },
  { id: 'falling_objects', label: 'Falling Objects' },
  { id: 'struck_by', label: 'Struck By' },
  { id: 'caught_between', label: 'Caught In/Between' },
  { id: 'heat_burns', label: 'Heat/Burns' },
  { id: 'fire', label: 'Fire' },
  { id: 'explosion', label: 'Explosion' },
  { id: 'chemical_exposure', label: 'Chemical Exposure' },
  { id: 'toxic_atmosphere', label: 'Toxic Atmosphere' },
  { id: 'oxygen_deficiency', label: 'Oxygen Deficiency' },
  { id: 'confined_space', label: 'Confined Space' },
  { id: 'noise', label: 'Excessive Noise' },
  { id: 'radiation', label: 'Radiation' },
  { id: 'biological', label: 'Biological Hazards' },
  { id: 'ergonomic', label: 'Ergonomic Hazards' },
  { id: 'weather', label: 'Weather Conditions' },
  { id: 'traffic', label: 'Vehicle/Traffic' },
  { id: 'excavation_collapse', label: 'Excavation Collapse' },
  { id: 'engulfment', label: 'Engulfment' },
] as const;

export const PRECAUTION_OPTIONS = [
  { id: 'lockout_tagout', label: 'Lockout/Tagout Applied' },
  { id: 'zero_energy', label: 'Zero Energy State Verified' },
  { id: 'atmospheric_test', label: 'Atmospheric Testing' },
  { id: 'continuous_monitoring', label: 'Continuous Air Monitoring' },
  { id: 'ventilation', label: 'Ventilation Established' },
  { id: 'fire_watch', label: 'Fire Watch Posted' },
  { id: 'fire_extinguisher', label: 'Fire Extinguisher Ready' },
  { id: 'barriers', label: 'Barriers/Barricades Installed' },
  { id: 'warning_signs', label: 'Warning Signs Posted' },
  { id: 'fall_protection', label: 'Fall Protection in Place' },
  { id: 'rescue_equipment', label: 'Rescue Equipment Ready' },
  { id: 'communication', label: 'Communication Established' },
  { id: 'spill_containment', label: 'Spill Containment in Place' },
  { id: 'grounding', label: 'Grounding Verified' },
  { id: 'hot_surface', label: 'Hot Surface Warnings' },
  { id: 'line_isolated', label: 'Line/Pipe Isolated' },
  { id: 'blind_installed', label: 'Blind/Blank Installed' },
  { id: 'area_cleared', label: 'Area Cleared of Personnel' },
  { id: 'first_aid', label: 'First Aid Kit Available' },
  { id: 'emergency_shower', label: 'Emergency Shower Accessible' },
] as const;
