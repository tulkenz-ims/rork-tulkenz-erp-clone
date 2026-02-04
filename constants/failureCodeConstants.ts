export type FailureCodeCategory = 
  | 'mechanical'
  | 'electrical'
  | 'hydraulic'
  | 'pneumatic'
  | 'instrumentation'
  | 'structural'
  | 'process'
  | 'operator'
  | 'external';

export interface FailureCodeCategoryInfo {
  id: FailureCodeCategory;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const FAILURE_CODE_CATEGORIES: FailureCodeCategoryInfo[] = [
  { id: 'mechanical', name: 'Mechanical', description: 'Mechanical component failures', color: '#3B82F6', icon: 'Cog' },
  { id: 'electrical', name: 'Electrical', description: 'Electrical system failures', color: '#F59E0B', icon: 'Zap' },
  { id: 'hydraulic', name: 'Hydraulic', description: 'Hydraulic system failures', color: '#8B5CF6', icon: 'Droplets' },
  { id: 'pneumatic', name: 'Pneumatic', description: 'Pneumatic system failures', color: '#06B6D4', icon: 'Wind' },
  { id: 'instrumentation', name: 'Instrumentation', description: 'Sensor and control failures', color: '#10B981', icon: 'Gauge' },
  { id: 'structural', name: 'Structural', description: 'Frame and structural failures', color: '#6B7280', icon: 'Box' },
  { id: 'process', name: 'Process', description: 'Process-related failures', color: '#EC4899', icon: 'GitBranch' },
  { id: 'operator', name: 'Operator Error', description: 'Human error related failures', color: '#EF4444', icon: 'User' },
  { id: 'external', name: 'External', description: 'External factors (power, environment)', color: '#78716C', icon: 'Cloud' },
] as const;

export type FailureCodeSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export const FAILURE_CODE_SEVERITIES: { value: FailureCodeSeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Minor', color: '#10B981' },
  { value: 'moderate', label: 'Moderate', color: '#F59E0B' },
  { value: 'major', label: 'Major', color: '#F97316' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
] as const;
