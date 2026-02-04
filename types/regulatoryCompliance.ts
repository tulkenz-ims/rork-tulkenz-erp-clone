export type OSHA300AStatus = 'draft' | 'pending_review' | 'certified' | 'posted' | 'archived';
export type WorkersCompStatus = 'open' | 'pending' | 'accepted' | 'denied' | 'closed' | 'reopened' | 'litigation';
export type InjuryType = 'injury' | 'illness' | 'occupational_disease';
export type TreatmentType = 'first_aid' | 'medical_facility' | 'emergency_room' | 'hospitalized' | 'none';
export type ReturnToWorkStatus = 'pending' | 'cleared' | 'restricted' | 'not_cleared' | 'completed' | 'cancelled';
export type AbsenceType = 'workers_comp' | 'fmla' | 'medical_leave' | 'personal_leave' | 'other';
export type ReturnType = 'full_duty' | 'modified_duty' | 'light_duty' | 'partial_return' | 'not_cleared';
export type FitnessResult = 'fit' | 'fit_with_restrictions' | 'not_fit' | 'pending';
export type RestrictionStatus = 'active' | 'modified' | 'expired' | 'released' | 'cancelled';
export type RestrictionCategory = 'lifting' | 'standing' | 'sitting' | 'walking' | 'repetitive_motion' | 'driving' | 'heights' | 'environmental' | 'cognitive' | 'medication' | 'other';
export type DrugTestType = 'pre_employment' | 'random' | 'post_accident' | 'reasonable_suspicion' | 'return_to_duty' | 'follow_up' | 'periodic' | 'other';
export type SpecimenType = 'urine' | 'hair' | 'saliva' | 'blood' | 'breath';
export type DrugPanelType = '5_panel' | '7_panel' | '10_panel' | '12_panel' | 'custom' | 'dot';
export type AlcoholTestType = 'breath' | 'blood' | 'saliva';
export type TestResult = 'negative' | 'positive' | 'dilute_negative' | 'dilute_positive' | 'invalid' | 'refused' | 'pending';
export type AlcoholResult = 'negative' | 'positive' | 'refused' | 'pending' | 'n/a';
export type TestAction = 'none' | 'counseling' | 'eap_referral' | 'sap_referral' | 'suspension' | 'termination' | 'offer_rescinded' | 'other';
export type DrugTestStatus = 'scheduled' | 'collected' | 'pending' | 'completed' | 'cancelled' | 'no_show';
export type PSMElement = 'employee_participation' | 'process_safety_information' | 'process_hazard_analysis' | 'operating_procedures' | 'training' | 'contractors' | 'pre_startup_safety_review' | 'mechanical_integrity' | 'hot_work_permit' | 'management_of_change' | 'incident_investigation' | 'emergency_planning' | 'compliance_audits' | 'trade_secrets';
export type PSMActivityType = 'audit' | 'review' | 'update' | 'training' | 'inspection' | 'pha' | 'moc' | 'pssr' | 'incident_review' | 'drill' | 'other';
export type PSMStatus = 'scheduled' | 'in_progress' | 'open' | 'pending_review' | 'completed' | 'overdue' | 'cancelled';
export type FireSystemType = 'sprinkler' | 'standpipe' | 'fire_pump' | 'fire_alarm' | 'suppression_hood' | 'clean_agent' | 'foam' | 'deluge' | 'water_supply' | 'hydrant' | 'other';
export type ImpairmentType = 'planned' | 'emergency' | 'discovered';
export type ImpairmentReason = 'maintenance' | 'repair' | 'modification' | 'construction' | 'testing' | 'freeze_protection' | 'water_supply_issue' | 'equipment_failure' | 'false_alarm_prevention' | 'other';
export type ImpairmentStatus = 'pending' | 'active' | 'extended' | 'restored' | 'cancelled';

export interface OSHA300ASummary {
  id: string;
  organization_id: string;
  summary_number: string;
  year: number;
  facility_id: string | null;
  facility_name: string | null;
  establishment_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  industry_description: string | null;
  sic_code: string | null;
  naics_code: string | null;
  annual_average_employees: number;
  total_hours_worked: number;
  total_deaths: number;
  total_days_away: number;
  total_job_transfer_restriction: number;
  total_other_recordable: number;
  injury_total_cases: number;
  injury_days_away: number;
  injury_job_transfer: number;
  injury_other_recordable: number;
  skin_disorder_total: number;
  skin_disorder_days_away: number;
  skin_disorder_job_transfer: number;
  skin_disorder_other_recordable: number;
  respiratory_total: number;
  respiratory_days_away: number;
  respiratory_job_transfer: number;
  respiratory_other_recordable: number;
  poisoning_total: number;
  poisoning_days_away: number;
  poisoning_job_transfer: number;
  poisoning_other_recordable: number;
  hearing_loss_total: number;
  hearing_loss_days_away: number;
  hearing_loss_job_transfer: number;
  hearing_loss_other_recordable: number;
  other_illness_total: number;
  other_illness_days_away: number;
  other_illness_job_transfer: number;
  other_illness_other_recordable: number;
  certifying_official_name: string | null;
  certifying_official_title: string | null;
  certifying_official_phone: string | null;
  certification_date: string | null;
  posting_start_date: string | null;
  posting_end_date: string | null;
  posted_by: string | null;
  posted_by_id: string | null;
  status: OSHA300AStatus;
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkersCompClaim {
  id: string;
  organization_id: string;
  claim_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  hire_date: string | null;
  date_of_birth: string | null;
  ssn_last_four: string | null;
  facility_id: string | null;
  facility_name: string | null;
  date_of_injury: string;
  time_of_injury: string | null;
  date_reported: string;
  reported_to: string | null;
  reported_to_id: string | null;
  injury_type: InjuryType;
  body_part_affected: string[];
  nature_of_injury: string;
  injury_description: string;
  injury_location: string | null;
  cause_of_injury: string | null;
  object_substance_involved: string | null;
  activity_at_time: string | null;
  witnesses: Record<string, unknown>[];
  medical_treatment_required: boolean;
  initial_treatment_type: TreatmentType | null;
  treating_physician: string | null;
  treating_facility: string | null;
  treating_facility_address: string | null;
  treating_facility_phone: string | null;
  lost_time_claim: boolean;
  first_day_lost: string | null;
  return_to_work_date: string | null;
  days_away_from_work: number;
  days_restricted_duty: number;
  insurance_carrier: string | null;
  policy_number: string | null;
  insurance_claim_number: string | null;
  adjuster_name: string | null;
  adjuster_phone: string | null;
  adjuster_email: string | null;
  medical_costs: number;
  indemnity_costs: number;
  legal_costs: number;
  other_costs: number;
  total_incurred: number;
  reserve_amount: number;
  status: WorkersCompStatus;
  claim_accepted_date: string | null;
  claim_denied_date: string | null;
  denial_reason: string | null;
  claim_closed_date: string | null;
  closure_reason: string | null;
  osha_recordable: boolean;
  osha_300_log_entry: string | null;
  osha_301_completed: boolean;
  investigation_completed: boolean;
  investigation_date: string | null;
  investigated_by: string | null;
  investigated_by_id: string | null;
  root_cause: string | null;
  corrective_actions: Record<string, unknown>[];
  notes: string | null;
  internal_notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnToWorkForm {
  id: string;
  organization_id: string;
  form_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  workers_comp_claim_id: string | null;
  claim_number: string | null;
  absence_type: AbsenceType;
  absence_reason: string | null;
  first_day_absent: string;
  last_day_absent: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  total_days_absent: number | null;
  medical_clearance_required: boolean;
  medical_clearance_received: boolean;
  clearance_date: string | null;
  clearing_physician: string | null;
  clearing_facility: string | null;
  return_type: ReturnType | null;
  has_restrictions: boolean;
  restrictions_start_date: string | null;
  restrictions_end_date: string | null;
  restriction_details: string | null;
  work_hours_per_day: number | null;
  work_days_per_week: number | null;
  lifting_restriction_lbs: number | null;
  standing_restriction_hours: number | null;
  sitting_restriction_hours: number | null;
  walking_restriction: string | null;
  driving_restriction: boolean;
  other_restrictions: string[];
  modified_duty_assigned: boolean;
  modified_duty_description: string | null;
  modified_duty_department: string | null;
  modified_duty_supervisor: string | null;
  modified_duty_start_date: string | null;
  modified_duty_end_date: string | null;
  fitness_for_duty_exam_required: boolean;
  fitness_for_duty_exam_date: string | null;
  fitness_for_duty_result: FitnessResult | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  next_medical_appointment: string | null;
  hr_reviewed: boolean;
  hr_reviewer: string | null;
  hr_reviewer_id: string | null;
  hr_review_date: string | null;
  hr_notes: string | null;
  supervisor_approved: boolean;
  supervisor_approval_date: string | null;
  hr_approved: boolean;
  hr_approval_date: string | null;
  status: ReturnToWorkStatus;
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalRestriction {
  id: string;
  organization_id: string;
  restriction_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  workers_comp_claim_id: string | null;
  return_to_work_id: string | null;
  effective_date: string;
  expiration_date: string | null;
  is_permanent: boolean;
  prescribing_physician: string;
  medical_facility: string | null;
  facility_phone: string | null;
  restriction_category: RestrictionCategory;
  lifting_max_lbs: number | null;
  lifting_frequency: string | null;
  standing_max_hours: number | null;
  sitting_max_hours: number | null;
  walking_max_distance: string | null;
  no_repetitive_motion: boolean;
  repetitive_motion_details: string | null;
  no_driving: boolean;
  no_heights: boolean;
  height_limit_feet: number | null;
  no_ladders: boolean;
  no_extreme_temps: boolean;
  temp_restrictions: string | null;
  no_chemicals: boolean;
  chemical_restrictions: string[];
  no_noise_exposure: boolean;
  noise_limit_db: number | null;
  no_vibration: boolean;
  cognitive_restrictions: string | null;
  medication_restrictions: string | null;
  other_restrictions: string | null;
  modified_schedule_required: boolean;
  work_hours_per_day: number | null;
  work_days_per_week: number | null;
  required_breaks: string | null;
  break_frequency_minutes: number | null;
  equipment_required: string[];
  accommodations_required: string[];
  accommodations_provided: boolean;
  accommodations_details: string | null;
  employee_notified: boolean;
  employee_notified_date: string | null;
  supervisor_notified: boolean;
  supervisor_notified_date: string | null;
  hr_notified: boolean;
  hr_notified_date: string | null;
  employee_acknowledged: boolean;
  employee_acknowledged_date: string | null;
  supervisor_acknowledged: boolean;
  supervisor_acknowledged_date: string | null;
  next_review_date: string | null;
  last_reviewed_date: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  review_notes: string | null;
  status: RestrictionStatus;
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrugAlcoholTest {
  id: string;
  organization_id: string;
  test_number: string;
  employee_id: string | null;
  employee_name: string;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  is_candidate: boolean;
  candidate_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  test_date: string;
  test_time: string | null;
  test_type: DrugTestType;
  test_reason: string | null;
  collection_site: string;
  collection_site_address: string | null;
  collector_name: string | null;
  specimen_type: SpecimenType;
  specimen_id: string | null;
  chain_of_custody_number: string | null;
  collection_time: string | null;
  drug_panel_type: DrugPanelType | null;
  substances_tested: string[];
  alcohol_test_included: boolean;
  alcohol_test_type: AlcoholTestType | null;
  bat_name: string | null;
  bat_certification: string | null;
  drug_result: TestResult | null;
  alcohol_result: AlcoholResult | null;
  alcohol_level: number | null;
  positive_substances: string[];
  mro_name: string | null;
  mro_phone: string | null;
  mro_review_date: string | null;
  mro_verified_result: string | null;
  mro_notes: string | null;
  is_dot_test: boolean;
  dot_mode: string | null;
  dot_reason_code: string | null;
  action_taken: TestAction | null;
  action_date: string | null;
  action_details: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  employee_notified: boolean;
  employee_notified_date: string | null;
  supervisor_notified: boolean;
  supervisor_notified_date: string | null;
  hr_notified: boolean;
  hr_notified_date: string | null;
  access_restricted: boolean;
  authorized_viewers: string[];
  status: DrugTestStatus;
  notes: string | null;
  confidential_notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PSMComplianceRecord {
  id: string;
  organization_id: string;
  record_number: string;
  facility_id: string | null;
  facility_name: string | null;
  process_name: string;
  process_area: string | null;
  covered_chemical: string;
  chemical_cas_number: string | null;
  threshold_quantity_lbs: number | null;
  actual_quantity_lbs: number | null;
  psm_element: PSMElement;
  activity_type: PSMActivityType;
  activity_description: string;
  activity_date: string;
  due_date: string | null;
  completion_date: string | null;
  next_due_date: string | null;
  responsible_person: string;
  responsible_person_id: string | null;
  participants: Record<string, unknown>[];
  contractor_involvement: boolean;
  contractor_names: string[];
  findings_count: number;
  findings: Record<string, unknown>[];
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
  corrective_actions_required: number;
  corrective_actions_completed: number;
  corrective_actions: Record<string, unknown>[];
  documentation_updated: boolean;
  documents_reviewed: string[];
  documents_updated: string[];
  verified: boolean;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_date: string | null;
  osha_citation_related: boolean;
  citation_number: string | null;
  epa_rmp_related: boolean;
  status: PSMStatus;
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FireSuppressionImpairment {
  id: string;
  organization_id: string;
  impairment_number: string;
  facility_id: string | null;
  facility_name: string | null;
  system_type: FireSystemType;
  system_name: string;
  system_location: string;
  system_coverage_area: string | null;
  impairment_type: ImpairmentType;
  impairment_reason: ImpairmentReason;
  impairment_description: string;
  full_system_impaired: boolean;
  partial_areas_impaired: string[];
  floors_affected: string[];
  start_date: string;
  start_time: string;
  estimated_duration_hours: number | null;
  expected_end_date: string | null;
  expected_end_time: string | null;
  actual_end_date: string | null;
  actual_end_time: string | null;
  work_being_performed: string | null;
  contractor_name: string | null;
  contractor_contact: string | null;
  work_permit_number: string | null;
  fire_watch_required: boolean;
  fire_watch_assigned: boolean;
  fire_watch_name: string | null;
  fire_watch_location: string | null;
  fire_watch_start_time: string | null;
  portable_extinguishers_placed: boolean;
  extinguisher_locations: string[];
  hot_work_prohibited: boolean;
  smoking_prohibited: boolean;
  fire_department_notified: boolean;
  fire_department_notification_time: string | null;
  fire_department_contact: string | null;
  insurance_notified: boolean;
  insurance_notification_time: string | null;
  insurance_contact: string | null;
  insurance_reference_number: string | null;
  alarm_company_notified: boolean;
  alarm_company_notification_time: string | null;
  management_notified: boolean;
  management_notification_time: string | null;
  affected_areas_notified: boolean;
  notification_method: string | null;
  impairment_tag_placed: boolean;
  tag_number: string | null;
  tag_location: string | null;
  tag_placed_by: string | null;
  tag_placed_by_id: string | null;
  system_restored: boolean;
  restoration_verified: boolean;
  restoration_verified_by: string | null;
  restoration_verified_by_id: string | null;
  restoration_date: string | null;
  restoration_time: string | null;
  tag_removed: boolean;
  tag_removed_by: string | null;
  tag_removed_by_id: string | null;
  tag_removed_date: string | null;
  post_restoration_test_required: boolean;
  post_restoration_test_completed: boolean;
  test_results: string | null;
  fire_department_closeout_notified: boolean;
  insurance_closeout_notified: boolean;
  alarm_company_closeout_notified: boolean;
  impairment_coordinator: string;
  impairment_coordinator_id: string | null;
  authorized_by: string | null;
  authorized_by_id: string | null;
  authorization_date: string | null;
  status: ImpairmentStatus;
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export const OSHA_STATUS_LABELS: Record<OSHA300AStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  certified: 'Certified',
  posted: 'Posted',
  archived: 'Archived',
};

export const OSHA_STATUS_COLORS: Record<OSHA300AStatus, string> = {
  draft: '#6B7280',
  pending_review: '#F59E0B',
  certified: '#3B82F6',
  posted: '#10B981',
  archived: '#9CA3AF',
};

export const WORKERS_COMP_STATUS_LABELS: Record<WorkersCompStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  accepted: 'Accepted',
  denied: 'Denied',
  closed: 'Closed',
  reopened: 'Reopened',
  litigation: 'In Litigation',
};

export const WORKERS_COMP_STATUS_COLORS: Record<WorkersCompStatus, string> = {
  open: '#F59E0B',
  pending: '#6B7280',
  accepted: '#10B981',
  denied: '#EF4444',
  closed: '#3B82F6',
  reopened: '#8B5CF6',
  litigation: '#DC2626',
};

export const RETURN_TO_WORK_STATUS_LABELS: Record<ReturnToWorkStatus, string> = {
  pending: 'Pending',
  cleared: 'Cleared',
  restricted: 'Restricted',
  not_cleared: 'Not Cleared',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const RETURN_TO_WORK_STATUS_COLORS: Record<ReturnToWorkStatus, string> = {
  pending: '#F59E0B',
  cleared: '#10B981',
  restricted: '#3B82F6',
  not_cleared: '#EF4444',
  completed: '#6B7280',
  cancelled: '#9CA3AF',
};

export const RESTRICTION_STATUS_LABELS: Record<RestrictionStatus, string> = {
  active: 'Active',
  modified: 'Modified',
  expired: 'Expired',
  released: 'Released',
  cancelled: 'Cancelled',
};

export const RESTRICTION_STATUS_COLORS: Record<RestrictionStatus, string> = {
  active: '#EF4444',
  modified: '#F59E0B',
  expired: '#6B7280',
  released: '#10B981',
  cancelled: '#9CA3AF',
};

export const DRUG_TEST_STATUS_LABELS: Record<DrugTestStatus, string> = {
  scheduled: 'Scheduled',
  collected: 'Collected',
  pending: 'Pending Results',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const DRUG_TEST_STATUS_COLORS: Record<DrugTestStatus, string> = {
  scheduled: '#6B7280',
  collected: '#3B82F6',
  pending: '#F59E0B',
  completed: '#10B981',
  cancelled: '#9CA3AF',
  no_show: '#EF4444',
};

export const DRUG_TEST_TYPE_LABELS: Record<DrugTestType, string> = {
  pre_employment: 'Pre-Employment',
  random: 'Random',
  post_accident: 'Post-Accident',
  reasonable_suspicion: 'Reasonable Suspicion',
  return_to_duty: 'Return to Duty',
  follow_up: 'Follow-Up',
  periodic: 'Periodic',
  other: 'Other',
};

export const PSM_STATUS_LABELS: Record<PSMStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  open: 'Open',
  pending_review: 'Pending Review',
  completed: 'Completed',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const PSM_STATUS_COLORS: Record<PSMStatus, string> = {
  scheduled: '#6B7280',
  in_progress: '#3B82F6',
  open: '#F59E0B',
  pending_review: '#8B5CF6',
  completed: '#10B981',
  overdue: '#EF4444',
  cancelled: '#9CA3AF',
};

export const PSM_ELEMENT_LABELS: Record<PSMElement, string> = {
  employee_participation: 'Employee Participation',
  process_safety_information: 'Process Safety Information',
  process_hazard_analysis: 'Process Hazard Analysis',
  operating_procedures: 'Operating Procedures',
  training: 'Training',
  contractors: 'Contractors',
  pre_startup_safety_review: 'Pre-Startup Safety Review',
  mechanical_integrity: 'Mechanical Integrity',
  hot_work_permit: 'Hot Work Permit',
  management_of_change: 'Management of Change',
  incident_investigation: 'Incident Investigation',
  emergency_planning: 'Emergency Planning',
  compliance_audits: 'Compliance Audits',
  trade_secrets: 'Trade Secrets',
};

export const IMPAIRMENT_STATUS_LABELS: Record<ImpairmentStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  extended: 'Extended',
  restored: 'Restored',
  cancelled: 'Cancelled',
};

export const IMPAIRMENT_STATUS_COLORS: Record<ImpairmentStatus, string> = {
  pending: '#6B7280',
  active: '#EF4444',
  extended: '#F59E0B',
  restored: '#10B981',
  cancelled: '#9CA3AF',
};

export const FIRE_SYSTEM_TYPE_LABELS: Record<FireSystemType, string> = {
  sprinkler: 'Sprinkler System',
  standpipe: 'Standpipe',
  fire_pump: 'Fire Pump',
  fire_alarm: 'Fire Alarm',
  suppression_hood: 'Suppression Hood',
  clean_agent: 'Clean Agent System',
  foam: 'Foam System',
  deluge: 'Deluge System',
  water_supply: 'Water Supply',
  hydrant: 'Fire Hydrant',
  other: 'Other',
};

export const IMPAIRMENT_REASON_LABELS: Record<ImpairmentReason, string> = {
  maintenance: 'Maintenance',
  repair: 'Repair',
  modification: 'Modification',
  construction: 'Construction',
  testing: 'Testing',
  freeze_protection: 'Freeze Protection',
  water_supply_issue: 'Water Supply Issue',
  equipment_failure: 'Equipment Failure',
  false_alarm_prevention: 'False Alarm Prevention',
  other: 'Other',
};

export const BODY_PARTS = [
  'Head', 'Face', 'Eye(s)', 'Ear(s)', 'Neck', 'Shoulder(s)',
  'Upper Arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Finger(s)',
  'Chest', 'Upper Back', 'Lower Back', 'Abdomen', 'Hip',
  'Thigh', 'Knee', 'Lower Leg', 'Ankle', 'Foot', 'Toe(s)',
  'Multiple Body Parts', 'Internal Organs', 'Whole Body',
];

export const INJURY_NATURES = [
  'Sprain/Strain', 'Cut/Laceration', 'Contusion/Bruise', 'Fracture',
  'Burn (Heat)', 'Burn (Chemical)', 'Amputation', 'Puncture',
  'Abrasion', 'Crushing Injury', 'Dislocation', 'Foreign Body',
  'Repetitive Motion', 'Hearing Loss', 'Respiratory Condition',
  'Skin Disorder', 'Poisoning', 'Electric Shock', 'Heat Stress',
  'Cold Stress', 'Other',
];

export const RESTRICTION_CATEGORIES: { value: RestrictionCategory; label: string }[] = [
  { value: 'lifting', label: 'Lifting' },
  { value: 'standing', label: 'Standing' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'walking', label: 'Walking' },
  { value: 'repetitive_motion', label: 'Repetitive Motion' },
  { value: 'driving', label: 'Driving' },
  { value: 'heights', label: 'Heights' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'cognitive', label: 'Cognitive' },
  { value: 'medication', label: 'Medication' },
  { value: 'other', label: 'Other' },
];
