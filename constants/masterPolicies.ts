// Master Policy Program Constants
// Comprehensive company-wide policy management system

export type PolicyCategory = 
  | 'corporate'
  | 'safety'
  | 'hr'
  | 'quality'
  | 'environmental'
  | 'security'
  | 'financial'
  | 'operations'
  | 'it'
  | 'ethics';

export type PolicyStatus = 'active' | 'draft' | 'under_review' | 'archived' | 'pending_approval';

export type PolicyPriority = 'critical' | 'high' | 'medium' | 'low';

export interface MasterPolicy {
  id: string;
  policyNumber: string;
  title: string;
  category: PolicyCategory;
  description: string;
  status: PolicyStatus;
  priority: PolicyPriority;
  version: string;
  effectiveDate: string;
  reviewDate: string;
  lastReviewed?: string;
  owner: string;
  approver: string;
  applicableTo: string[];
  relatedPolicies?: string[];
  keyRequirements: string[];
  regulatoryReferences?: string[];
  attachments?: string[];
}

export interface PolicyCategoryInfo {
  id: PolicyCategory;
  label: string;
  description: string;
  color: string;
  icon: string;
}

export const POLICY_CATEGORIES: Record<PolicyCategory, PolicyCategoryInfo> = {
  corporate: {
    id: 'corporate',
    label: 'Corporate Governance',
    description: 'Company-wide governance, leadership, and organizational policies',
    color: '#7C3AED',
    icon: 'Building2',
  },
  safety: {
    id: 'safety',
    label: 'Safety & Health',
    description: 'Workplace safety, occupational health, and emergency procedures',
    color: '#EF4444',
    icon: 'Shield',
  },
  hr: {
    id: 'hr',
    label: 'Human Resources',
    description: 'Employment, benefits, conduct, and workforce management',
    color: '#3B82F6',
    icon: 'Users',
  },
  quality: {
    id: 'quality',
    label: 'Quality Management',
    description: 'Quality assurance, control, and continuous improvement',
    color: '#10B981',
    icon: 'Award',
  },
  environmental: {
    id: 'environmental',
    label: 'Environmental',
    description: 'Environmental compliance, sustainability, and waste management',
    color: '#22C55E',
    icon: 'Leaf',
  },
  security: {
    id: 'security',
    label: 'Security',
    description: 'Physical security, access control, and asset protection',
    color: '#F59E0B',
    icon: 'Lock',
  },
  financial: {
    id: 'financial',
    label: 'Financial',
    description: 'Financial controls, reporting, and fiscal management',
    color: '#06B6D4',
    icon: 'DollarSign',
  },
  operations: {
    id: 'operations',
    label: 'Operations',
    description: 'Operational procedures, production, and process management',
    color: '#8B5CF6',
    icon: 'Settings',
  },
  it: {
    id: 'it',
    label: 'IT & Data',
    description: 'Information technology, cybersecurity, and data management',
    color: '#EC4899',
    icon: 'Monitor',
  },
  ethics: {
    id: 'ethics',
    label: 'Ethics & Conduct',
    description: 'Business ethics, code of conduct, and compliance',
    color: '#14B8A6',
    icon: 'Scale',
  },
};

export const POLICY_STATUS_CONFIG: Record<PolicyStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#10B981' },
  draft: { label: 'Draft', color: '#6B7280' },
  under_review: { label: 'Under Review', color: '#F59E0B' },
  archived: { label: 'Archived', color: '#9CA3AF' },
  pending_approval: { label: 'Pending Approval', color: '#3B82F6' },
};

export const POLICY_PRIORITY_CONFIG: Record<PolicyPriority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#DC2626' },
  high: { label: 'High', color: '#F97316' },
  medium: { label: 'Medium', color: '#F59E0B' },
  low: { label: 'Low', color: '#10B981' },
};

export const MASTER_POLICIES: MasterPolicy[] = [
  // Corporate Governance
  {
    id: 'corp-001',
    policyNumber: 'CORP-001',
    title: 'Corporate Mission & Values',
    category: 'corporate',
    description: 'Defines the organization\'s mission statement, core values, and guiding principles that shape company culture and decision-making.',
    status: 'active',
    priority: 'critical',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    lastReviewed: '2024-01-15',
    owner: 'CEO',
    approver: 'Board of Directors',
    applicableTo: ['All Employees', 'Contractors', 'Partners'],
    keyRequirements: [
      'All employees must acknowledge and uphold company values',
      'Annual review of mission alignment',
      'Values integrated into performance evaluations',
      'Leadership must model expected behaviors',
    ],
  },
  {
    id: 'corp-002',
    policyNumber: 'CORP-002',
    title: 'Organizational Structure & Authority',
    category: 'corporate',
    description: 'Establishes the organizational hierarchy, reporting relationships, and delegation of authority matrix.',
    status: 'active',
    priority: 'high',
    version: '2.5',
    effectiveDate: '2024-03-01',
    reviewDate: '2025-03-01',
    owner: 'VP Operations',
    approver: 'CEO',
    applicableTo: ['All Employees'],
    keyRequirements: [
      'Clear reporting lines documented',
      'Authority limits defined by position',
      'Annual organizational review',
      'Changes require executive approval',
    ],
  },
  {
    id: 'corp-003',
    policyNumber: 'CORP-003',
    title: 'Document Control',
    category: 'corporate',
    description: 'Establishes requirements for creation, review, approval, distribution, and retention of controlled documents.',
    status: 'active',
    priority: 'high',
    version: '4.1',
    effectiveDate: '2024-02-01',
    reviewDate: '2025-02-01',
    owner: 'Quality Manager',
    approver: 'VP Operations',
    applicableTo: ['All Departments'],
    keyRequirements: [
      'All documents must have version control',
      'Review cycles defined by document type',
      'Approval signatures required before release',
      'Obsolete documents must be archived',
    ],
  },
  {
    id: 'corp-004',
    policyNumber: 'CORP-004',
    title: 'Management Review',
    category: 'corporate',
    description: 'Defines the process for periodic management review of company performance, objectives, and strategic initiatives.',
    status: 'active',
    priority: 'medium',
    version: '2.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'CEO',
    approver: 'Board of Directors',
    applicableTo: ['Executive Team', 'Department Heads'],
    keyRequirements: [
      'Quarterly management review meetings',
      'KPI dashboard review required',
      'Action items tracked to completion',
      'Minutes distributed within 5 business days',
    ],
  },

  // Safety & Health
  {
    id: 'saf-001',
    policyNumber: 'SAF-001',
    title: 'Health & Safety Policy',
    category: 'safety',
    description: 'Master safety policy establishing commitment to workplace health and safety, responsibilities, and general requirements.',
    status: 'active',
    priority: 'critical',
    version: '5.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    lastReviewed: '2024-01-10',
    owner: 'Safety Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Contractors', 'Visitors'],
    regulatoryReferences: ['OSHA 29 CFR 1910', 'OSHA 29 CFR 1904'],
    keyRequirements: [
      'Safety is a core value and priority',
      'All employees responsible for safety',
      'Hazards must be reported immediately',
      'Safety training required for all employees',
      'Near-miss reporting encouraged',
    ],
  },
  {
    id: 'saf-002',
    policyNumber: 'SAF-002',
    title: 'Lockout/Tagout (LOTO)',
    category: 'safety',
    description: 'Energy control program for servicing and maintenance of machines and equipment.',
    status: 'active',
    priority: 'critical',
    version: '3.2',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Safety Director',
    approver: 'VP Operations',
    applicableTo: ['Maintenance', 'Operations', 'Contractors'],
    regulatoryReferences: ['OSHA 29 CFR 1910.147'],
    relatedPolicies: ['SAF-001', 'SAF-005'],
    keyRequirements: [
      'Written procedures for each machine',
      'Authorized employee training required',
      'Annual procedure audits',
      'Personal locks for each authorized employee',
      'Group lockout procedures documented',
    ],
  },
  {
    id: 'saf-003',
    policyNumber: 'SAF-003',
    title: 'Personal Protective Equipment (PPE)',
    category: 'safety',
    description: 'Requirements for assessment, selection, training, and use of personal protective equipment.',
    status: 'active',
    priority: 'critical',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Safety Director',
    approver: 'VP Operations',
    applicableTo: ['All Employees', 'Contractors', 'Visitors'],
    regulatoryReferences: ['OSHA 29 CFR 1910.132-138'],
    keyRequirements: [
      'Hazard assessment required for all tasks',
      'PPE provided at no cost to employees',
      'Training on proper use and care',
      'Regular inspection and replacement',
      'Documentation of PPE issuance',
    ],
  },
  {
    id: 'saf-004',
    policyNumber: 'SAF-004',
    title: 'Emergency Action Plan',
    category: 'safety',
    description: 'Procedures for emergency response including evacuation, shelter-in-place, and emergency contacts.',
    status: 'active',
    priority: 'critical',
    version: '3.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Safety Director',
    approver: 'Plant Manager',
    applicableTo: ['All Employees', 'Contractors', 'Visitors'],
    regulatoryReferences: ['OSHA 29 CFR 1910.38'],
    keyRequirements: [
      'Evacuation routes posted',
      'Assembly areas designated',
      'Emergency drills conducted quarterly',
      'Emergency contacts updated monthly',
      'Employees trained on alarm recognition',
    ],
  },
  {
    id: 'saf-005',
    policyNumber: 'SAF-005',
    title: 'Hazard Communication (HazCom)',
    category: 'safety',
    description: 'Program for communicating chemical hazards through labels, SDS, and training.',
    status: 'active',
    priority: 'critical',
    version: '4.1',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Safety Director',
    approver: 'VP Operations',
    applicableTo: ['All Employees', 'Contractors'],
    regulatoryReferences: ['OSHA 29 CFR 1910.1200'],
    keyRequirements: [
      'SDS readily accessible for all chemicals',
      'All containers properly labeled',
      'Annual HazCom training required',
      'Chemical inventory maintained',
      'New chemical approval process',
    ],
  },
  {
    id: 'saf-006',
    policyNumber: 'SAF-006',
    title: 'Incident Reporting & Investigation',
    category: 'safety',
    description: 'Requirements for reporting, investigating, and documenting workplace incidents and near-misses.',
    status: 'active',
    priority: 'high',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Safety Director',
    approver: 'VP Operations',
    applicableTo: ['All Employees', 'Supervisors'],
    regulatoryReferences: ['OSHA 29 CFR 1904'],
    keyRequirements: [
      'All incidents reported within 24 hours',
      'Root cause analysis for recordables',
      'Corrective actions tracked to completion',
      'Monthly incident review meetings',
      'OSHA 300 log maintained',
    ],
  },

  // Human Resources
  {
    id: 'hr-001',
    policyNumber: 'HR-001',
    title: 'Equal Employment Opportunity',
    category: 'hr',
    description: 'Commitment to equal opportunity employment and non-discrimination in all employment practices.',
    status: 'active',
    priority: 'critical',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Applicants', 'Hiring Managers'],
    regulatoryReferences: ['Title VII', 'ADA', 'ADEA'],
    keyRequirements: [
      'No discrimination in hiring or promotion',
      'Reasonable accommodations provided',
      'EEO training for hiring managers',
      'Complaints investigated promptly',
      'Annual EEO-1 reporting compliance',
    ],
  },
  {
    id: 'hr-002',
    policyNumber: 'HR-002',
    title: 'Anti-Harassment',
    category: 'hr',
    description: 'Policy prohibiting harassment of any kind and establishing complaint procedures.',
    status: 'active',
    priority: 'critical',
    version: '3.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Contractors', 'Vendors'],
    regulatoryReferences: ['Title VII', 'State Laws'],
    keyRequirements: [
      'Zero tolerance for harassment',
      'Multiple reporting channels available',
      'Prompt and thorough investigations',
      'No retaliation against reporters',
      'Annual harassment prevention training',
    ],
  },
  {
    id: 'hr-003',
    policyNumber: 'HR-003',
    title: 'Attendance & Time Keeping',
    category: 'hr',
    description: 'Requirements for attendance, punctuality, and accurate time recording.',
    status: 'active',
    priority: 'high',
    version: '2.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'VP Operations',
    applicableTo: ['All Employees'],
    keyRequirements: [
      'Clock in/out required for non-exempt',
      'Absence notification procedures',
      'Excessive absence documentation',
      'Time record approval by supervisors',
      'Overtime pre-approval required',
    ],
  },
  {
    id: 'hr-004',
    policyNumber: 'HR-004',
    title: 'Leave of Absence (FMLA)',
    category: 'hr',
    description: 'Family and Medical Leave Act compliance and company leave policies.',
    status: 'active',
    priority: 'high',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'VP HR',
    applicableTo: ['Eligible Employees'],
    regulatoryReferences: ['FMLA 29 CFR 825'],
    keyRequirements: [
      'Eligibility determination process',
      '12 weeks unpaid leave available',
      'Job protection during leave',
      'Benefits continuation during leave',
      'Required certifications documented',
    ],
  },
  {
    id: 'hr-005',
    policyNumber: 'HR-005',
    title: 'Workplace Violence Prevention',
    category: 'hr',
    description: 'Policy prohibiting workplace violence and establishing prevention and response procedures.',
    status: 'active',
    priority: 'critical',
    version: '2.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Contractors', 'Visitors'],
    keyRequirements: [
      'Zero tolerance for violence or threats',
      'Immediate reporting required',
      'Threat assessment team established',
      'Employee assistance program available',
      'Security measures reviewed annually',
    ],
  },

  // Quality Management
  {
    id: 'qms-001',
    policyNumber: 'QMS-001',
    title: 'Quality Management System',
    category: 'quality',
    description: 'Master quality policy establishing commitment to quality and continuous improvement.',
    status: 'active',
    priority: 'critical',
    version: '5.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Quality Director',
    approver: 'CEO',
    applicableTo: ['All Departments'],
    regulatoryReferences: ['ISO 9001:2015', 'FDA 21 CFR Part 820'],
    keyRequirements: [
      'Customer focus in all operations',
      'Process approach to management',
      'Continuous improvement mindset',
      'Evidence-based decision making',
      'Annual management review',
    ],
  },
  {
    id: 'qms-002',
    policyNumber: 'QMS-002',
    title: 'Non-Conformance Management',
    category: 'quality',
    description: 'Procedures for identifying, documenting, and resolving non-conforming products or processes.',
    status: 'active',
    priority: 'high',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Quality Director',
    approver: 'VP Operations',
    applicableTo: ['Quality', 'Production', 'Receiving'],
    keyRequirements: [
      'Non-conformances documented immediately',
      'Material segregated and identified',
      'Root cause analysis required',
      'Corrective actions verified effective',
      'Trends monitored and reported',
    ],
  },
  {
    id: 'qms-003',
    policyNumber: 'QMS-003',
    title: 'Supplier Quality Management',
    category: 'quality',
    description: 'Requirements for supplier qualification, monitoring, and performance management.',
    status: 'active',
    priority: 'high',
    version: '3.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Quality Director',
    approver: 'VP Supply Chain',
    applicableTo: ['Purchasing', 'Quality', 'Receiving'],
    keyRequirements: [
      'Supplier qualification process required',
      'Approved supplier list maintained',
      'Supplier scorecards reviewed quarterly',
      'On-site audits for critical suppliers',
      'Supplier corrective actions tracked',
    ],
  },
  {
    id: 'qms-004',
    policyNumber: 'QMS-004',
    title: 'Calibration & Measurement',
    category: 'quality',
    description: 'Requirements for calibration and control of inspection, measuring, and test equipment.',
    status: 'active',
    priority: 'high',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Quality Director',
    approver: 'VP Operations',
    applicableTo: ['Quality', 'Production', 'Maintenance'],
    keyRequirements: [
      'All measuring equipment identified',
      'Calibration schedules maintained',
      'Traceability to NIST standards',
      'Out-of-tolerance investigations',
      'Calibration records retained',
    ],
  },

  // Environmental
  {
    id: 'env-001',
    policyNumber: 'ENV-001',
    title: 'Environmental Management System',
    category: 'environmental',
    description: 'Master environmental policy establishing commitment to environmental protection and compliance.',
    status: 'active',
    priority: 'critical',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Environmental Manager',
    approver: 'CEO',
    applicableTo: ['All Departments'],
    regulatoryReferences: ['ISO 14001:2015', 'EPA Regulations'],
    keyRequirements: [
      'Compliance with environmental regulations',
      'Pollution prevention focus',
      'Continuous improvement of environmental performance',
      'Environmental aspects identified and managed',
      'Annual environmental objectives set',
    ],
  },
  {
    id: 'env-002',
    policyNumber: 'ENV-002',
    title: 'Waste Management',
    category: 'environmental',
    description: 'Requirements for proper handling, storage, and disposal of all waste streams.',
    status: 'active',
    priority: 'high',
    version: '3.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Environmental Manager',
    approver: 'Plant Manager',
    applicableTo: ['All Departments'],
    regulatoryReferences: ['RCRA', 'State Regulations'],
    keyRequirements: [
      'Waste streams characterized',
      'Proper containers and labeling',
      'Licensed haulers used',
      'Manifests retained 3 years',
      'Waste minimization goals set',
    ],
  },

  // Security
  {
    id: 'sec-001',
    policyNumber: 'SEC-001',
    title: 'Physical Security',
    category: 'security',
    description: 'Requirements for facility security, access control, and asset protection.',
    status: 'active',
    priority: 'high',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Security Director',
    approver: 'VP Operations',
    applicableTo: ['All Employees', 'Contractors', 'Visitors'],
    keyRequirements: [
      'Badge access required for entry',
      'Visitor sign-in and escort required',
      'Restricted areas clearly marked',
      'Security incidents reported immediately',
      'Annual security assessments',
    ],
  },
  {
    id: 'sec-002',
    policyNumber: 'SEC-002',
    title: 'Information Security',
    category: 'security',
    description: 'Policy for protecting confidential and proprietary information.',
    status: 'active',
    priority: 'critical',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'IT Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Contractors'],
    keyRequirements: [
      'Confidential information classified',
      'Need-to-know access controls',
      'Clean desk policy enforced',
      'Data encryption required',
      'Breach notification procedures',
    ],
  },

  // Financial
  {
    id: 'fin-001',
    policyNumber: 'FIN-001',
    title: 'Financial Controls',
    category: 'financial',
    description: 'Internal controls for financial transactions, approvals, and reporting.',
    status: 'active',
    priority: 'critical',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'CFO',
    approver: 'CEO',
    applicableTo: ['Finance', 'Department Heads', 'Procurement'],
    regulatoryReferences: ['SOX', 'GAAP'],
    keyRequirements: [
      'Segregation of duties maintained',
      'Approval authority limits enforced',
      'Monthly reconciliations required',
      'Annual external audit',
      'Fraud prevention measures',
    ],
  },
  {
    id: 'fin-002',
    policyNumber: 'FIN-002',
    title: 'Procurement & Purchasing',
    category: 'financial',
    description: 'Requirements for purchasing goods and services including approvals and vendor selection.',
    status: 'active',
    priority: 'high',
    version: '3.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Procurement Director',
    approver: 'CFO',
    applicableTo: ['Procurement', 'Department Heads'],
    keyRequirements: [
      'Purchase orders required over $500',
      'Competitive bids for orders over $10K',
      'Approval matrix followed',
      'Preferred vendor list maintained',
      'Contract review by legal',
    ],
  },

  // Operations
  {
    id: 'ops-001',
    policyNumber: 'OPS-001',
    title: 'Production Control',
    category: 'operations',
    description: 'Requirements for production planning, scheduling, and control.',
    status: 'active',
    priority: 'high',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Production Manager',
    approver: 'VP Operations',
    applicableTo: ['Production', 'Planning', 'Warehouse'],
    keyRequirements: [
      'Production schedules maintained',
      'Work orders required for production',
      'First article inspection required',
      'In-process inspections documented',
      'Production metrics tracked daily',
    ],
  },
  {
    id: 'ops-002',
    policyNumber: 'OPS-002',
    title: 'Maintenance Management',
    category: 'operations',
    description: 'Requirements for preventive and corrective maintenance of equipment and facilities.',
    status: 'active',
    priority: 'high',
    version: '3.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'Maintenance Manager',
    approver: 'VP Operations',
    applicableTo: ['Maintenance', 'Production'],
    keyRequirements: [
      'PM schedules maintained for all equipment',
      'Work orders required for all maintenance',
      'Critical spares inventory maintained',
      'Equipment history records kept',
      'OEE metrics tracked',
    ],
  },

  // IT & Data
  {
    id: 'it-001',
    policyNumber: 'IT-001',
    title: 'Acceptable Use Policy',
    category: 'it',
    description: 'Rules for acceptable use of company IT resources including computers, email, and internet.',
    status: 'active',
    priority: 'high',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'IT Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Contractors'],
    keyRequirements: [
      'Business use only for company resources',
      'No unauthorized software installation',
      'Strong passwords required',
      'Phishing awareness required',
      'Personal device policies',
    ],
  },
  {
    id: 'it-002',
    policyNumber: 'IT-002',
    title: 'Data Backup & Recovery',
    category: 'it',
    description: 'Requirements for data backup, retention, and disaster recovery.',
    status: 'active',
    priority: 'critical',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'IT Director',
    approver: 'CFO',
    applicableTo: ['IT', 'All Data Owners'],
    keyRequirements: [
      'Daily backups of critical data',
      'Off-site backup storage',
      'Recovery testing quarterly',
      'RTO/RPO defined by system',
      'Disaster recovery plan maintained',
    ],
  },

  // Ethics & Conduct
  {
    id: 'eth-001',
    policyNumber: 'ETH-001',
    title: 'Code of Conduct',
    category: 'ethics',
    description: 'Standards of ethical conduct expected of all employees in business dealings.',
    status: 'active',
    priority: 'critical',
    version: '4.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Board Members'],
    keyRequirements: [
      'Annual acknowledgment required',
      'Conflicts of interest disclosed',
      'Gifts and entertainment limits',
      'Confidentiality maintained',
      'Reporting of violations required',
    ],
  },
  {
    id: 'eth-002',
    policyNumber: 'ETH-002',
    title: 'Whistleblower Protection',
    category: 'ethics',
    description: 'Protection for employees who report suspected violations of law or policy.',
    status: 'active',
    priority: 'critical',
    version: '2.5',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'HR Director',
    approver: 'CEO',
    applicableTo: ['All Employees'],
    regulatoryReferences: ['SOX', 'Dodd-Frank'],
    keyRequirements: [
      'Anonymous reporting available',
      'No retaliation for good faith reports',
      'Investigations conducted promptly',
      'Confidentiality protected',
      'Hotline monitored 24/7',
    ],
  },
  {
    id: 'eth-003',
    policyNumber: 'ETH-003',
    title: 'Anti-Bribery & Corruption',
    category: 'ethics',
    description: 'Policy prohibiting bribery, corruption, and improper payments in all business dealings.',
    status: 'active',
    priority: 'critical',
    version: '3.0',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    owner: 'General Counsel',
    approver: 'CEO',
    applicableTo: ['All Employees', 'Agents', 'Partners'],
    regulatoryReferences: ['FCPA', 'UK Bribery Act'],
    keyRequirements: [
      'Zero tolerance for bribery',
      'Due diligence on third parties',
      'Accurate books and records',
      'Training for at-risk roles',
      'Reporting of suspicious activity',
    ],
  },
];

// Helper functions
export function getPoliciesByCategory(category: PolicyCategory): MasterPolicy[] {
  return MASTER_POLICIES.filter(policy => policy.category === category);
}

export function getPoliciesByStatus(status: PolicyStatus): MasterPolicy[] {
  return MASTER_POLICIES.filter(policy => policy.status === status);
}

export function getPoliciesByPriority(priority: PolicyPriority): MasterPolicy[] {
  return MASTER_POLICIES.filter(policy => policy.priority === priority);
}

export function getPoliciesNeedingReview(daysThreshold: number = 30): MasterPolicy[] {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return MASTER_POLICIES.filter(policy => {
    const reviewDate = new Date(policy.reviewDate);
    return reviewDate <= thresholdDate;
  });
}

export function searchPolicies(searchTerm: string): MasterPolicy[] {
  const term = searchTerm.toLowerCase();
  return MASTER_POLICIES.filter(policy => 
    policy.title.toLowerCase().includes(term) ||
    policy.policyNumber.toLowerCase().includes(term) ||
    policy.description.toLowerCase().includes(term) ||
    policy.keyRequirements.some(req => req.toLowerCase().includes(term))
  );
}

export function getPolicyById(id: string): MasterPolicy | undefined {
  return MASTER_POLICIES.find(policy => policy.id === id);
}

export function getPolicyByNumber(policyNumber: string): MasterPolicy | undefined {
  return MASTER_POLICIES.find(policy => policy.policyNumber === policyNumber);
}
