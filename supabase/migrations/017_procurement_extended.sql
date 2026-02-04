-- Extended Procurement Tables Migration
-- PO Templates, Blanket POs, Vendor Onboarding

-- PO Templates
CREATE TABLE IF NOT EXISTS po_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  po_type TEXT DEFAULT 'material' CHECK (po_type IN ('material', 'service', 'capex')),
  default_vendor_id UUID REFERENCES procurement_vendors(id),
  default_vendor_name TEXT,
  default_department_id TEXT,
  default_department_name TEXT,
  default_terms TEXT,
  default_shipping_method TEXT,
  default_payment_terms TEXT DEFAULT 'net_30',
  default_notes TEXT,
  line_items JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, template_code)
);

-- Blanket Purchase Orders
CREATE TABLE IF NOT EXISTS blanket_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  blanket_po_number TEXT NOT NULL,
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT NOT NULL,
  department_id TEXT,
  department_name TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'closed', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  released_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - released_amount) STORED,
  release_count INTEGER DEFAULT 0,
  terms_conditions TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  auto_renew BOOLEAN DEFAULT FALSE,
  renewal_notice_days INTEGER DEFAULT 30,
  line_items JSONB DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, blanket_po_number)
);

-- Blanket PO Releases
CREATE TABLE IF NOT EXISTS blanket_po_releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  blanket_po_id UUID NOT NULL REFERENCES blanket_purchase_orders(id) ON DELETE CASCADE,
  release_number TEXT NOT NULL,
  po_id UUID REFERENCES procurement_purchase_orders(id),
  po_number TEXT,
  release_amount DECIMAL(12,2) NOT NULL,
  release_date TIMESTAMPTZ DEFAULT NOW(),
  expected_delivery DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  line_items JSONB DEFAULT '[]',
  released_by TEXT NOT NULL,
  released_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, blanket_po_id, release_number)
);

-- Drop Ship Orders
CREATE TABLE IF NOT EXISTS drop_ship_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  drop_ship_number TEXT NOT NULL,
  po_id UUID REFERENCES procurement_purchase_orders(id),
  po_number TEXT,
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  ship_to_address TEXT NOT NULL,
  ship_to_city TEXT,
  ship_to_state TEXT,
  ship_to_zip TEXT,
  ship_to_country TEXT DEFAULT 'USA',
  ship_to_phone TEXT,
  ship_to_email TEXT,
  sales_order_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'shipped', 'delivered', 'cancelled')),
  blind_ship BOOLEAN DEFAULT FALSE,
  tracking_number TEXT,
  carrier TEXT,
  shipped_date TIMESTAMPTZ,
  delivered_date TIMESTAMPTZ,
  total_amount DECIMAL(12,2) DEFAULT 0,
  line_items JSONB DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, drop_ship_number)
);

-- Service Purchase Orders (Extended)
CREATE TABLE IF NOT EXISTS service_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_po_number TEXT NOT NULL,
  po_id UUID REFERENCES procurement_purchase_orders(id),
  po_number TEXT,
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT NOT NULL,
  department_id TEXT,
  department_name TEXT,
  service_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  service_location TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0,
  completed_amount DECIMAL(12,2) DEFAULT 0,
  completion_percent INTEGER DEFAULT 0,
  payment_schedule TEXT DEFAULT 'on_completion' CHECK (payment_schedule IN ('on_completion', 'milestone', 'monthly', 'weekly', 'upfront')),
  milestones JSONB DEFAULT '[]',
  labor_hours_estimated DECIMAL(8,2),
  labor_hours_actual DECIMAL(8,2),
  hourly_rate DECIMAL(10,2),
  line_items JSONB DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, service_po_number)
);

-- Vendor Onboarding
CREATE TABLE IF NOT EXISTS vendor_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES procurement_vendors(id),
  vendor_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'documents_pending', 'under_review', 'approved', 'rejected', 'on_hold')),
  vendor_type TEXT DEFAULT 'supplier' CHECK (vendor_type IN ('supplier', 'service', 'contractor', 'distributor')),
  onboarding_type TEXT DEFAULT 'new' CHECK (onboarding_type IN ('new', 'reactivation', 'update')),
  initiated_by TEXT NOT NULL,
  initiated_by_id UUID REFERENCES employees(id),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  w9_received BOOLEAN DEFAULT FALSE,
  w9_received_at TIMESTAMPTZ,
  insurance_received BOOLEAN DEFAULT FALSE,
  insurance_received_at TIMESTAMPTZ,
  insurance_expiry DATE,
  certifications_received BOOLEAN DEFAULT FALSE,
  certifications JSONB DEFAULT '[]',
  bank_info_received BOOLEAN DEFAULT FALSE,
  bank_info_verified BOOLEAN DEFAULT FALSE,
  questionnaire_sent BOOLEAN DEFAULT FALSE,
  questionnaire_sent_at TIMESTAMPTZ,
  questionnaire_completed BOOLEAN DEFAULT FALSE,
  questionnaire_completed_at TIMESTAMPTZ,
  questionnaire_responses JSONB DEFAULT '{}',
  background_check_required BOOLEAN DEFAULT FALSE,
  background_check_completed BOOLEAN DEFAULT FALSE,
  background_check_result TEXT,
  reviewed_by TEXT,
  reviewed_by_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  documents JSONB DEFAULT '[]',
  checklist_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PO Revisions History
CREATE TABLE IF NOT EXISTS po_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES procurement_purchase_orders(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  revision_type TEXT NOT NULL CHECK (revision_type IN ('quantity_change', 'price_change', 'line_add', 'line_remove', 'date_change', 'terms_change', 'vendor_change', 'cancellation', 'other')),
  description TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  amount_change DECIMAL(12,2),
  effective_date DATE,
  reason TEXT,
  requested_by TEXT NOT NULL,
  requested_by_id UUID REFERENCES employees(id),
  approved_by TEXT,
  approved_by_id UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  vendor_notified BOOLEAN DEFAULT FALSE,
  vendor_notified_at TIMESTAMPTZ,
  vendor_acknowledged BOOLEAN DEFAULT FALSE,
  vendor_acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_po_templates_org ON po_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_po_templates_active ON po_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_po_templates_type ON po_templates(organization_id, po_type);

CREATE INDEX IF NOT EXISTS idx_blanket_po_org ON blanket_purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_blanket_po_status ON blanket_purchase_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_blanket_po_vendor ON blanket_purchase_orders(organization_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_blanket_po_dates ON blanket_purchase_orders(organization_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_blanket_releases_org ON blanket_po_releases(organization_id);
CREATE INDEX IF NOT EXISTS idx_blanket_releases_blanket ON blanket_po_releases(blanket_po_id);

CREATE INDEX IF NOT EXISTS idx_drop_ship_org ON drop_ship_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_status ON drop_ship_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_drop_ship_po ON drop_ship_orders(po_id);

CREATE INDEX IF NOT EXISTS idx_service_po_org ON service_purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_po_status ON service_purchase_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_service_po_vendor ON service_purchase_orders(organization_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_onboarding_org ON vendor_onboarding(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_onboarding_status ON vendor_onboarding(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_onboarding_vendor ON vendor_onboarding(vendor_id);

CREATE INDEX IF NOT EXISTS idx_po_revisions_org ON po_revisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_po_revisions_po ON po_revisions(po_id);
CREATE INDEX IF NOT EXISTS idx_po_revisions_status ON po_revisions(organization_id, status);

-- Enable RLS
ALTER TABLE po_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE blanket_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE blanket_po_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_ship_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_revisions ENABLE ROW LEVEL SECURITY;

-- Create update triggers
CREATE TRIGGER update_po_templates_updated_at BEFORE UPDATE ON po_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blanket_po_updated_at BEFORE UPDATE ON blanket_purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drop_ship_updated_at BEFORE UPDATE ON drop_ship_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_po_updated_at BEFORE UPDATE ON service_purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_onboarding_updated_at BEFORE UPDATE ON vendor_onboarding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
