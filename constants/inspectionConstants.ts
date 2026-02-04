export type InspectionType = 
  | 'pre_op'
  | 'post_op'
  | 'safety'
  | 'quality'
  | 'sanitation'
  | 'equipment'
  | 'gmp'
  | 'environmental';

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type InspectionResult = 'pass' | 'fail' | 'conditional' | 'na';

export interface Inspection {
  id: string;
  inspectionNumber: string;
  type: InspectionType;
  title: string;
  description?: string;
  area: string;
  equipment?: string;
  scheduledDate: string;
  completedDate?: string;
  inspector?: string;
  status: InspectionStatus;
  result?: InspectionResult;
  score?: number;
  findings?: string[];
  correctiveActions?: string[];
}

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  pre_op: 'Pre-Operation',
  post_op: 'Post-Operation',
  safety: 'Safety',
  quality: 'Quality',
  sanitation: 'Sanitation',
  equipment: 'Equipment',
  gmp: 'GMP',
  environmental: 'Environmental',
};

export const INSPECTION_TYPE_COLORS: Record<InspectionType, string> = {
  pre_op: '#3B82F6',
  post_op: '#8B5CF6',
  safety: '#EF4444',
  quality: '#10B981',
  sanitation: '#06B6D4',
  equipment: '#F59E0B',
  gmp: '#EC4899',
  environmental: '#14B8A6',
};

export const INSPECTION_STATUS_COLORS: Record<InspectionStatus, string> = {
  scheduled: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  failed: '#EF4444',
  cancelled: '#6B7280',
};

export const INSPECTION_RESULT_COLORS: Record<InspectionResult, string> = {
  pass: '#10B981',
  fail: '#EF4444',
  conditional: '#F59E0B',
  na: '#6B7280',
};

export const MOCK_INSPECTIONS: Inspection[] = [];

export type InspectionFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface InspectionField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date';
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  fields: InspectionField[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackedItem {
  id: string;
  templateId: string;
  name: string;
  location: string;
  identifier: string;
  lastInspection?: string;
  nextInspection?: string;
  status: 'active' | 'inactive' | 'retired';
}

export interface InspectionSchedule {
  id: string;
  templateId: string;
  itemId?: string;
  frequency: InspectionFrequency;
  dayOfWeek?: DayOfWeek;
  dayOfMonth?: number;
  time?: string;
  assignedTo?: string;
  lastCompleted?: string;
  nextDue: string;
  active: boolean;
}

export const INSPECTION_CATEGORIES = [
  { key: 'safety', label: 'Safety', icon: 'Shield', color: '#EF4444' },
  { key: 'quality', label: 'Quality', icon: 'Award', color: '#10B981' },
  { key: 'sanitation', label: 'Sanitation', icon: 'ClipboardCheck', color: '#06B6D4' },
  { key: 'equipment', label: 'Equipment', icon: 'Settings', color: '#F59E0B' },
  { key: 'environmental', label: 'Environmental', icon: 'Thermometer', color: '#14B8A6' },
  { key: 'gmp', label: 'GMP', icon: 'FileCheck', color: '#EC4899' },
];

export const FREQUENCY_OPTIONS: { key: InspectionFrequency; label: string; days: number }[] = [
  { key: 'daily', label: 'Daily', days: 1 },
  { key: 'weekly', label: 'Weekly', days: 7 },
  { key: 'biweekly', label: 'Bi-Weekly', days: 14 },
  { key: 'monthly', label: 'Monthly', days: 30 },
  { key: 'quarterly', label: 'Quarterly', days: 90 },
  { key: 'annually', label: 'Annually', days: 365 },
];

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];
