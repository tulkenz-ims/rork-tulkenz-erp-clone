export type AssessmentType = 'initial' | 'follow_up' | 'complaint' | 'periodic' | 'post_injury';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';
export type AssessmentStatus = 'draft' | 'completed' | 'pending_review' | 'action_required' | 'closed';
export type WorkstationType = 'office' | 'industrial' | 'laboratory' | 'assembly' | 'computer' | 'standing' | 'sit_stand' | 'vehicle' | 'other';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'needs_improvement' | 'action_required';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type MonitoringType = 'area' | 'personal' | 'task_based' | 'baseline' | 'follow_up';
export type MonitoringStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'pending_results';
export type HeatMonitoringType = 'routine' | 'hot_weather' | 'incident_response' | 'baseline' | 'follow_up';
export type MetabolicRate = 'light' | 'moderate' | 'heavy' | 'very_heavy';
export type HeatIndex = 'caution' | 'extreme_caution' | 'danger' | 'extreme_danger' | 'safe';
export type AcclimatizationStatus = 'acclimatized' | 'not_acclimatized' | 'partial';
export type AirMonitoringType = 'routine' | 'complaint' | 'incident' | 'baseline' | 'follow_up' | 'exposure_assessment';
export type SampleType = 'area' | 'personal' | 'grab' | 'continuous';
export type ContaminantType = 'particulate' | 'gas' | 'vapor' | 'fume' | 'mist' | 'dust' | 'biological' | 'multiple';
export type ForceLevel = 'light' | 'moderate' | 'heavy' | 'very_heavy';
export type RepetitionRate = 'low' | 'moderate' | 'high' | 'very_high';

export interface ErgonomicAssessment {
  id: string;
  organization_id: string;
  assessment_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_department: string | null;
  employee_job_title: string | null;
  facility_id: string | null;
  facility_name: string | null;
  assessment_date: string;
  assessment_type: AssessmentType;
  work_area: string;
  job_tasks: string[];
  hours_per_day: number | null;
  days_per_week: number | null;
  physical_demands: Record<string, unknown>;
  posture_assessment: Record<string, unknown>;
  workstation_setup: Record<string, unknown>;
  tools_equipment: string[];
  environmental_factors: Record<string, unknown>;
  risk_factors_identified: string[];
  overall_risk_level: RiskLevel;
  recommendations: string[];
  priority_actions: string[];
  employee_concerns: string | null;
  employee_symptoms: string[];
  symptom_duration: string | null;
  symptom_frequency: string | null;
  previous_injuries: string | null;
  accommodations_needed: string[];
  follow_up_required: boolean;
  follow_up_date: string | null;
  assessor_id: string | null;
  assessor_name: string;
  assessor_title: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  status: AssessmentStatus;
  attachments: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkstationEvaluation {
  id: string;
  organization_id: string;
  evaluation_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_department: string | null;
  facility_id: string | null;
  facility_name: string | null;
  location: string;
  workstation_type: WorkstationType;
  evaluation_date: string;
  evaluator_id: string | null;
  evaluator_name: string;
  chair_assessment: Record<string, unknown>;
  desk_assessment: Record<string, unknown>;
  monitor_assessment: Record<string, unknown>;
  keyboard_mouse_assessment: Record<string, unknown>;
  lighting_assessment: Record<string, unknown>;
  noise_level_db: number | null;
  temperature_f: number | null;
  humidity_percent: number | null;
  ventilation_adequate: boolean | null;
  floor_condition: string | null;
  mat_required: boolean | null;
  anti_fatigue_mat_present: boolean | null;
  footrest_required: boolean | null;
  footrest_present: boolean | null;
  document_holder_required: boolean | null;
  document_holder_present: boolean | null;
  phone_headset_required: boolean | null;
  phone_headset_present: boolean | null;
  overall_score: number | null;
  compliance_status: ComplianceStatus;
  issues_identified: string[];
  recommendations: string[];
  equipment_needed: string[];
  estimated_cost: number | null;
  priority: Priority;
  action_items: Record<string, unknown>[];
  follow_up_required: boolean;
  follow_up_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'closed';
  employee_signature: string | null;
  employee_signed_date: string | null;
  supervisor_signature: string | null;
  supervisor_signed_date: string | null;
  attachments: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoiseMonitoring {
  id: string;
  organization_id: string;
  monitoring_number: string;
  facility_id: string | null;
  facility_name: string | null;
  location: string;
  area_description: string | null;
  monitoring_date: string;
  monitoring_type: MonitoringType;
  equipment_used: string;
  equipment_serial: string | null;
  calibration_date: string | null;
  calibration_due: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  employee_id: string | null;
  employee_name: string | null;
  job_title: string | null;
  tasks_monitored: string[];
  twa_db: number;
  max_db: number | null;
  min_db: number | null;
  peak_db: number | null;
  dose_percent: number | null;
  exchange_rate: number;
  criterion_level: number;
  threshold_level: number;
  action_level: number;
  exceeds_action_level: boolean;
  exceeds_pel: boolean;
  hearing_protection_required: boolean;
  current_hearing_protection: string | null;
  recommended_hearing_protection: string | null;
  nrr_required: number | null;
  engineering_controls_present: string[];
  engineering_controls_recommended: string[];
  administrative_controls_present: string[];
  administrative_controls_recommended: string[];
  noise_sources: string[];
  weather_conditions: string | null;
  background_noise_db: number | null;
  monitored_by: string;
  monitored_by_id: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  status: MonitoringStatus;
  compliance_status: ComplianceStatus;
  corrective_actions: string[];
  follow_up_required: boolean;
  follow_up_date: string | null;
  attachments: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeatStressMonitoring {
  id: string;
  organization_id: string;
  monitoring_number: string;
  facility_id: string | null;
  facility_name: string | null;
  location: string;
  work_area: string | null;
  monitoring_date: string;
  monitoring_time: string;
  monitoring_type: HeatMonitoringType;
  dry_bulb_temp_f: number | null;
  wet_bulb_temp_f: number | null;
  globe_temp_f: number | null;
  wbgt_index: number | null;
  relative_humidity: number | null;
  air_velocity_fpm: number | null;
  radiant_heat_source: string | null;
  clothing_adjustment: number;
  metabolic_rate: MetabolicRate | null;
  work_rest_regime: string | null;
  recommended_work_rest: string | null;
  employee_id: string | null;
  employee_name: string | null;
  job_task: string | null;
  exposure_duration_minutes: number | null;
  hydration_available: boolean;
  hydration_frequency: string | null;
  shade_available: boolean | null;
  cooling_available: boolean | null;
  cooling_type: string | null;
  ppe_worn: string[];
  acclimatization_status: AcclimatizationStatus | null;
  heat_index: HeatIndex | null;
  action_limit_exceeded: boolean;
  threshold_limit_exceeded: boolean;
  symptoms_reported: string[];
  first_aid_provided: boolean;
  first_aid_details: string | null;
  engineering_controls: string[];
  administrative_controls: string[];
  recommended_controls: string[];
  monitored_by: string;
  monitored_by_id: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  status: MonitoringStatus;
  follow_up_required: boolean;
  follow_up_date: string | null;
  attachments: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AirQualityMonitoring {
  id: string;
  organization_id: string;
  monitoring_number: string;
  facility_id: string | null;
  facility_name: string | null;
  location: string;
  area_description: string | null;
  monitoring_date: string;
  monitoring_type: AirMonitoringType;
  sample_type: SampleType;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  employee_id: string | null;
  employee_name: string | null;
  job_task: string | null;
  contaminant_type: ContaminantType;
  contaminant_name: string;
  cas_number: string | null;
  sampling_method: string;
  equipment_used: string;
  equipment_serial: string | null;
  calibration_date: string | null;
  flow_rate_lpm: number | null;
  sample_volume_liters: number | null;
  lab_sample_id: string | null;
  lab_name: string | null;
  analysis_method: string | null;
  result_value: number | null;
  result_unit: string;
  detection_limit: number | null;
  osha_pel: number | null;
  osha_pel_unit: string | null;
  acgih_tlv: number | null;
  acgih_tlv_unit: string | null;
  niosh_rel: number | null;
  niosh_rel_unit: string | null;
  stel_value: number | null;
  ceiling_value: number | null;
  percent_of_pel: number | null;
  exceeds_action_level: boolean;
  exceeds_pel: boolean;
  exceeds_stel: boolean;
  respiratory_protection_required: boolean;
  current_respirator: string | null;
  recommended_respirator: string | null;
  ventilation_type: string | null;
  ventilation_adequate: boolean | null;
  engineering_controls: string[];
  administrative_controls: string[];
  recommended_controls: string[];
  weather_conditions: string | null;
  temperature_f: number | null;
  humidity_percent: number | null;
  barometric_pressure: number | null;
  sampled_by: string;
  sampled_by_id: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  status: MonitoringStatus;
  compliance_status: ComplianceStatus | null;
  corrective_actions: string[];
  follow_up_required: boolean;
  follow_up_date: string | null;
  attachments: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepetitiveMotionAssessment {
  id: string;
  organization_id: string;
  assessment_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_department: string | null;
  employee_job_title: string | null;
  facility_id: string | null;
  facility_name: string | null;
  work_area: string;
  job_task: string;
  assessment_date: string;
  assessment_type: AssessmentType;
  assessor_id: string | null;
  assessor_name: string;
  task_duration_hours: number | null;
  cycle_time_seconds: number | null;
  cycles_per_shift: number | null;
  force_level: ForceLevel | null;
  force_description: string | null;
  repetition_rate: RepetitionRate | null;
  awkward_postures: Record<string, unknown>;
  contact_stress: Record<string, unknown>;
  vibration_exposure: Record<string, unknown>;
  static_postures: Record<string, unknown>;
  body_parts_affected: string[];
  strain_index_score: number | null;
  rula_score: number | null;
  reba_score: number | null;
  ocra_index: number | null;
  hal_tlv_score: number | null;
  overall_risk_level: RiskLevel;
  current_controls: string[];
  recommended_engineering_controls: string[];
  recommended_administrative_controls: string[];
  recommended_ppe: string[];
  tool_modifications: string[];
  workstation_modifications: string[];
  work_practice_changes: string[];
  job_rotation_recommended: boolean;
  rotation_schedule: string | null;
  rest_breaks_recommended: string | null;
  stretching_program: boolean;
  employee_symptoms: string[];
  symptom_body_parts: string[];
  symptom_duration: string | null;
  symptom_frequency: string | null;
  previous_msd_history: string | null;
  medical_restrictions: string | null;
  priority: Priority;
  implementation_timeline: string | null;
  estimated_cost: number | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  status: AssessmentStatus;
  attachments: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  videos: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  initial: 'Initial Assessment',
  follow_up: 'Follow-Up',
  complaint: 'Employee Complaint',
  periodic: 'Periodic Review',
  post_injury: 'Post-Injury',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
  very_high: 'Very High Risk',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#10B981',
  moderate: '#F59E0B',
  high: '#EF4444',
  very_high: '#7C2D12',
};

export const STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
  pending_review: 'Pending Review',
  action_required: 'Action Required',
  closed: 'Closed',
};

export const STATUS_COLORS: Record<AssessmentStatus, string> = {
  draft: '#6B7280',
  completed: '#10B981',
  pending_review: '#F59E0B',
  action_required: '#EF4444',
  closed: '#3B82F6',
};

export const WORKSTATION_TYPE_LABELS: Record<WorkstationType, string> = {
  office: 'Office',
  industrial: 'Industrial',
  laboratory: 'Laboratory',
  assembly: 'Assembly Line',
  computer: 'Computer Workstation',
  standing: 'Standing',
  sit_stand: 'Sit-Stand',
  vehicle: 'Vehicle',
  other: 'Other',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7C2D12',
};

export const MONITORING_TYPE_LABELS: Record<MonitoringType, string> = {
  area: 'Area Monitoring',
  personal: 'Personal Monitoring',
  task_based: 'Task-Based',
  baseline: 'Baseline',
  follow_up: 'Follow-Up',
};

export const HEAT_INDEX_LABELS: Record<HeatIndex, string> = {
  safe: 'Safe',
  caution: 'Caution',
  extreme_caution: 'Extreme Caution',
  danger: 'Danger',
  extreme_danger: 'Extreme Danger',
};

export const HEAT_INDEX_COLORS: Record<HeatIndex, string> = {
  safe: '#10B981',
  caution: '#F59E0B',
  extreme_caution: '#F97316',
  danger: '#EF4444',
  extreme_danger: '#7C2D12',
};

export const CONTAMINANT_TYPE_LABELS: Record<ContaminantType, string> = {
  particulate: 'Particulate',
  gas: 'Gas',
  vapor: 'Vapor',
  fume: 'Fume',
  mist: 'Mist',
  dust: 'Dust',
  biological: 'Biological',
  multiple: 'Multiple',
};

export const BODY_PARTS = [
  'Neck',
  'Shoulders',
  'Upper Back',
  'Lower Back',
  'Upper Arms',
  'Elbows',
  'Forearms',
  'Wrists',
  'Hands',
  'Fingers',
  'Hips',
  'Thighs',
  'Knees',
  'Lower Legs',
  'Ankles',
  'Feet',
];

export const COMMON_SYMPTOMS = [
  'Pain',
  'Numbness',
  'Tingling',
  'Stiffness',
  'Weakness',
  'Swelling',
  'Burning',
  'Cramping',
  'Fatigue',
  'Limited Range of Motion',
];

export const COMMON_RISK_FACTORS = [
  'Repetitive motions',
  'Forceful exertions',
  'Awkward postures',
  'Static positions',
  'Contact stress',
  'Vibration',
  'Cold temperatures',
  'Inadequate lighting',
  'Prolonged sitting',
  'Prolonged standing',
  'Heavy lifting',
  'Twisting',
  'Reaching overhead',
  'Pinch grip',
  'Power grip',
];
