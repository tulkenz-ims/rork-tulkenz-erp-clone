export type VendorType = 'supplier' | 'service' | 'contractor' | 'distributor';
export type VendorStatus = 'active' | 'inactive' | 'pending_approval' | 'suspended';
export type PaymentTerms = 'net_10' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'cod' | 'prepaid';

export interface VendorContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface VendorAddress {
  id: string;
  type: 'billing' | 'shipping' | 'both';
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
}

export interface VendorCertification {
  id: string;
  name: string;
  certNumber: string;
  issuedDate: string;
  expirationDate: string;
  issuingBody: string;
}

export interface VendorPerformance {
  onTimeDeliveryRate: number;
  qualityScore: number;
  responseTime: number;
  totalOrders: number;
  returnRate: number;
  avgLeadTimeDays: number;
  lastOrderDate?: string;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  legalName?: string;
  type: VendorType;
  status: VendorStatus;
  taxId?: string;
  website?: string;
  paymentTerms: PaymentTerms;
  creditLimit?: number;
  currency: string;
  contacts: VendorContact[];
  addresses: VendorAddress[];
  certifications: VendorCertification[];
  performance: VendorPerformance;
  categories: string[];
  departments: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PriceAgreement {
  id: string;
  vendorId: string;
  materialId?: string;
  materialSku?: string;
  materialName?: string;
  serviceDescription?: string;
  unitPrice: number;
  currency: string;
  effectiveDate: string;
  expirationDate?: string;
  minQuantity?: number;
  notes?: string;
}

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  supplier: 'Supplier',
  service: 'Service',
  contractor: 'Contractor',
  distributor: 'Distributor',
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_approval: 'Pending Approval',
  suspended: 'Suspended',
};

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  net_10: 'Net 10',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
  cod: 'COD',
  prepaid: 'Prepaid',
};

export const VENDOR_CATEGORIES: string[] = [
  'Bearings',
  'Belts',
  'Calibration',
  'Chemicals',
  'Controls',
  'Electrical',
  'Fasteners',
  'Filters',
  'Fire Protection',
  'Hydraulics',
  'HVAC',
  'Lubricants',
  'Maintenance',
  'Motors',
  'Packaging',
  'Plumbing',
  'Pneumatics',
  'PPE',
  'Raw Materials',
  'Repairs',
  'Safety Equipment',
  'Sensors',
  'Tools',
  'Valves',
  'Welding',
];

export const MOCK_PRICE_AGREEMENTS: PriceAgreement[] = [
  {
    id: 'pa-001',
    vendorId: 'v-001',
    materialId: 'mat-001',
    materialSku: 'BRG-6205-2RS',
    materialName: 'Bearing 6205-2RS',
    unitPrice: 12.50,
    currency: 'USD',
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    minQuantity: 10,
    notes: 'Volume discount available for orders > 100',
  },
  {
    id: 'pa-002',
    vendorId: 'v-001',
    materialId: 'mat-002',
    materialSku: 'BLT-A68',
    materialName: 'V-Belt A68',
    unitPrice: 8.75,
    currency: 'USD',
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
  },
  {
    id: 'pa-003',
    vendorId: 'v-003',
    serviceDescription: 'Preventive Maintenance Service - Hourly Rate',
    unitPrice: 85.00,
    currency: 'USD',
    effectiveDate: '2024-01-01',
    notes: 'Standard labor rate, emergency rate is 1.5x',
  },
  {
    id: 'pa-004',
    vendorId: 'v-004',
    materialId: 'mat-003',
    materialSku: 'HYD-OIL-5GAL',
    materialName: 'Hydraulic Oil ISO 46 (5 Gal)',
    unitPrice: 45.00,
    currency: 'USD',
    effectiveDate: '2024-02-01',
    expirationDate: '2025-01-31',
    minQuantity: 4,
  },
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v-001',
    vendorCode: 'ABC-001',
    name: 'ABC Industrial Supply',
    legalName: 'ABC Industrial Supply LLC',
    type: 'supplier',
    status: 'active',
    taxId: '12-3456789',
    website: 'https://abcindustrial.com',
    paymentTerms: 'net_30',
    creditLimit: 50000,
    currency: 'USD',
    contacts: [
      {
        id: 'c-001',
        name: 'John Anderson',
        title: 'Sales Manager',
        email: 'john@abcindustrial.com',
        phone: '(555) 123-4567',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        id: 'a-001',
        type: 'both',
        street1: '123 Industrial Way',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        isPrimary: true,
      },
    ],
    certifications: [],
    performance: {
      onTimeDeliveryRate: 95,
      qualityScore: 92,
      responseTime: 4,
      totalOrders: 156,
      returnRate: 1.2,
      avgLeadTimeDays: 5,
      lastOrderDate: '2024-01-15',
    },
    categories: ['Bearings', 'Belts', 'Motors'],
    departments: ['Maintenance', 'Production'],
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'v-002',
    vendorCode: 'TPI-001',
    name: 'TechParts Inc',
    legalName: 'TechParts Incorporated',
    type: 'supplier',
    status: 'active',
    taxId: '23-4567890',
    website: 'https://techparts.com',
    paymentTerms: 'net_45',
    creditLimit: 35000,
    currency: 'USD',
    contacts: [
      {
        id: 'c-002',
        name: 'Sarah Miller',
        title: 'Account Executive',
        email: 'sarah@techparts.com',
        phone: '(555) 234-5678',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        id: 'a-002',
        type: 'both',
        street1: '456 Tech Park Drive',
        city: 'Detroit',
        state: 'MI',
        zipCode: '48201',
        country: 'USA',
        isPrimary: true,
      },
    ],
    certifications: [],
    performance: {
      onTimeDeliveryRate: 88,
      qualityScore: 90,
      responseTime: 6,
      totalOrders: 89,
      returnRate: 2.1,
      avgLeadTimeDays: 7,
      lastOrderDate: '2024-01-10',
    },
    categories: ['Electrical', 'Sensors', 'Controls'],
    departments: ['Maintenance', 'Engineering'],
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'v-003',
    vendorCode: 'PMS-001',
    name: 'Precision Maintenance Services',
    legalName: 'Precision Maintenance Services Inc',
    type: 'contractor',
    status: 'active',
    taxId: '34-5678901',
    website: 'https://precisionmaint.com',
    paymentTerms: 'net_15',
    creditLimit: 25000,
    currency: 'USD',
    contacts: [
      {
        id: 'c-003',
        name: 'Mike Johnson',
        title: 'Operations Director',
        email: 'mike@precisionmaint.com',
        phone: '(555) 345-6789',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        id: 'a-003',
        type: 'both',
        street1: '789 Service Blvd',
        city: 'Cleveland',
        state: 'OH',
        zipCode: '44101',
        country: 'USA',
        isPrimary: true,
      },
    ],
    certifications: [
      {
        id: 'cert-001',
        name: 'ISO 9001:2015',
        certNumber: 'ISO-2023-45678',
        issuedDate: '2023-06-01',
        expirationDate: '2026-06-01',
        issuingBody: 'Bureau Veritas',
      },
    ],
    performance: {
      onTimeDeliveryRate: 98,
      qualityScore: 96,
      responseTime: 2,
      totalOrders: 234,
      returnRate: 0.5,
      avgLeadTimeDays: 3,
      lastOrderDate: '2024-01-18',
    },
    categories: ['Maintenance', 'Repairs', 'Calibration'],
    departments: ['Maintenance'],
    createdAt: '2022-08-10T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'v-004',
    vendorCode: 'GFS-001',
    name: 'Global Fluid Systems',
    legalName: 'Global Fluid Systems Corp',
    type: 'supplier',
    status: 'active',
    taxId: '45-6789012',
    website: 'https://globalfluid.com',
    paymentTerms: 'net_30',
    creditLimit: 40000,
    currency: 'USD',
    contacts: [
      {
        id: 'c-004',
        name: 'Lisa Chen',
        title: 'Regional Sales Rep',
        email: 'lisa@globalfluid.com',
        phone: '(555) 456-7890',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        id: 'a-004',
        type: 'both',
        street1: '321 Fluid Lane',
        city: 'Houston',
        state: 'TX',
        zipCode: '77001',
        country: 'USA',
        isPrimary: true,
      },
    ],
    certifications: [],
    performance: {
      onTimeDeliveryRate: 85,
      qualityScore: 88,
      responseTime: 8,
      totalOrders: 67,
      returnRate: 2.8,
      avgLeadTimeDays: 10,
      lastOrderDate: '2024-01-05',
    },
    categories: ['Hydraulics', 'Pneumatics', 'Lubricants'],
    departments: ['Maintenance', 'Production'],
    createdAt: '2023-05-01T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'v-005',
    vendorCode: 'SFE-001',
    name: 'SafetyFirst Equipment',
    legalName: 'SafetyFirst Equipment LLC',
    type: 'supplier',
    status: 'active',
    taxId: '56-7890123',
    website: 'https://safetyfirst.com',
    paymentTerms: 'net_30',
    creditLimit: 30000,
    currency: 'USD',
    contacts: [
      {
        id: 'c-005',
        name: 'Robert Brown',
        title: 'Safety Solutions Manager',
        email: 'robert@safetyfirst.com',
        phone: '(555) 567-8901',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        id: 'a-005',
        type: 'both',
        street1: '555 Safety Street',
        city: 'Pittsburgh',
        state: 'PA',
        zipCode: '15201',
        country: 'USA',
        isPrimary: true,
      },
    ],
    certifications: [],
    performance: {
      onTimeDeliveryRate: 92,
      qualityScore: 94,
      responseTime: 3,
      totalOrders: 112,
      returnRate: 0.8,
      avgLeadTimeDays: 4,
      lastOrderDate: '2024-01-12',
    },
    categories: ['PPE', 'Safety Equipment', 'Fire Protection'],
    departments: ['Safety', 'HR'],
    createdAt: '2023-02-28T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    createdBy: 'admin',
  },
];

export const getVendorStatusColor = (status: VendorStatus): string => {
  const colors: Record<VendorStatus, string> = {
    active: '#10B981',
    inactive: '#6B7280',
    pending_approval: '#F59E0B',
    suspended: '#EF4444',
  };
  return colors[status] || '#6B7280';
};
