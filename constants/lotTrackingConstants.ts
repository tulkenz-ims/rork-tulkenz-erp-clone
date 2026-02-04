export interface LotVendor {
  id: string;
  name: string;
  code: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export const MOCK_VENDORS: LotVendor[] = [
  { id: 'lv-001', name: 'ABC Ingredients', code: 'ABC', contactName: 'John Smith', contactEmail: 'john@abcing.com' },
  { id: 'lv-002', name: 'Quality Supplies Inc', code: 'QSI', contactName: 'Jane Doe', contactEmail: 'jane@qsi.com' },
  { id: 'lv-003', name: 'Global Foods Co', code: 'GFC', contactName: 'Bob Wilson', contactEmail: 'bob@globalfoods.com' },
  { id: 'lv-004', name: 'Premium Packaging', code: 'PPK', contactName: 'Alice Brown', contactEmail: 'alice@prempack.com' },
  { id: 'lv-005', name: 'Fresh Farms Direct', code: 'FFD', contactName: 'Tom Davis', contactEmail: 'tom@freshfarms.com' },
];

export type LotStatus = 'available' | 'quarantine' | 'on_hold' | 'released' | 'expired' | 'consumed';

export const LOT_STATUS_COLORS: Record<LotStatus, string> = {
  available: '#10B981',
  quarantine: '#F59E0B',
  on_hold: '#8B5CF6',
  released: '#3B82F6',
  expired: '#EF4444',
  consumed: '#6B7280',
};

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  available: 'Available',
  quarantine: 'Quarantine',
  on_hold: 'On Hold',
  released: 'Released',
  expired: 'Expired',
  consumed: 'Consumed',
};
