-- Safety Program Documents (LOTO Policies, Procedures, etc.)
-- Stores editable safety program documents with version control

CREATE TABLE safety_program_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Document identification
  document_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Document type and classification
  document_type TEXT NOT NULL CHECK (document_type IN ('policy', 'procedure', 'form', 'training', 'reference', 'opl', 'checklist', 'guide')),
  program_type TEXT NOT NULL CHECK (program_type IN ('loto', 'ppe', 'confined_space', 'hot_work', 'fall_protection', 'hazcom', 'emergency', 'general_safety', 'other')),
  
  -- Version control
  version TEXT NOT NULL DEFAULT '1.0',
  revision_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'pending_review', 'pending_approval', 'approved', 'active', 'revision', 'obsolete', 'archived')),
  
  -- Content (rich content stored as JSONB for flexibility)
  content JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  
  -- Metadata
  applicable_levels INTEGER[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  
  -- Dates
  effective_date DATE,
  expiration_date DATE,
  last_reviewed DATE,
  next_review DATE,
  
  -- Author/Approval chain
  author TEXT,
  author_id UUID REFERENCES employees(id),
  owner TEXT,
  owner_id UUID REFERENCES employees(id),
  reviewer TEXT,
  reviewer_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  approver TEXT,
  approver_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  
  -- File attachment (optional PDF/doc)
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  
  -- Related documents
  related_documents UUID[] DEFAULT '{}',
  supersedes_id UUID REFERENCES safety_program_documents(id),
  
  -- Access control
  access_level TEXT DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted')),
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, document_number, version)
);

-- Safety Program Document Versions (Version history)
CREATE TABLE safety_program_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES safety_program_documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  content JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  change_summary TEXT,
  changed_by TEXT NOT NULL,
  changed_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Program Document Acknowledgments
CREATE TABLE safety_program_document_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES safety_program_documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  version_acknowledged TEXT NOT NULL,
  UNIQUE(document_id, employee_id, version_acknowledged)
);

-- Indexes
CREATE INDEX idx_safety_program_documents_org ON safety_program_documents(organization_id);
CREATE INDEX idx_safety_program_documents_type ON safety_program_documents(organization_id, document_type);
CREATE INDEX idx_safety_program_documents_program ON safety_program_documents(organization_id, program_type);
CREATE INDEX idx_safety_program_documents_status ON safety_program_documents(organization_id, status);
CREATE INDEX idx_safety_program_documents_number ON safety_program_documents(organization_id, document_number);

CREATE INDEX idx_safety_program_doc_versions_doc ON safety_program_document_versions(document_id);
CREATE INDEX idx_safety_program_doc_acks_doc ON safety_program_document_acknowledgments(document_id);
CREATE INDEX idx_safety_program_doc_acks_emp ON safety_program_document_acknowledgments(employee_id);

-- RLS
ALTER TABLE safety_program_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_program_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_program_document_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Policies for anon/authenticated access
CREATE POLICY "Allow anon select for safety_program_documents" ON safety_program_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow authenticated insert for safety_program_documents" ON safety_program_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update for safety_program_documents" ON safety_program_documents FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow authenticated delete for safety_program_documents" ON safety_program_documents FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon select for safety_program_document_versions" ON safety_program_document_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow authenticated insert for safety_program_document_versions" ON safety_program_document_versions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon select for safety_program_document_acknowledgments" ON safety_program_document_acknowledgments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow authenticated insert for safety_program_document_acknowledgments" ON safety_program_document_acknowledgments FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_safety_program_documents_updated_at BEFORE UPDATE ON safety_program_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
