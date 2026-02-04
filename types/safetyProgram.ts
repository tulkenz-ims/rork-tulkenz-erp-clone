// Safety Program Document Types

export type SafetyDocumentType = 'policy' | 'procedure' | 'form' | 'training' | 'reference' | 'opl' | 'checklist' | 'guide';

export type SafetyProgramType = 'loto' | 'ppe' | 'confined_space' | 'hot_work' | 'fall_protection' | 'hazcom' | 'emergency' | 'general_safety' | 'other';

export type SafetyDocumentStatus = 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'active' | 'revision' | 'obsolete' | 'archived';

export type SafetyDocumentAccessLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface SafetyDocumentSection {
  id: string;
  title: string;
  content: string;
  subsections?: {
    title: string;
    content: string;
  }[];
  order: number;
}

export interface SafetyProgramDocument {
  id: string;
  organization_id: string;
  document_number: string;
  title: string;
  description: string | null;
  document_type: SafetyDocumentType;
  program_type: SafetyProgramType;
  version: string;
  revision_number: number;
  status: SafetyDocumentStatus;
  content: Record<string, unknown>;
  sections: SafetyDocumentSection[];
  applicable_levels: number[];
  tags: string[];
  keywords: string[];
  effective_date: string | null;
  expiration_date: string | null;
  last_reviewed: string | null;
  next_review: string | null;
  author: string | null;
  author_id: string | null;
  owner: string | null;
  owner_id: string | null;
  reviewer: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  approver: string | null;
  approver_id: string | null;
  approved_at: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  related_documents: string[];
  supersedes_id: string | null;
  access_level: SafetyDocumentAccessLevel;
  requires_acknowledgment: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafetyDocumentVersion {
  id: string;
  organization_id: string;
  document_id: string;
  version: string;
  revision_number: number;
  content: Record<string, unknown>;
  sections: SafetyDocumentSection[];
  change_summary: string | null;
  changed_by: string;
  changed_by_id: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  effective_date: string | null;
  created_at: string;
}

export interface SafetyDocumentAcknowledgment {
  id: string;
  organization_id: string;
  document_id: string;
  employee_id: string;
  employee_name: string;
  acknowledged_at: string;
  version_acknowledged: string;
}

export interface CreateSafetyDocumentInput {
  document_number: string;
  title: string;
  description?: string;
  document_type: SafetyDocumentType;
  program_type: SafetyProgramType;
  version?: string;
  status?: SafetyDocumentStatus;
  content?: Record<string, unknown>;
  sections?: SafetyDocumentSection[];
  applicable_levels?: number[];
  tags?: string[];
  keywords?: string[];
  effective_date?: string;
  expiration_date?: string;
  last_reviewed?: string;
  next_review?: string;
  author?: string;
  author_id?: string;
  owner?: string;
  owner_id?: string;
  approver?: string;
  approver_id?: string;
  access_level?: SafetyDocumentAccessLevel;
  requires_acknowledgment?: boolean;
  notes?: string;
}

export interface UpdateSafetyDocumentInput {
  title?: string;
  description?: string;
  status?: SafetyDocumentStatus;
  content?: Record<string, unknown>;
  sections?: SafetyDocumentSection[];
  applicable_levels?: number[];
  tags?: string[];
  keywords?: string[];
  effective_date?: string;
  expiration_date?: string;
  last_reviewed?: string;
  next_review?: string;
  author?: string;
  owner?: string;
  approver?: string;
  access_level?: SafetyDocumentAccessLevel;
  requires_acknowledgment?: boolean;
  notes?: string;
}

export const SAFETY_DOCUMENT_TYPE_INFO: Record<SafetyDocumentType, { label: string; color: string }> = {
  policy: { label: 'Policy', color: '#7C3AED' },
  procedure: { label: 'Procedure', color: '#3B82F6' },
  form: { label: 'Form', color: '#10B981' },
  training: { label: 'Training', color: '#F59E0B' },
  reference: { label: 'Reference', color: '#6B7280' },
  opl: { label: 'OPL', color: '#EC4899' },
  checklist: { label: 'Checklist', color: '#06B6D4' },
  guide: { label: 'Guide', color: '#8B5CF6' },
};

export const SAFETY_PROGRAM_TYPE_INFO: Record<SafetyProgramType, { label: string; color: string }> = {
  loto: { label: 'LOTO', color: '#DC2626' },
  ppe: { label: 'PPE', color: '#F59E0B' },
  confined_space: { label: 'Confined Space', color: '#8B5CF6' },
  hot_work: { label: 'Hot Work', color: '#EF4444' },
  fall_protection: { label: 'Fall Protection', color: '#06B6D4' },
  hazcom: { label: 'HazCom', color: '#10B981' },
  emergency: { label: 'Emergency', color: '#DC2626' },
  general_safety: { label: 'General Safety', color: '#3B82F6' },
  other: { label: 'Other', color: '#6B7280' },
};

export const SAFETY_DOCUMENT_STATUS_INFO: Record<SafetyDocumentStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6B7280' },
  pending_review: { label: 'Pending Review', color: '#F59E0B' },
  pending_approval: { label: 'Pending Approval', color: '#8B5CF6' },
  approved: { label: 'Approved', color: '#10B981' },
  active: { label: 'Active', color: '#3B82F6' },
  revision: { label: 'Under Revision', color: '#F59E0B' },
  obsolete: { label: 'Obsolete', color: '#EF4444' },
  archived: { label: 'Archived', color: '#6B7280' },
};
