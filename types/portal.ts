// Portal Announcement Types
export type AnnouncementType = 'general' | 'policy' | 'event' | 'safety' | 'hr' | 'maintenance' | 'it' | 'celebration' | 'urgent' | 'other';
export type AnnouncementPriority = 'low' | 'normal' | 'important' | 'urgent' | 'critical';
export type AnnouncementStatus = 'draft' | 'published' | 'archived' | 'expired';
export type AnnouncementTargetAudience = 'all' | 'departments' | 'roles' | 'facilities' | 'custom';

export interface PortalAnnouncement {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  summary: string | null;
  announcement_type: AnnouncementType;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target_audience: AnnouncementTargetAudience;
  target_departments: string[];
  target_roles: string[];
  target_facilities: string[];
  target_employee_ids: string[];
  publish_at: string | null;
  expires_at: string | null;
  pinned: boolean;
  show_on_dashboard: boolean;
  show_on_portal: boolean;
  requires_acknowledgment: boolean;
  cover_image_url: string | null;
  attachments: unknown[];
  created_by: string | null;
  created_by_name: string;
  published_by: string | null;
  published_by_name: string | null;
  published_at: string | null;
  view_count: number;
  acknowledgment_count: number;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalAnnouncementAcknowledgment {
  id: string;
  organization_id: string;
  announcement_id: string;
  employee_id: string;
  employee_name: string;
  acknowledged_at: string;
}

export interface PortalAnnouncementView {
  id: string;
  organization_id: string;
  announcement_id: string;
  employee_id: string;
  viewed_at: string;
}

// Employee Directory Types
export interface EmployeeDirectoryEntry {
  id: string;
  organization_id: string;
  facility_id: string | null;
  facility_name: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  position: string | null;
  department_code: string | null;
  status: string;
  hire_date: string | null;
  manager_id: string | null;
  manager_name: string | null;
  phone: string;
  extension: string;
  office_location: string;
  avatar_url: string;
  job_title: string;
  bio: string;
  skills: string[];
  created_at: string;
}

// Role Types
export interface Role {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  permissions: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRole {
  id: string;
  organization_id: string;
  employee_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

// Labels
export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  general: 'General',
  policy: 'Policy',
  event: 'Event',
  safety: 'Safety',
  hr: 'HR',
  maintenance: 'Maintenance',
  it: 'IT',
  celebration: 'Celebration',
  urgent: 'Urgent',
  other: 'Other',
};

export const ANNOUNCEMENT_TYPE_COLORS: Record<AnnouncementType, string> = {
  general: '#6B7280',
  policy: '#8B5CF6',
  event: '#3B82F6',
  safety: '#EF4444',
  hr: '#10B981',
  maintenance: '#F59E0B',
  it: '#06B6D4',
  celebration: '#EC4899',
  urgent: '#DC2626',
  other: '#6B7280',
};

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
  critical: 'Critical',
};

export const ANNOUNCEMENT_PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  low: '#6B7280',
  normal: '#3B82F6',
  important: '#F59E0B',
  urgent: '#F97316',
  critical: '#EF4444',
};

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
  expired: 'Expired',
};

export const ANNOUNCEMENT_STATUS_COLORS: Record<AnnouncementStatus, string> = {
  draft: '#6B7280',
  published: '#10B981',
  archived: '#374151',
  expired: '#DC2626',
};
