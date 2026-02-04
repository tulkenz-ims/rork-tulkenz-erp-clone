-- Behavior-Based Safety Module Tables

-- Safety Observations (Safety Observation Cards)
CREATE TABLE safety_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  observation_number TEXT NOT NULL,
  observation_date DATE NOT NULL,
  observation_time TIME,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department TEXT,
  location TEXT NOT NULL,
  work_area TEXT,
  observer_id UUID REFERENCES employees(id),
  observer_name TEXT NOT NULL,
  observer_department TEXT,
  observed_employee_id UUID REFERENCES employees(id),
  observed_employee_name TEXT,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('safe', 'at_risk', 'positive', 'coaching')),
  category TEXT NOT NULL CHECK (category IN ('ppe', 'body_positioning', 'housekeeping', 'procedures', 'tools_equipment', 'communication', 'line_of_fire', 'lockout_tagout', 'other')),
  behavior_observed TEXT NOT NULL,
  task_being_performed TEXT,
  safe_behaviors TEXT[] DEFAULT '{}',
  at_risk_behaviors TEXT[] DEFAULT '{}',
  immediate_action_taken TEXT,
  coaching_provided BOOLEAN DEFAULT FALSE,
  coaching_notes TEXT,
  root_cause TEXT,
  corrective_action_required BOOLEAN DEFAULT FALSE,
  corrective_action TEXT,
  corrective_action_due_date DATE,
  corrective_action_completed BOOLEAN DEFAULT FALSE,
  corrective_action_completed_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_notes TEXT,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_date DATE,
  attachments JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, observation_number)
);

-- Peer Safety Audits
CREATE TABLE peer_safety_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audit_number TEXT NOT NULL,
  audit_date DATE NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department TEXT,
  area_audited TEXT NOT NULL,
  shift TEXT,
  auditor_id UUID REFERENCES employees(id),
  auditor_name TEXT NOT NULL,
  auditor_department TEXT,
  audit_partner_id UUID REFERENCES employees(id),
  audit_partner_name TEXT,
  audit_type TEXT,
  audit_duration_minutes INTEGER,
  employees_observed INTEGER,
  safe_observations INTEGER DEFAULT 0,
  at_risk_observations INTEGER DEFAULT 0,
  total_observations INTEGER DEFAULT 0,
  safety_score DECIMAL(5,2),
  checklist_items JSONB DEFAULT '[]',
  findings JSONB DEFAULT '[]',
  positive_findings TEXT[] DEFAULT '{}',
  areas_for_improvement TEXT[] DEFAULT '{}',
  immediate_hazards_found BOOLEAN DEFAULT FALSE,
  hazards_corrected_immediately BOOLEAN DEFAULT FALSE,
  hazard_details TEXT,
  recommendations TEXT[] DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_date DATE,
  attachments JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, audit_number)
);

-- Safety Suggestions
CREATE TABLE safety_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  suggestion_number TEXT NOT NULL,
  submission_date DATE NOT NULL,
  submitter_id UUID REFERENCES employees(id),
  submitter_name TEXT NOT NULL,
  submitter_department TEXT,
  submitter_email TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  department TEXT,
  location TEXT,
  category TEXT NOT NULL CHECK (category IN ('equipment', 'process', 'ppe', 'training', 'housekeeping', 'ergonomics', 'environment', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_situation TEXT,
  proposed_solution TEXT,
  expected_benefits TEXT,
  safety_impact TEXT,
  estimated_cost DECIMAL(12,2),
  cost_savings_potential DECIMAL(12,2),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'implemented', 'rejected', 'deferred')),
  assigned_to TEXT,
  assigned_to_id UUID REFERENCES employees(id),
  assigned_date DATE,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_date DATE,
  review_notes TEXT,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_date DATE,
  rejection_reason TEXT,
  implementation_date DATE,
  implementation_notes TEXT,
  implemented_by TEXT,
  implemented_by_id UUID REFERENCES employees(id),
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  recognition_given BOOLEAN DEFAULT FALSE,
  recognition_type TEXT,
  recognition_date DATE,
  attachments JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, suggestion_number)
);

-- Safety Committee Meetings
CREATE TABLE safety_committee_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_number TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  meeting_end_time TIME,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  meeting_type TEXT DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'special', 'emergency', 'quarterly', 'annual')),
  location TEXT,
  chairperson_id UUID REFERENCES employees(id),
  chairperson_name TEXT NOT NULL,
  secretary_id UUID REFERENCES employees(id),
  secretary_name TEXT,
  attendees JSONB DEFAULT '[]',
  absentees JSONB DEFAULT '[]',
  guests TEXT[] DEFAULT '{}',
  quorum_met BOOLEAN DEFAULT TRUE,
  previous_minutes_approved BOOLEAN DEFAULT FALSE,
  agenda_items JSONB DEFAULT '[]',
  old_business JSONB DEFAULT '[]',
  new_business JSONB DEFAULT '[]',
  incident_reviews JSONB DEFAULT '[]',
  inspection_reviews JSONB DEFAULT '[]',
  training_updates TEXT[] DEFAULT '{}',
  safety_metrics JSONB DEFAULT '{}',
  action_items JSONB DEFAULT '[]',
  motions JSONB DEFAULT '[]',
  announcements TEXT[] DEFAULT '{}',
  next_meeting_date DATE,
  next_meeting_time TIME,
  next_meeting_location TEXT,
  minutes_approved_by TEXT,
  minutes_approved_by_id UUID REFERENCES employees(id),
  minutes_approved_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'distributed')),
  distribution_list TEXT[] DEFAULT '{}',
  distributed_date DATE,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, meeting_number)
);

-- Safety Recognition
CREATE TABLE safety_recognitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recognition_number TEXT NOT NULL,
  recognition_date DATE NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT,
  recipient_id UUID REFERENCES employees(id),
  recipient_name TEXT NOT NULL,
  recipient_department TEXT,
  recipient_job_title TEXT,
  is_team_recognition BOOLEAN DEFAULT FALSE,
  team_name TEXT,
  team_members JSONB DEFAULT '[]',
  recognition_type TEXT NOT NULL CHECK (recognition_type IN ('safety_star', 'near_miss_report', 'safety_suggestion', 'perfect_record', 'safety_leadership', 'injury_free_milestone', 'other')),
  category TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  achievement_details TEXT,
  incident_date DATE,
  incident_reference TEXT,
  safety_impact TEXT,
  award_name TEXT,
  award_value DECIMAL(10,2),
  award_description TEXT,
  presented_by_id UUID REFERENCES employees(id),
  presented_by_name TEXT NOT NULL,
  presented_by_title TEXT,
  ceremony_date DATE,
  ceremony_location TEXT,
  announcement_method TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  milestones JSONB DEFAULT '{}',
  nominated_by_id UUID REFERENCES employees(id),
  nominated_by_name TEXT,
  nomination_date DATE,
  nomination_reason TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_by_name TEXT,
  approved_date DATE,
  status TEXT DEFAULT 'nominated' CHECK (status IN ('nominated', 'approved', 'presented', 'rejected')),
  photos JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, recognition_number)
);

-- Indexes
CREATE INDEX idx_safety_observations_org ON safety_observations(organization_id);
CREATE INDEX idx_safety_observations_date ON safety_observations(organization_id, observation_date);
CREATE INDEX idx_safety_observations_type ON safety_observations(organization_id, observation_type);
CREATE INDEX idx_safety_observations_status ON safety_observations(organization_id, status);
CREATE INDEX idx_safety_observations_observer ON safety_observations(observer_id);
CREATE INDEX idx_safety_observations_facility ON safety_observations(organization_id, facility_id);

CREATE INDEX idx_peer_safety_audits_org ON peer_safety_audits(organization_id);
CREATE INDEX idx_peer_safety_audits_date ON peer_safety_audits(organization_id, audit_date);
CREATE INDEX idx_peer_safety_audits_status ON peer_safety_audits(organization_id, status);
CREATE INDEX idx_peer_safety_audits_auditor ON peer_safety_audits(auditor_id);
CREATE INDEX idx_peer_safety_audits_facility ON peer_safety_audits(organization_id, facility_id);

CREATE INDEX idx_safety_suggestions_org ON safety_suggestions(organization_id);
CREATE INDEX idx_safety_suggestions_date ON safety_suggestions(organization_id, submission_date);
CREATE INDEX idx_safety_suggestions_status ON safety_suggestions(organization_id, status);
CREATE INDEX idx_safety_suggestions_category ON safety_suggestions(organization_id, category);
CREATE INDEX idx_safety_suggestions_submitter ON safety_suggestions(submitter_id);
CREATE INDEX idx_safety_suggestions_facility ON safety_suggestions(organization_id, facility_id);

CREATE INDEX idx_safety_committee_meetings_org ON safety_committee_meetings(organization_id);
CREATE INDEX idx_safety_committee_meetings_date ON safety_committee_meetings(organization_id, meeting_date);
CREATE INDEX idx_safety_committee_meetings_status ON safety_committee_meetings(organization_id, status);
CREATE INDEX idx_safety_committee_meetings_facility ON safety_committee_meetings(organization_id, facility_id);

CREATE INDEX idx_safety_recognitions_org ON safety_recognitions(organization_id);
CREATE INDEX idx_safety_recognitions_date ON safety_recognitions(organization_id, recognition_date);
CREATE INDEX idx_safety_recognitions_type ON safety_recognitions(organization_id, recognition_type);
CREATE INDEX idx_safety_recognitions_status ON safety_recognitions(organization_id, status);
CREATE INDEX idx_safety_recognitions_recipient ON safety_recognitions(recipient_id);
CREATE INDEX idx_safety_recognitions_facility ON safety_recognitions(organization_id, facility_id);

-- RLS
ALTER TABLE safety_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_safety_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_committee_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_recognitions ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_safety_observations_updated_at BEFORE UPDATE ON safety_observations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_peer_safety_audits_updated_at BEFORE UPDATE ON peer_safety_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_suggestions_updated_at BEFORE UPDATE ON safety_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_committee_meetings_updated_at BEFORE UPDATE ON safety_committee_meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_recognitions_updated_at BEFORE UPDATE ON safety_recognitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
