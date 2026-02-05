export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'overdue';

export const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  on_hold: '#6B7280',
  completed: '#10B981',
  cancelled: '#EF4444',
  overdue: '#DC2626',
};

export type DepartmentType = 'maintenance' | 'production' | 'quality' | 'safety' | 'warehouse' | 'engineering' | 'sanitation';

export interface DepartmentWorkflow {
  id: string;
  workOrderId: string;
  currentDepartment: DepartmentType;
  departmentQueue: DepartmentType[];
  completedDepartments: DepartmentType[];
  routingHistory: {
    department: DepartmentType;
    sentBy: string;
    sentAt: string;
    notes?: string;
  }[];
  documentationSections: CompletedDocumentationSection[];
}

export interface CompletedDocumentationSection {
  id: string;
  templateId: string;
  department: DepartmentType;
  completedBy: string;
  completedByName: string;
  completedAt: string;
  values: Record<string, unknown>;
  signature?: string;
  notes?: string;
  isLocked: boolean;
}

export interface LOTOStep {
  id: string;
  order: number;
  description: string;
  lockColor?: string;
  energySource?: string;
  location?: string;
}

export const DEFAULT_LOTO_STEPS: LOTOStep[] = [
  {
    id: 'loto-1',
    order: 1,
    description: 'Disconnect main power supply',
    lockColor: 'red',
    energySource: 'electrical',
    location: 'Main Panel - Breaker 15',
  },
  {
    id: 'loto-2',
    order: 2,
    description: 'Close air supply valve',
    lockColor: 'yellow',
    energySource: 'pneumatic',
    location: 'Valve V-101',
  },
];

export interface LockColor {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const LOCK_COLORS: LockColor[] = [
  { id: 'red', name: 'Red', hex: '#EF4444', description: 'Danger - Electrical' },
  { id: 'yellow', name: 'Yellow', hex: '#F59E0B', description: 'Caution - Pneumatic' },
  { id: 'blue', name: 'Blue', hex: '#3B82F6', description: 'Information - Mechanical' },
  { id: 'green', name: 'Green', hex: '#10B981', description: 'Safety - Chemical' },
  { id: 'orange', name: 'Orange', hex: '#F97316', description: 'Warning - Hydraulic' },
  { id: 'purple', name: 'Purple', hex: '#8B5CF6', description: 'Radiation' },
  { id: 'white', name: 'White', hex: '#FFFFFF', description: 'General - Thermal' },
  { id: 'black', name: 'Black', hex: '#1F2937', description: 'Gravity/Stored Energy' },
];

export interface PermitFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select' | 'date' | 'time' | 'number';
  required: boolean;
  options?: string[];
  defaultValue?: string | boolean | number;
  placeholder?: string;
}

export interface PermitType {
  id: string;
  name: string;
  code: string;
  color: string;
  description: string;
  formFields: PermitFormField[];
  expirationHours: number;
  approvalRequired: boolean;
}

export const PERMIT_TYPES: PermitType[] = [
  {
    id: 'hot_work',
    name: 'Hot Work Permit',
    code: 'HW',
    color: '#EF4444',
    description: 'Required for welding, cutting, grinding, or any work producing sparks or flames',
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'location', label: 'Work Location', type: 'text', required: true, placeholder: 'Enter specific location' },
      { id: 'work_description', label: 'Description of Work', type: 'textarea', required: true, placeholder: 'Describe the hot work to be performed' },
      { id: 'fire_watch', label: 'Fire Watch Assigned', type: 'checkbox', required: true },
      { id: 'fire_extinguisher', label: 'Fire Extinguisher Present', type: 'checkbox', required: true },
      { id: 'combustibles_removed', label: 'Combustibles Removed (35ft radius)', type: 'checkbox', required: true },
      { id: 'start_time', label: 'Planned Start Time', type: 'time', required: true },
      { id: 'end_time', label: 'Planned End Time', type: 'time', required: true },
    ],
  },
  {
    id: 'confined_space',
    name: 'Confined Space Entry',
    code: 'CS',
    color: '#8B5CF6',
    description: 'Required for entry into tanks, vessels, silos, or other confined spaces',
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'space_name', label: 'Confined Space Name/ID', type: 'text', required: true, placeholder: 'Enter space identifier' },
      { id: 'purpose', label: 'Purpose of Entry', type: 'textarea', required: true, placeholder: 'Describe reason for entry' },
      { id: 'attendant', label: 'Attendant Name', type: 'text', required: true, placeholder: 'Enter attendant name' },
      { id: 'rescue_plan', label: 'Rescue Plan Reviewed', type: 'checkbox', required: true },
      { id: 'atmosphere_tested', label: 'Atmosphere Tested', type: 'checkbox', required: true },
      { id: 'o2_level', label: 'O2 Level (%)', type: 'number', required: true, placeholder: '19.5-23.5%' },
      { id: 'lel_level', label: 'LEL Level (%)', type: 'number', required: true, placeholder: 'Must be <10%' },
      { id: 'ventilation', label: 'Ventilation Established', type: 'checkbox', required: true },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical Work Permit',
    code: 'EW',
    color: '#F59E0B',
    description: 'Required for work on energized electrical systems or within arc flash boundary',
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'equipment', label: 'Equipment/Panel ID', type: 'text', required: true, placeholder: 'Enter equipment identifier' },
      { id: 'voltage', label: 'Voltage Level', type: 'select', required: true, options: ['<50V', '50-600V', '>600V'] },
      { id: 'work_description', label: 'Work Description', type: 'textarea', required: true, placeholder: 'Describe electrical work' },
      { id: 'loto_verified', label: 'LOTO Verified', type: 'checkbox', required: true },
      { id: 'ppe_verified', label: 'Arc Flash PPE Verified', type: 'checkbox', required: true },
      { id: 'zero_energy', label: 'Zero Energy State Verified', type: 'checkbox', required: true },
    ],
  },
  {
    id: 'excavation',
    name: 'Excavation Permit',
    code: 'EX',
    color: '#6366F1',
    description: 'Required for any digging, trenching, or excavation work',
    expirationHours: 24,
    approvalRequired: true,
    formFields: [
      { id: 'location', label: 'Excavation Location', type: 'text', required: true, placeholder: 'Enter location' },
      { id: 'depth', label: 'Planned Depth (ft)', type: 'number', required: true, placeholder: 'Enter depth' },
      { id: 'utilities_marked', label: 'Utilities Located & Marked', type: 'checkbox', required: true },
      { id: 'shoring_required', label: 'Shoring/Sloping Required', type: 'checkbox', required: false },
      { id: 'competent_person', label: 'Competent Person Name', type: 'text', required: true, placeholder: 'Enter name' },
    ],
  },
  {
    id: 'line_break',
    name: 'Line Break Permit',
    code: 'LB',
    color: '#10B981',
    description: 'Required for opening process lines or equipment containing hazardous materials',
    expirationHours: 8,
    approvalRequired: true,
    formFields: [
      { id: 'line_id', label: 'Line/Equipment ID', type: 'text', required: true, placeholder: 'Enter line identifier' },
      { id: 'contents', label: 'Line Contents', type: 'text', required: true, placeholder: 'What does line contain?' },
      { id: 'drained', label: 'Line Drained', type: 'checkbox', required: true },
      { id: 'depressurized', label: 'Line Depressurized', type: 'checkbox', required: true },
      { id: 'isolated', label: 'Line Isolated', type: 'checkbox', required: true },
    ],
  },
  {
    id: 'roof_access',
    name: 'Roof Access Permit',
    code: 'RA',
    color: '#EC4899',
    description: 'Required for accessing rooftops or elevated work areas',
    expirationHours: 8,
    approvalRequired: false,
    formFields: [
      { id: 'building', label: 'Building Name', type: 'text', required: true, placeholder: 'Enter building name' },
      { id: 'purpose', label: 'Purpose of Access', type: 'textarea', required: true, placeholder: 'Describe reason for roof access' },
      { id: 'fall_protection', label: 'Fall Protection Required', type: 'checkbox', required: true },
      { id: 'weather_checked', label: 'Weather Conditions Verified Safe', type: 'checkbox', required: true },
    ],
  },
];

export interface PermitSubmission {
  id: string;
  permitTypeId: string;
  workOrderId: string;
  workOrderNumber: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  expiresAt?: string;
  formData: Record<string, unknown>;
  location?: string;
  equipment?: string;
}

export function generatePermitId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PRM-${timestamp}-${random}`;
}

export interface PPECategory {
  id: string;
  name: string;
}

export const PPE_CATEGORIES: PPECategory[] = [
  { id: 'head', name: 'Head Protection' },
  { id: 'eye', name: 'Eye & Face Protection' },
  { id: 'hearing', name: 'Hearing Protection' },
  { id: 'respiratory', name: 'Respiratory Protection' },
  { id: 'hand', name: 'Hand Protection' },
  { id: 'body', name: 'Body Protection' },
  { id: 'foot', name: 'Foot Protection' },
  { id: 'fall', name: 'Fall Protection' },
];

export interface PPEItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const PPE_ITEMS: PPEItem[] = [
  { id: 'hard-hat', name: 'Hard Hat', category: 'head', description: 'Class E hard hat for impact and electrical protection' },
  { id: 'bump-cap', name: 'Bump Cap', category: 'head', description: 'Light impact protection for low-clearance areas' },
  { id: 'safety-glasses', name: 'Safety Glasses', category: 'eye', description: 'ANSI Z87.1 rated safety glasses' },
  { id: 'safety-goggles', name: 'Safety Goggles', category: 'eye', description: 'Sealed goggles for chemical/dust protection' },
  { id: 'face-shield', name: 'Face Shield', category: 'eye', description: 'Full face protection for grinding/cutting' },
  { id: 'welding-helmet', name: 'Welding Helmet', category: 'eye', description: 'Auto-darkening welding helmet' },
  { id: 'ear-plugs', name: 'Ear Plugs', category: 'hearing', description: 'Disposable foam ear plugs (NRR 32)' },
  { id: 'ear-muffs', name: 'Ear Muffs', category: 'hearing', description: 'Over-ear hearing protection (NRR 25)' },
  { id: 'dust-mask', name: 'Dust Mask', category: 'respiratory', description: 'N95 disposable dust mask' },
  { id: 'half-mask', name: 'Half-Face Respirator', category: 'respiratory', description: 'Reusable half-mask respirator' },
  { id: 'full-mask', name: 'Full-Face Respirator', category: 'respiratory', description: 'Full-face air-purifying respirator' },
  { id: 'scba', name: 'SCBA', category: 'respiratory', description: 'Self-contained breathing apparatus' },
  { id: 'leather-gloves', name: 'Leather Gloves', category: 'hand', description: 'General purpose leather work gloves' },
  { id: 'nitrile-gloves', name: 'Nitrile Gloves', category: 'hand', description: 'Chemical-resistant nitrile gloves' },
  { id: 'cut-resistant', name: 'Cut-Resistant Gloves', category: 'hand', description: 'ANSI A4 cut-resistant gloves' },
  { id: 'welding-gloves', name: 'Welding Gloves', category: 'hand', description: 'Heat-resistant welding gloves' },
  { id: 'electrical-gloves', name: 'Electrical Gloves', category: 'hand', description: 'Class 00 electrical insulating gloves' },
  { id: 'hi-vis-vest', name: 'Hi-Vis Vest', category: 'body', description: 'Class 2 high-visibility safety vest' },
  { id: 'coveralls', name: 'Coveralls', category: 'body', description: 'Full-body protective coveralls' },
  { id: 'chemical-suit', name: 'Chemical Suit', category: 'body', description: 'Chemical-resistant protective suit' },
  { id: 'arc-flash-suit', name: 'Arc Flash Suit', category: 'body', description: 'Arc-rated flash suit (40 cal/cm²)' },
  { id: 'safety-shoes', name: 'Safety Shoes', category: 'foot', description: 'Steel-toe safety shoes' },
  { id: 'metatarsal-boots', name: 'Metatarsal Boots', category: 'foot', description: 'Boots with metatarsal protection' },
  { id: 'rubber-boots', name: 'Rubber Boots', category: 'foot', description: 'Chemical-resistant rubber boots' },
  { id: 'harness', name: 'Safety Harness', category: 'fall', description: 'Full-body fall arrest harness' },
  { id: 'lanyard', name: 'Shock-Absorbing Lanyard', category: 'fall', description: '6ft shock-absorbing lanyard' },
  { id: 'retractable', name: 'Self-Retracting Lifeline', category: 'fall', description: 'Self-retracting lifeline (SRL)' },
];

export interface WorkOrderSafety {
  lotoRequired: boolean;
  lotoSteps: LOTOStep[];
  permits: string[];
  permitNumbers: Record<string, string>;
  permitExpiry: Record<string, string>;
  ppeRequired: string[];
}

export interface WorkOrderTask {
  id: string;
  order: number;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface WorkOrderAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
  size?: number;
}

export interface DetailedWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: Exclude<WorkOrderStatus, 'overdue'>;
  type: 'corrective' | 'preventive' | 'emergency' | 'request';
  source: 'manual' | 'request' | 'pm_schedule' | 'task_feed';
  sourceId?: string;
  equipment?: string;
  equipmentId?: string;
  location: string;
  facility_id: string;
  requestedBy?: string;
  requestedAt?: string;
  assigned_to?: string;
  assignedName?: string;
  due_date: string;
  started_at?: string;
  completed_at?: string;
  estimatedHours?: number;
  actualHours?: number;
  safety: WorkOrderSafety;
  tasks: WorkOrderTask[];
  attachments: WorkOrderAttachment[];
  notes: string;
  completionNotes?: string;
  created_at: string;
  updated_at: string;
  workflow?: DepartmentWorkflow;
  currentDepartment?: DepartmentType;
  requiredDepartments?: DepartmentType[];
}

export const DEFAULT_SAFETY: WorkOrderSafety = {
  lotoRequired: false,
  lotoSteps: [],
  permits: [],
  permitNumbers: {},
  permitExpiry: {},
  ppeRequired: [],
};
