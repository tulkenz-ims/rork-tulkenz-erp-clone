import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type ComplianceCategory = 'food_safety' | 'fsma' | 'sqf' | 'environmental' | 'osha' | 'labor' | 'licensing' | 'certification' | 'food_defense' | 'import_export' | 'insurance' | 'other';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending_review' | 'expired' | 'expiring_soon' | 'not_applicable';
export type AuditType = 'internal' | 'external' | 'regulatory' | 'customer' | 'certification' | 'surveillance';
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type AuditResult = 'pass' | 'conditional_pass' | 'fail' | 'pending';
export type FindingSeverity = 'observation' | 'minor' | 'major' | 'critical';
export type FindingStatus = 'open' | 'in_progress' | 'corrective_action' | 'verification' | 'closed';

export type CertificationType = 'sqf' | 'brc' | 'fssc22000' | 'organic' | 'kosher' | 'halal' | 'non_gmo' | 'gluten_free' | 'fair_trade' | 'other';
export type CertificationStatus = 'active' | 'expiring_soon' | 'expired' | 'suspended' | 'revoked' | 'pending';

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'expired';

export interface ComplianceRequirement {
  id: string;
  organization_id: string;
  requirement_code: string;
  title: string;
  description: string | null;
  category: ComplianceCategory;
  status: ComplianceStatus;
  facility_id: string | null;
  regulatory_body: string | null;
  regulation_reference: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  renewal_date: string | null;
  renewal_frequency_months: number | null;
  responsible_party: string | null;
  responsible_party_id: string | null;
  documentation_required: string[];
  documentation_on_file: boolean;
  last_review_date: string | null;
  next_review_date: string | null;
  last_audit_date: string | null;
  notes: string | null;
  attachments: any[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceAudit {
  id: string;
  organization_id: string;
  audit_number: string;
  audit_type: AuditType;
  status: AuditStatus;
  result: AuditResult | null;
  facility_id: string | null;
  audit_scope: string | null;
  certification_type: CertificationType | null;
  auditor_name: string | null;
  auditor_company: string | null;
  lead_auditor_id: string | null;
  scheduled_date: string | null;
  start_date: string | null;
  end_date: string | null;
  areas_audited: string[];
  total_findings: number;
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
  observations: number;
  score: number | null;
  grade: string | null;
  report_date: string | null;
  report_received: boolean;
  corrective_action_due_date: string | null;
  all_actions_closed: boolean;
  next_audit_date: string | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditFinding {
  id: string;
  organization_id: string;
  finding_number: string;
  audit_id: string;
  audit_number: string | null;
  severity: FindingSeverity;
  status: FindingStatus;
  category: string | null;
  clause_reference: string | null;
  area: string | null;
  description: string;
  evidence: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  responsible_party: string | null;
  responsible_party_id: string | null;
  due_date: string | null;
  completion_date: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verification_date: string | null;
  verification_notes: string | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  organization_id: string;
  certification_type: CertificationType;
  certification_name: string;
  status: CertificationStatus;
  facility_id: string | null;
  certifying_body: string;
  certificate_number: string | null;
  scope: string | null;
  issue_date: string;
  expiration_date: string | null;
  last_audit_date: string | null;
  next_audit_date: string | null;
  renewal_fee: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_usage_allowed: boolean;
  logo_guidelines: string | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceTraining {
  id: string;
  organization_id: string;
  training_name: string;
  category: ComplianceCategory;
  status: TrainingStatus;
  required_for: string[];
  frequency_months: number | null;
  duration_hours: number | null;
  provider: string | null;
  regulatory_requirement: string | null;
  description: string | null;
  total_employees_required: number;
  total_employees_completed: number;
  completion_rate: number;
  next_due_date: string | null;
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCalendarItem {
  id: string;
  organization_id: string;
  title: string;
  item_type: 'audit' | 'certification_renewal' | 'training' | 'permit_renewal' | 'inspection' | 'filing' | 'review' | 'other';
  category: ComplianceCategory;
  due_date: string;
  reminder_days: number[];
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  responsible_party: string | null;
  responsible_party_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type CreateRequirementInput = Omit<ComplianceRequirement, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateAuditInput = Omit<ComplianceAudit, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateFindingInput = Omit<AuditFinding, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateCertificationInput = Omit<Certification, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

const MOCK_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'CR001',
    organization_id: 'org1',
    requirement_code: 'FSMA-PC-001',
    title: 'FSMA Preventive Controls',
    description: 'Food Safety Modernization Act - Preventive Controls for Human Food',
    category: 'fsma',
    status: 'compliant',
    facility_id: 'FAC001',
    regulatory_body: 'FDA',
    regulation_reference: '21 CFR Part 117',
    effective_date: '2016-09-19',
    expiration_date: null,
    renewal_date: null,
    renewal_frequency_months: null,
    responsible_party: 'Quality Manager',
    responsible_party_id: 'EMP004',
    documentation_required: ['Food Safety Plan', 'Hazard Analysis', 'Preventive Controls'],
    documentation_on_file: true,
    last_review_date: '2025-01-05',
    next_review_date: '2026-01-05',
    last_audit_date: '2024-11-15',
    notes: null,
    attachments: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
  },
  {
    id: 'CR002',
    organization_id: 'org1',
    requirement_code: 'FSMA-204-001',
    title: 'FSMA 204 Traceability',
    description: 'Food Traceability Rule - Records for certain foods',
    category: 'fsma',
    status: 'compliant',
    facility_id: 'FAC001',
    regulatory_body: 'FDA',
    regulation_reference: '21 CFR Part 1 Subpart S',
    effective_date: '2026-01-20',
    expiration_date: null,
    renewal_date: null,
    renewal_frequency_months: null,
    responsible_party: 'Quality Manager',
    responsible_party_id: 'EMP004',
    documentation_required: ['Traceability Plan', 'KDE Records', 'CTE Documentation'],
    documentation_on_file: true,
    last_review_date: '2025-01-10',
    next_review_date: '2025-07-10',
    last_audit_date: null,
    notes: 'Preparing for compliance deadline',
    attachments: [],
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2025-01-10T14:00:00Z',
  },
  {
    id: 'CR003',
    organization_id: 'org1',
    requirement_code: 'OSHA-GEN-001',
    title: 'OSHA General Duty Clause',
    description: 'Workplace free from recognized hazards',
    category: 'osha',
    status: 'compliant',
    facility_id: 'FAC001',
    regulatory_body: 'OSHA',
    regulation_reference: 'Section 5(a)(1)',
    effective_date: null,
    expiration_date: null,
    renewal_date: null,
    renewal_frequency_months: null,
    responsible_party: 'Safety Manager',
    responsible_party_id: 'EMP003',
    documentation_required: ['Safety Program', 'Training Records', 'Incident Logs'],
    documentation_on_file: true,
    last_review_date: '2025-01-08',
    next_review_date: '2025-04-08',
    last_audit_date: '2024-08-20',
    notes: null,
    attachments: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-08T09:00:00Z',
  },
];

const MOCK_AUDITS: ComplianceAudit[] = [
  {
    id: 'CA001',
    organization_id: 'org1',
    audit_number: 'AUD-2501-0001',
    audit_type: 'certification',
    status: 'scheduled',
    result: null,
    facility_id: 'FAC001',
    audit_scope: 'SQF Edition 9 Certification Audit',
    certification_type: 'sqf',
    auditor_name: 'John Auditor',
    auditor_company: 'SQF Certification Body',
    lead_auditor_id: null,
    scheduled_date: '2025-02-15',
    start_date: '2025-02-15',
    end_date: '2025-02-17',
    areas_audited: ['HACCP', 'GMP', 'Food Safety Culture', 'Traceability'],
    total_findings: 0,
    critical_findings: 0,
    major_findings: 0,
    minor_findings: 0,
    observations: 0,
    score: null,
    grade: null,
    report_date: null,
    report_received: false,
    corrective_action_due_date: null,
    all_actions_closed: false,
    next_audit_date: null,
    attachments: [],
    notes: 'Annual recertification audit',
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
  },
  {
    id: 'CA002',
    organization_id: 'org1',
    audit_number: 'AUD-2412-0001',
    audit_type: 'internal',
    status: 'completed',
    result: 'pass',
    facility_id: 'FAC001',
    audit_scope: 'Internal Food Safety Audit Q4',
    certification_type: null,
    auditor_name: 'Internal Audit Team',
    auditor_company: null,
    lead_auditor_id: 'EMP004',
    scheduled_date: '2024-12-10',
    start_date: '2024-12-10',
    end_date: '2024-12-11',
    areas_audited: ['Receiving', 'Storage', 'Production', 'Shipping', 'Sanitation'],
    total_findings: 5,
    critical_findings: 0,
    major_findings: 0,
    minor_findings: 3,
    observations: 2,
    score: 94,
    grade: 'A',
    report_date: '2024-12-15',
    report_received: true,
    corrective_action_due_date: '2025-01-15',
    all_actions_closed: true,
    next_audit_date: '2025-03-10',
    attachments: [],
    notes: null,
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2025-01-15T11:00:00Z',
  },
];

const MOCK_FINDINGS: AuditFinding[] = [
  {
    id: 'AF001',
    organization_id: 'org1',
    finding_number: 'FND-2412-0001',
    audit_id: 'CA002',
    audit_number: 'AUD-2412-0001',
    severity: 'minor',
    status: 'closed',
    category: 'GMP',
    clause_reference: 'SQF 11.2.3',
    area: 'Production Floor',
    description: 'Personal effects observed in production area near workstation',
    evidence: 'Cell phone found on work table during audit',
    root_cause: 'Employee unaware of updated policy',
    corrective_action: 'Re-trained all production staff on GMP requirements',
    preventive_action: 'Added reminder signage at all entry points',
    responsible_party: 'Production Supervisor',
    responsible_party_id: 'EMP005',
    due_date: '2025-01-10',
    completion_date: '2025-01-08',
    verified_by: 'Quality Manager',
    verified_by_id: 'EMP004',
    verification_date: '2025-01-10',
    verification_notes: 'Training records verified, signage installed',
    attachments: [],
    notes: null,
    created_at: '2024-12-11T10:00:00Z',
    updated_at: '2025-01-10T14:00:00Z',
  },
];

const MOCK_CERTIFICATIONS: Certification[] = [
  {
    id: 'CERT001',
    organization_id: 'org1',
    certification_type: 'sqf',
    certification_name: 'SQF Food Safety',
    status: 'active',
    facility_id: 'FAC001',
    certifying_body: 'SQF Institute',
    certificate_number: 'SQF-2024-12345',
    scope: 'Manufacturing of food products',
    issue_date: '2024-02-20',
    expiration_date: '2025-02-20',
    last_audit_date: '2024-02-15',
    next_audit_date: '2025-02-15',
    renewal_fee: 5000,
    contact_name: 'Certification Manager',
    contact_email: 'cert@sqfi.com',
    contact_phone: '555-0100',
    logo_usage_allowed: true,
    logo_guidelines: 'Follow SQF logo usage guidelines',
    attachments: [],
    notes: null,
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-02-20T10:00:00Z',
  },
  {
    id: 'CERT002',
    organization_id: 'org1',
    certification_type: 'organic',
    certification_name: 'USDA Organic',
    status: 'active',
    facility_id: 'FAC001',
    certifying_body: 'Oregon Tilth',
    certificate_number: 'ORG-2024-98765',
    scope: 'Organic product handling',
    issue_date: '2024-06-01',
    expiration_date: '2025-05-31',
    last_audit_date: '2024-05-25',
    next_audit_date: '2025-05-15',
    renewal_fee: 2500,
    contact_name: 'Organic Certifier',
    contact_email: 'organic@tilth.org',
    contact_phone: '555-0200',
    logo_usage_allowed: true,
    logo_guidelines: 'USDA Organic seal guidelines apply',
    attachments: [],
    notes: null,
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2024-06-01T09:00:00Z',
  },
];

const MOCK_CALENDAR: ComplianceCalendarItem[] = [
  {
    id: 'CAL001',
    organization_id: 'org1',
    title: 'SQF Certification Audit',
    item_type: 'audit',
    category: 'sqf',
    due_date: '2025-02-15',
    reminder_days: [30, 14, 7],
    status: 'upcoming',
    responsible_party: 'Quality Manager',
    responsible_party_id: 'EMP004',
    reference_id: 'CA001',
    reference_type: 'audit',
    notes: null,
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
  },
  {
    id: 'CAL002',
    organization_id: 'org1',
    title: 'SQF Certificate Renewal',
    item_type: 'certification_renewal',
    category: 'certification',
    due_date: '2025-02-20',
    reminder_days: [60, 30, 14],
    status: 'due_soon',
    responsible_party: 'Quality Manager',
    responsible_party_id: 'EMP004',
    reference_id: 'CERT001',
    reference_type: 'certification',
    notes: null,
    created_at: '2024-12-01T09:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
];

export function useSupabaseCompliance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const requirementsQuery = useQuery({
    queryKey: ['compliance_requirements', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_REQUIREMENTS;
      console.log('[useSupabaseCompliance] Fetching compliance requirements');

      const { data, error } = await supabase
        .from('compliance_requirements')
        .select('*')
        .eq('organization_id', organizationId)
        .order('category', { ascending: true });

      if (error) {
        console.log('[useSupabaseCompliance] Using mock data - table may not exist yet');
        return MOCK_REQUIREMENTS;
      }
      return (data?.length ? data : MOCK_REQUIREMENTS) as ComplianceRequirement[];
    },
    enabled: true,
  });

  const auditsQuery = useQuery({
    queryKey: ['compliance_audits', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_AUDITS;
      console.log('[useSupabaseCompliance] Fetching compliance audits');

      const { data, error } = await supabase
        .from('compliance_audits')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scheduled_date', { ascending: false });

      if (error) {
        console.log('[useSupabaseCompliance] Using mock audits data');
        return MOCK_AUDITS;
      }
      return (data?.length ? data : MOCK_AUDITS) as ComplianceAudit[];
    },
    enabled: true,
  });

  const upcomingAuditsQuery = useQuery({
    queryKey: ['compliance_audits', 'upcoming', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_AUDITS.filter(a => a.status === 'scheduled');
      console.log('[useSupabaseCompliance] Fetching upcoming audits');

      const { data, error } = await supabase
        .from('compliance_audits')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (error) {
        return MOCK_AUDITS.filter(a => a.status === 'scheduled');
      }
      const result = data?.length ? data : MOCK_AUDITS.filter(a => a.status === 'scheduled');
      return result as ComplianceAudit[];
    },
    enabled: true,
  });

  const findingsQuery = useQuery({
    queryKey: ['audit_findings', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_FINDINGS;
      console.log('[useSupabaseCompliance] Fetching audit findings');

      const { data, error } = await supabase
        .from('audit_findings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('[useSupabaseCompliance] Using mock findings data');
        return MOCK_FINDINGS;
      }
      return (data?.length ? data : MOCK_FINDINGS) as AuditFinding[];
    },
    enabled: true,
  });

  const openFindingsQuery = useQuery({
    queryKey: ['audit_findings', 'open', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_FINDINGS.filter(f => f.status !== 'closed');
      console.log('[useSupabaseCompliance] Fetching open findings');

      const { data, error } = await supabase
        .from('audit_findings')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'closed')
        .order('severity', { ascending: true })
        .order('due_date', { ascending: true });

      if (error) {
        return MOCK_FINDINGS.filter(f => f.status !== 'closed');
      }
      const result = data?.length ? data : MOCK_FINDINGS.filter(f => f.status !== 'closed');
      return result as AuditFinding[];
    },
    enabled: true,
  });

  const certificationsQuery = useQuery({
    queryKey: ['certifications', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_CERTIFICATIONS;
      console.log('[useSupabaseCompliance] Fetching certifications');

      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('expiration_date', { ascending: true });

      if (error) {
        console.log('[useSupabaseCompliance] Using mock certifications data');
        return MOCK_CERTIFICATIONS;
      }
      return (data?.length ? data : MOCK_CERTIFICATIONS) as Certification[];
    },
    enabled: true,
  });

  const calendarQuery = useQuery({
    queryKey: ['compliance_calendar', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_CALENDAR;
      console.log('[useSupabaseCompliance] Fetching compliance calendar');

      const { data, error } = await supabase
        .from('compliance_calendar')
        .select('*')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: true });

      if (error) {
        console.log('[useSupabaseCompliance] Using mock calendar data');
        return MOCK_CALENDAR;
      }
      return (data?.length ? data : MOCK_CALENDAR) as ComplianceCalendarItem[];
    },
    enabled: true,
  });

  const createRequirementMutation = useMutation({
    mutationFn: async (input: CreateRequirementInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseCompliance] Creating requirement:', input.requirement_code);

      const { data, error } = await supabase
        .from('compliance_requirements')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance_requirements'] });
    },
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComplianceRequirement> & { id: string }) => {
      console.log('[useSupabaseCompliance] Updating requirement:', id);

      const { data, error } = await supabase
        .from('compliance_requirements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance_requirements'] });
    },
  });

  const createAuditMutation = useMutation({
    mutationFn: async (input: CreateAuditInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseCompliance] Creating audit:', input.audit_number);

      const { data, error } = await supabase
        .from('compliance_audits')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceAudit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance_audits'] });
    },
  });

  const updateAuditMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComplianceAudit> & { id: string }) => {
      console.log('[useSupabaseCompliance] Updating audit:', id);

      const { data, error } = await supabase
        .from('compliance_audits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceAudit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance_audits'] });
    },
  });

  const createFindingMutation = useMutation({
    mutationFn: async (input: CreateFindingInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseCompliance] Creating finding:', input.finding_number);

      const { data, error } = await supabase
        .from('audit_findings')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as AuditFinding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_findings'] });
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditFinding> & { id: string }) => {
      console.log('[useSupabaseCompliance] Updating finding:', id);

      const { data, error } = await supabase
        .from('audit_findings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AuditFinding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_findings'] });
    },
  });

  const closeFindingMutation = useMutation({
    mutationFn: async ({ id, verifiedBy, verifiedById, verificationNotes }: { id: string; verifiedBy: string; verifiedById?: string; verificationNotes?: string }) => {
      console.log('[useSupabaseCompliance] Closing finding:', id);

      const { data, error } = await supabase
        .from('audit_findings')
        .update({
          status: 'closed' as FindingStatus,
          completion_date: new Date().toISOString().split('T')[0],
          verified_by: verifiedBy,
          verified_by_id: verifiedById || null,
          verification_date: new Date().toISOString().split('T')[0],
          verification_notes: verificationNotes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AuditFinding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_findings'] });
    },
  });

  const createCertificationMutation = useMutation({
    mutationFn: async (input: CreateCertificationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseCompliance] Creating certification:', input.certification_name);

      const { data, error } = await supabase
        .from('certifications')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as Certification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
    },
  });

  const updateCertificationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Certification> & { id: string }) => {
      console.log('[useSupabaseCompliance] Updating certification:', id);

      const { data, error } = await supabase
        .from('certifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Certification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
    },
  });

  const generateAuditNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `AUD-${year}${month}-${random}`;
  };

  const generateFindingNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FND-${year}${month}-${random}`;
  };

  const getRequirementsByCategory = (category: ComplianceCategory) => {
    return requirementsQuery.data?.filter(req => req.category === category) || [];
  };

  const getNonCompliantRequirements = () => {
    return requirementsQuery.data?.filter(req => 
      req.status === 'non_compliant' || req.status === 'expired'
    ) || [];
  };

  const getExpiringCertifications = (daysAhead: number = 60) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return certificationsQuery.data?.filter(cert => 
      cert.expiration_date &&
      new Date(cert.expiration_date) <= futureDate &&
      cert.status !== 'expired' &&
      cert.status !== 'revoked'
    ) || [];
  };

  const getOverdueFindings = () => {
    const today = new Date().toISOString().split('T')[0];
    return findingsQuery.data?.filter(finding => 
      finding.due_date &&
      finding.due_date < today &&
      finding.status !== 'closed'
    ) || [];
  };

  const getComplianceScore = () => {
    const requirements = requirementsQuery.data || [];
    const compliant = requirements.filter(r => r.status === 'compliant').length;
    return requirements.length > 0 ? Math.round((compliant / requirements.length) * 100) : 100;
  };

  return {
    requirements: requirementsQuery.data || [],
    audits: auditsQuery.data || [],
    upcomingAudits: upcomingAuditsQuery.data || [],
    findings: findingsQuery.data || [],
    openFindings: openFindingsQuery.data || [],
    certifications: certificationsQuery.data || [],
    calendar: calendarQuery.data || [],
    isLoading: requirementsQuery.isLoading || auditsQuery.isLoading || certificationsQuery.isLoading,

    createRequirement: createRequirementMutation.mutateAsync,
    updateRequirement: updateRequirementMutation.mutateAsync,
    createAudit: createAuditMutation.mutateAsync,
    updateAudit: updateAuditMutation.mutateAsync,
    createFinding: createFindingMutation.mutateAsync,
    updateFinding: updateFindingMutation.mutateAsync,
    closeFinding: closeFindingMutation.mutateAsync,
    createCertification: createCertificationMutation.mutateAsync,
    updateCertification: updateCertificationMutation.mutateAsync,

    generateAuditNumber,
    generateFindingNumber,
    getRequirementsByCategory,
    getNonCompliantRequirements,
    getExpiringCertifications,
    getOverdueFindings,
    getComplianceScore,

    refetch: () => {
      requirementsQuery.refetch();
      auditsQuery.refetch();
      upcomingAuditsQuery.refetch();
      findingsQuery.refetch();
      openFindingsQuery.refetch();
      certificationsQuery.refetch();
      calendarQuery.refetch();
    },
  };
}
