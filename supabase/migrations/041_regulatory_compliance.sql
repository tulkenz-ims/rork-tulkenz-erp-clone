-- Regulatory Compliance Module Tables
-- OSHA 300A Summary, Workers Comp, Return to Work, Medical Restrictions,
-- Drug/Alcohol Testing, PSM Compliance, Fire Suppression Impairment

-- OSHA 300A Annual Summary
CREATE TABLE osha_300a_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  summary_number TEXT NOT NULL,
  year INTEGER NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Establishment Information
  establishment_name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  industry_description TEXT,
  sic_code TEXT,
  naics_code TEXT,
  
  -- Employment Information
  annual_average_employees INTEGER NOT NULL DEFAULT 0,
  total_hours_worked INTEGER NOT NULL DEFAULT 0,
  
  -- Injury and Illness Summary
  total_deaths INTEGER DEFAULT 0,
  total_days_away INTEGER DEFAULT 0,
  total_job_transfer_restriction INTEGER DEFAULT 0,
  total_other_recordable INTEGER DEFAULT 0,
  
  -- Injury Types
  injury_total_cases INTEGER DEFAULT 0,
  injury_days_away INTEGER DEFAULT 0,
  injury_job_transfer INTEGER DEFAULT 0,
  injury_other_recordable INTEGER DEFAULT 0,
  
  -- Skin Disorders
  skin_disorder_total INTEGER DEFAULT 0,
  skin_disorder_days_away INTEGER DEFAULT 0,
  skin_disorder_job_transfer INTEGER DEFAULT 0,
  skin_disorder_other_recordable INTEGER DEFAULT 0,
  
  -- Respiratory Conditions
  respiratory_total INTEGER DEFAULT 0,
  respiratory_days_away INTEGER DEFAULT 0,
  respiratory_job_transfer INTEGER DEFAULT 0,
  respiratory_other_recordable INTEGER DEFAULT 0,
  
  -- Poisoning
  poisoning_total INTEGER DEFAULT 0,
  poisoning_days_away INTEGER DEFAULT 0,
  poisoning_job_transfer INTEGER DEFAULT 0,
  poisoning_other_recordable INTEGER DEFAULT 0,
  
  -- Hearing Loss
  hearing_loss_total INTEGER DEFAULT 0,
  hearing_loss_days_away INTEGER DEFAULT 0,
  hearing_loss_job_transfer INTEGER DEFAULT 0,
  hearing_loss_other_recordable INTEGER DEFAULT 0,
  
  -- All Other Illnesses
  other_illness_total INTEGER DEFAULT 0,
  other_illness_days_away INTEGER DEFAULT 0,
  other_illness_job_transfer INTEGER DEFAULT 0,
  other_illness_other_recordable INTEGER DEFAULT 0,
  
  -- Certification
  certifying_official_name TEXT,
  certifying_official_title TEXT,
  certifying_official_phone TEXT,
  certification_date DATE,
  
  -- Posting Information
  posting_start_date DATE,
  posting_end_date DATE,
  posted_by TEXT,
  posted_by_id UUID REFERENCES employees(id),
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'certified', 'posted', 'archived')),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, year, facility_id)
);

-- Workers Compensation Claims
CREATE TABLE workers_comp_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL,
  
  -- Employee Information
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department TEXT,
  job_title TEXT,
  hire_date DATE,
  date_of_birth DATE,
  ssn_last_four TEXT,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Injury/Illness Information
  date_of_injury DATE NOT NULL,
  time_of_injury TIME,
  date_reported DATE NOT NULL,
  reported_to TEXT,
  reported_to_id UUID REFERENCES employees(id),
  
  injury_type TEXT NOT NULL CHECK (injury_type IN ('injury', 'illness', 'occupational_disease')),
  body_part_affected TEXT[],
  nature_of_injury TEXT NOT NULL,
  injury_description TEXT NOT NULL,
  injury_location TEXT,
  
  -- Cause Information
  cause_of_injury TEXT,
  object_substance_involved TEXT,
  activity_at_time TEXT,
  
  -- Witnesses
  witnesses JSONB DEFAULT '[]',
  
  -- Medical Treatment
  medical_treatment_required BOOLEAN DEFAULT FALSE,
  initial_treatment_type TEXT CHECK (initial_treatment_type IN ('first_aid', 'medical_facility', 'emergency_room', 'hospitalized', 'none')),
  treating_physician TEXT,
  treating_facility TEXT,
  treating_facility_address TEXT,
  treating_facility_phone TEXT,
  
  -- Lost Time
  lost_time_claim BOOLEAN DEFAULT FALSE,
  first_day_lost DATE,
  return_to_work_date DATE,
  days_away_from_work INTEGER DEFAULT 0,
  days_restricted_duty INTEGER DEFAULT 0,
  
  -- Insurance Information
  insurance_carrier TEXT,
  policy_number TEXT,
  insurance_claim_number TEXT,
  adjuster_name TEXT,
  adjuster_phone TEXT,
  adjuster_email TEXT,
  
  -- Financial
  medical_costs DECIMAL(12,2) DEFAULT 0,
  indemnity_costs DECIMAL(12,2) DEFAULT 0,
  legal_costs DECIMAL(12,2) DEFAULT 0,
  other_costs DECIMAL(12,2) DEFAULT 0,
  total_incurred DECIMAL(12,2) DEFAULT 0,
  reserve_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'accepted', 'denied', 'closed', 'reopened', 'litigation')),
  claim_accepted_date DATE,
  claim_denied_date DATE,
  denial_reason TEXT,
  claim_closed_date DATE,
  closure_reason TEXT,
  
  -- OSHA Recordable
  osha_recordable BOOLEAN DEFAULT FALSE,
  osha_300_log_entry TEXT,
  osha_301_completed BOOLEAN DEFAULT FALSE,
  
  -- Investigation
  investigation_completed BOOLEAN DEFAULT FALSE,
  investigation_date DATE,
  investigated_by TEXT,
  investigated_by_id UUID REFERENCES employees(id),
  root_cause TEXT,
  corrective_actions JSONB DEFAULT '[]',
  
  -- Notes and Attachments
  notes TEXT,
  internal_notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, claim_number)
);

-- Return to Work Forms
CREATE TABLE return_to_work_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_number TEXT NOT NULL,
  
  -- Employee Information
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department TEXT,
  job_title TEXT,
  supervisor_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Related Claim
  workers_comp_claim_id UUID REFERENCES workers_comp_claims(id),
  claim_number TEXT,
  
  -- Absence Information
  absence_type TEXT NOT NULL CHECK (absence_type IN ('workers_comp', 'fmla', 'medical_leave', 'personal_leave', 'other')),
  absence_reason TEXT,
  first_day_absent DATE NOT NULL,
  last_day_absent DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  total_days_absent INTEGER,
  
  -- Medical Clearance
  medical_clearance_required BOOLEAN DEFAULT TRUE,
  medical_clearance_received BOOLEAN DEFAULT FALSE,
  clearance_date DATE,
  clearing_physician TEXT,
  clearing_facility TEXT,
  
  -- Return Status
  return_type TEXT CHECK (return_type IN ('full_duty', 'modified_duty', 'light_duty', 'partial_return', 'not_cleared')),
  
  -- Restrictions (if any)
  has_restrictions BOOLEAN DEFAULT FALSE,
  restrictions_start_date DATE,
  restrictions_end_date DATE,
  restriction_details TEXT,
  
  -- Work Capacity
  work_hours_per_day DECIMAL(4,2),
  work_days_per_week INTEGER,
  lifting_restriction_lbs INTEGER,
  standing_restriction_hours DECIMAL(4,2),
  sitting_restriction_hours DECIMAL(4,2),
  walking_restriction TEXT,
  driving_restriction BOOLEAN DEFAULT FALSE,
  other_restrictions TEXT[],
  
  -- Modified Duty Assignment
  modified_duty_assigned BOOLEAN DEFAULT FALSE,
  modified_duty_description TEXT,
  modified_duty_department TEXT,
  modified_duty_supervisor TEXT,
  modified_duty_start_date DATE,
  modified_duty_end_date DATE,
  
  -- Fitness for Duty
  fitness_for_duty_exam_required BOOLEAN DEFAULT FALSE,
  fitness_for_duty_exam_date DATE,
  fitness_for_duty_result TEXT CHECK (fitness_for_duty_result IN ('fit', 'fit_with_restrictions', 'not_fit', 'pending')),
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_notes TEXT,
  next_medical_appointment DATE,
  
  -- HR Review
  hr_reviewed BOOLEAN DEFAULT FALSE,
  hr_reviewer TEXT,
  hr_reviewer_id UUID REFERENCES employees(id),
  hr_review_date DATE,
  hr_notes TEXT,
  
  -- Approvals
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_approval_date DATE,
  hr_approved BOOLEAN DEFAULT FALSE,
  hr_approval_date DATE,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'restricted', 'not_cleared', 'completed', 'cancelled')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, form_number)
);

-- Medical Restrictions
CREATE TABLE medical_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restriction_number TEXT NOT NULL,
  
  -- Employee Information
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department TEXT,
  job_title TEXT,
  supervisor_id UUID REFERENCES employees(id),
  supervisor_name TEXT,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Related Records
  workers_comp_claim_id UUID REFERENCES workers_comp_claims(id),
  return_to_work_id UUID REFERENCES return_to_work_forms(id),
  
  -- Restriction Period
  effective_date DATE NOT NULL,
  expiration_date DATE,
  is_permanent BOOLEAN DEFAULT FALSE,
  
  -- Medical Provider
  prescribing_physician TEXT NOT NULL,
  medical_facility TEXT,
  facility_phone TEXT,
  
  -- Restriction Type
  restriction_category TEXT NOT NULL CHECK (restriction_category IN ('lifting', 'standing', 'sitting', 'walking', 'repetitive_motion', 'driving', 'heights', 'environmental', 'cognitive', 'medication', 'other')),
  
  -- Specific Restrictions
  lifting_max_lbs INTEGER,
  lifting_frequency TEXT,
  standing_max_hours DECIMAL(4,2),
  sitting_max_hours DECIMAL(4,2),
  walking_max_distance TEXT,
  no_repetitive_motion BOOLEAN DEFAULT FALSE,
  repetitive_motion_details TEXT,
  no_driving BOOLEAN DEFAULT FALSE,
  no_heights BOOLEAN DEFAULT FALSE,
  height_limit_feet INTEGER,
  no_ladders BOOLEAN DEFAULT FALSE,
  no_extreme_temps BOOLEAN DEFAULT FALSE,
  temp_restrictions TEXT,
  no_chemicals BOOLEAN DEFAULT FALSE,
  chemical_restrictions TEXT[],
  no_noise_exposure BOOLEAN DEFAULT FALSE,
  noise_limit_db INTEGER,
  no_vibration BOOLEAN DEFAULT FALSE,
  cognitive_restrictions TEXT,
  medication_restrictions TEXT,
  other_restrictions TEXT,
  
  -- Work Modifications
  modified_schedule_required BOOLEAN DEFAULT FALSE,
  work_hours_per_day DECIMAL(4,2),
  work_days_per_week INTEGER,
  required_breaks TEXT,
  break_frequency_minutes INTEGER,
  
  -- Equipment/Accommodations
  equipment_required TEXT[],
  accommodations_required TEXT[],
  accommodations_provided BOOLEAN DEFAULT FALSE,
  accommodations_details TEXT,
  
  -- Communication
  employee_notified BOOLEAN DEFAULT FALSE,
  employee_notified_date DATE,
  supervisor_notified BOOLEAN DEFAULT FALSE,
  supervisor_notified_date DATE,
  hr_notified BOOLEAN DEFAULT FALSE,
  hr_notified_date DATE,
  
  -- Acknowledgments
  employee_acknowledged BOOLEAN DEFAULT FALSE,
  employee_acknowledged_date DATE,
  supervisor_acknowledged BOOLEAN DEFAULT FALSE,
  supervisor_acknowledged_date DATE,
  
  -- Review
  next_review_date DATE,
  last_reviewed_date DATE,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  review_notes TEXT,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'modified', 'expired', 'released', 'cancelled')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, restriction_number)
);

-- Drug and Alcohol Test Records
CREATE TABLE drug_alcohol_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  test_number TEXT NOT NULL,
  
  -- Employee/Candidate Information
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  department TEXT,
  job_title TEXT,
  is_candidate BOOLEAN DEFAULT FALSE,
  candidate_name TEXT,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Test Information
  test_date DATE NOT NULL,
  test_time TIME,
  test_type TEXT NOT NULL CHECK (test_type IN ('pre_employment', 'random', 'post_accident', 'reasonable_suspicion', 'return_to_duty', 'follow_up', 'periodic', 'other')),
  test_reason TEXT,
  
  -- Testing Facility
  collection_site TEXT NOT NULL,
  collection_site_address TEXT,
  collector_name TEXT,
  
  -- Specimen Information
  specimen_type TEXT NOT NULL CHECK (specimen_type IN ('urine', 'hair', 'saliva', 'blood', 'breath')),
  specimen_id TEXT,
  chain_of_custody_number TEXT,
  collection_time TIMESTAMPTZ,
  
  -- Drug Panel
  drug_panel_type TEXT CHECK (drug_panel_type IN ('5_panel', '7_panel', '10_panel', '12_panel', 'custom', 'dot')),
  substances_tested TEXT[],
  
  -- Alcohol Test
  alcohol_test_included BOOLEAN DEFAULT FALSE,
  alcohol_test_type TEXT CHECK (alcohol_test_type IN ('breath', 'blood', 'saliva')),
  bat_name TEXT,
  bat_certification TEXT,
  
  -- Results
  drug_result TEXT CHECK (drug_result IN ('negative', 'positive', 'dilute_negative', 'dilute_positive', 'invalid', 'refused', 'pending')),
  alcohol_result TEXT CHECK (alcohol_result IN ('negative', 'positive', 'refused', 'pending', 'n/a')),
  alcohol_level DECIMAL(4,3),
  positive_substances TEXT[],
  
  -- MRO Review
  mro_name TEXT,
  mro_phone TEXT,
  mro_review_date DATE,
  mro_verified_result TEXT,
  mro_notes TEXT,
  
  -- DOT Compliance
  is_dot_test BOOLEAN DEFAULT FALSE,
  dot_mode TEXT,
  dot_reason_code TEXT,
  
  -- Actions Taken
  action_taken TEXT CHECK (action_taken IN ('none', 'counseling', 'eap_referral', 'sap_referral', 'suspension', 'termination', 'offer_rescinded', 'other')),
  action_date DATE,
  action_details TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Notifications
  employee_notified BOOLEAN DEFAULT FALSE,
  employee_notified_date DATE,
  supervisor_notified BOOLEAN DEFAULT FALSE,
  supervisor_notified_date DATE,
  hr_notified BOOLEAN DEFAULT FALSE,
  hr_notified_date DATE,
  
  -- Confidentiality
  access_restricted BOOLEAN DEFAULT TRUE,
  authorized_viewers UUID[],
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('scheduled', 'collected', 'pending', 'completed', 'cancelled', 'no_show')),
  
  notes TEXT,
  confidential_notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, test_number)
);

-- PSM (Process Safety Management) Compliance Records
CREATE TABLE psm_compliance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_number TEXT NOT NULL,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- Process Information
  process_name TEXT NOT NULL,
  process_area TEXT,
  covered_chemical TEXT NOT NULL,
  chemical_cas_number TEXT,
  threshold_quantity_lbs DECIMAL(12,2),
  actual_quantity_lbs DECIMAL(12,2),
  
  -- PSM Element
  psm_element TEXT NOT NULL CHECK (psm_element IN (
    'employee_participation',
    'process_safety_information',
    'process_hazard_analysis',
    'operating_procedures',
    'training',
    'contractors',
    'pre_startup_safety_review',
    'mechanical_integrity',
    'hot_work_permit',
    'management_of_change',
    'incident_investigation',
    'emergency_planning',
    'compliance_audits',
    'trade_secrets'
  )),
  
  -- Compliance Activity
  activity_type TEXT NOT NULL CHECK (activity_type IN ('audit', 'review', 'update', 'training', 'inspection', 'pha', 'moc', 'pssr', 'incident_review', 'drill', 'other')),
  activity_description TEXT NOT NULL,
  activity_date DATE NOT NULL,
  
  -- Due Dates
  due_date DATE,
  completion_date DATE,
  next_due_date DATE,
  
  -- Personnel
  responsible_person TEXT NOT NULL,
  responsible_person_id UUID REFERENCES employees(id),
  participants JSONB DEFAULT '[]',
  contractor_involvement BOOLEAN DEFAULT FALSE,
  contractor_names TEXT[],
  
  -- Findings
  findings_count INTEGER DEFAULT 0,
  findings JSONB DEFAULT '[]',
  critical_findings INTEGER DEFAULT 0,
  major_findings INTEGER DEFAULT 0,
  minor_findings INTEGER DEFAULT 0,
  
  -- Corrective Actions
  corrective_actions_required INTEGER DEFAULT 0,
  corrective_actions_completed INTEGER DEFAULT 0,
  corrective_actions JSONB DEFAULT '[]',
  
  -- Documentation
  documentation_updated BOOLEAN DEFAULT FALSE,
  documents_reviewed TEXT[],
  documents_updated TEXT[],
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_by_id UUID REFERENCES employees(id),
  verified_date DATE,
  
  -- Regulatory
  osha_citation_related BOOLEAN DEFAULT FALSE,
  citation_number TEXT,
  epa_rmp_related BOOLEAN DEFAULT FALSE,
  
  status TEXT DEFAULT 'open' CHECK (status IN ('scheduled', 'in_progress', 'open', 'pending_review', 'completed', 'overdue', 'cancelled')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, record_number)
);

-- Fire Suppression System Impairments
CREATE TABLE fire_suppression_impairments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impairment_number TEXT NOT NULL,
  
  -- Facility
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  
  -- System Information
  system_type TEXT NOT NULL CHECK (system_type IN ('sprinkler', 'standpipe', 'fire_pump', 'fire_alarm', 'suppression_hood', 'clean_agent', 'foam', 'deluge', 'water_supply', 'hydrant', 'other')),
  system_name TEXT NOT NULL,
  system_location TEXT NOT NULL,
  system_coverage_area TEXT,
  
  -- Impairment Details
  impairment_type TEXT NOT NULL CHECK (impairment_type IN ('planned', 'emergency', 'discovered')),
  impairment_reason TEXT NOT NULL CHECK (impairment_reason IN ('maintenance', 'repair', 'modification', 'construction', 'testing', 'freeze_protection', 'water_supply_issue', 'equipment_failure', 'false_alarm_prevention', 'other')),
  impairment_description TEXT NOT NULL,
  
  -- Scope
  full_system_impaired BOOLEAN DEFAULT FALSE,
  partial_areas_impaired TEXT[],
  floors_affected TEXT[],
  
  -- Timeline
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  estimated_duration_hours INTEGER,
  expected_end_date DATE,
  expected_end_time TIME,
  actual_end_date DATE,
  actual_end_time TIME,
  
  -- Work Details
  work_being_performed TEXT,
  contractor_name TEXT,
  contractor_contact TEXT,
  work_permit_number TEXT,
  
  -- Pre-Impairment Actions
  fire_watch_required BOOLEAN DEFAULT TRUE,
  fire_watch_assigned BOOLEAN DEFAULT FALSE,
  fire_watch_name TEXT,
  fire_watch_location TEXT,
  fire_watch_start_time TIMESTAMPTZ,
  
  portable_extinguishers_placed BOOLEAN DEFAULT FALSE,
  extinguisher_locations TEXT[],
  
  hot_work_prohibited BOOLEAN DEFAULT TRUE,
  smoking_prohibited BOOLEAN DEFAULT TRUE,
  
  -- Notifications
  fire_department_notified BOOLEAN DEFAULT FALSE,
  fire_department_notification_time TIMESTAMPTZ,
  fire_department_contact TEXT,
  
  insurance_notified BOOLEAN DEFAULT FALSE,
  insurance_notification_time TIMESTAMPTZ,
  insurance_contact TEXT,
  insurance_reference_number TEXT,
  
  alarm_company_notified BOOLEAN DEFAULT FALSE,
  alarm_company_notification_time TIMESTAMPTZ,
  
  management_notified BOOLEAN DEFAULT FALSE,
  management_notification_time TIMESTAMPTZ,
  
  affected_areas_notified BOOLEAN DEFAULT FALSE,
  notification_method TEXT,
  
  -- Tag System
  impairment_tag_placed BOOLEAN DEFAULT FALSE,
  tag_number TEXT,
  tag_location TEXT,
  tag_placed_by TEXT,
  tag_placed_by_id UUID REFERENCES employees(id),
  
  -- Restoration
  system_restored BOOLEAN DEFAULT FALSE,
  restoration_verified BOOLEAN DEFAULT FALSE,
  restoration_verified_by TEXT,
  restoration_verified_by_id UUID REFERENCES employees(id),
  restoration_date DATE,
  restoration_time TIME,
  
  tag_removed BOOLEAN DEFAULT FALSE,
  tag_removed_by TEXT,
  tag_removed_by_id UUID REFERENCES employees(id),
  tag_removed_date DATE,
  
  post_restoration_test_required BOOLEAN DEFAULT TRUE,
  post_restoration_test_completed BOOLEAN DEFAULT FALSE,
  test_results TEXT,
  
  -- Closeout Notifications
  fire_department_closeout_notified BOOLEAN DEFAULT FALSE,
  insurance_closeout_notified BOOLEAN DEFAULT FALSE,
  alarm_company_closeout_notified BOOLEAN DEFAULT FALSE,
  
  -- Responsible Parties
  impairment_coordinator TEXT NOT NULL,
  impairment_coordinator_id UUID REFERENCES employees(id),
  authorized_by TEXT,
  authorized_by_id UUID REFERENCES employees(id),
  authorization_date DATE,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'extended', 'restored', 'cancelled')),
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, impairment_number)
);

-- Indexes
CREATE INDEX idx_osha_300a_org ON osha_300a_summaries(organization_id);
CREATE INDEX idx_osha_300a_year ON osha_300a_summaries(organization_id, year);
CREATE INDEX idx_osha_300a_facility ON osha_300a_summaries(organization_id, facility_id);
CREATE INDEX idx_osha_300a_status ON osha_300a_summaries(organization_id, status);

CREATE INDEX idx_workers_comp_claims_org ON workers_comp_claims(organization_id);
CREATE INDEX idx_workers_comp_claims_employee ON workers_comp_claims(employee_id);
CREATE INDEX idx_workers_comp_claims_facility ON workers_comp_claims(organization_id, facility_id);
CREATE INDEX idx_workers_comp_claims_status ON workers_comp_claims(organization_id, status);
CREATE INDEX idx_workers_comp_claims_date ON workers_comp_claims(organization_id, date_of_injury);
CREATE INDEX idx_workers_comp_claims_open ON workers_comp_claims(organization_id, status) WHERE status IN ('open', 'pending');

CREATE INDEX idx_return_to_work_org ON return_to_work_forms(organization_id);
CREATE INDEX idx_return_to_work_employee ON return_to_work_forms(employee_id);
CREATE INDEX idx_return_to_work_facility ON return_to_work_forms(organization_id, facility_id);
CREATE INDEX idx_return_to_work_status ON return_to_work_forms(organization_id, status);
CREATE INDEX idx_return_to_work_claim ON return_to_work_forms(workers_comp_claim_id);

CREATE INDEX idx_medical_restrictions_org ON medical_restrictions(organization_id);
CREATE INDEX idx_medical_restrictions_employee ON medical_restrictions(employee_id);
CREATE INDEX idx_medical_restrictions_facility ON medical_restrictions(organization_id, facility_id);
CREATE INDEX idx_medical_restrictions_status ON medical_restrictions(organization_id, status);
CREATE INDEX idx_medical_restrictions_active ON medical_restrictions(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_medical_restrictions_expiration ON medical_restrictions(organization_id, expiration_date);

CREATE INDEX idx_drug_alcohol_tests_org ON drug_alcohol_tests(organization_id);
CREATE INDEX idx_drug_alcohol_tests_employee ON drug_alcohol_tests(employee_id);
CREATE INDEX idx_drug_alcohol_tests_facility ON drug_alcohol_tests(organization_id, facility_id);
CREATE INDEX idx_drug_alcohol_tests_status ON drug_alcohol_tests(organization_id, status);
CREATE INDEX idx_drug_alcohol_tests_date ON drug_alcohol_tests(organization_id, test_date);
CREATE INDEX idx_drug_alcohol_tests_type ON drug_alcohol_tests(organization_id, test_type);

CREATE INDEX idx_psm_compliance_org ON psm_compliance_records(organization_id);
CREATE INDEX idx_psm_compliance_facility ON psm_compliance_records(organization_id, facility_id);
CREATE INDEX idx_psm_compliance_element ON psm_compliance_records(organization_id, psm_element);
CREATE INDEX idx_psm_compliance_status ON psm_compliance_records(organization_id, status);
CREATE INDEX idx_psm_compliance_due ON psm_compliance_records(organization_id, due_date);
CREATE INDEX idx_psm_compliance_process ON psm_compliance_records(organization_id, process_name);

CREATE INDEX idx_fire_suppression_org ON fire_suppression_impairments(organization_id);
CREATE INDEX idx_fire_suppression_facility ON fire_suppression_impairments(organization_id, facility_id);
CREATE INDEX idx_fire_suppression_status ON fire_suppression_impairments(organization_id, status);
CREATE INDEX idx_fire_suppression_type ON fire_suppression_impairments(organization_id, system_type);
CREATE INDEX idx_fire_suppression_active ON fire_suppression_impairments(organization_id, status) WHERE status = 'active';
CREATE INDEX idx_fire_suppression_date ON fire_suppression_impairments(organization_id, start_date);

-- RLS
ALTER TABLE osha_300a_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers_comp_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_to_work_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_alcohol_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE psm_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_suppression_impairments ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_osha_300a_summaries_updated_at BEFORE UPDATE ON osha_300a_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workers_comp_claims_updated_at BEFORE UPDATE ON workers_comp_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_return_to_work_forms_updated_at BEFORE UPDATE ON return_to_work_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_restrictions_updated_at BEFORE UPDATE ON medical_restrictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drug_alcohol_tests_updated_at BEFORE UPDATE ON drug_alcohol_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_psm_compliance_records_updated_at BEFORE UPDATE ON psm_compliance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fire_suppression_impairments_updated_at BEFORE UPDATE ON fire_suppression_impairments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
