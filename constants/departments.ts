// Multi-Facility Department & Material Configuration
// 
// NUMBERING SYSTEM:
// 
// MATERIALS ARE GLOBAL (Organization-wide):
// - Material Code: [DepartmentPrefix][6 digits] (e.g., 1000001 = Maintenance item #1)
// - The SAME material number is used across ALL facilities
// - Material 1000001 "Compressor XYZ" is the same part everywhere
// - Department prefix (0-9) identifies the department/category
// 
// FACILITY STOCK IS FACILITY-SPECIFIC:
// - Each facility tracks its own stock levels for global materials
// - Facility 1 may have 5 units of 1000001, Facility 2 may have 12 units
// - Stock identifier: [FacilityNumber]-[MaterialNumber] (e.g., 1-1000001, 2-1000001)
// 
// DEPARTMENTS:
// - Department Code: [FacilityNumber][BaseCode] (e.g., F1: 1001, F2: 2001)
// - GL codes are shared across facilities
// 
// SCALABILITY:
// - Facility Number: 1-9 standard, 10-99 for large organizations
// - If a department exhausts 999,999 items, use extended format: [Dept]-[Sequence]
//   e.g., 1-1000001 for Maintenance when standard numbers are exhausted

export interface BaseDepartment {
  id: string;
  baseCode: number; // 0-10 base department code
  name: string;
  shortName: string;
  glCodePrefix: string; // 4-digit GL code prefix (shared across all facilities)
  color: string;
  inventoryCode: number; // 0-9 for materials (first digit of material number)
  costCenterPrefix: string;
  isActive: boolean;
  sortOrder: number;
}

export interface FacilityDepartment extends BaseDepartment {
  facilityNumber: number;
  departmentCode: string; // Computed: facilityNumber * 1000 + baseCode
  facilityId?: string;
  facilityName?: string;
}

// Global Material Code (same across all facilities)
export interface GlobalMaterialCode {
  materialNumber: string; // 7 digits: [DeptPrefix][6-digit sequence]
  departmentCode: number; // 0-9 department prefix
  sequenceNumber: number; // 000001-999999
}

// Facility-specific stock for a global material
export interface FacilityStockIdentifier {
  facilityNumber: number; // 1-99
  materialNumber: string; // Global material number
  stockId: string; // Format: [FacilityNumber]-[MaterialNumber]
}

export interface DepartmentCodeFormat {
  facilityNumber: {
    minValue: 1;
    maxValue: 99;
    description: 'Facility identifier (1-9 standard, 10-99 for large organizations)';
    example: '1';
  };
  baseCode: {
    length: 3;
    minValue: 0;
    maxValue: 999;
    description: 'Base department code within facility';
    example: '001';
  };
  departmentCode: {
    format: '[FacilityNumber][BaseCode padded to 3 digits]';
    description: 'Full department code per facility';
    examples: {
      facility1: '1001 (Maintenance at F1)';
      facility2: '2001 (Maintenance at F2)';
    };
  };
  materialCode: {
    format: '[DepartmentPrefix 0-9][6 digits]';
    description: 'GLOBAL material number - same across ALL facilities';
    examples: {
      maintenance: '1000001-1999999 (Maintenance parts)';
      sanitation: '2000001-2999999 (Sanitation supplies)';
      production: '3000001-3999999 (Production materials)';
    };
  };
  facilityStock: {
    format: '[FacilityNumber]-[MaterialNumber]';
    description: 'Facility-specific stock identifier';
    examples: {
      facility1: '1-1000001 (F1 stock of material 1000001)';
      facility2: '2-1000001 (F2 stock of material 1000001)';
    };
  };
  glCode: {
    length: 4;
    description: 'General Ledger account prefix (SHARED across all facilities)';
    example: '5000';
  };
}

export const CODE_FORMATS: DepartmentCodeFormat = {
  facilityNumber: {
    minValue: 1,
    maxValue: 99,
    description: 'Facility identifier (1-9 standard, 10-99 for large organizations)',
    example: '1',
  },
  baseCode: {
    length: 3,
    minValue: 0,
    maxValue: 999,
    description: 'Base department code within facility',
    example: '001',
  },
  departmentCode: {
    format: '[FacilityNumber][BaseCode padded to 3 digits]',
    description: 'Full department code per facility',
    examples: {
      facility1: '1001 (Maintenance at F1)',
      facility2: '2001 (Maintenance at F2)',
    },
  },
  materialCode: {
    format: '[DepartmentPrefix 0-9][6 digits]',
    description: 'GLOBAL material number - same across ALL facilities',
    examples: {
      maintenance: '1000001-1999999 (Maintenance parts)',
      sanitation: '2000001-2999999 (Sanitation supplies)',
      production: '3000001-3999999 (Production materials)',
    },
  },
  facilityStock: {
    format: '[FacilityNumber]-[MaterialNumber]',
    description: 'Facility-specific stock identifier',
    examples: {
      facility1: '1-1000001 (F1 stock of material 1000001)',
      facility2: '2-1000001 (F2 stock of material 1000001)',
    },
  },
  glCode: {
    length: 4,
    description: 'General Ledger account prefix (SHARED across all facilities)',
    example: '5000',
  },
};

// Base department definitions - these are templates that get replicated per facility
// GL codes are shared across all facilities
export const BASE_DEPARTMENTS: BaseDepartment[] = [
  {
    id: 'dept-offices',
    baseCode: 0,
    name: 'Projects / Offices',
    shortName: 'PROJ',
    glCodePrefix: '5800',
    color: '#6B7280',
    inventoryCode: 0,
    costCenterPrefix: 'CC-ADMIN',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'dept-maintenance',
    baseCode: 1,
    name: 'Maintenance',
    shortName: 'MAINT',
    glCodePrefix: '5000',
    color: '#3B82F6',
    inventoryCode: 1,
    costCenterPrefix: 'CC-MAINT',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'dept-sanitation',
    baseCode: 2,
    name: 'Sanitation',
    shortName: 'SANI',
    glCodePrefix: '5100',
    color: '#10B981',
    inventoryCode: 2,
    costCenterPrefix: 'CC-SANI',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'dept-production',
    baseCode: 3,
    name: 'Production',
    shortName: 'PROD',
    glCodePrefix: '5200',
    color: '#F59E0B',
    inventoryCode: 3,
    costCenterPrefix: 'CC-PROD',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'dept-quality',
    baseCode: 4,
    name: 'Quality',
    shortName: 'QUAL',
    glCodePrefix: '5300',
    color: '#8B5CF6',
    inventoryCode: 4,
    costCenterPrefix: 'CC-QUAL',
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'dept-safety',
    baseCode: 5,
    name: 'Safety',
    shortName: 'SAFE',
    glCodePrefix: '5400',
    color: '#EF4444',
    inventoryCode: 5,
    costCenterPrefix: 'CC-SAFE',
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'dept-hr',
    baseCode: 6,
    name: 'HR',
    shortName: 'HR',
    glCodePrefix: '5500',
    color: '#EC4899',
    inventoryCode: 6,
    costCenterPrefix: 'CC-HR',
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'dept-warehouse',
    baseCode: 7,
    name: 'Warehouse',
    shortName: 'WARE',
    glCodePrefix: '5700',
    color: '#84CC16',
    inventoryCode: 7,
    costCenterPrefix: 'CC-WARE',
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'dept-it',
    baseCode: 8,
    name: 'IT / Technology',
    shortName: 'IT',
    glCodePrefix: '5850',
    color: '#06B6D4',
    inventoryCode: 8,
    costCenterPrefix: 'CC-IT',
    isActive: true,
    sortOrder: 9,
  },
  {
    id: 'dept-facilities',
    baseCode: 9,
    name: 'Facilities',
    shortName: 'FAC',
    glCodePrefix: '5900',
    color: '#A855F7',
    inventoryCode: 9,
    costCenterPrefix: 'CC-FAC',
    isActive: true,
    sortOrder: 10,
  },
];

// Generate department code from facility number and base code
export const generateDepartmentCode = (facilityNumber: number, baseCode: number): string => {
  if (facilityNumber < 1 || facilityNumber > 99) {
    throw new Error('Facility number must be between 1 and 99');
  }
  if (baseCode < 0 || baseCode > 999) {
    throw new Error('Base code must be between 0 and 999');
  }
  const paddedBase = baseCode.toString().padStart(3, '0');
  return `${facilityNumber}${paddedBase}`;
};

// Parse department code to get facility number and base code
export const parseDepartmentCode = (departmentCode: string): { facilityNumber: number; baseCode: number } | null => {
  const match = departmentCode.match(/^(\d{1,2})(\d{3})$/);
  if (!match) return null;
  return {
    facilityNumber: parseInt(match[1], 10),
    baseCode: parseInt(match[2], 10),
  };
};

// Generate material number from facility number and sequence
export const generateMaterialNumber = (facilityNumber: number, sequence: number): string => {
  if (facilityNumber < 1 || facilityNumber > 99) {
    throw new Error('Facility number must be between 1 and 99');
  }
  if (sequence < 1 || sequence > 999999) {
    throw new Error('Sequence must be between 1 and 999999');
  }
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${facilityNumber}${paddedSequence}`;
};

// Parse material number to get facility number and sequence
export const parseMaterialNumber = (materialNumber: string): { facilityNumber: number; sequence: number } | null => {
  const match = materialNumber.match(/^(\d{1,2})(\d{6})$/);
  if (!match) return null;
  return {
    facilityNumber: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
};

// Get departments for a specific facility
export const getDepartmentsForFacility = (
  facilityNumber: number,
  facilityId?: string,
  facilityName?: string
): FacilityDepartment[] => {
  return BASE_DEPARTMENTS.filter(d => d.isActive).map(base => ({
    ...base,
    facilityNumber,
    departmentCode: generateDepartmentCode(facilityNumber, base.baseCode),
    facilityId,
    facilityName,
  })).sort((a, b) => a.sortOrder - b.sortOrder);
};

// Get base department by base code
export const getBaseDepartmentByCode = (baseCode: number): BaseDepartment | undefined => {
  return BASE_DEPARTMENTS.find(d => d.baseCode === baseCode);
};

// Get base department by inventory code
export const getBaseDepartmentByInventoryCode = (inventoryCode: number): BaseDepartment | undefined => {
  return BASE_DEPARTMENTS.find(d => d.inventoryCode === inventoryCode);
};

// Get base department by GL prefix
export const getBaseDepartmentByGLPrefix = (glPrefix: string): BaseDepartment | undefined => {
  return BASE_DEPARTMENTS.find(d => d.glCodePrefix === glPrefix);
};

// Get base department by ID
export const getBaseDepartmentById = (id: string): BaseDepartment | undefined => {
  return BASE_DEPARTMENTS.find(d => d.id === id);
};

// Get department info from full department code
export const getDepartmentFromCode = (departmentCode: string): (BaseDepartment & { facilityNumber: number }) | undefined => {
  const parsed = parseDepartmentCode(departmentCode);
  if (!parsed) return undefined;
  
  const baseDept = getBaseDepartmentByCode(parsed.baseCode);
  if (!baseDept) return undefined;
  
  return {
    ...baseDept,
    facilityNumber: parsed.facilityNumber,
  };
};

// Get department color
export const getDepartmentColor = (departmentCode: string): string => {
  const dept = getDepartmentFromCode(departmentCode);
  return dept?.color || '#6B7280';
};

// Get department name
export const getDepartmentName = (departmentCode: string): string => {
  const dept = getDepartmentFromCode(departmentCode);
  return dept?.name || 'Unknown';
};

// Get department short name
export const getDepartmentShortName = (departmentCode: string): string => {
  const dept = getDepartmentFromCode(departmentCode);
  return dept?.shortName || 'UNK';
};

// Get facility number from material code
export const getFacilityFromMaterialCode = (materialCode: string): number | undefined => {
  const parsed = parseMaterialNumber(materialCode);
  return parsed?.facilityNumber;
};

// Get department from material code (via inventory code mapping)
export const getDepartmentFromMaterialCode = (materialCode: string, facilityNumber?: number): FacilityDepartment | undefined => {
  const parsed = parseMaterialNumber(materialCode);
  if (!parsed) return undefined;
  
  const facility = facilityNumber || parsed.facilityNumber;
  const baseDept = getBaseDepartmentByInventoryCode(parsed.facilityNumber);
  if (!baseDept) return undefined;
  
  return {
    ...baseDept,
    facilityNumber: facility,
    departmentCode: generateDepartmentCode(facility, baseDept.baseCode),
  };
};

// Validation functions
export const validateFacilityNumber = (num: number): { valid: boolean; error?: string } => {
  if (typeof num !== 'number' || isNaN(num)) {
    return { valid: false, error: 'Facility number must be a number' };
  }
  if (num < 1 || num > 99) {
    return { valid: false, error: 'Facility number must be between 1 and 99' };
  }
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Facility number must be an integer' };
  }
  return { valid: true };
};

export const validateDepartmentCode = (code: string): { valid: boolean; error?: string } => {
  if (!code) {
    return { valid: false, error: 'Department code is required' };
  }
  const parsed = parseDepartmentCode(code);
  if (!parsed) {
    return { valid: false, error: 'Department code must be facility number (1-99) + 3-digit base code' };
  }
  const facilityValidation = validateFacilityNumber(parsed.facilityNumber);
  if (!facilityValidation.valid) {
    return facilityValidation;
  }
  if (parsed.baseCode < 0 || parsed.baseCode > 999) {
    return { valid: false, error: 'Base code must be between 000 and 999' };
  }
  return { valid: true };
};

export const validateGLCode = (code: string): { valid: boolean; error?: string } => {
  if (!code) {
    return { valid: false, error: 'GL code is required' };
  }
  if (code.length !== 4) {
    return { valid: false, error: 'GL code must be exactly 4 digits' };
  }
  if (!/^\d{4}$/.test(code)) {
    return { valid: false, error: 'GL code must contain only digits' };
  }
  return { valid: true };
};

export const validateMaterialCode = (code: string): { valid: boolean; error?: string } => {
  if (!code) {
    return { valid: false, error: 'Material code is required' };
  }
  const parsed = parseMaterialNumber(code);
  if (!parsed) {
    return { valid: false, error: 'Material code must be facility number (1-99) + 6-digit sequence' };
  }
  const facilityValidation = validateFacilityNumber(parsed.facilityNumber);
  if (!facilityValidation.valid) {
    return facilityValidation;
  }
  if (parsed.sequence < 1 || parsed.sequence > 999999) {
    return { valid: false, error: 'Material sequence must be between 000001 and 999999' };
  }
  return { valid: true };
};

// Generate full GL account code
export const generateGLAccountCode = (departmentCode: string, accountSuffix: string): string => {
  const dept = getDepartmentFromCode(departmentCode);
  if (!dept) return '';
  return `${dept.glCodePrefix}-${accountSuffix}`;
};

// For backwards compatibility with existing code
export const mapLegacyDepartmentCode = (legacyCode: string, facilityNumber: number = 1): FacilityDepartment | undefined => {
  const legacyMapping: Record<string, number> = {
    'maintenance': 1,
    'sanitation': 2,
    'production': 3,
    'quality': 4,
    'safety': 5,
    'hr': 6,
    'warehouse': 7,
    'it': 8,
    'facilities': 9,
    'offices': 0,
    'admin': 0,
    '1001': 1,
    '1002': 2,
    '1003': 3,
    '1004': 4,
    '1005': 5,
    '1006': 6,
    '1007': 7,
    '1008': 8,
    '1009': 9,
    '1000': 0,
  };
  
  const baseCode = legacyMapping[legacyCode.toLowerCase()];
  if (baseCode === undefined) {
    // Try parsing as new format
    const parsed = parseDepartmentCode(legacyCode);
    if (parsed) {
      const baseDept = getBaseDepartmentByCode(parsed.baseCode);
      if (baseDept) {
        return {
          ...baseDept,
          facilityNumber: parsed.facilityNumber,
          departmentCode: legacyCode,
        };
      }
    }
    return undefined;
  }
  
  const baseDept = getBaseDepartmentByCode(baseCode);
  if (!baseDept) return undefined;
  
  return {
    ...baseDept,
    facilityNumber,
    departmentCode: generateDepartmentCode(facilityNumber, baseCode),
  };
};

// Legacy compatibility exports
export const UNIFIED_DEPARTMENTS = BASE_DEPARTMENTS;
export const getUnifiedDepartments = () => BASE_DEPARTMENTS.filter(d => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
export const getUnifiedDepartmentByCode = (code: string) => getDepartmentFromCode(code);
export const getUnifiedDepartmentByInventoryCode = (inventoryCode: number) => getBaseDepartmentByInventoryCode(inventoryCode);
export const getUnifiedDepartmentByGLPrefix = (glPrefix: string) => getBaseDepartmentByGLPrefix(glPrefix);
export const getUnifiedDepartmentById = (id: string) => getBaseDepartmentById(id);

export type UnifiedDepartment = BaseDepartment;
