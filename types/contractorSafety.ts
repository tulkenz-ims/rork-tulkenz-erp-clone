// Contractor Pre-Qualification Types
export type PrequalStatus = 'pending' | 'under_review' | 'approved' | 'conditionally_approved' | 'rejected' | 'expired';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ContractorPrequal {
  id: string;
  organization_id: string;
  prequal_number: string;
  company_name: string;
  company_address: string | null;
  company_city: string | null;
  company_state: string | null;
  company_zip: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  tax_id: string | null;
  duns_number: string | null;
  years_in_business: number | null;
  employee_count: number | null;
  primary_contact_name: string;
  primary_contact_title: string | null;
  primary_contact_phone: string | null;
  primary_contact_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  services_provided: string[];
  work_types: string[];
  experience_description: string | null;
  references: ContractorReference[];
  safety_program: boolean;
  safety_manual_provided: boolean;
  emr_rate: number | null;
  trir_rate: number | null;
  dart_rate: number | null;
  osha_citations_3_years: number | null;
  fatalities_3_years: number | null;
  drug_testing_program: boolean;
  background_check_program: boolean;
  safety_training_program: boolean;
  risk_level: RiskLevel;
  status: PrequalStatus;
  submitted_date: string;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  expiration_date: string | null;
  rejection_reason: string | null;
  conditions: string | null;
  attachments: ContractorAttachment[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorReference {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  project_description: string | null;
  project_value: number | null;
  project_dates: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_date: string | null;
  notes: string | null;
}

export interface ContractorAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
  uploaded_by: string;
}

// Contractor Orientation Types
export type OrientationStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'expired' | 'cancelled';

export interface ContractorOrientation {
  id: string;
  organization_id: string;
  orientation_number: string;
  contractor_id: string | null;
  contractor_company: string;
  attendee_name: string;
  attendee_title: string | null;
  attendee_phone: string | null;
  attendee_email: string | null;
  attendee_photo_url: string | null;
  facility_id: string | null;
  facility_name: string | null;
  orientation_type: 'initial' | 'annual_refresher' | 'site_specific' | 'project_specific';
  scheduled_date: string;
  scheduled_time: string | null;
  completed_date: string | null;
  instructor_name: string | null;
  instructor_id: string | null;
  topics_covered: OrientationTopic[];
  quiz_required: boolean;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  passing_score: number;
  badge_number: string | null;
  badge_issued: boolean;
  badge_issued_date: string | null;
  badge_expiration: string | null;
  status: OrientationStatus;
  signature_url: string | null;
  signed_date: string | null;
  acknowledgments: OrientationAcknowledgment[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrientationTopic {
  id: string;
  topic: string;
  description: string | null;
  duration_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
}

export interface OrientationAcknowledgment {
  id: string;
  item: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
}

// Contractor Sign-In/Out Types
export type SignInStatus = 'signed_in' | 'signed_out' | 'emergency_evacuated';

export interface ContractorSignIn {
  id: string;
  organization_id: string;
  sign_in_number: string;
  contractor_id: string | null;
  contractor_company: string;
  person_name: string;
  person_title: string | null;
  person_phone: string | null;
  badge_number: string | null;
  orientation_verified: boolean;
  orientation_id: string | null;
  insurance_verified: boolean;
  insurance_id: string | null;
  work_auth_verified: boolean;
  work_auth_id: string | null;
  facility_id: string | null;
  facility_name: string | null;
  work_area: string | null;
  purpose_of_visit: string;
  host_name: string | null;
  host_id: string | null;
  host_notified: boolean;
  vehicle_info: string | null;
  vehicle_plate: string | null;
  tools_equipment: string | null;
  sign_in_time: string;
  expected_sign_out_time: string | null;
  sign_out_time: string | null;
  status: SignInStatus;
  safety_briefing_completed: boolean;
  ppe_verified: boolean;
  ppe_issued: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  signature_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Visitor Safety Acknowledgment Types
export type VisitorType = 'business' | 'vendor' | 'customer' | 'auditor' | 'inspector' | 'tour' | 'interview' | 'delivery' | 'other';

export interface VisitorSafety {
  id: string;
  organization_id: string;
  visitor_number: string;
  visitor_name: string;
  visitor_company: string | null;
  visitor_title: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  visitor_type: VisitorType;
  facility_id: string | null;
  facility_name: string | null;
  purpose_of_visit: string;
  host_name: string;
  host_id: string | null;
  host_department: string | null;
  host_notified: boolean;
  host_notified_at: string | null;
  check_in_time: string;
  expected_duration_minutes: number | null;
  check_out_time: string | null;
  badge_number: string | null;
  badge_issued: boolean;
  badge_returned: boolean;
  areas_authorized: string[];
  escort_required: boolean;
  escort_name: string | null;
  escort_id: string | null;
  photo_id_verified: boolean;
  photo_id_type: string | null;
  safety_video_watched: boolean;
  safety_rules_acknowledged: boolean;
  emergency_procedures_reviewed: boolean;
  ppe_provided: string[];
  health_screening_completed: boolean;
  health_screening_passed: boolean | null;
  nda_signed: boolean;
  nda_document_id: string | null;
  signature_url: string | null;
  signed_date: string | null;
  vehicle_info: string | null;
  vehicle_plate: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Contractor Work Authorization Types
export type WorkAuthStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'suspended' | 'cancelled' | 'expired';

export interface ContractorWorkAuth {
  id: string;
  organization_id: string;
  auth_number: string;
  contractor_id: string | null;
  contractor_company: string;
  prequal_id: string | null;
  prequal_verified: boolean;
  project_name: string;
  project_number: string | null;
  scope_of_work: string;
  work_location: string;
  facility_id: string | null;
  facility_name: string | null;
  department_code: string | null;
  department_name: string | null;
  start_date: string;
  end_date: string;
  work_hours_start: string | null;
  work_hours_end: string | null;
  weekend_work_allowed: boolean;
  night_work_allowed: boolean;
  max_workers_onsite: number | null;
  workers_assigned: ContractorWorker[];
  supervisor_name: string;
  supervisor_phone: string | null;
  supervisor_email: string | null;
  company_contact_name: string | null;
  company_contact_phone: string | null;
  hazards_identified: string[];
  ppe_required: string[];
  permits_required: string[];
  permit_numbers: string[];
  safety_requirements: string[];
  environmental_requirements: string[];
  insurance_verified: boolean;
  insurance_id: string | null;
  orientation_required: boolean;
  orientation_completed: boolean;
  jha_required: boolean;
  jha_completed: boolean;
  jha_document_id: string | null;
  daily_briefing_required: boolean;
  hot_work_authorized: boolean;
  confined_space_authorized: boolean;
  electrical_work_authorized: boolean;
  excavation_authorized: boolean;
  crane_lift_authorized: boolean;
  status: WorkAuthStatus;
  requested_by: string;
  requested_by_id: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  suspended_by: string | null;
  suspended_date: string | null;
  suspension_reason: string | null;
  completed_by: string | null;
  completed_date: string | null;
  completion_notes: string | null;
  attachments: ContractorAttachment[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorWorker {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  badge_number: string | null;
  orientation_completed: boolean;
  orientation_date: string | null;
}

// Contractor Insurance Types
export type InsuranceStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'pending_verification';
export type InsuranceType = 'general_liability' | 'workers_comp' | 'auto_liability' | 'umbrella' | 'professional_liability' | 'pollution_liability' | 'builders_risk' | 'other';

export interface ContractorInsurance {
  id: string;
  organization_id: string;
  contractor_id: string | null;
  contractor_company: string;
  insurance_type: InsuranceType;
  policy_number: string;
  carrier_name: string;
  carrier_phone: string | null;
  carrier_address: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  coverage_amount: number;
  deductible: number | null;
  aggregate_limit: number | null;
  per_occurrence_limit: number | null;
  effective_date: string;
  expiration_date: string;
  additional_insured: boolean;
  additional_insured_name: string | null;
  waiver_of_subrogation: boolean;
  primary_noncontributory: boolean;
  certificate_holder: string | null;
  certificate_number: string | null;
  certificate_url: string | null;
  certificate_uploaded_at: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_date: string | null;
  verification_method: string | null;
  status: InsuranceStatus;
  renewal_reminder_sent: boolean;
  renewal_reminder_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Labels and Colors
export const PREQUAL_STATUS_LABELS: Record<PrequalStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  conditionally_approved: 'Conditionally Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const PREQUAL_STATUS_COLORS: Record<PrequalStatus, string> = {
  pending: '#6B7280',
  under_review: '#F59E0B',
  approved: '#10B981',
  conditionally_approved: '#3B82F6',
  rejected: '#EF4444',
  expired: '#DC2626',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export const ORIENTATION_STATUS_LABELS: Record<OrientationStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const ORIENTATION_STATUS_COLORS: Record<OrientationStatus, string> = {
  scheduled: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  failed: '#EF4444',
  expired: '#DC2626',
  cancelled: '#6B7280',
};

export const SIGN_IN_STATUS_LABELS: Record<SignInStatus, string> = {
  signed_in: 'On Site',
  signed_out: 'Signed Out',
  emergency_evacuated: 'Emergency Evacuated',
};

export const SIGN_IN_STATUS_COLORS: Record<SignInStatus, string> = {
  signed_in: '#10B981',
  signed_out: '#6B7280',
  emergency_evacuated: '#EF4444',
};

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  business: 'Business Meeting',
  vendor: 'Vendor/Supplier',
  customer: 'Customer',
  auditor: 'Auditor',
  inspector: 'Inspector',
  tour: 'Facility Tour',
  interview: 'Interview',
  delivery: 'Delivery',
  other: 'Other',
};

export const WORK_AUTH_STATUS_LABELS: Record<WorkAuthStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
  completed: 'Completed',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const WORK_AUTH_STATUS_COLORS: Record<WorkAuthStatus, string> = {
  draft: '#6B7280',
  pending_approval: '#F59E0B',
  approved: '#3B82F6',
  active: '#10B981',
  completed: '#059669',
  suspended: '#F97316',
  cancelled: '#EF4444',
  expired: '#DC2626',
};

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  general_liability: 'General Liability',
  workers_comp: "Workers' Compensation",
  auto_liability: 'Auto Liability',
  umbrella: 'Umbrella/Excess',
  professional_liability: 'Professional Liability',
  pollution_liability: 'Pollution Liability',
  builders_risk: "Builder's Risk",
  other: 'Other',
};

export const INSURANCE_STATUS_LABELS: Record<InsuranceStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  cancelled: 'Cancelled',
  pending_verification: 'Pending Verification',
};

export const INSURANCE_STATUS_COLORS: Record<InsuranceStatus, string> = {
  active: '#10B981',
  expiring_soon: '#F59E0B',
  expired: '#EF4444',
  cancelled: '#6B7280',
  pending_verification: '#3B82F6',
};

export const WORK_TYPES = [
  'General Construction',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Refrigeration',
  'Mechanical',
  'Welding/Fabrication',
  'Painting/Coatings',
  'Roofing',
  'Flooring',
  'Concrete',
  'Demolition',
  'Excavation',
  'Landscaping',
  'Cleaning/Sanitation',
  'Pest Control',
  'Security',
  'IT/Technology',
  'Equipment Installation',
  'Equipment Repair',
  'Calibration',
  'Inspection Services',
  'Consulting',
  'Engineering',
  'Other',
] as const;

export const DEFAULT_ORIENTATION_TOPICS: OrientationTopic[] = [
  { id: '1', topic: 'Site Safety Rules', description: 'General facility safety rules and regulations', duration_minutes: 15, completed: false, completed_at: null },
  { id: '2', topic: 'Emergency Procedures', description: 'Evacuation routes, assembly points, and emergency contacts', duration_minutes: 10, completed: false, completed_at: null },
  { id: '3', topic: 'PPE Requirements', description: 'Required personal protective equipment for the facility', duration_minutes: 10, completed: false, completed_at: null },
  { id: '4', topic: 'Hazard Communication', description: 'Chemical hazards and SDS locations', duration_minutes: 15, completed: false, completed_at: null },
  { id: '5', topic: 'Permit Requirements', description: 'Hot work, confined space, and other permit requirements', duration_minutes: 10, completed: false, completed_at: null },
  { id: '6', topic: 'Reporting Procedures', description: 'How to report incidents, near misses, and hazards', duration_minutes: 10, completed: false, completed_at: null },
  { id: '7', topic: 'Restricted Areas', description: 'Areas requiring special authorization', duration_minutes: 5, completed: false, completed_at: null },
  { id: '8', topic: 'Environmental Requirements', description: 'Waste disposal and environmental compliance', duration_minutes: 10, completed: false, completed_at: null },
];

export const DEFAULT_SAFETY_ACKNOWLEDGMENTS: OrientationAcknowledgment[] = [
  { id: '1', item: 'I have received and understand the site safety rules', acknowledged: false, acknowledged_at: null },
  { id: '2', item: 'I know the location of emergency exits and assembly points', acknowledged: false, acknowledged_at: null },
  { id: '3', item: 'I understand the PPE requirements for this facility', acknowledged: false, acknowledged_at: null },
  { id: '4', item: 'I will report all incidents, injuries, and near misses immediately', acknowledged: false, acknowledged_at: null },
  { id: '5', item: 'I will follow all permit requirements for hazardous work', acknowledged: false, acknowledged_at: null },
  { id: '6', item: 'I will not enter restricted areas without authorization', acknowledged: false, acknowledged_at: null },
  { id: '7', item: 'I understand I may be subject to random drug/alcohol testing', acknowledged: false, acknowledged_at: null },
  { id: '8', item: 'I agree to comply with all safety requirements while on site', acknowledged: false, acknowledged_at: null },
];
