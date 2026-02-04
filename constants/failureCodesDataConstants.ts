import { 
  FailureCodeCategory, 
  FailureCodeSeverity,
  FAILURE_CODE_CATEGORIES,
  FAILURE_CODE_SEVERITIES 
} from './failureCodeConstants';

export { 
  FAILURE_CODE_CATEGORIES, 
  FAILURE_CODE_SEVERITIES,
  type FailureCodeCategory,
  type FailureCodeSeverity,
};

export interface FailureCode {
  id: string;
  code: string;
  name: string;
  description: string;
  category: FailureCodeCategory;
  severity: FailureCodeSeverity;
  commonCauses: string[];
  recommendedActions: string[];
  averageRepairTime: number;
  isActive: boolean;
}

export interface FailureRecord {
  id: string;
  failureCodeId: string;
  failureCode: string;
  equipmentId: string;
  equipmentName: string;
  workOrderId?: string;
  occurredAt: string;
  resolvedAt?: string;
  downtime: number;
  rootCause?: string;
  correctiveAction?: string;
  reportedBy: string;
  reportedByName: string;
  resolvedBy?: string;
  repairHours: number;
  partsCost: number;
  laborCost: number;
}

export const FAILURE_CODES: FailureCode[] = [
  {
    id: 'fc-001',
    code: 'M-BRG-001',
    name: 'Bearing Failure',
    description: 'Bearing seized or excessively worn',
    category: 'mechanical',
    severity: 'major',
    commonCauses: ['Lack of lubrication', 'Overloading', 'Contamination', 'Misalignment'],
    recommendedActions: ['Replace bearing', 'Check alignment', 'Verify lubrication schedule'],
    averageRepairTime: 2.5,
    isActive: true,
  },
  {
    id: 'fc-002',
    code: 'M-BLT-001',
    name: 'Belt Wear/Failure',
    description: 'Drive belt worn, cracked, or broken',
    category: 'mechanical',
    severity: 'moderate',
    commonCauses: ['Normal wear', 'Misalignment', 'Over-tensioning', 'Age'],
    recommendedActions: ['Replace belt', 'Check tension', 'Verify pulley alignment'],
    averageRepairTime: 1.5,
    isActive: true,
  },
  {
    id: 'fc-003',
    code: 'E-MTR-001',
    name: 'Motor Overheating',
    description: 'Electric motor running hot or tripping thermal protection',
    category: 'electrical',
    severity: 'major',
    commonCauses: ['Overloading', 'Poor ventilation', 'Voltage imbalance', 'Bearing failure'],
    recommendedActions: ['Check load', 'Clean motor', 'Verify voltage', 'Check bearings'],
    averageRepairTime: 3.0,
    isActive: true,
  },
  {
    id: 'fc-004',
    code: 'E-SEN-001',
    name: 'Sensor Malfunction',
    description: 'Sensor giving erratic or no readings',
    category: 'instrumentation',
    severity: 'moderate',
    commonCauses: ['Wiring issues', 'Calibration drift', 'Physical damage', 'EMI'],
    recommendedActions: ['Check wiring', 'Recalibrate', 'Replace sensor if needed'],
    averageRepairTime: 1.0,
    isActive: true,
  },
  {
    id: 'fc-005',
    code: 'H-LEK-001',
    name: 'Hydraulic Leak',
    description: 'Hydraulic fluid leaking from system',
    category: 'hydraulic',
    severity: 'major',
    commonCauses: ['Seal failure', 'Hose damage', 'Connection loose', 'Corrosion'],
    recommendedActions: ['Identify leak source', 'Replace seals/hoses', 'Tighten connections'],
    averageRepairTime: 2.0,
    isActive: true,
  },
  {
    id: 'fc-006',
    code: 'P-AIR-001',
    name: 'Air Leak',
    description: 'Pneumatic system losing pressure due to air leak',
    category: 'pneumatic',
    severity: 'minor',
    commonCauses: ['Fitting loose', 'Hose damage', 'Seal wear', 'Connection failure'],
    recommendedActions: ['Locate leak', 'Tighten fittings', 'Replace damaged components'],
    averageRepairTime: 0.5,
    isActive: true,
  },
  {
    id: 'fc-007',
    code: 'O-ERR-001',
    name: 'Operator Error',
    description: 'Equipment failure due to improper operation',
    category: 'operator',
    severity: 'moderate',
    commonCauses: ['Lack of training', 'Procedural violation', 'Inattention'],
    recommendedActions: ['Retrain operator', 'Review procedures', 'Update documentation'],
    averageRepairTime: 0.5,
    isActive: true,
  },
  {
    id: 'fc-008',
    code: 'X-PWR-001',
    name: 'Power Failure',
    description: 'Loss of electrical power to equipment',
    category: 'external',
    severity: 'critical',
    commonCauses: ['Grid failure', 'Breaker trip', 'UPS failure', 'Storm damage'],
    recommendedActions: ['Check power source', 'Reset breakers', 'Verify UPS status'],
    averageRepairTime: 0.5,
    isActive: true,
  },
];

export const MOCK_FAILURE_RECORDS: FailureRecord[] = [
  {
    id: 'fr-001',
    failureCodeId: 'fc-001',
    failureCode: 'M-BRG-001',
    equipmentId: 'eq-001',
    equipmentName: 'Mixer #1',
    workOrderId: 'wo-001',
    occurredAt: '2024-01-15T10:30:00Z',
    resolvedAt: '2024-01-15T14:00:00Z',
    downtime: 3.5,
    rootCause: 'Bearing ran dry due to missed lubrication',
    correctiveAction: 'Replaced bearing and updated PM schedule',
    reportedBy: 'emp-001',
    reportedByName: 'John Smith',
    resolvedBy: 'Mike Johnson',
    repairHours: 3.5,
    partsCost: 150.00,
    laborCost: 175.00,
  },
];
