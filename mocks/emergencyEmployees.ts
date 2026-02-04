export type EmployeeWorkArea = 'production' | 'warehouse' | 'office' | 'maintenance' | 'kiosk' | 'shipping';
export type EmployeeShift = '1st' | '2nd' | '3rd';

export interface EmergencyEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  workArea: EmployeeWorkArea;
  position: string;
  shift: EmployeeShift;
  isKioskUser: boolean;
  defaultAssemblyPoint: string;
  phoneNumber: string;
  emergencyContact: string;
  specialNeeds?: string;
}

export interface AssemblySector {
  id: string;
  name: string;
  code: string;
  description: string;
  capacity: number;
  location: string;
  color: string;
}

export const ASSEMBLY_SECTORS: AssemblySector[] = [
  {
    id: 'sector-1',
    name: 'Sector 1 - North Parking',
    code: 'S1',
    description: 'Primary assembly point for Production & Warehouse',
    capacity: 50,
    location: 'North Parking Lot - Near Flag Pole',
    color: '#3B82F6',
  },
  {
    id: 'sector-2',
    name: 'Sector 2 - South Lawn',
    code: 'S2',
    description: 'Primary assembly point for Office & Admin',
    capacity: 30,
    location: 'South Lawn - Near Picnic Tables',
    color: '#10B981',
  },
  {
    id: 'sector-3',
    name: 'Sector 3 - East Gate',
    code: 'S3',
    description: 'Primary assembly point for Maintenance & Shipping',
    capacity: 25,
    location: 'East Gate - Loading Dock Area',
    color: '#F59E0B',
  },
];

export const MOCK_EMERGENCY_EMPLOYEES: EmergencyEmployee[] = [
  {
    id: 'emp-001',
    employeeCode: 'E1001',
    firstName: 'Maria',
    lastName: 'Garcia',
    department: 'Production',
    workArea: 'production',
    position: 'Line Lead',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-1',
    phoneNumber: '555-0101',
    emergencyContact: 'Juan Garcia - 555-0102',
  },
  {
    id: 'emp-002',
    employeeCode: 'E1002',
    firstName: 'James',
    lastName: 'Wilson',
    department: 'Warehouse',
    workArea: 'warehouse',
    position: 'Forklift Operator',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-1',
    phoneNumber: '555-0103',
    emergencyContact: 'Sarah Wilson - 555-0104',
  },
  {
    id: 'emp-003',
    employeeCode: 'E1003',
    firstName: 'Linda',
    lastName: 'Chen',
    department: 'Office',
    workArea: 'office',
    position: 'HR Coordinator',
    shift: '1st',
    isKioskUser: false,
    defaultAssemblyPoint: 'sector-2',
    phoneNumber: '555-0105',
    emergencyContact: 'Michael Chen - 555-0106',
  },
  {
    id: 'emp-004',
    employeeCode: 'E1004',
    firstName: 'Robert',
    lastName: 'Martinez',
    department: 'Maintenance',
    workArea: 'maintenance',
    position: 'Maintenance Tech',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-3',
    phoneNumber: '555-0107',
    emergencyContact: 'Rosa Martinez - 555-0108',
  },
  {
    id: 'emp-005',
    employeeCode: 'E1005',
    firstName: 'Ashley',
    lastName: 'Johnson',
    department: 'Production',
    workArea: 'kiosk',
    position: 'Kiosk Operator',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-1',
    phoneNumber: '555-0109',
    emergencyContact: 'David Johnson - 555-0110',
  },
  {
    id: 'emp-006',
    employeeCode: 'E1006',
    firstName: 'Marcus',
    lastName: 'Thompson',
    department: 'Shipping',
    workArea: 'shipping',
    position: 'Shipping Clerk',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-3',
    phoneNumber: '555-0111',
    emergencyContact: 'Keisha Thompson - 555-0112',
  },
  {
    id: 'emp-007',
    employeeCode: 'E1007',
    firstName: 'Patricia',
    lastName: 'Brown',
    department: 'Office',
    workArea: 'office',
    position: 'Receptionist',
    shift: '1st',
    isKioskUser: false,
    defaultAssemblyPoint: 'sector-2',
    phoneNumber: '555-0113',
    emergencyContact: 'Tom Brown - 555-0114',
  },
  {
    id: 'emp-008',
    employeeCode: 'E1008',
    firstName: 'Kevin',
    lastName: 'Davis',
    department: 'Production',
    workArea: 'kiosk',
    position: 'Kiosk Operator',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-1',
    phoneNumber: '555-0115',
    emergencyContact: 'Lisa Davis - 555-0116',
    specialNeeds: 'Mobility assistance required',
  },
  {
    id: 'emp-009',
    employeeCode: 'E1009',
    firstName: 'Jennifer',
    lastName: 'Lee',
    department: 'Warehouse',
    workArea: 'warehouse',
    position: 'Inventory Specialist',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-1',
    phoneNumber: '555-0117',
    emergencyContact: 'Daniel Lee - 555-0118',
  },
  {
    id: 'emp-010',
    employeeCode: 'E1010',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    department: 'Maintenance',
    workArea: 'maintenance',
    position: 'Electrician',
    shift: '1st',
    isKioskUser: true,
    defaultAssemblyPoint: 'sector-3',
    phoneNumber: '555-0119',
    emergencyContact: 'Maria Rodriguez - 555-0120',
  },
];

export const getEmployeesBySector = (sectorId: string): EmergencyEmployee[] => {
  return MOCK_EMERGENCY_EMPLOYEES.filter(emp => emp.defaultAssemblyPoint === sectorId);
};

export const getKioskEmployees = (): EmergencyEmployee[] => {
  return MOCK_EMERGENCY_EMPLOYEES.filter(emp => emp.isKioskUser);
};

export const getSectorById = (sectorId: string): AssemblySector | undefined => {
  return ASSEMBLY_SECTORS.find(s => s.id === sectorId);
};
