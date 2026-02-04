export type FailureCodeCategory = 'mechanical' | 'electrical' | 'pneumatic' | 'hydraulic' | 'pneumatic' | 'instrumentation' | 'structural' | 'process' | 'operator' | 'external' | 'environmental' | 'software' | 'other';

export interface FailureCode {
  id: string;
  code: string;
  name: string;
  description: string;
  category: FailureCodeCategory;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  commonCauses: string[];
  suggestedActions: string[];
  mttrHours?: number;
  isActive: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FailureCodeCategoryInfo {
  id: FailureCodeCategory;
  name: string;
  color: string;
  description?: string;
}

export const FAILURE_CODE_CATEGORIES: FailureCodeCategoryInfo[] = [
  { id: 'mechanical', name: 'Mechanical', color: '#3B82F6' },
  { id: 'electrical', name: 'Electrical', color: '#EF4444' },
  { id: 'pneumatic', name: 'Pneumatic', color: '#F59E0B' },
  { id: 'hydraulic', name: 'Hydraulic', color: '#8B5CF6' },
  { id: 'instrumentation', name: 'Instrumentation', color: '#14B8A6' },
  { id: 'structural', name: 'Structural', color: '#78716C' },
  { id: 'process', name: 'Process', color: '#0EA5E9' },
  { id: 'operator', name: 'Operator Error', color: '#EC4899' },
  { id: 'external', name: 'External', color: '#A855F7' },
  { id: 'environmental', name: 'Environmental', color: '#10B981' },
  { id: 'software', name: 'Software/Controls', color: '#6366F1' },
  { id: 'other', name: 'Other', color: '#6B7280' },
];

export interface RootCause {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface ActionTaken {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface FailureRecord {
  id: string;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId: string;
  equipmentName: string;
  failureCodeId: string;
  failureCode: string;
  rootCauseId?: string;
  rootCauseCode?: string;
  actionTakenId?: string;
  actionTakenCode?: string;
  failureDate: string;
  reportedBy: string;
  reportedByName: string;
  description: string;
  downtimeHours: number;
  repairHours: number;
  partsCost: number;
  laborCost: number;
  fiveWhys?: string[];
  correctiveActions?: string[];
  preventiveActions?: string[];
  isRecurring: boolean;
  previousFailureId?: string;
}

export interface EquipmentReliabilityMetrics {
  equipmentId: string;
  equipmentName: string;
  failureCount: number;
  totalDowntimeHours: number;
  totalRepairHours: number;
  totalOperatingHours: number;
  totalCost: number;
  mtbfHours: number;
  mtbfDays: number;
  mttrHours: number;
  availability: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ReliabilityTrendData {
  month: string;
  mtbf: number;
  mttr: number;
  availability: number;
  failures: number;
}

export interface OverallReliabilityStats {
  totalEquipment: number;
  totalFailures: number;
  avgMTBF: number;
  avgMTTR: number;
  avgAvailability: number;
  topPerformers: EquipmentReliabilityMetrics[];
  needsAttention: EquipmentReliabilityMetrics[];
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
}

export interface FailureStatsByCode {
  code: string;
  name: string;
  category: FailureCodeCategory;
  count: number;
  totalDowntime: number;
  totalCost: number;
}

export interface FailureStatsByEquipment {
  equipmentId: string;
  equipmentName: string;
  failureCount: number;
  downtimeHours: number;
  totalCost: number;
}

export const ROOT_CAUSES: RootCause[] = [];
export const ROOT_CAUSE_CATEGORIES: string[] = [];
export const ACTIONS_TAKEN: ActionTaken[] = [];
export const FAILURE_CODES: FailureCode[] = [];
export const FAILURE_RECORDS: FailureRecord[] = [];

export function calculateEquipmentReliability(equipmentId: string): EquipmentReliabilityMetrics | null {
  return null;
}

export function getAllEquipmentReliability(): EquipmentReliabilityMetrics[] {
  return [];
}

export function getOverallReliabilityStats(): OverallReliabilityStats {
  return {
    totalEquipment: 0,
    totalFailures: 0,
    avgMTBF: 0,
    avgMTTR: 0,
    avgAvailability: 100,
    topPerformers: [],
    needsAttention: [],
    totalDowntimeHours: 0,
    totalMaintenanceCost: 0,
  };
}

export function getReliabilityTrends(): ReliabilityTrendData[] {
  return [];
}

export function getFailureStatsByCode(): FailureStatsByCode[] {
  return [];
}

export function getFailureStatsByEquipment(): FailureStatsByEquipment[] {
  return [];
}
