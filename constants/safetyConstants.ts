export interface LOTOStep {
  id: string;
  order: number;
  description: string;
  lockColor?: string;
  energySource?: string;
  location?: string;
}

export const LOCK_COLORS = [
  { id: 'red', name: 'Red', hex: '#EF4444', description: 'Individual lockout' },
  { id: 'blue', name: 'Blue', hex: '#3B82F6', description: 'Shift/Group lockout' },
  { id: 'green', name: 'Green', hex: '#10B981', description: 'Department lockout' },
  { id: 'yellow', name: 'Yellow', hex: '#F59E0B', description: 'Contractor lockout' },
  { id: 'orange', name: 'Orange', hex: '#F97316', description: 'Supervisor lockout' },
  { id: 'purple', name: 'Purple', hex: '#8B5CF6', description: 'Maintenance lockout' },
  { id: 'black', name: 'Black', hex: '#1F2937', description: 'Operations lockout' },
  { id: 'white', name: 'White', hex: '#F9FAFB', description: 'Temporary lockout' },
] as const;

export const ENERGY_SOURCES = [
  { id: 'electrical', name: 'Electrical', icon: 'Zap' },
  { id: 'mechanical', name: 'Mechanical', icon: 'Cog' },
  { id: 'hydraulic', name: 'Hydraulic', icon: 'Droplets' },
  { id: 'pneumatic', name: 'Pneumatic', icon: 'Wind' },
  { id: 'thermal', name: 'Thermal', icon: 'Thermometer' },
  { id: 'chemical', name: 'Chemical', icon: 'FlaskConical' },
  { id: 'gravity', name: 'Gravity/Stored Energy', icon: 'ArrowDown' },
  { id: 'radiation', name: 'Radiation', icon: 'RadioTower' },
] as const;

export const DEFAULT_LOTO_STEPS: LOTOStep[] = [
  { id: 'loto-1', order: 1, description: 'Notify all affected employees of the lockout/tagout', energySource: 'all' },
  { id: 'loto-2', order: 2, description: 'Identify all energy sources for the equipment', energySource: 'all' },
  { id: 'loto-3', order: 3, description: 'Shut down equipment using normal stopping procedures', energySource: 'mechanical' },
  { id: 'loto-4', order: 4, description: 'Isolate all energy sources', energySource: 'all' },
  { id: 'loto-5', order: 5, description: 'Apply lockout/tagout devices to each isolation point', energySource: 'all', lockColor: 'red' },
  { id: 'loto-6', order: 6, description: 'Release, restrain, or dissipate all stored energy', energySource: 'gravity' },
  { id: 'loto-7', order: 7, description: 'Verify zero energy state - attempt to start equipment', energySource: 'all' },
];

export interface PPEItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  category: 'head' | 'eye' | 'ear' | 'respiratory' | 'hand' | 'body' | 'foot' | 'fall' | 'electrical';
  description: string;
}

export const PPE_ITEMS: PPEItem[] = [
  { id: 'hard-hat', name: 'Hard Hat', code: 'HH', icon: 'HardHat', category: 'head', description: 'Head protection for falling objects' },
  { id: 'bump-cap', name: 'Bump Cap', code: 'BC', icon: 'HardHat', category: 'head', description: 'Light head protection for bump hazards' },
  { id: 'safety-glasses', name: 'Safety Glasses', code: 'SG', icon: 'Glasses', category: 'eye', description: 'Eye protection from debris and particles' },
  { id: 'safety-goggles', name: 'Safety Goggles', code: 'GO', icon: 'Glasses', category: 'eye', description: 'Sealed eye protection for chemical/dust' },
  { id: 'face-shield', name: 'Face Shield', code: 'FS', icon: 'Shield', category: 'eye', description: 'Full face protection' },
  { id: 'welding-helmet', name: 'Welding Helmet', code: 'WH', icon: 'Shield', category: 'eye', description: 'Protection for welding operations' },
  { id: 'ear-plugs', name: 'Ear Plugs', code: 'EP', icon: 'Ear', category: 'ear', description: 'Hearing protection - insertable' },
  { id: 'ear-muffs', name: 'Ear Muffs', code: 'EM', icon: 'Headphones', category: 'ear', description: 'Hearing protection - over-ear' },
  { id: 'dust-mask', name: 'Dust Mask', code: 'DM', icon: 'Wind', category: 'respiratory', description: 'Basic particulate protection' },
  { id: 'n95-respirator', name: 'N95 Respirator', code: 'N95', icon: 'Wind', category: 'respiratory', description: 'Filtered particulate protection' },
  { id: 'half-face-respirator', name: 'Half-Face Respirator', code: 'HFR', icon: 'Wind', category: 'respiratory', description: 'Chemical vapor protection' },
  { id: 'full-face-respirator', name: 'Full-Face Respirator', code: 'FFR', icon: 'Wind', category: 'respiratory', description: 'Full face with respiratory protection' },
  { id: 'scba', name: 'SCBA', code: 'SCBA', icon: 'Wind', category: 'respiratory', description: 'Self-contained breathing apparatus' },
  { id: 'leather-gloves', name: 'Leather Gloves', code: 'LG', icon: 'Hand', category: 'hand', description: 'General purpose hand protection' },
  { id: 'nitrile-gloves', name: 'Nitrile Gloves', code: 'NG', icon: 'Hand', category: 'hand', description: 'Chemical resistant gloves' },
  { id: 'cut-resistant-gloves', name: 'Cut Resistant Gloves', code: 'CRG', icon: 'Hand', category: 'hand', description: 'Protection from cuts and lacerations' },
  { id: 'welding-gloves', name: 'Welding Gloves', code: 'WG', icon: 'Hand', category: 'hand', description: 'Heat and spark protection' },
  { id: 'electrical-gloves', name: 'Electrical Gloves', code: 'EG', icon: 'Zap', category: 'electrical', description: 'Insulated gloves for electrical work' },
  { id: 'hi-vis-vest', name: 'Hi-Vis Vest', code: 'HV', icon: 'Shirt', category: 'body', description: 'High visibility safety vest' },
  { id: 'fr-clothing', name: 'FR Clothing', code: 'FR', icon: 'Shirt', category: 'body', description: 'Flame resistant clothing' },
  { id: 'chemical-suit', name: 'Chemical Suit', code: 'CS', icon: 'Shirt', category: 'body', description: 'Chemical resistant coverall' },
  { id: 'arc-flash-suit', name: 'Arc Flash Suit', code: 'AFS', icon: 'Zap', category: 'electrical', description: 'Arc flash protection suit' },
  { id: 'safety-shoes', name: 'Safety Shoes', code: 'SS', icon: 'Footprints', category: 'foot', description: 'Steel/composite toe footwear' },
  { id: 'metatarsal-boots', name: 'Metatarsal Boots', code: 'MB', icon: 'Footprints', category: 'foot', description: 'Extended foot protection' },
  { id: 'rubber-boots', name: 'Rubber Boots', code: 'RB', icon: 'Footprints', category: 'foot', description: 'Chemical/water resistant boots' },
  { id: 'electrical-boots', name: 'Electrical Hazard Boots', code: 'EB', icon: 'Zap', category: 'electrical', description: 'Dielectric footwear' },
  { id: 'safety-harness', name: 'Safety Harness', code: 'SH', icon: 'Link', category: 'fall', description: 'Full body fall arrest harness' },
  { id: 'lanyard', name: 'Lanyard', code: 'LY', icon: 'Link', category: 'fall', description: 'Fall arrest connection device' },
  { id: 'srl', name: 'Self-Retracting Lifeline', code: 'SRL', icon: 'Link', category: 'fall', description: 'Retractable fall protection' },
  { id: 'arc-face-shield', name: 'Arc Flash Face Shield', code: 'AFFS', icon: 'Shield', category: 'electrical', description: 'Arc flash rated face protection' },
  { id: 'voltage-detector', name: 'Voltage Detector', code: 'VD', icon: 'Zap', category: 'electrical', description: 'Non-contact voltage tester' },
];

export const PPE_CATEGORIES = [
  { id: 'head', name: 'Head Protection', icon: 'HardHat' },
  { id: 'eye', name: 'Eye & Face Protection', icon: 'Glasses' },
  { id: 'ear', name: 'Hearing Protection', icon: 'Ear' },
  { id: 'respiratory', name: 'Respiratory Protection', icon: 'Wind' },
  { id: 'hand', name: 'Hand Protection', icon: 'Hand' },
  { id: 'body', name: 'Body Protection', icon: 'Shirt' },
  { id: 'foot', name: 'Foot Protection', icon: 'Footprints' },
  { id: 'fall', name: 'Fall Protection', icon: 'Link' },
  { id: 'electrical', name: 'Electrical Protection', icon: 'Zap' },
] as const;

export interface PermitFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'signature';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | boolean;
}

export interface PermitType {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  requiredFields: string[];
  expirationHours: number;
  approvalRequired: boolean;
  formFields: PermitFormField[];
}

export const PERMIT_TYPES: PermitType[] = [
  {
    id: 'roof-access',
    name: 'Roof Access',
    code: 'RA',
    description: 'Required for any work performed on building rooftops',
    color: '#F59E0B',
    requiredFields: ['location', 'duration', 'fallProtection'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'roof_location', label: 'Roof Location/Area', type: 'text', required: true, placeholder: 'e.g., Main Building North Section' },
      { id: 'access_point', label: 'Access Point', type: 'select', required: true, options: ['Interior Ladder', 'Exterior Ladder', 'Roof Hatch', 'Scissor Lift', 'Boom Lift', 'Other'] },
      { id: 'purpose', label: 'Purpose of Access', type: 'textarea', required: true, placeholder: 'Describe the work to be performed...' },
      { id: 'start_date', label: 'Start Date', type: 'date', required: true },
      { id: 'start_time', label: 'Start Time', type: 'time', required: true },
      { id: 'estimated_duration', label: 'Estimated Duration (hours)', type: 'select', required: true, options: ['1', '2', '3', '4', '5', '6', '7', '8'] },
      { id: 'fall_protection_type', label: 'Fall Protection Type', type: 'select', required: true, options: ['Guardrail System', 'Safety Net', 'Personal Fall Arrest System', 'Warning Line System', 'Combination'] },
      { id: 'fall_protection_inspected', label: 'Fall protection equipment inspected', type: 'checkbox', required: true, defaultValue: false },
      { id: 'weather_checked', label: 'Weather conditions checked and acceptable', type: 'checkbox', required: true, defaultValue: false },
      { id: 'rescue_plan', label: 'Rescue plan reviewed', type: 'checkbox', required: true, defaultValue: false },
      { id: 'communication', label: 'Communication method established', type: 'checkbox', required: true, defaultValue: false },
      { id: 'personnel_names', label: 'Personnel Accessing Roof', type: 'textarea', required: true, placeholder: 'List all personnel names...' },
      { id: 'emergency_contact', label: 'Emergency Contact', type: 'text', required: true, placeholder: 'Name and phone number' },
      { id: 'additional_hazards', label: 'Additional Hazards Identified', type: 'textarea', required: false, placeholder: 'List any additional hazards...' },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'confined-space',
    name: 'Confined Space Entry',
    code: 'CSE',
    description: 'Required for entry into tanks, vessels, silos, pits, or other confined spaces',
    color: '#EF4444',
    requiredFields: ['atmosphericTesting', 'rescuePlan', 'attendant', 'entrant'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'space_location', label: 'Confined Space Location', type: 'text', required: true, placeholder: 'e.g., Tank #3, Basement Pit A' },
      { id: 'space_type', label: 'Type of Confined Space', type: 'select', required: true, options: ['Tank', 'Vessel', 'Silo', 'Pit', 'Vault', 'Trench', 'Pipeline', 'Other'] },
      { id: 'purpose', label: 'Purpose of Entry', type: 'textarea', required: true, placeholder: 'Describe the work to be performed...' },
      { id: 'entrant_names', label: 'Authorized Entrant(s)', type: 'textarea', required: true, placeholder: 'List all entrant names...' },
      { id: 'attendant_name', label: 'Attendant Name', type: 'text', required: true },
      { id: 'entry_supervisor', label: 'Entry Supervisor', type: 'text', required: true },
      { id: 'atmospheric_tested', label: 'Atmospheric testing completed', type: 'checkbox', required: true, defaultValue: false },
      { id: 'oxygen_level', label: 'Oxygen Level (%)', type: 'text', required: true, placeholder: '19.5% - 23.5%' },
      { id: 'lel_level', label: 'LEL Level (%)', type: 'text', required: true, placeholder: 'Less than 10%' },
      { id: 'toxic_gases', label: 'Toxic Gas Levels', type: 'text', required: true, placeholder: 'H2S, CO, etc.' },
      { id: 'ventilation', label: 'Ventilation established', type: 'checkbox', required: true, defaultValue: false },
      { id: 'rescue_equipment', label: 'Rescue equipment on-site', type: 'checkbox', required: true, defaultValue: false },
      { id: 'communication_method', label: 'Communication method established', type: 'checkbox', required: true, defaultValue: false },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'hot-work',
    name: 'Hot Work',
    code: 'HW',
    description: 'Required for welding, cutting, grinding, or other spark-producing activities',
    color: '#DC2626',
    requiredFields: ['fireWatch', 'fireExtinguisher', 'clearance'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'work_location', label: 'Work Location', type: 'text', required: true, placeholder: 'Specific location of hot work' },
      { id: 'work_type', label: 'Type of Hot Work', type: 'select', required: true, options: ['Welding', 'Cutting', 'Grinding', 'Brazing', 'Soldering', 'Other'] },
      { id: 'purpose', label: 'Description of Work', type: 'textarea', required: true, placeholder: 'Describe the work to be performed...' },
      { id: 'fire_watch_name', label: 'Fire Watch Person', type: 'text', required: true },
      { id: 'fire_extinguisher', label: 'Fire extinguisher present and inspected', type: 'checkbox', required: true, defaultValue: false },
      { id: 'area_cleared', label: 'Area cleared of combustibles (35 ft radius)', type: 'checkbox', required: true, defaultValue: false },
      { id: 'sprinklers_active', label: 'Sprinkler system active', type: 'checkbox', required: true, defaultValue: false },
      { id: 'fire_alarm_notified', label: 'Fire alarm monitoring notified', type: 'checkbox', required: false, defaultValue: false },
      { id: 'floors_protected', label: 'Floors/surfaces protected', type: 'checkbox', required: true, defaultValue: false },
      { id: 'fire_watch_duration', label: 'Fire Watch Duration After Work (min)', type: 'select', required: true, options: ['30', '60', '90', '120'] },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'working-heights',
    name: 'Working at Heights',
    code: 'WAH',
    description: 'Required for work performed above 6 feet from ground level',
    color: '#8B5CF6',
    requiredFields: ['fallProtectionType', 'rescuePlan', 'equipmentInspection'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'work_location', label: 'Work Location', type: 'text', required: true },
      { id: 'height', label: 'Working Height (feet)', type: 'text', required: true },
      { id: 'equipment_type', label: 'Equipment Type', type: 'select', required: true, options: ['Ladder', 'Scaffold', 'Aerial Lift', 'Scissor Lift', 'Boom Lift', 'Roof', 'Other'] },
      { id: 'fall_protection', label: 'Fall Protection Type', type: 'select', required: true, options: ['Guardrails', 'Personal Fall Arrest', 'Safety Net', 'Positioning Device', 'Travel Restraint'] },
      { id: 'harness_inspected', label: 'Harness/lanyard inspected', type: 'checkbox', required: true, defaultValue: false },
      { id: 'anchor_point', label: 'Anchor point identified and rated', type: 'checkbox', required: true, defaultValue: false },
      { id: 'rescue_plan', label: 'Rescue plan in place', type: 'checkbox', required: true, defaultValue: false },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'electrical-work',
    name: 'Electrical Work',
    code: 'EW',
    description: 'Required for work on or near energized electrical equipment',
    color: '#F97316',
    requiredFields: ['voltage', 'arcFlashCategory', 'boundaries'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'equipment_location', label: 'Equipment/Panel Location', type: 'text', required: true },
      { id: 'voltage', label: 'Voltage Level', type: 'select', required: true, options: ['120V', '208V', '240V', '277V', '480V', '600V+'] },
      { id: 'arc_flash_category', label: 'Arc Flash Category', type: 'select', required: true, options: ['Category 1', 'Category 2', 'Category 3', 'Category 4'] },
      { id: 'work_description', label: 'Work Description', type: 'textarea', required: true },
      { id: 'voltage_tested', label: 'Voltage absence verified', type: 'checkbox', required: true, defaultValue: false },
      { id: 'ppe_donned', label: 'Appropriate PPE donned', type: 'checkbox', required: true, defaultValue: false },
      { id: 'boundaries_established', label: 'Shock/arc flash boundaries established', type: 'checkbox', required: true, defaultValue: false },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'excavation',
    name: 'Excavation',
    code: 'EX',
    description: 'Required for digging or trenching operations',
    color: '#6B7280',
    requiredFields: ['depth', 'shoring', 'utilitiesLocated'],
    expirationHours: 24,
    approvalRequired: true,
    formFields: [
      { id: 'dig_location', label: 'Excavation Location', type: 'text', required: true },
      { id: 'depth', label: 'Estimated Depth (feet)', type: 'text', required: true },
      { id: 'purpose', label: 'Purpose of Excavation', type: 'textarea', required: true },
      { id: 'utilities_located', label: 'Underground utilities located (811 called)', type: 'checkbox', required: true, defaultValue: false },
      { id: 'shoring_required', label: 'Shoring/Shielding Required', type: 'select', required: true, options: ['None (< 5 ft)', 'Sloping', 'Benching', 'Shoring', 'Shielding'] },
      { id: 'competent_person', label: 'Competent Person Name', type: 'text', required: true },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'crane-lift',
    name: 'Critical Lift / Crane',
    code: 'CL',
    description: 'Required for crane operations and critical lifts',
    color: '#3B82F6',
    requiredFields: ['loadWeight', 'liftPlan', 'riggerCertified'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'lift_location', label: 'Lift Location', type: 'text', required: true },
      { id: 'load_weight', label: 'Load Weight (lbs)', type: 'text', required: true },
      { id: 'crane_capacity', label: 'Crane Capacity (lbs)', type: 'text', required: true },
      { id: 'lift_description', label: 'Lift Description', type: 'textarea', required: true },
      { id: 'operator_certified', label: 'Crane operator certified', type: 'checkbox', required: true, defaultValue: false },
      { id: 'rigger_certified', label: 'Rigger certified', type: 'checkbox', required: true, defaultValue: false },
      { id: 'lift_plan_reviewed', label: 'Lift plan reviewed', type: 'checkbox', required: true, defaultValue: false },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'line-break',
    name: 'Line Break',
    code: 'LB',
    description: 'Required for opening process piping or equipment',
    color: '#10B981',
    requiredFields: ['systemIsolated', 'pressureRelieved', 'drainedPurged'],
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'system_location', label: 'System/Line Location', type: 'text', required: true },
      { id: 'system_contents', label: 'System Contents', type: 'text', required: true, placeholder: 'e.g., Water, Steam, Chemical' },
      { id: 'break_purpose', label: 'Purpose of Line Break', type: 'textarea', required: true },
      { id: 'system_isolated', label: 'System isolated', type: 'checkbox', required: true, defaultValue: false },
      { id: 'pressure_relieved', label: 'Pressure relieved/verified', type: 'checkbox', required: true, defaultValue: false },
      { id: 'drained_purged', label: 'System drained/purged', type: 'checkbox', required: true, defaultValue: false },
      { id: 'blinds_installed', label: 'Blinds/blanks installed', type: 'checkbox', required: false, defaultValue: false },
      { id: 'signature', label: 'Requester Signature', type: 'signature', required: true },
    ],
  },
];

export function generatePermitId(): string {
  return `PER-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}
