export type HeadcountStatus = 'approved' | 'pending' | 'rejected' | 'on_hold' | 'filled';
export type PositionType = 'full_time' | 'part_time' | 'temporary' | 'contractor' | 'intern';

export interface HeadcountRequest {
  id: string;
  positionTitle: string;
  department: string;
  requestedBy: string;
  requestDate: string;
  status: HeadcountStatus;
  positionType: PositionType;
  justification: string;
  budgetedSalary: number;
  targetStartDate: string;
  approvedBy?: string;
  approvalDate?: string;
  filledDate?: string;
  notes?: string;
}

export const HEADCOUNT_STATUS_COLORS: Record<HeadcountStatus, string> = {
  approved: '#10B981',
  pending: '#F59E0B',
  rejected: '#EF4444',
  on_hold: '#8B5CF6',
  filled: '#3B82F6',
};

export const HEADCOUNT_STATUS_LABELS: Record<HeadcountStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  filled: 'Filled',
};

export const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  temporary: 'Temporary',
  contractor: 'Contractor',
  intern: 'Intern',
};

export const MOCK_HEADCOUNT_REQUESTS: HeadcountRequest[] = [];

export type PresenceStatus = 'onsite' | 'clocked_in' | 'on_break' | 'clocked_out' | 'absent_known' | 'absent_unknown';
export type EmergencyType = 'fire' | 'evacuation' | 'shelter' | 'lockdown' | 'drill';
export type AbsenceReason = 'pto' | 'sick' | 'fmla' | 'jury_duty' | 'bereavement' | 'other';

export interface EmergencyRoll {
  id: string;
  facilityId: string;
  facilityName: string;
  initiatedBy: string;
  initiatedByName: string;
  type: EmergencyType;
  status: 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  totalOnsite: number;
  accountedFor: number;
  unaccounted: number;
  evacuated: number;
  notes?: string;
  departments: {
    departmentCode: string;
    departmentName: string;
    managerName: string;
    total: number;
    accounted: number;
    unaccounted: number;
    absentKnown: number;
    evacuated: number;
  }[];
}

export interface GeofenceSetting {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  enabled: boolean;
}

export interface FacilityLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export const MOCK_EMERGENCY_ROLLS: EmergencyRoll[] = [];

export const MOCK_GEOFENCE_SETTINGS = {
  radiusMeters: 100,
  enabled: true,
};

export const MOCK_FACILITY_LOCATIONS: FacilityLocation[] = [
  {
    id: 'fac-001',
    name: 'Main Manufacturing Plant',
    address: '123 Industrial Way',
    latitude: 0,
    longitude: 0,
  },
];

export const getPresenceStatusColor = (status: PresenceStatus): string => {
  const colors: Record<PresenceStatus, string> = {
    onsite: '#10B981',
    clocked_in: '#3B82F6',
    on_break: '#F59E0B',
    clocked_out: '#6B7280',
    absent_known: '#8B5CF6',
    absent_unknown: '#EF4444',
  };
  return colors[status] || '#6B7280';
};

export const getPresenceStatusLabel = (status: PresenceStatus): string => {
  const labels: Record<PresenceStatus, string> = {
    onsite: 'On Site',
    clocked_in: 'Clocked In',
    on_break: 'On Break',
    clocked_out: 'Clocked Out',
    absent_known: 'Absent (Known)',
    absent_unknown: 'Absent (Unknown)',
  };
  return labels[status] || 'Unknown';
};

export const getEmergencyTypeLabel = (type: EmergencyType): string => {
  const labels: Record<EmergencyType, string> = {
    fire: 'Fire Alarm',
    evacuation: 'Evacuation',
    shelter: 'Shelter in Place',
    lockdown: 'Lockdown',
    drill: 'Drill',
  };
  return labels[type] || 'Unknown';
};

export const getEmergencyTypeColor = (type: EmergencyType): string => {
  const colors: Record<EmergencyType, string> = {
    fire: '#EF4444',
    evacuation: '#F59E0B',
    shelter: '#3B82F6',
    lockdown: '#8B5CF6',
    drill: '#10B981',
  };
  return colors[type] || '#6B7280';
};

export const getAbsenceReasonLabel = (reason: AbsenceReason): string => {
  const labels: Record<AbsenceReason, string> = {
    pto: 'PTO',
    sick: 'Sick Leave',
    fmla: 'FMLA',
    jury_duty: 'Jury Duty',
    bereavement: 'Bereavement',
    other: 'Other',
  };
  return labels[reason] || 'Unknown';
};

export const getAbsenceReasonColor = (reason: AbsenceReason): string => {
  const colors: Record<AbsenceReason, string> = {
    pto: '#3B82F6',
    sick: '#F59E0B',
    fmla: '#8B5CF6',
    jury_duty: '#06B6D4',
    bereavement: '#6B7280',
    other: '#9CA3AF',
  };
  return colors[reason] || '#6B7280';
};
