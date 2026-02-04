export interface BulletinPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole?: string;
  category: 'announcement' | 'policy' | 'event' | 'safety' | 'recognition' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  expiresAt?: string;
  isPinned: boolean;
  attachments?: { name: string; url: string }[];
  readBy?: string[];
}

export interface Facility {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  timezone: string;
  isActive: boolean;
}

export const MOCK_FACILITIES: Facility[] = [
  {
    id: 'fac-001',
    name: 'Main Production Facility',
    code: 'MPF',
    address: '1234 Industrial Blvd',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    country: 'USA',
    phone: '(312) 555-1000',
    timezone: 'America/Chicago',
    isActive: true,
  },
  {
    id: 'fac-002',
    name: 'Distribution Center',
    code: 'DC1',
    address: '5678 Logistics Way',
    city: 'Indianapolis',
    state: 'IN',
    zip: '46201',
    country: 'USA',
    phone: '(317) 555-2000',
    timezone: 'America/Indiana/Indianapolis',
    isActive: true,
  },
  {
    id: 'fac-003',
    name: 'Quality Lab',
    code: 'QLB',
    address: '910 Research Park',
    city: 'Chicago',
    state: 'IL',
    zip: '60602',
    country: 'USA',
    phone: '(312) 555-3000',
    timezone: 'America/Chicago',
    isActive: true,
  },
];

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  equipment?: string;
  equipmentId?: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  type: 'corrective' | 'preventive' | 'emergency' | 'request';
  assignedTo?: string;
  requestedBy?: string;
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
}

export const PRIORITY_COLORS: Record<WorkOrder['priority'], string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

export const STATUS_COLORS: Record<WorkOrder['status'], string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  on_hold: '#8B5CF6',
  cancelled: '#6B7280',
};

export const CATEGORY_COLORS: Record<BulletinPost['category'], string> = {
  announcement: '#3B82F6',
  policy: '#8B5CF6',
  event: '#10B981',
  safety: '#EF4444',
  recognition: '#F59E0B',
  general: '#6B7280',
};
