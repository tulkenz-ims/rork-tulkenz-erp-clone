export type PresenceStatus = 'clocked_in' | 'on_break' | 'clocked_out' | 'not_arrived' | 'missing' | 'absent';
export type EmployeeType = 'hourly' | 'salaried';
export type EmergencyStatus = 'normal' | 'drill' | 'emergency';
export type AccountabilityStatus = 'accounted' | 'unaccounted' | 'evacuated' | 'missing' | 'absent_known';
export type AbsenceReason = 'vacation' | 'sick' | 'fmla' | 'personal' | 'bereavement' | 'jury_duty' | 'suspended' | 'other';
export type ClockEventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
export type ClockMethod = 'kiosk' | 'qr_code' | 'manual' | 'geo_auto';

export interface FacilityLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  isActive: boolean;
}

export interface ClockEvent {
  id: string;
  employeeId: string;
  type: ClockEventType;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  locationVerified: boolean;
  method: ClockMethod;
  facilityId: string;
  notes?: string;
}

export interface EmployeePresence {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentCode: string;
  departmentName: string;
  facilityId: string;
  employeeType: EmployeeType;
  position: string;
  managerId?: string;
  managerName?: string;
  presenceStatus: PresenceStatus;
  lastClockIn?: string;
  lastClockOut?: string;
  lastBreakStart?: string;
  lastBreakEnd?: string;
  currentShiftStart?: string;
  currentShiftEnd?: string;
  hoursToday: number;
  isOnsite: boolean;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  accountabilityStatus: AccountabilityStatus;
  absenceReason?: AbsenceReason;
  absenceNote?: string;
  expectedReturnDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  photoUrl?: string;
}

export interface DepartmentHeadcount {
  departmentCode: string;
  departmentName: string;
  managerId: string;
  managerName: string;
  totalEmployees: number;
  clockedIn: number;
  onBreak: number;
  clockedOut: number;
  notArrived: number;
  missing: number;
  absentKnown: number;
  accountedFor: number;
  unaccounted: number;
  complianceRate: number;
}

export interface HeadcountSummary {
  facilityId: string;
  facilityName: string;
  totalEmployees: number;
  clockedIn: number;
  onBreak: number;
  clockedOut: number;
  notArrived: number;
  missing: number;
  absentKnown: number;
  accountedFor: number;
  unaccounted: number;
  emergencyStatus: EmergencyStatus;
  lastUpdated: string;
}
