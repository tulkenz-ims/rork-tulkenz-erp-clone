export interface Department {
  code: string;
  name: string;
  color: string;
  costCenterPrefix: string;
  glAccountPrefix: string;
  parentDepartment?: string;
}

export interface CostCenter {
  code: string;
  name: string;
  departmentCode: string;
  facilityCode?: string;
  active: boolean;
}

export interface FacilityCode {
  code: string;
  name: string;
  address?: string;
  active: boolean;
}

export interface GLAccount {
  code: string;
  name: string;
  type: 'expense' | 'asset' | 'liability' | 'revenue';
  departmentCode?: string;
  active: boolean;
}

// Department codes aligned with inventory material numbering system
// Facility-based numbering: Facility# + BaseCode (3 digits)
// e.g., Facility 1 Maintenance = 1001, Facility 2 Maintenance = 2001
// Material numbers: Facility# + 6 digits (e.g., 1000001 = Facility 1, Maintenance)
export const DEPARTMENT_CODES: Record<string, Department> = {
  '1000': {
    code: '1000',
    name: 'Projects / Offices',
    color: '#6B7280',
    costCenterPrefix: 'CC-PROJ',
    glAccountPrefix: '5800',
  },
  '1001': {
    code: '1001',
    name: 'Maintenance',
    color: '#3B82F6',
    costCenterPrefix: 'CC-MAINT',
    glAccountPrefix: '5000',
  },
  '1002': {
    code: '1002',
    name: 'Sanitation',
    color: '#10B981',
    costCenterPrefix: 'CC-SANI',
    glAccountPrefix: '5100',
  },
  '1003': {
    code: '1003',
    name: 'Production',
    color: '#F59E0B',
    costCenterPrefix: 'CC-PROD',
    glAccountPrefix: '5200',
  },
  '1004': {
    code: '1004',
    name: 'Quality',
    color: '#8B5CF6',
    costCenterPrefix: 'CC-QUAL',
    glAccountPrefix: '5300',
  },
  '1005': {
    code: '1005',
    name: 'Safety',
    color: '#EF4444',
    costCenterPrefix: 'CC-SAFE',
    glAccountPrefix: '5400',
  },
  '1006': {
    code: '1006',
    name: 'HR',
    color: '#EC4899',
    costCenterPrefix: 'CC-HR',
    glAccountPrefix: '5500',
  },
  '1008': {
    code: '1008',
    name: 'Warehouse',
    color: '#84CC16',
    costCenterPrefix: 'CC-WARE',
    glAccountPrefix: '5700',
  },
  '1009': {
    code: '1009',
    name: 'IT / Technology',
    color: '#06B6D4',
    costCenterPrefix: 'CC-IT',
    glAccountPrefix: '5850',
  },
  '1010': {
    code: '1010',
    name: 'Facilities',
    color: '#A855F7',
    costCenterPrefix: 'CC-FAC',
    glAccountPrefix: '5900',
  },
};

export const FACILITY_CODES: FacilityCode[] = [
  {
    code: 'FAC-001',
    name: 'Main Warehouse',
    address: '123 Industrial Blvd',
    active: true,
  },
  {
    code: 'FAC-002',
    name: 'Distribution Center',
    address: '456 Logistics Way',
    active: true,
  },
  {
    code: 'FAC-003',
    name: 'Production Plant A',
    address: '789 Manufacturing Dr',
    active: true,
  },
  {
    code: 'FAC-004',
    name: 'Corporate Office',
    address: '100 Corporate Plaza',
    active: true,
  },
];

export const COST_CENTERS: CostCenter[] = [
  { code: 'CC-PROJ-001', name: 'Projects / Offices - Corporate', departmentCode: '1000', facilityCode: 'FAC-004', active: true },
  { code: 'CC-MAINT-001', name: 'Maintenance - Main Warehouse', departmentCode: '1001', facilityCode: 'FAC-001', active: true },
  { code: 'CC-MAINT-002', name: 'Maintenance - Distribution Center', departmentCode: '1001', facilityCode: 'FAC-002', active: true },
  { code: 'CC-MAINT-003', name: 'Maintenance - Production Plant A', departmentCode: '1001', facilityCode: 'FAC-003', active: true },
  { code: 'CC-SANI-001', name: 'Sanitation - Main Warehouse', departmentCode: '1002', facilityCode: 'FAC-001', active: true },
  { code: 'CC-SANI-002', name: 'Sanitation - Distribution Center', departmentCode: '1002', facilityCode: 'FAC-002', active: true },
  { code: 'CC-SANI-003', name: 'Sanitation - Production Plant A', departmentCode: '1002', facilityCode: 'FAC-003', active: true },
  { code: 'CC-PROD-001', name: 'Production - Line 1', departmentCode: '1003', facilityCode: 'FAC-003', active: true },
  { code: 'CC-PROD-002', name: 'Production - Line 2', departmentCode: '1003', facilityCode: 'FAC-003', active: true },
  { code: 'CC-QUAL-001', name: 'Quality Assurance', departmentCode: '1004', facilityCode: 'FAC-003', active: true },
  { code: 'CC-SAFE-001', name: 'Safety - All Facilities', departmentCode: '1005', active: true },
  { code: 'CC-HR-001', name: 'HR - Corporate', departmentCode: '1006', facilityCode: 'FAC-004', active: true },
  { code: 'CC-WARE-001', name: 'Warehouse Operations', departmentCode: '1008', facilityCode: 'FAC-001', active: true },
  { code: 'CC-IT-001', name: 'IT / Technology', departmentCode: '1009', facilityCode: 'FAC-004', active: true },
  { code: 'CC-FAC-001', name: 'Facilities - All Sites', departmentCode: '1010', active: true },
];

export const GL_ACCOUNTS: GLAccount[] = [
  { code: '5800-100', name: 'Projects / Offices - Supplies', type: 'expense', departmentCode: '1000', active: true },
  { code: '5800-200', name: 'Projects / Offices - Equipment', type: 'expense', departmentCode: '1000', active: true },
  { code: '5000-100', name: 'Maintenance - Parts & Supplies', type: 'expense', departmentCode: '1001', active: true },
  { code: '5000-200', name: 'Maintenance - Contract Services', type: 'expense', departmentCode: '1001', active: true },
  { code: '5000-300', name: 'Maintenance - Equipment Repair', type: 'expense', departmentCode: '1001', active: true },
  { code: '5100-100', name: 'Sanitation - Supplies', type: 'expense', departmentCode: '1002', active: true },
  { code: '5100-200', name: 'Sanitation - Contract Services', type: 'expense', departmentCode: '1002', active: true },
  { code: '5200-100', name: 'Production - Raw Materials', type: 'expense', departmentCode: '1003', active: true },
  { code: '5200-200', name: 'Production - Consumables', type: 'expense', departmentCode: '1003', active: true },
  { code: '5300-100', name: 'Quality - Testing Supplies', type: 'expense', departmentCode: '1004', active: true },
  { code: '5300-200', name: 'Quality - Lab Equipment', type: 'expense', departmentCode: '1004', active: true },
  { code: '5400-100', name: 'Safety - PPE', type: 'expense', departmentCode: '1005', active: true },
  { code: '5400-200', name: 'Safety - Training', type: 'expense', departmentCode: '1005', active: true },
  { code: '5500-100', name: 'HR - Supplies', type: 'expense', departmentCode: '1006', active: true },
  { code: '5500-200', name: 'HR - Training Materials', type: 'expense', departmentCode: '1006', active: true },
  { code: '5700-100', name: 'Warehouse - Supplies', type: 'expense', departmentCode: '1008', active: true },
  { code: '5700-200', name: 'Warehouse - Equipment', type: 'expense', departmentCode: '1008', active: true },
  { code: '5850-100', name: 'IT - Hardware', type: 'expense', departmentCode: '1009', active: true },
  { code: '5850-200', name: 'IT - Software & Services', type: 'expense', departmentCode: '1009', active: true },
  { code: '5900-100', name: 'Facilities - Building Materials', type: 'expense', departmentCode: '1010', active: true },
  { code: '5900-200', name: 'Facilities - HVAC & Plumbing', type: 'expense', departmentCode: '1010', active: true },
];

export const getDepartmentByCode = (code: string): Department | undefined => {
  return DEPARTMENT_CODES[code];
};

export const getDepartmentName = (code: string): string => {
  return DEPARTMENT_CODES[code]?.name || 'Unknown Department';
};

export const getDepartmentColor = (code: string): string => {
  return DEPARTMENT_CODES[code]?.color || '#6B7280';
};

export const getFacilityByCode = (code: string): FacilityCode | undefined => {
  return FACILITY_CODES.find(f => f.code === code);
};

export const getFacilityName = (code: string): string => {
  return FACILITY_CODES.find(f => f.code === code)?.name || 'Unknown Facility';
};

export const getCostCentersByDepartment = (departmentCode: string): CostCenter[] => {
  return COST_CENTERS.filter(cc => cc.departmentCode === departmentCode && cc.active);
};

export const getCostCentersByFacility = (facilityCode: string): CostCenter[] => {
  return COST_CENTERS.filter(cc => cc.facilityCode === facilityCode && cc.active);
};

export const getGLAccountsByDepartment = (departmentCode: string): GLAccount[] => {
  return GL_ACCOUNTS.filter(gl => gl.departmentCode === departmentCode && gl.active);
};

export const getAllDepartments = (): Department[] => {
  return Object.values(DEPARTMENT_CODES);
};

export const getAllActiveFacilities = (): FacilityCode[] => {
  return FACILITY_CODES.filter(f => f.active);
};

export const getAllActiveCostCenters = (): CostCenter[] => {
  return COST_CENTERS.filter(cc => cc.active);
};

export const getAllActiveGLAccounts = (): GLAccount[] => {
  return GL_ACCOUNTS.filter(gl => gl.active);
};
