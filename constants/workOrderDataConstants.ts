export type DepartmentType = 'maintenance' | 'safety' | 'quality' | 'compliance' | 'calibration';

export interface Department {
  id: DepartmentType;
  name: string;
  color: string;
  icon: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 'maintenance', name: 'Maintenance', color: '#3B82F6', icon: 'Wrench' },
  { id: 'safety', name: 'Safety', color: '#EF4444', icon: 'ShieldAlert' },
  { id: 'quality', name: 'Quality', color: '#10B981', icon: 'CheckCircle2' },
  { id: 'compliance', name: 'Compliance', color: '#8B5CF6', icon: 'FileCheck' },
  { id: 'calibration', name: 'Calibration', color: '#F59E0B', icon: 'Gauge' },
];

export const WORK_ORDER_TYPES = [
  { id: 'corrective', name: 'Corrective', description: 'Repair or fix a breakdown', color: '#EF4444' },
  { id: 'preventive', name: 'Preventive', description: 'Scheduled maintenance', color: '#3B82F6' },
  { id: 'emergency', name: 'Emergency', description: 'Urgent work needed', color: '#DC2626' },
  { id: 'request', name: 'Request', description: 'Service request', color: '#8B5CF6' },
] as const;

export const PERMIT_TYPES = [
  { id: 'hot_work', name: 'Hot Work Permit', description: 'Welding, cutting, brazing', color: '#EF4444', icon: 'Flame' },
  { id: 'confined_space', name: 'Confined Space Entry', description: 'Tanks, vessels, pits', color: '#F59E0B', icon: 'Box' },
  { id: 'electrical', name: 'Electrical Work', description: 'High voltage work', color: '#3B82F6', icon: 'Zap' },
  { id: 'excavation', name: 'Excavation', description: 'Digging, trenching', color: '#8B5CF6', icon: 'Shovel' },
  { id: 'roof_access', name: 'Roof Access', description: 'Work on rooftops', color: '#06B6D4', icon: 'Home' },
  { id: 'working_at_height', name: 'Working at Height', description: 'Elevated work platforms', color: '#10B981', icon: 'ArrowUp' },
] as const;

export const PPE_CATEGORIES = [
  { id: 'head', name: 'Head Protection', icon: 'HardHat' },
  { id: 'eye', name: 'Eye Protection', icon: 'Eye' },
  { id: 'ear', name: 'Hearing Protection', icon: 'Headphones' },
  { id: 'respiratory', name: 'Respiratory Protection', icon: 'Wind' },
  { id: 'hand', name: 'Hand Protection', icon: 'Hand' },
  { id: 'body', name: 'Body Protection', icon: 'Shirt' },
  { id: 'foot', name: 'Foot Protection', icon: 'Footprints' },
  { id: 'fall', name: 'Fall Protection', icon: 'Shield' },
] as const;

export const PPE_ITEMS = [
  { id: 'hard_hat', name: 'Hard Hat', category: 'head', required: false },
  { id: 'bump_cap', name: 'Bump Cap', category: 'head', required: false },
  { id: 'safety_glasses', name: 'Safety Glasses', category: 'eye', required: true },
  { id: 'goggles', name: 'Chemical Goggles', category: 'eye', required: false },
  { id: 'face_shield', name: 'Face Shield', category: 'eye', required: false },
  { id: 'ear_plugs', name: 'Ear Plugs', category: 'ear', required: false },
  { id: 'ear_muffs', name: 'Ear Muffs', category: 'ear', required: false },
  { id: 'dust_mask', name: 'Dust Mask', category: 'respiratory', required: false },
  { id: 'n95_respirator', name: 'N95 Respirator', category: 'respiratory', required: false },
  { id: 'half_face_respirator', name: 'Half-Face Respirator', category: 'respiratory', required: false },
  { id: 'full_face_respirator', name: 'Full-Face Respirator', category: 'respiratory', required: false },
  { id: 'leather_gloves', name: 'Leather Gloves', category: 'hand', required: false },
  { id: 'nitrile_gloves', name: 'Nitrile Gloves', category: 'hand', required: false },
  { id: 'cut_resistant_gloves', name: 'Cut-Resistant Gloves', category: 'hand', required: false },
  { id: 'chemical_gloves', name: 'Chemical Gloves', category: 'hand', required: false },
  { id: 'welding_gloves', name: 'Welding Gloves', category: 'hand', required: false },
  { id: 'safety_vest', name: 'Safety Vest', category: 'body', required: false },
  { id: 'coveralls', name: 'Coveralls', category: 'body', required: false },
  { id: 'apron', name: 'Apron', category: 'body', required: false },
  { id: 'welding_jacket', name: 'Welding Jacket', category: 'body', required: false },
  { id: 'steel_toe_boots', name: 'Steel Toe Boots', category: 'foot', required: true },
  { id: 'metatarsal_boots', name: 'Metatarsal Boots', category: 'foot', required: false },
  { id: 'rubber_boots', name: 'Rubber Boots', category: 'foot', required: false },
  { id: 'safety_harness', name: 'Safety Harness', category: 'fall', required: false },
  { id: 'lanyard', name: 'Lanyard', category: 'fall', required: false },
  { id: 'retractable_lifeline', name: 'Retractable Lifeline', category: 'fall', required: false },
] as const;

export interface LOTOStep {
  id: string;
  order: number;
  description: string;
  energySource: string;
  lockLocation: string;
  verificationMethod: string;
  lockColor?: string;
  completed?: boolean;
  completedBy?: string;
  completedAt?: string;
}

export const DEFAULT_LOTO_STEPS: LOTOStep[] = [
  {
    id: 'loto-1',
    order: 1,
    description: 'Notify affected employees',
    energySource: 'N/A',
    lockLocation: 'N/A',
    verificationMethod: 'Verbal confirmation',
  },
  {
    id: 'loto-2',
    order: 2,
    description: 'Shut down equipment using normal stopping procedure',
    energySource: 'Electrical',
    lockLocation: 'Control panel',
    verificationMethod: 'Equipment stops',
  },
  {
    id: 'loto-3',
    order: 3,
    description: 'Isolate energy source at main disconnect',
    energySource: 'Electrical',
    lockLocation: 'Main breaker panel',
    verificationMethod: 'Breaker in OFF position',
  },
  {
    id: 'loto-4',
    order: 4,
    description: 'Apply lockout device and personal lock',
    energySource: 'Electrical',
    lockLocation: 'Main breaker',
    verificationMethod: 'Lock secured',
  },
  {
    id: 'loto-5',
    order: 5,
    description: 'Release stored energy',
    energySource: 'Pneumatic/Hydraulic',
    lockLocation: 'Pressure relief valve',
    verificationMethod: 'Gauge reads zero',
  },
  {
    id: 'loto-6',
    order: 6,
    description: 'Verify zero energy state',
    energySource: 'All',
    lockLocation: 'Equipment',
    verificationMethod: 'Try-start procedure',
  },
];

export const ENERGY_SOURCES = [
  { id: 'electrical', name: 'Electrical', color: '#F59E0B', icon: 'Zap' },
  { id: 'pneumatic', name: 'Pneumatic', color: '#06B6D4', icon: 'Wind' },
  { id: 'hydraulic', name: 'Hydraulic', color: '#8B5CF6', icon: 'Droplets' },
  { id: 'mechanical', name: 'Mechanical', color: '#3B82F6', icon: 'Cog' },
  { id: 'thermal', name: 'Thermal', color: '#EF4444', icon: 'Thermometer' },
  { id: 'chemical', name: 'Chemical', color: '#10B981', icon: 'FlaskConical' },
  { id: 'gravity', name: 'Gravitational', color: '#6B7280', icon: 'ArrowDown' },
] as const;

export const LOCK_COLORS = [
  { id: 'red', name: 'Red', hex: '#DC2626' },
  { id: 'blue', name: 'Blue', hex: '#2563EB' },
  { id: 'green', name: 'Green', hex: '#16A34A' },
  { id: 'yellow', name: 'Yellow', hex: '#CA8A04' },
  { id: 'orange', name: 'Orange', hex: '#EA580C' },
  { id: 'purple', name: 'Purple', hex: '#9333EA' },
] as const;

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export interface DetailedWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  equipment: string;
  equipmentId: string;
  location: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  type: string;
  assignedTo?: string;
  requestedBy?: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export const MOCK_DETAILED_WORK_ORDERS: DetailedWorkOrder[] = [
  {
    id: 'wo-001',
    workOrderNumber: 'WO-2024-001',
    title: 'Replace conveyor belt motor',
    description: 'Motor showing signs of wear, replace before failure',
    equipment: 'Conveyor Belt A',
    equipmentId: 'eq-002',
    location: 'Production Line 1',
    priority: 'high',
    status: 'in_progress',
    type: 'corrective',
    assignedTo: 'John Smith',
    requestedBy: 'Production Manager',
    createdAt: '2024-01-15T08:00:00Z',
    dueDate: '2024-01-20T17:00:00Z',
    estimatedHours: 4,
  },
  {
    id: 'wo-002',
    workOrderNumber: 'WO-2024-002',
    title: 'Monthly PM - Mixer #1',
    description: 'Perform monthly preventive maintenance checklist',
    equipment: 'Mixer #1',
    equipmentId: 'eq-001',
    location: 'Production Line 1',
    priority: 'medium',
    status: 'open',
    type: 'preventive',
    assignedTo: 'Mike Johnson',
    createdAt: '2024-01-10T08:00:00Z',
    dueDate: '2024-01-25T17:00:00Z',
    estimatedHours: 2,
  },
];

let workOrderCounter = 100;

export function generateWorkOrderNumber(): string {
  workOrderCounter++;
  const year = new Date().getFullYear();
  return `WO-${year}-${workOrderCounter.toString().padStart(4, '0')}`;
}
