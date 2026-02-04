export type ProcurementVendorStatus = 'active' | 'inactive' | 'pending_approval' | 'suspended';
export type VendorTier = 'preferred' | 'approved' | 'conditional' | 'probation';

export interface ProcurementVendor {
  id: string;
  vendorCode: string;
  name: string;
  category: string;
  status: ProcurementVendorStatus;
  tier: VendorTier;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  paymentTerms: string;
  leadTimeDays: number;
  minimumOrder?: number;
  qualityRating?: number;
  deliveryRating?: number;
  overallRating?: number;
  lastOrderDate?: string;
  ytdSpend: number;
  contractExpiry?: string;
}

export const VENDOR_STATUS_COLORS: Record<ProcurementVendorStatus, string> = {
  active: '#10B981',
  inactive: '#6B7280',
  pending_approval: '#F59E0B',
  suspended: '#EF4444',
};

export const VENDOR_TIER_COLORS: Record<VendorTier, string> = {
  preferred: '#10B981',
  approved: '#3B82F6',
  conditional: '#F59E0B',
  probation: '#EF4444',
};

export const VENDOR_TIER_LABELS: Record<VendorTier, string> = {
  preferred: 'Preferred',
  approved: 'Approved',
  conditional: 'Conditional',
  probation: 'Probation',
};

export const MOCK_PROCUREMENT_VENDORS: ProcurementVendor[] = [
  {
    id: 'pv-001',
    vendorCode: 'VND-001',
    name: 'ABC Industrial Supply',
    category: 'MRO',
    status: 'active',
    tier: 'preferred',
    contactName: 'John Anderson',
    contactEmail: 'john@abcindustrial.com',
    contactPhone: '(555) 123-4567',
    address: '123 Industrial Way',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    country: 'USA',
    paymentTerms: 'Net 30',
    leadTimeDays: 5,
    qualityRating: 4.5,
    deliveryRating: 4.8,
    overallRating: 4.6,
    ytdSpend: 125000,
  },
];
