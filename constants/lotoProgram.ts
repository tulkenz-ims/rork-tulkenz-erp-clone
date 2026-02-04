// LOTO Program Constants
// Comprehensive Lockout/Tagout Program with Energy Hazard Levels and Procedure Complexity

export type LOTOLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface LOTOLevelDefinition {
  level: LOTOLevel;
  name: string;
  energyHazard: string;
  energyDescription: string;
  procedureComplexity: string;
  procedureDescription: string;
  color: string;
  requiredTraining: string[];
  typicalExamples: string[];
  minAuthorizedPersonnel: number;
  requiresSupervisorApproval: boolean;
  requiresSafetyOfficerApproval: boolean;
  maxDurationHours: number | null;
  reviewFrequencyDays: number;
}

export const LOTO_LEVELS: Record<LOTOLevel, LOTOLevelDefinition> = {
  0: {
    level: 0,
    name: 'Zero Energy / No Lockout Required',
    energyHazard: 'Zero Energy State',
    energyDescription: 'Verified safe - no hazardous energy present or equipment is inherently safe',
    procedureComplexity: 'No Lockout Required',
    procedureDescription: 'Equipment poses no energy hazard; standard work procedures apply',
    color: '#10B981',
    requiredTraining: ['Basic Safety Orientation'],
    typicalExamples: [
      'Unplugged portable equipment',
      'Battery-operated tools (battery removed)',
      'Manual hand tools',
      'Equipment with verified zero energy state',
    ],
    minAuthorizedPersonnel: 1,
    requiresSupervisorApproval: false,
    requiresSafetyOfficerApproval: false,
    maxDurationHours: null,
    reviewFrequencyDays: 365,
  },
  1: {
    level: 1,
    name: 'Minimal Energy / Simple Lockout',
    energyHazard: 'Minimal Energy',
    energyDescription: 'Gravity, residual pressure, minor stored energy that can be easily released',
    procedureComplexity: 'Simple Lockout',
    procedureDescription: 'Single energy source, single person lockout with standard procedures',
    color: '#3B82F6',
    requiredTraining: ['LOTO Authorized Employee Training', 'Energy Control Basics'],
    typicalExamples: [
      'Small conveyor belts',
      'Low-pressure pneumatic systems (<30 PSI)',
      'Light duty equipment with single disconnect',
      'Small pumps with manual valves',
    ],
    minAuthorizedPersonnel: 1,
    requiresSupervisorApproval: false,
    requiresSafetyOfficerApproval: false,
    maxDurationHours: 8,
    reviewFrequencyDays: 180,
  },
  2: {
    level: 2,
    name: 'Low Energy / Multiple Sources',
    energyHazard: 'Low Energy',
    energyDescription: 'Small electrical (<480V), pneumatic, low-pressure hydraulic systems',
    procedureComplexity: 'Multiple Energy Sources',
    procedureDescription: 'Two or more energy sources requiring isolation; documented procedure required',
    color: '#F59E0B',
    requiredTraining: ['LOTO Authorized Employee Training', 'Energy Source Identification', 'Multi-Point Isolation'],
    typicalExamples: [
      'Production machinery with electrical and pneumatic',
      'Packaging equipment',
      'HVAC units',
      'Medium-sized pumps and compressors',
    ],
    minAuthorizedPersonnel: 1,
    requiresSupervisorApproval: true,
    requiresSafetyOfficerApproval: false,
    maxDurationHours: 12,
    reviewFrequencyDays: 90,
  },
  3: {
    level: 3,
    name: 'Moderate Energy / Group Lockout',
    energyHazard: 'Moderate Energy',
    energyDescription: 'Larger motors, hydraulic systems, moderate voltage electrical (up to 600V)',
    procedureComplexity: 'Group Lockout',
    procedureDescription: 'Multiple workers requiring lockout; group lockbox and coordination required',
    color: '#EF4444',
    requiredTraining: ['LOTO Authorized Employee Training', 'Group Lockout Procedures', 'Lock Box Management'],
    typicalExamples: [
      'Large production lines',
      'Industrial presses',
      'Major conveyor systems',
      'Refrigeration compressors',
      'Large mixing/blending equipment',
    ],
    minAuthorizedPersonnel: 2,
    requiresSupervisorApproval: true,
    requiresSafetyOfficerApproval: false,
    maxDurationHours: 24,
    reviewFrequencyDays: 60,
  },
  4: {
    level: 4,
    name: 'High Energy / Shift Change Procedures',
    energyHazard: 'High Energy',
    energyDescription: 'High voltage (>600V), steam systems, large mechanical energy, high-pressure hydraulics',
    procedureComplexity: 'Shift Change Procedures',
    procedureDescription: 'Work spanning multiple shifts; formal handoff procedures and continuous monitoring required',
    color: '#DC2626',
    requiredTraining: [
      'LOTO Authorized Employee Training',
      'High Energy Systems',
      'Shift Change Lockout Procedures',
      'Emergency Response',
    ],
    typicalExamples: [
      'High-voltage electrical equipment',
      'Steam boilers and piping',
      'Large industrial ovens/furnaces',
      'High-pressure systems (>500 PSI)',
      'Major refrigeration systems',
    ],
    minAuthorizedPersonnel: 2,
    requiresSupervisorApproval: true,
    requiresSafetyOfficerApproval: true,
    maxDurationHours: 72,
    reviewFrequencyDays: 30,
  },
  5: {
    level: 5,
    name: 'Extreme/Complex Energy',
    energyHazard: 'Extreme/Complex',
    energyDescription: 'Multiple high-energy sources, hazardous materials, radiation, or complex interconnected systems',
    procedureComplexity: 'Contractor/Complex Multi-Day Work',
    procedureDescription: 'Complex multi-day work involving contractors; comprehensive planning, JSA, and multiple permits required',
    color: '#7C3AED',
    requiredTraining: [
      'LOTO Authorized Employee Training',
      'Complex Systems Isolation',
      'Contractor Safety Management',
      'Permit-to-Work Systems',
      'Emergency Response Advanced',
    ],
    typicalExamples: [
      'Plant-wide shutdowns',
      'Ammonia refrigeration systems',
      'High-voltage substations',
      'Process piping modifications',
      'Multi-system interconnected equipment',
      'Radiation-producing equipment',
    ],
    minAuthorizedPersonnel: 3,
    requiresSupervisorApproval: true,
    requiresSafetyOfficerApproval: true,
    maxDurationHours: null,
    reviewFrequencyDays: 14,
  },
};

export const LOTO_LEVEL_OPTIONS = Object.values(LOTO_LEVELS).map((level) => ({
  value: level.level,
  label: `Level ${level.level} - ${level.name}`,
  description: level.energyDescription,
  color: level.color,
}));

// PPE Options for Work Orders and PMs
export interface PPEOption {
  id: string;
  label: string;
  category: 'head' | 'eye' | 'ear' | 'respiratory' | 'hand' | 'body' | 'foot' | 'fall' | 'other';
  icon?: string;
  required?: boolean;
}

export const PPE_OPTIONS_EXTENDED: PPEOption[] = [
  // Head Protection
  { id: 'hard_hat', label: 'Hard Hat', category: 'head' },
  { id: 'bump_cap', label: 'Bump Cap', category: 'head' },
  { id: 'hair_net', label: 'Hair Net', category: 'head' },
  { id: 'beard_net', label: 'Beard Net', category: 'head' },
  
  // Eye & Face Protection
  { id: 'safety_glasses', label: 'Safety Glasses', category: 'eye', required: true },
  { id: 'safety_goggles', label: 'Safety Goggles', category: 'eye' },
  { id: 'face_shield', label: 'Face Shield', category: 'eye' },
  { id: 'welding_helmet', label: 'Welding Helmet', category: 'eye' },
  { id: 'cutting_goggles', label: 'Cutting Goggles', category: 'eye' },
  
  // Hearing Protection
  { id: 'ear_plugs', label: 'Ear Plugs', category: 'ear' },
  { id: 'ear_muffs', label: 'Ear Muffs', category: 'ear' },
  { id: 'hearing_protection_dual', label: 'Dual Protection (Plugs + Muffs)', category: 'ear' },
  
  // Respiratory Protection
  { id: 'dust_mask', label: 'Dust Mask (N95)', category: 'respiratory' },
  { id: 'half_face_respirator', label: 'Half-Face Respirator', category: 'respiratory' },
  { id: 'full_face_respirator', label: 'Full-Face Respirator', category: 'respiratory' },
  { id: 'scba', label: 'SCBA (Self-Contained Breathing Apparatus)', category: 'respiratory' },
  { id: 'supplied_air', label: 'Supplied Air Respirator', category: 'respiratory' },
  
  // Hand Protection
  { id: 'leather_gloves', label: 'Leather Gloves', category: 'hand' },
  { id: 'cut_resistant_gloves', label: 'Cut-Resistant Gloves', category: 'hand' },
  { id: 'chemical_gloves', label: 'Chemical-Resistant Gloves', category: 'hand' },
  { id: 'nitrile_gloves', label: 'Nitrile Gloves', category: 'hand' },
  { id: 'insulated_gloves', label: 'Electrical Insulated Gloves', category: 'hand' },
  { id: 'heat_resistant_gloves', label: 'Heat-Resistant Gloves', category: 'hand' },
  { id: 'cold_resistant_gloves', label: 'Cold-Resistant Gloves', category: 'hand' },
  { id: 'welding_gloves', label: 'Welding Gloves', category: 'hand' },
  
  // Body Protection
  { id: 'safety_vest', label: 'High-Visibility Vest', category: 'body' },
  { id: 'coveralls', label: 'Coveralls', category: 'body' },
  { id: 'chemical_suit', label: 'Chemical Suit', category: 'body' },
  { id: 'welding_jacket', label: 'Welding Jacket', category: 'body' },
  { id: 'apron', label: 'Protective Apron', category: 'body' },
  { id: 'flame_resistant', label: 'Flame-Resistant Clothing', category: 'body' },
  { id: 'arc_flash_suit', label: 'Arc Flash Suit', category: 'body' },
  { id: 'tyvek_suit', label: 'Tyvek Suit', category: 'body' },
  
  // Foot Protection
  { id: 'steel_toe_boots', label: 'Steel Toe Boots', category: 'foot', required: true },
  { id: 'composite_toe_boots', label: 'Composite Toe Boots', category: 'foot' },
  { id: 'metatarsal_guards', label: 'Metatarsal Guards', category: 'foot' },
  { id: 'electrical_hazard_boots', label: 'Electrical Hazard Boots', category: 'foot' },
  { id: 'chemical_resistant_boots', label: 'Chemical-Resistant Boots', category: 'foot' },
  { id: 'slip_resistant_shoes', label: 'Slip-Resistant Shoes', category: 'foot' },
  
  // Fall Protection
  { id: 'full_body_harness', label: 'Full Body Harness', category: 'fall' },
  { id: 'lanyard', label: 'Shock-Absorbing Lanyard', category: 'fall' },
  { id: 'retractable_lifeline', label: 'Retractable Lifeline', category: 'fall' },
  { id: 'anchor_point', label: 'Anchor Point/System', category: 'fall' },
  
  // Other
  { id: 'knee_pads', label: 'Knee Pads', category: 'other' },
  { id: 'cooling_vest', label: 'Cooling Vest', category: 'other' },
  { id: 'life_jacket', label: 'Life Jacket/PFD', category: 'other' },
];

export const PPE_CATEGORIES = {
  head: 'Head Protection',
  eye: 'Eye & Face Protection',
  ear: 'Hearing Protection',
  respiratory: 'Respiratory Protection',
  hand: 'Hand Protection',
  body: 'Body Protection',
  foot: 'Foot Protection',
  fall: 'Fall Protection',
  other: 'Other PPE',
} as const;

// Permit Types for Work Orders and PMs
export interface PermitOption {
  id: string;
  label: string;
  description: string;
  color: string;
  requiresApproval: boolean;
  validHours: number;
  requiredTraining?: string[];
}

export const PERMIT_OPTIONS: PermitOption[] = [
  {
    id: 'hot_work',
    label: 'Hot Work Permit',
    description: 'Required for welding, cutting, grinding, or any spark-producing work',
    color: '#EF4444',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['Hot Work Safety', 'Fire Watch'],
  },
  {
    id: 'confined_space',
    label: 'Confined Space Entry Permit',
    description: 'Required for entry into tanks, vessels, pits, or enclosed spaces',
    color: '#F59E0B',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['Confined Space Entry', 'Atmospheric Monitoring', 'Rescue Procedures'],
  },
  {
    id: 'excavation',
    label: 'Excavation Permit',
    description: 'Required for digging, trenching, or ground disturbance',
    color: '#8B5CF6',
    requiresApproval: true,
    validHours: 24,
    requiredTraining: ['Excavation Safety', 'Utility Locate'],
  },
  {
    id: 'electrical',
    label: 'Electrical Work Permit',
    description: 'Required for work on energized electrical systems or high voltage',
    color: '#3B82F6',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['Electrical Safety', 'NFPA 70E'],
  },
  {
    id: 'roof_access',
    label: 'Roof Access Permit',
    description: 'Required for work on rooftops or elevated surfaces',
    color: '#06B6D4',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['Fall Protection', 'Roof Safety'],
  },
  {
    id: 'line_break',
    label: 'Line Break Permit',
    description: 'Required for breaking into piping systems or process lines',
    color: '#EC4899',
    requiresApproval: true,
    validHours: 12,
    requiredTraining: ['Line Break Procedures', 'Hazardous Materials'],
  },
  {
    id: 'crane_lift',
    label: 'Crane/Lift Permit',
    description: 'Required for critical lifts or crane operations',
    color: '#10B981',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['Crane Safety', 'Rigging'],
  },
  {
    id: 'chemical_handling',
    label: 'Chemical Handling Permit',
    description: 'Required for handling hazardous chemicals outside normal operations',
    color: '#84CC16',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['HazCom', 'Chemical Safety'],
  },
  {
    id: 'radiation',
    label: 'Radiation Work Permit',
    description: 'Required for work involving radioactive materials or radiation sources',
    color: '#7C3AED',
    requiresApproval: true,
    validHours: 4,
    requiredTraining: ['Radiation Safety', 'ALARA Principles'],
  },
  {
    id: 'pressure_test',
    label: 'Pressure Testing Permit',
    description: 'Required for hydrostatic or pneumatic pressure testing',
    color: '#0891B2',
    requiresApproval: true,
    validHours: 8,
    requiredTraining: ['Pressure Testing Safety'],
  },
];

export const PERMIT_OPTIONS_MAP = PERMIT_OPTIONS.reduce((acc, permit) => {
  acc[permit.id] = permit;
  return acc;
}, {} as Record<string, PermitOption>);

// LOTO Program Documents Structure
export interface LOTODocument {
  id: string;
  title: string;
  type: 'policy' | 'procedure' | 'form' | 'training' | 'reference';
  description: string;
  applicableLevels: LOTOLevel[];
  lastReviewed?: string;
  nextReview?: string;
  version?: string;
}

// LOTO Master Policy Content
export interface LOTOMasterPolicy {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  lastReviewed: string;
  nextReview: string;
  approvedBy: string;
  sections: LOTOPolicySection[];
}

export interface LOTOPolicySection {
  id: string;
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

export const LOTO_MASTER_POLICY: LOTOMasterPolicy = {
  id: 'loto-master-policy',
  title: 'Lockout/Tagout (LOTO) Program Policy',
  version: '3.0',
  effectiveDate: '2024-01-01',
  lastReviewed: '2024-12-01',
  nextReview: '2025-06-01',
  approvedBy: 'Safety Director',
  sections: [
    {
      id: 'purpose',
      title: '1. Purpose',
      content: 'This Lockout/Tagout (LOTO) Program establishes the minimum requirements for the control of hazardous energy during servicing and maintenance of machines and equipment. This program is designed to prevent unexpected energization, start-up, or release of stored energy that could cause injury to employees.',
    },
    {
      id: 'scope',
      title: '2. Scope',
      content: 'This program applies to all employees who service or maintain machines and equipment where the unexpected energization, start-up, or release of stored energy could cause injury. This includes, but is not limited to: electrical, mechanical, hydraulic, pneumatic, chemical, thermal, gravitational, and other forms of hazardous energy.',
    },
    {
      id: 'definitions',
      title: '3. Definitions',
      content: '',
      subsections: [
        { title: 'Affected Employee', content: 'An employee whose job requires them to operate or use a machine or equipment on which servicing or maintenance is being performed under lockout/tagout, or whose job requires them to work in an area in which such servicing or maintenance is being performed.' },
        { title: 'Authorized Employee', content: 'A person who locks out or tags out machines or equipment in order to perform servicing or maintenance on that machine or equipment. An authorized employee must be trained and authorized to perform LOTO procedures.' },
        { title: 'Energy Isolating Device', content: 'A mechanical device that physically prevents the transmission or release of energy, including but not limited to: manually operated electrical circuit breakers, disconnect switches, line valves, and blocks.' },
        { title: 'Lockout', content: 'The placement of a lockout device on an energy isolating device, ensuring that the energy isolating device and the equipment being controlled cannot be operated until the lockout device is removed.' },
        { title: 'Tagout', content: 'The placement of a tagout device on an energy isolating device to indicate that the energy isolating device and the equipment being controlled may not be operated until the tagout device is removed.' },
        { title: 'LOTO Level', content: 'A classification (0-5) that indicates the energy hazard level and procedure complexity required for a specific lockout/tagout situation.' },
      ],
    },
    {
      id: 'responsibilities',
      title: '4. Responsibilities',
      content: '',
      subsections: [
        { title: 'Management', content: 'Ensure adequate resources for LOTO program implementation, enforce compliance with LOTO procedures, ensure proper training is provided, and conduct periodic program audits.' },
        { title: 'Safety Department', content: 'Develop and maintain LOTO procedures, conduct training, perform periodic inspections, investigate incidents, and maintain program documentation.' },
        { title: 'Supervisors', content: 'Ensure employees are trained before performing LOTO, verify LOTO procedures are followed, approve LOTO permits as required, and coordinate group lockout activities.' },
        { title: 'Authorized Employees', content: 'Apply personal locks and tags, follow established procedures, verify zero energy state, coordinate with affected employees, and maintain control of personal lock keys.' },
        { title: 'Affected Employees', content: 'Recognize when LOTO is in effect, not attempt to operate locked/tagged equipment, notify authorized employees of work status, and report any concerns or violations.' },
      ],
    },
    {
      id: 'loto-levels',
      title: '5. LOTO Levels (0-5)',
      content: 'All maintenance and servicing activities must be assessed for LOTO requirements and assigned an appropriate level based on energy hazard and procedure complexity. Refer to the LOTO Level One Point Lessons (OPLs) for detailed requirements at each level.',
      subsections: [
        { title: 'Level 0 - Zero Energy', content: 'Equipment with no energy sources. No lockout required. Visual verification only.' },
        { title: 'Level 1 - Minimal Energy', content: 'Single energy source, single person lockout. Standard personal lockout procedures apply.' },
        { title: 'Level 2 - Low Energy', content: 'Multiple energy sources requiring multiple isolation points. Energy source inventory required.' },
        { title: 'Level 3 - Moderate Energy', content: 'Group lockout required with multiple workers. Designated LOTO coordinator assigned.' },
        { title: 'Level 4 - High Energy', content: 'Extended work spanning multiple shifts. Formal shift transfer procedures required.' },
        { title: 'Level 5 - Extreme/Complex', content: 'Contractor involvement, multiple trades, high-hazard work. Maximum documentation and oversight required.' },
      ],
    },
    {
      id: 'procedures',
      title: '6. General LOTO Procedures',
      content: '',
      subsections: [
        { title: 'Preparation', content: 'Identify all energy sources, notify affected employees, gather required locks/tags/devices, review equipment-specific procedures.' },
        { title: 'Shutdown', content: 'Shut down equipment using normal operating procedures. Do not use emergency stops unless necessary.' },
        { title: 'Isolation', content: 'Locate and operate all energy isolating devices to isolate equipment from energy sources.' },
        { title: 'Lockout/Tagout', content: 'Apply locks and tags to each energy isolating device. Each authorized employee applies their own lock.' },
        { title: 'Stored Energy', content: 'Release, restrain, or otherwise render safe all potentially hazardous stored or residual energy.' },
        { title: 'Verification', content: 'Verify isolation by attempting to operate equipment controls. Ensure all personnel are clear before testing.' },
        { title: 'Release from LOTO', content: 'Ensure work is complete, remove tools, reinstall guards, verify personnel are clear, remove locks in reverse order, notify affected employees.' },
      ],
    },
    {
      id: 'training',
      title: '7. Training Requirements',
      content: 'All employees must receive LOTO training appropriate to their role and authorization level. Training must be conducted before initial assignment and whenever there is a change in job assignments, machines, equipment, or processes that present new hazards. Retraining is required whenever periodic inspection reveals inadequacies.',
      subsections: [
        { title: 'Authorized Employee Training', content: 'Recognition of hazardous energy sources, type and magnitude of energy, methods and means of energy isolation, purpose and use of LOTO procedures.' },
        { title: 'Affected Employee Training', content: 'Purpose and use of LOTO procedures, prohibition against attempting to restart locked/tagged equipment.' },
        { title: 'Annual Refresher', content: 'All authorized and affected employees must complete annual LOTO refresher training.' },
      ],
    },
    {
      id: 'inspections',
      title: '8. Periodic Inspections',
      content: 'Periodic inspections of LOTO procedures shall be conducted at least annually for each authorized employee. Inspections shall be performed by an authorized employee other than the one using the procedure and shall include a review between the inspector and authorized employee.',
    },
    {
      id: 'emergency-removal',
      title: '9. Emergency Lock Removal',
      content: 'Locks may only be removed by the employee who applied them, except in emergency situations where the employee is unavailable. Emergency removal requires: verification that the authorized employee is not at the facility, all reasonable efforts to contact the employee, ensuring safe removal of the lock, and notification to the employee that their lock was removed before they return to work.',
    },
    {
      id: 'documentation',
      title: '10. Documentation',
      content: 'All LOTO activities must be documented as required by the assigned LOTO level. Documentation includes LOTO permits, energy source inventories, shift transfer logs, inspection records, and training records. Records must be maintained for a minimum of three years.',
    },
  ],
};

// LOTO OPL (One Point Lesson) Documents
export interface LOTOOPLDocument {
  id: string;
  level: LOTOLevel;
  title: string;
  subtitle: string;
  color: string;
  imageUrl: string;
  description: string;
  typicalExamples: string[];
  requirements: string[];
  trainingRequired: string[];
  approvalRequired: string[];
  ppeRequirements: string[];
  permitsRequired: string[];
  keySteps: string[];
}

export const LOTO_OPL_DOCUMENTS: LOTOOPLDocument[] = [
  {
    id: 'loto-opl-level-0',
    level: 0,
    title: 'Level 0 - Zero Energy',
    subtitle: 'No Lockout Required',
    color: '#10B981',
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/0e64pyf1a8mkwemwr8sm0',
    description: 'Equipment or systems that have no stored energy or energy sources. Work can be performed safely without lockout procedures. The equipment poses no risk of unexpected energization.',
    typicalExamples: [
      'Manual hand tools',
      'Unplugged portable equipment',
      'Gravity-fed systems (empty)',
      'Equipment with no power connection',
      'Static displays or signage',
    ],
    requirements: [
      'Verify zero energy state',
      'Confirm no stored energy',
      'Visual inspection only',
      'No isolation points exist',
      'Document verification',
    ],
    trainingRequired: [
      'Basic safety orientation',
      'Hazard recognition',
      'No formal LOTO training required',
    ],
    approvalRequired: [
      'No approval required',
      'Self-verified by worker',
      'Supervisor awareness recommended',
    ],
    ppeRequirements: [
      'Standard PPE for task',
      'No additional LOTO-specific PPE',
    ],
    permitsRequired: [
      'No LOTO permit required',
      'Standard work order only',
    ],
    keySteps: [
      '1. Identify equipment has no energy source',
      '2. Visually verify zero energy state',
      '3. Confirm no stored energy (pressure, gravity, spring)',
      '4. Proceed with work',
      '5. Document completion on work order',
    ],
  },
  {
    id: 'loto-opl-level-1',
    level: 1,
    title: 'Level 1 - Minimal Energy',
    subtitle: 'Simple Lockout (Single Energy, Single Person)',
    color: '#F59E0B',
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/4kn1fuzbhh6ckgmucblx0',
    description: 'Equipment with a single energy source that can be isolated by one worker. Low risk of injury if unexpected energization occurs. Standard personal lockout procedures apply.',
    typicalExamples: [
      'Single motor equipment',
      'Small electrical panels',
      'Individual pneumatic valves',
      'Single-pump systems',
      'Small conveyor sections',
    ],
    requirements: [
      'Single isolation point',
      'One authorized worker',
      'Personal lock and tag',
      'Try verification required',
      'Return to service by same worker',
    ],
    trainingRequired: [
      'Authorized Employee Training',
      'Energy source identification',
      'Lock/tag application',
      'Try verification procedures',
    ],
    approvalRequired: [
      'Self-authorized',
      'Must be trained/authorized employee',
      'Notify supervisor of LOTO',
    ],
    ppeRequirements: [
      'Safety glasses',
      'Appropriate gloves',
      'Arc flash PPE if electrical',
      'Standard work PPE',
    ],
    permitsRequired: [
      'Level 1 LOTO Permit',
      'Single-page simple permit',
      'Self-issued by authorized employee',
    ],
    keySteps: [
      '1. Notify affected employees',
      '2. Shut down equipment normally',
      '3. Isolate energy source',
      '4. Apply personal lock and tag',
      '5. Verify zero energy (try start)',
      '6. Perform work',
      '7. Remove tools, replace guards',
      '8. Remove lock/tag',
      '9. Notify affected employees',
      '10. Return to service',
    ],
  },
  {
    id: 'loto-opl-level-2',
    level: 2,
    title: 'Level 2 - Low Energy',
    subtitle: 'Multiple Energy Sources',
    color: '#F97316',
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bip1irarsqhdarx024lyp',
    description: 'Equipment with multiple energy sources requiring multiple isolation points. Still single-worker operation but increased complexity. All energy sources must be identified and isolated.',
    typicalExamples: [
      'Motor + pneumatic systems',
      'Electrical + hydraulic equipment',
      'Multi-feed conveyors',
      'Packaging machines',
      'Processing equipment with utilities',
    ],
    requirements: [
      'Multiple isolation points',
      'Energy source inventory',
      'Lock for each isolation point',
      'Sequential isolation',
      'Verification at each point',
    ],
    trainingRequired: [
      'Authorized Employee Training',
      'Multi-energy identification',
      'Complex system isolation',
      'Energy inventory procedures',
    ],
    approvalRequired: [
      'Self-authorized',
      'Supervisor review recommended',
      'Energy inventory verified',
    ],
    ppeRequirements: [
      'Safety glasses',
      'Appropriate gloves',
      'Arc flash PPE if electrical',
      'Hearing protection if needed',
      'Task-specific PPE',
    ],
    permitsRequired: [
      'Level 2 LOTO Permit',
      'Energy source checklist required',
      'All isolation points documented',
    ],
    keySteps: [
      '1. Complete energy source inventory',
      '2. Notify affected employees',
      '3. Shut down equipment normally',
      '4. Isolate ALL energy sources',
      '5. Apply lock to EACH isolation point',
      '6. Dissipate stored energy',
      '7. Verify EACH source isolated (try start)',
      '8. Perform work',
      '9. Remove tools, replace guards',
      '10. Remove locks in reverse order',
      '11. Notify and return to service',
    ],
  },
  {
    id: 'loto-opl-level-3',
    level: 3,
    title: 'Level 3 - Moderate Energy',
    subtitle: 'Group Lockout (Multiple Workers)',
    color: '#EF4444',
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/e2cg4no322g5pzxfbneaj',
    description: 'Equipment requiring multiple authorized workers to perform maintenance. Group lockout box procedures apply. Each worker must apply personal lock to group box. Designated coordinator required.',
    typicalExamples: [
      'Large production lines',
      'Multi-station equipment',
      'Tank cleaning operations',
      'Major mechanical repairs',
      'System-wide maintenance',
    ],
    requirements: [
      'Group lockout box',
      'Designated LOTO coordinator',
      "Each worker's personal lock",
      'Sign-in/sign-out log',
      'Verification by each worker',
    ],
    trainingRequired: [
      'Authorized Employee Training',
      'Group lockout procedures',
      'Coordinator responsibilities',
      'Communication protocols',
    ],
    approvalRequired: [
      'LOTO Coordinator assigned',
      'Supervisor approval required',
      'Pre-job briefing mandatory',
    ],
    ppeRequirements: [
      'Full PPE assessment required',
      'Arc flash analysis if electrical',
      'Confined space PPE if applicable',
      'Respiratory if needed',
      'Fall protection if heights',
    ],
    permitsRequired: [
      'Level 3 Group LOTO Permit',
      'Worker sign-in sheet',
      'May require additional permits',
      'Hot Work, Confined Space, etc.',
    ],
    keySteps: [
      '1. Coordinator completes energy inventory',
      '2. Pre-job safety briefing with all workers',
      '3. Coordinator isolates all energy sources',
      '4. Coordinator applies lock to group box',
      '5. EACH worker applies personal lock to group box',
      '6. EACH worker verifies zero energy',
      '7. Perform work (workers sign in/out)',
      '8. ALL workers remove personal locks when complete',
      '9. Coordinator verifies all clear',
      '10. Coordinator removes master lock',
      '11. Return to service',
    ],
  },
  {
    id: 'loto-opl-level-4',
    level: 4,
    title: 'Level 4 - High Energy',
    subtitle: 'Shift Change Procedures',
    color: '#991B1B',
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/5kikb688v6vf1ybloeo0e',
    description: 'Extended work spanning multiple shifts. LOTO must be maintained continuously with documented transfer of control between shifts. Incoming shift must verify before work continues.',
    typicalExamples: [
      'Multi-day repairs',
      'Major overhauls',
      'Equipment rebuilds',
      'Extended outages',
      'Capital projects',
    ],
    requirements: [
      'Shift transfer procedures',
      'Documented handoff',
      'Oncoming shift verification',
      'Continuous lock coverage',
      'Management notification',
    ],
    trainingRequired: [
      'Authorized Employee Training',
      'Shift transfer procedures',
      'Documentation requirements',
      'Verification protocols',
    ],
    approvalRequired: [
      'Supervisor approval each shift',
      'Management notification',
      'Documented shift handoff',
      'Safety coordinator oversight',
    ],
    ppeRequirements: [
      'Full PPE assessment',
      'Task-specific requirements',
      'Updated each shift',
      'Additional PPE as conditions change',
    ],
    permitsRequired: [
      'Level 4 LOTO Permit',
      'Shift transfer log',
      'Daily permit review',
      'Associated permits as needed',
    ],
    keySteps: [
      '1. Initial setup per Level 2/3 procedures',
      '2. Document all isolation points',
      '3. END OF SHIFT: Complete shift transfer form',
      '4. Outgoing workers remove personal locks',
      '5. Shift Supervisor lock remains',
      '6. START OF SHIFT: Pre-job briefing',
      '7. Incoming workers apply personal locks',
      '8. Incoming workers RE-VERIFY zero energy',
      '9. Document verification on permit',
      '10. Continue work',
      '11. Repeat transfer process each shift',
      '12. Final shift completes full restoration',
    ],
  },
  {
    id: 'loto-opl-level-5',
    level: 5,
    title: 'Level 5 - Extreme/Complex',
    subtitle: 'Contractor Multi-Day Work',
    color: '#1E3A5F',
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/0o74dsrz4irxve8zye1z8',
    description: 'Complex, high-hazard work involving contractors, multiple trades, extended duration, and/or life-critical systems. Maximum documentation and oversight required. Safety coordinator involvement mandatory.',
    typicalExamples: [
      'Contractor maintenance projects',
      'Multi-trade coordinated work',
      'Life safety system work',
      'High voltage electrical',
      'Pressure vessel entry',
      'Process hazard work',
    ],
    requirements: [
      'Contractor LOTO integration',
      'Site-specific procedures',
      'Multi-employer coordination',
      'Daily safety meetings',
      'Continuous monitoring',
    ],
    trainingRequired: [
      'All contractor workers trained',
      'Site-specific orientation',
      'Hazard communication',
      'Emergency procedures',
      'Rescue plan if applicable',
    ],
    approvalRequired: [
      'Plant Manager approval',
      'Safety Coordinator approval',
      'Contractor safety rep approval',
      'Daily permit review',
      'Pre-task risk assessment',
    ],
    ppeRequirements: [
      'Full hazard assessment',
      'Contractor PPE verification',
      'Site PPE requirements',
      'Emergency equipment staged',
      'Rescue equipment if needed',
    ],
    permitsRequired: [
      'Level 5 LOTO Permit',
      'Contractor safety plan',
      'Hot Work Permit if applicable',
      'Confined Space if applicable',
      'Line Break Permit if applicable',
      'Crane/Lift Permit if applicable',
    ],
    keySteps: [
      '1. Pre-project planning meeting',
      '2. Contractor safety plan review',
      '3. Site-specific training for all contractors',
      '4. Detailed energy inventory',
      '5. Multi-employer lock coordination',
      '6. Daily pre-task safety briefings',
      '7. Continuous Safety Coordinator oversight',
      '8. Documented shift transfers',
      '9. Daily permit reviews and updates',
      '10. Final verification by all parties',
      '11. Phased return to service',
      '12. Post-project safety debrief',
    ],
  },
];

export const LOTO_PROGRAM_DOCUMENTS: LOTODocument[] = [
  {
    id: 'loto-policy',
    title: 'LOTO Program Policy',
    type: 'policy',
    description: 'Master policy document for the Lockout/Tagout program covering scope, responsibilities, and requirements',
    applicableLevels: [0, 1, 2, 3, 4, 5],
    version: '3.0',
  },
  {
    id: 'loto-procedure-general',
    title: 'General LOTO Procedures',
    type: 'procedure',
    description: 'Step-by-step procedures for applying and removing locks and tags',
    applicableLevels: [1, 2, 3, 4, 5],
    version: '2.1',
  },
  {
    id: 'loto-group-lockout',
    title: 'Group Lockout Procedures',
    type: 'procedure',
    description: 'Procedures for group lockout situations with multiple authorized employees',
    applicableLevels: [3, 4, 5],
    version: '1.5',
  },
  {
    id: 'loto-shift-change',
    title: 'Shift Change Lockout Procedures',
    type: 'procedure',
    description: 'Procedures for transferring lockout protection between shifts',
    applicableLevels: [4, 5],
    version: '1.2',
  },
  {
    id: 'loto-contractor',
    title: 'Contractor LOTO Requirements',
    type: 'procedure',
    description: 'Requirements and procedures for contractors performing work requiring LOTO',
    applicableLevels: [3, 4, 5],
    version: '2.0',
  },
  {
    id: 'loto-equipment-specific',
    title: 'Equipment-Specific LOTO Procedures',
    type: 'reference',
    description: 'Index of machine-specific lockout procedures for all facility equipment',
    applicableLevels: [1, 2, 3, 4, 5],
    version: '4.2',
  },
  {
    id: 'loto-permit-form',
    title: 'LOTO Permit Form',
    type: 'form',
    description: 'Standard form for documenting lockout activities',
    applicableLevels: [1, 2, 3, 4, 5],
    version: '2.0',
  },
  {
    id: 'loto-audit-checklist',
    title: 'LOTO Audit Checklist',
    type: 'form',
    description: 'Checklist for conducting periodic LOTO program audits',
    applicableLevels: [0, 1, 2, 3, 4, 5],
    version: '1.3',
  },
  {
    id: 'loto-training-auth',
    title: 'Authorized Employee Training',
    type: 'training',
    description: 'Training curriculum for employees authorized to perform LOTO',
    applicableLevels: [1, 2, 3, 4, 5],
    version: '3.1',
  },
  {
    id: 'loto-training-affected',
    title: 'Affected Employee Training',
    type: 'training',
    description: 'Training curriculum for employees affected by LOTO but not authorized to apply',
    applicableLevels: [0, 1, 2, 3, 4, 5],
    version: '2.0',
  },
  {
    id: 'loto-energy-sources',
    title: 'Energy Source Identification Guide',
    type: 'reference',
    description: 'Guide to identifying hazardous energy sources in the workplace',
    applicableLevels: [1, 2, 3, 4, 5],
    version: '1.8',
  },
  {
    id: 'loto-emergency',
    title: 'Emergency Lock Removal Procedures',
    type: 'procedure',
    description: 'Procedures for emergency removal of locks when the authorized employee is unavailable',
    applicableLevels: [1, 2, 3, 4, 5],
    version: '1.0',
  },
];

export const LOTO_DOCUMENT_TYPES = {
  policy: { label: 'Policy', color: '#7C3AED' },
  procedure: { label: 'Procedure', color: '#3B82F6' },
  form: { label: 'Form', color: '#10B981' },
  training: { label: 'Training', color: '#F59E0B' },
  reference: { label: 'Reference', color: '#6B7280' },
} as const;

// Helper function to get LOTO level info
export function getLOTOLevelInfo(level: LOTOLevel): LOTOLevelDefinition {
  return LOTO_LEVELS[level];
}

// Helper function to determine minimum LOTO level based on conditions
export function determineMinimumLOTOLevel(options: {
  energySources: number;
  highVoltage: boolean;
  multipleWorkers: boolean;
  multipleShifts: boolean;
  contractorInvolved: boolean;
  hazardousMaterials: boolean;
}): LOTOLevel {
  const { energySources, highVoltage, multipleWorkers, multipleShifts, contractorInvolved, hazardousMaterials } = options;

  if (contractorInvolved || hazardousMaterials || (highVoltage && multipleShifts)) {
    return 5;
  }
  if (multipleShifts || highVoltage) {
    return 4;
  }
  if (multipleWorkers) {
    return 3;
  }
  if (energySources > 1) {
    return 2;
  }
  if (energySources === 1) {
    return 1;
  }
  return 0;
}

// Export grouped PPE by category for UI
export function getPPEByCategory(): Record<string, PPEOption[]> {
  const grouped: Record<string, PPEOption[]> = {};
  for (const ppe of PPE_OPTIONS_EXTENDED) {
    if (!grouped[ppe.category]) {
      grouped[ppe.category] = [];
    }
    grouped[ppe.category].push(ppe);
  }
  return grouped;
}
