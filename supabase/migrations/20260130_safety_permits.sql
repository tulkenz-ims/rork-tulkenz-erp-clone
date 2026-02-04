-- Safety Permits Table
CREATE TABLE IF NOT EXISTS safety_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permit_number VARCHAR(50) NOT NULL,
  permit_type VARCHAR(50) NOT NULL CHECK (permit_type IN (
    'loto', 'confined_space', 'hot_work', 'fall_protection', 
    'electrical', 'line_break', 'excavation', 'roof_access', 
    'chemical_handling', 'temporary_equipment'
  )),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'active', 
    'completed', 'cancelled', 'expired'
  )),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'critical'
  )),
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  location TEXT,
  department_code VARCHAR(20),
  department_name VARCHAR(100),
  work_description TEXT NOT NULL,
  hazards_identified JSONB DEFAULT '[]'::jsonb,
  precautions_required JSONB DEFAULT '[]'::jsonb,
  ppe_required JSONB DEFAULT '[]'::jsonb,
  
  -- LOTO Requirements
  loto_required BOOLEAN DEFAULT FALSE,
  loto_level INTEGER CHECK (loto_level >= 0 AND loto_level <= 5),
  loto_permit_number VARCHAR(50),
  
  -- Additional PPE (beyond standard)
  additional_ppe JSONB DEFAULT '[]'::jsonb,
  
  -- Additional Permits Required
  additional_permits_required JSONB DEFAULT '[]'::jsonb,
  
  -- Time fields
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE NOT NULL,
  end_time TIME,
  valid_hours INTEGER DEFAULT 8,
  
  -- Personnel
  requested_by VARCHAR(200) NOT NULL,
  requested_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  requested_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by VARCHAR(200),
  approved_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_date TIMESTAMP WITH TIME ZONE,
  supervisor_name VARCHAR(200),
  supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  contractor_name VARCHAR(200),
  contractor_company VARCHAR(200),
  emergency_contact VARCHAR(200),
  emergency_phone VARCHAR(50),
  workers JSONB DEFAULT '[]'::jsonb,
  
  -- Permit-specific data (stored as JSONB for flexibility)
  permit_data JSONB DEFAULT '{}'::jsonb,
  
  -- Completion fields
  completed_by VARCHAR(200),
  completed_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  -- Cancellation fields
  cancellation_reason TEXT,
  cancelled_by VARCHAR(200),
  cancelled_date TIMESTAMP WITH TIME ZONE,
  
  -- Attachments and notes
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_safety_permits_org ON safety_permits(organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_permits_type ON safety_permits(permit_type);
CREATE INDEX IF NOT EXISTS idx_safety_permits_status ON safety_permits(status);
CREATE INDEX IF NOT EXISTS idx_safety_permits_dates ON safety_permits(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_safety_permits_number ON safety_permits(permit_number);

-- Enable RLS
ALTER TABLE safety_permits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view permits in their organization"
  ON safety_permits FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert permits in their organization"
  ON safety_permits FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update permits in their organization"
  ON safety_permits FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete permits in their organization"
  ON safety_permits FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_safety_permits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER safety_permits_updated_at
  BEFORE UPDATE ON safety_permits
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_permits_updated_at();
