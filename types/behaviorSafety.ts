export type ObservationType = 'safe' | 'at_risk' | 'positive' | 'coaching';
export type ObservationCategory = 'ppe' | 'body_positioning' | 'housekeeping' | 'procedures' | 'tools_equipment' | 'communication' | 'line_of_fire' | 'lockout_tagout' | 'other';
export type ObservationStatus = 'open' | 'in_progress' | 'completed' | 'closed';
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SuggestionStatus = 'submitted' | 'under_review' | 'approved' | 'implemented' | 'rejected' | 'deferred';
export type SuggestionCategory = 'equipment' | 'process' | 'ppe' | 'training' | 'housekeeping' | 'ergonomics' | 'environment' | 'other';
export type MeetingType = 'regular' | 'special' | 'emergency' | 'quarterly' | 'annual';
export type RecognitionType = 'safety_star' | 'near_miss_report' | 'safety_suggestion' | 'perfect_record' | 'safety_leadership' | 'injury_free_milestone' | 'other';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface SafetyObservation {
  id: string;
  organization_id: string;
  observation_number: string;
  observation_date: string;
  observation_time: string | null;
  facility_id: string | null;
  facility_name: string | null;
  department: string | null;
  location: string;
  work_area: string | null;
  observer_id: string | null;
  observer_name: string;
  observer_department: string | null;
  observed_employee_id: string | null;
  observed_employee_name: string | null;
  observation_type: ObservationType;
  category: ObservationCategory;
  behavior_observed: string;
  task_being_performed: string | null;
  safe_behaviors: string[];
  at_risk_behaviors: string[];
  immediate_action_taken: string | null;
  coaching_provided: boolean;
  coaching_notes: string | null;
  root_cause: string | null;
  corrective_action_required: boolean;
  corrective_action: string | null;
  corrective_action_due_date: string | null;
  corrective_action_completed: boolean;
  corrective_action_completed_date: string | null;
  priority: Priority;
  status: ObservationStatus;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  attachments: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeerSafetyAudit {
  id: string;
  organization_id: string;
  audit_number: string;
  audit_date: string;
  facility_id: string | null;
  facility_name: string | null;
  department: string | null;
  area_audited: string;
  shift: string | null;
  auditor_id: string | null;
  auditor_name: string;
  auditor_department: string | null;
  audit_partner_id: string | null;
  audit_partner_name: string | null;
  audit_type: string | null;
  audit_duration_minutes: number | null;
  employees_observed: number | null;
  safe_observations: number;
  at_risk_observations: number;
  total_observations: number;
  safety_score: number | null;
  checklist_items: Record<string, unknown>[];
  findings: Record<string, unknown>[];
  positive_findings: string[];
  areas_for_improvement: string[];
  immediate_hazards_found: boolean;
  hazards_corrected_immediately: boolean;
  hazard_details: string | null;
  recommendations: string[];
  action_items: Record<string, unknown>[];
  follow_up_required: boolean;
  follow_up_date: string | null;
  status: AuditStatus;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  attachments: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetySuggestion {
  id: string;
  organization_id: string;
  suggestion_number: string;
  submission_date: string;
  submitter_id: string | null;
  submitter_name: string;
  submitter_department: string | null;
  submitter_email: string | null;
  is_anonymous: boolean;
  facility_id: string | null;
  facility_name: string | null;
  department: string | null;
  location: string | null;
  category: SuggestionCategory;
  title: string;
  description: string;
  current_situation: string | null;
  proposed_solution: string | null;
  expected_benefits: string | null;
  safety_impact: string | null;
  estimated_cost: number | null;
  cost_savings_potential: number | null;
  priority: Priority;
  status: SuggestionStatus;
  assigned_to: string | null;
  assigned_to_id: string | null;
  assigned_date: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  implementation_date: string | null;
  implementation_notes: string | null;
  implemented_by: string | null;
  implemented_by_id: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  recognition_given: boolean;
  recognition_type: string | null;
  recognition_date: string | null;
  attachments: Record<string, unknown>[];
  photos: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyCommitteeMeeting {
  id: string;
  organization_id: string;
  meeting_number: string;
  meeting_date: string;
  meeting_time: string | null;
  meeting_end_time: string | null;
  facility_id: string | null;
  facility_name: string | null;
  meeting_type: MeetingType;
  location: string | null;
  chairperson_id: string | null;
  chairperson_name: string;
  secretary_id: string | null;
  secretary_name: string | null;
  attendees: Record<string, unknown>[];
  absentees: Record<string, unknown>[];
  guests: string[];
  quorum_met: boolean;
  previous_minutes_approved: boolean;
  agenda_items: Record<string, unknown>[];
  old_business: Record<string, unknown>[];
  new_business: Record<string, unknown>[];
  incident_reviews: Record<string, unknown>[];
  inspection_reviews: Record<string, unknown>[];
  training_updates: string[];
  safety_metrics: Record<string, unknown>;
  action_items: Record<string, unknown>[];
  motions: Record<string, unknown>[];
  announcements: string[];
  next_meeting_date: string | null;
  next_meeting_time: string | null;
  next_meeting_location: string | null;
  minutes_approved_by: string | null;
  minutes_approved_by_id: string | null;
  minutes_approved_date: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'distributed';
  distribution_list: string[];
  distributed_date: string | null;
  attachments: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyRecognition {
  id: string;
  organization_id: string;
  recognition_number: string;
  recognition_date: string;
  facility_id: string | null;
  facility_name: string | null;
  recipient_id: string | null;
  recipient_name: string;
  recipient_department: string | null;
  recipient_job_title: string | null;
  is_team_recognition: boolean;
  team_name: string | null;
  team_members: Record<string, unknown>[];
  recognition_type: RecognitionType;
  category: string | null;
  title: string;
  description: string;
  achievement_details: string | null;
  incident_date: string | null;
  incident_reference: string | null;
  safety_impact: string | null;
  award_name: string | null;
  award_value: number | null;
  award_description: string | null;
  presented_by_id: string | null;
  presented_by_name: string;
  presented_by_title: string | null;
  ceremony_date: string | null;
  ceremony_location: string | null;
  announcement_method: string | null;
  is_public: boolean;
  milestones: Record<string, unknown>;
  nominated_by_id: string | null;
  nominated_by_name: string | null;
  nomination_date: string | null;
  nomination_reason: string | null;
  approved_by_id: string | null;
  approved_by_name: string | null;
  approved_date: string | null;
  status: 'nominated' | 'approved' | 'presented' | 'rejected';
  photos: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const OBSERVATION_TYPE_LABELS: Record<ObservationType, string> = {
  safe: 'Safe Behavior',
  at_risk: 'At-Risk Behavior',
  positive: 'Positive Reinforcement',
  coaching: 'Coaching Opportunity',
};

export const OBSERVATION_TYPE_COLORS: Record<ObservationType, string> = {
  safe: '#10B981',
  at_risk: '#EF4444',
  positive: '#3B82F6',
  coaching: '#F59E0B',
};

export const OBSERVATION_CATEGORY_LABELS: Record<ObservationCategory, string> = {
  ppe: 'PPE',
  body_positioning: 'Body Positioning',
  housekeeping: 'Housekeeping',
  procedures: 'Procedures',
  tools_equipment: 'Tools & Equipment',
  communication: 'Communication',
  line_of_fire: 'Line of Fire',
  lockout_tagout: 'Lockout/Tagout',
  other: 'Other',
};

export const OBSERVATION_STATUS_LABELS: Record<ObservationStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
};

export const OBSERVATION_STATUS_COLORS: Record<ObservationStatus, string> = {
  open: '#F59E0B',
  in_progress: '#3B82F6',
  completed: '#10B981',
  closed: '#6B7280',
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const AUDIT_STATUS_COLORS: Record<AuditStatus, string> = {
  scheduled: '#6B7280',
  in_progress: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  implemented: 'Implemented',
  rejected: 'Rejected',
  deferred: 'Deferred',
};

export const SUGGESTION_STATUS_COLORS: Record<SuggestionStatus, string> = {
  submitted: '#6B7280',
  under_review: '#F59E0B',
  approved: '#3B82F6',
  implemented: '#10B981',
  rejected: '#EF4444',
  deferred: '#8B5CF6',
};

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  equipment: 'Equipment',
  process: 'Process',
  ppe: 'PPE',
  training: 'Training',
  housekeeping: 'Housekeeping',
  ergonomics: 'Ergonomics',
  environment: 'Environment',
  other: 'Other',
};

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  regular: 'Regular Meeting',
  special: 'Special Meeting',
  emergency: 'Emergency Meeting',
  quarterly: 'Quarterly Meeting',
  annual: 'Annual Meeting',
};

export const RECOGNITION_TYPE_LABELS: Record<RecognitionType, string> = {
  safety_star: 'Safety Star',
  near_miss_report: 'Near Miss Reporting',
  safety_suggestion: 'Safety Suggestion',
  perfect_record: 'Perfect Safety Record',
  safety_leadership: 'Safety Leadership',
  injury_free_milestone: 'Injury-Free Milestone',
  other: 'Other',
};

export const RECOGNITION_TYPE_COLORS: Record<RecognitionType, string> = {
  safety_star: '#F59E0B',
  near_miss_report: '#3B82F6',
  safety_suggestion: '#10B981',
  perfect_record: '#8B5CF6',
  safety_leadership: '#EF4444',
  injury_free_milestone: '#EC4899',
  other: '#6B7280',
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

export const COMMON_SAFE_BEHAVIORS = [
  'Wearing required PPE',
  'Following proper procedures',
  'Using proper lifting techniques',
  'Maintaining 3-point contact',
  'Keeping work area clean',
  'Using proper tools for the job',
  'Communicating hazards to coworkers',
  'Locking out energy sources',
  'Using fall protection',
  'Staying out of line of fire',
];

export const COMMON_AT_RISK_BEHAVIORS = [
  'Not wearing required PPE',
  'Taking shortcuts',
  'Improper lifting',
  'Running/rushing',
  'Not following procedures',
  'Using damaged equipment',
  'Working in line of fire',
  'Not using fall protection',
  'Bypassing safety devices',
  'Working without proper training',
];

export const AUDIT_CHECKLIST_CATEGORIES = [
  'PPE Compliance',
  'Housekeeping',
  'Machine Guarding',
  'Lockout/Tagout',
  'Fire Safety',
  'Emergency Equipment',
  'Chemical Safety',
  'Ergonomics',
  'Walking/Working Surfaces',
  'Electrical Safety',
];
