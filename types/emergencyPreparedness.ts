export type EAPStatus = 'pending' | 'acknowledged' | 'needs_training' | 'expired';

export interface EmergencyActionPlanEntry {
  id: string;
  organization_id: string;
  facility_id?: string;
  employee_id?: string;
  employee_name: string;
  employee_code?: string;
  department: string;
  work_location?: string;
  shift?: string;
  acknowledgment_date?: string;
  plan_version: string;
  evacuation_routes: boolean;
  assembly_point?: string;
  alarm_recognition: boolean;
  emergency_contacts: boolean;
  fire_extinguisher: boolean;
  first_aid_kit: boolean;
  aed_location: boolean;
  shelter_location: boolean;
  special_duties?: string;
  medical_considerations?: string;
  training_completed: string[];
  supervisor_name?: string;
  supervisor_id?: string;
  supervisor_signature: boolean;
  employee_signature: boolean;
  status: EAPStatus;
  notes?: string;
  created_by?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export type FireDrillType = 'announced' | 'unannounced' | 'partial_evacuation' | 'night_shift' | 'weekend';
export type FireDrillStatus = 'scheduled' | 'completed' | 'issues_found' | 'corrective_pending';

export interface FireDrillEntry {
  id: string;
  organization_id: string;
  facility_id?: string;
  facility_name?: string;
  drill_date: string;
  drill_time?: string;
  drill_type: FireDrillType;
  shift?: string;
  alarm_activation_time?: string;
  building_clear_time?: string;
  total_evacuation_time?: string;
  total_participants: number;
  assembly_points_used: string[];
  headcount_completed: boolean;
  headcount_time?: string;
  all_accounted_for: boolean;
  missing_persons?: string;
  fire_extinguishers_tested: boolean;
  alarms_audible: boolean;
  exit_signs_lit: boolean;
  exits_unobstructed: boolean;
  evacuation_aids_used: string[];
  issues_identified: string[];
  corrective_actions?: string;
  conducted_by?: string;
  conducted_by_id?: string;
  observer_names?: string;
  weather_conditions?: string;
  announcement_made: boolean;
  status: FireDrillStatus;
  next_drill_due?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type EvacuationDrillRating = 'excellent' | 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
export type EvacuationDrillStatus = 'completed' | 'review_pending' | 'action_required';

export interface HeadcountResult {
  point: string;
  expected: number;
  actual: number;
  accountedFor: boolean;
}

export interface EvacuationDrillEntry {
  id: string;
  organization_id: string;
  facility_id?: string;
  facility_name?: string;
  drill_date: string;
  drill_time?: string;
  scenario_type: string;
  scenario_description?: string;
  shift?: string;
  areas_evacuated: string[];
  alarm_initiated_time?: string;
  first_exit_time?: string;
  last_exit_time?: string;
  total_evacuation_time?: string;
  total_employees: number;
  employees_evacuated: number;
  visitors_evacuated: number;
  contractors_evacuated: number;
  exits_used: string[];
  assembly_points: string[];
  headcount_results: HeadcountResult[];
  floor_wardens: string[];
  wardens_performed: boolean;
  communication_effective: boolean;
  pa_system_worked: boolean;
  emergency_lighting: boolean;
  mobility_assistance: string[];
  bottlenecks: string[];
  exit_obstructions: string[];
  lessons_learned: string[];
  recommendations: string[];
  conducted_by?: string;
  conducted_by_id?: string;
  observers?: string;
  overall_rating?: EvacuationDrillRating;
  status: EvacuationDrillStatus;
  follow_up_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type SevereWeatherType = 'tornado_warning' | 'tornado_watch' | 'severe_thunderstorm' | 'hurricane' | 'flood' | 'winter_storm' | 'other';
export type SevereWeatherDrillType = 'drill' | 'actual_event';
export type SevereWeatherDrillStatus = 'completed' | 'issues_found' | 'corrective_pending';

export interface SevereWeatherDrillEntry {
  id: string;
  organization_id: string;
  facility_id?: string;
  facility_name?: string;
  drill_date: string;
  drill_time?: string;
  weather_type: SevereWeatherType;
  drill_type: SevereWeatherDrillType;
  shift?: string;
  total_participants: number;
  warning_issued_time?: string;
  shelter_reached_time?: string;
  response_time?: string;
  all_clear_time?: string;
  all_accounted: boolean;
  missing_persons?: string;
  warning_system_worked: boolean;
  pa_system_worked: boolean;
  shelter_capacity_adequate: boolean;
  shelter_areas: string[];
  issues_identified: string[];
  corrective_actions?: string;
  conducted_by?: string;
  conducted_by_id?: string;
  status: SevereWeatherDrillStatus;
  next_drill_due?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ContactPriority = 'critical' | 'high' | 'medium' | 'low';

export interface EmergencyContact {
  id: string;
  organization_id: string;
  facility_id?: string;
  category: string;
  name: string;
  title?: string;
  organization_name?: string;
  primary_phone: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
  available_hours?: string;
  priority: ContactPriority;
  is_primary: boolean;
  last_verified?: string;
  verified_by?: string;
  verified_by_id?: string;
  notes?: string;
  created_by?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export type AssemblyHeadcountStatus = 'complete' | 'incomplete' | 'discrepancy' | 'in_progress';

export interface AssemblyHeadcountEntry {
  id: string;
  organization_id: string;
  facility_id?: string;
  event_date: string;
  event_time?: string;
  event_type: string;
  assembly_point: string;
  shift?: string;
  department?: string;
  expected_count: number;
  actual_count: number;
  accounted_for: string[];
  unaccounted: string[];
  found_locations?: string;
  time_to_complete?: string;
  all_clear: boolean;
  all_clear_time?: string;
  conducted_by?: string;
  conducted_by_id?: string;
  supervisor_name?: string;
  supervisor_id?: string;
  special_needs?: string;
  weather_conditions?: string;
  status: AssemblyHeadcountStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const EAP_STATUS_LABELS: Record<EAPStatus, string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  needs_training: 'Needs Training',
  expired: 'Expired',
};

export const FIRE_DRILL_TYPE_LABELS: Record<FireDrillType, string> = {
  announced: 'Announced',
  unannounced: 'Unannounced',
  partial_evacuation: 'Partial Evacuation',
  night_shift: 'Night Shift',
  weekend: 'Weekend',
};

export const FIRE_DRILL_STATUS_LABELS: Record<FireDrillStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  issues_found: 'Issues Found',
  corrective_pending: 'Corrective Pending',
};

export const EVACUATION_RATING_LABELS: Record<EvacuationDrillRating, string> = {
  excellent: 'Excellent',
  satisfactory: 'Satisfactory',
  needs_improvement: 'Needs Improvement',
  unsatisfactory: 'Unsatisfactory',
};

export const WEATHER_TYPE_LABELS: Record<SevereWeatherType, string> = {
  tornado_warning: 'Tornado Warning',
  tornado_watch: 'Tornado Watch',
  severe_thunderstorm: 'Severe Thunderstorm',
  hurricane: 'Hurricane',
  flood: 'Flood',
  winter_storm: 'Winter Storm',
  other: 'Other',
};

export const CONTACT_PRIORITY_LABELS: Record<ContactPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const HEADCOUNT_STATUS_LABELS: Record<AssemblyHeadcountStatus, string> = {
  complete: 'All Accounted',
  incomplete: 'Incomplete',
  discrepancy: 'Discrepancy',
  in_progress: 'In Progress',
};
