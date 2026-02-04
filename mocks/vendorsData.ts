export type VendorStatus = 'active' | 'inactive' | 'pending_approval' | 'suspended' | 'blacklisted';
export type VendorType = 'supplier' | 'service' | 'contractor' | 'distributor';

export interface VendorContact {
  id: string;
  name: string;
  title?: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

export interface VendorPerformance {
  onTimeDeliveryRate: number;
  qualityScore: number;
  responseTime: number;
  totalOrders: number;
  totalSpend: number;
  lastOrderDate?: string;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  type: VendorType;
  status: VendorStatus;
  taxId?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  contacts: VendorContact[];
  departments: string[];
  categories: string[];
  paymentTerms?: string;
  currency: string;
  performance: VendorPerformance;
  certifications?: string[];
  insuranceExpiry?: string;
  contractExpiry?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPriceAgreement {
  id: string;
  vendorId: string;
  vendorName: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  unitPrice: number;
  minQuantity?: number;
  maxQuantity?: number;
  effectiveDate: string;
  expirationDate?: string;
  currency: string;
  notes?: string;
  createdAt: string;
}
