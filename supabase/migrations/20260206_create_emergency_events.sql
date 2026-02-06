-- Create emergency_events table
CREATE TABLE IF NOT EXISTS emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  facility_name TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'fire', 'tornado', 'active_shooter', 'chemical_spill', 'gas_leak',
    'bomb_threat', 'medical_emergency', 'earthquake', 'flood',
    'power_outage', 'structural_collapse', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated', 'in_progress', 'all_clear', 'resolved', 'cancelled'
  )),
  title TEXT NOT NULL,
  description TEXT,
  location_details TEXT,
  initiated_by TEXT NOT NULL,
  initiated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  all_clear_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  total_evacuated INTEGER,
  total_sheltered INTEGER,
  injuries_reported INTEGER NOT NULL DEFAULT 0,
  fatalities_reported INTEGER NOT NULL DEFAULT 0,
  emergency_services_called BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_services_arrival TIMESTAMPTZ,
  assembly_points_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  departments_affected JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions_taken JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  after_action_notes TEXT,
  corrective_actions TEXT,
  root_cause TEXT,
  property_damage BOOLEAN DEFAULT FALSE,
  property_damage_description TEXT,
  estimated_damage_cost NUMERIC(12,2),
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  notifications_sent BOOLEAN NOT NULL DEFAULT FALSE,
  drill BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_emergency_events_org ON emergency_events(organization_id);
CREATE INDEX idx_emergency_events_status ON emergency_events(status);
CREATE INDEX idx_emergency_events_type ON emergency_events(event_type);
CREATE INDEX idx_emergency_events_initiated_at ON emergency_events(initiated_at DESC);
CREATE INDEX idx_emergency_events_drill ON emergency_events(drill);
CREATE INDEX idx_emergency_events_facility ON emergency_events(facility_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_emergency_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_emergency_events_updated_at
  BEFORE UPDATE ON emergency_events
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_events_updated_at();

-- RLS
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view emergency events in their organization"
  ON emergency_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert emergency events in their organization"
  ON emergency_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update emergency events in their organization"
  ON emergency_events FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete emergency events in their organization"
  ON emergency_events FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
