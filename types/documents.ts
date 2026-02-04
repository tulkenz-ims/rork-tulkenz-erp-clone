export type DocumentCategory = 
  | 'SDS' 
  | 'SOP' 
  | 'OPL' 
  | 'Policy' 
  | 'WorkInstruction' 
  | 'Specification' 
  | 'Certification' 
  | 'TrainingMaterial';

export type DocumentStatus = 'draft' | 'current' | 'expired';

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  departmentId: number;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  version: string;
  effectiveDate: string;
  expirationDate?: string;
  status: DocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  linkedInventoryItemId?: string;
  linkedMaterialNumber?: string;
  linkedChemicalName?: string;
  qrCodeUrl?: string;
  tags?: string[];
  isCurrent: boolean;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface SDSDocument extends Document {
  category: 'SDS';
  linkedMaterialNumber: string;
  linkedChemicalName: string;
  ghsHazards?: string[];
  signalWord?: 'Danger' | 'Warning' | 'None';
  hazardStatements?: string[];
  precautionaryStatements?: string[];
}

export const DOCUMENT_CATEGORIES: { 
  value: DocumentCategory; 
  label: string; 
  color: string; 
  icon: string;
  description: string;
}[] = [
  { 
    value: 'SDS', 
    label: 'SDS Sheets', 
    color: '#EF4444', 
    icon: 'AlertTriangle',
    description: 'Safety Data Sheets for chemicals and materials'
  },
  { 
    value: 'SOP', 
    label: 'SOPs', 
    color: '#10B981', 
    icon: 'FileCheck',
    description: 'Standard Operating Procedures'
  },
  { 
    value: 'OPL', 
    label: 'OPLs', 
    color: '#3B82F6', 
    icon: 'BookOpen',
    description: 'One Point Lessons and quick reference guides'
  },
  { 
    value: 'Policy', 
    label: 'Policies', 
    color: '#8B5CF6', 
    icon: 'Shield',
    description: 'Company policies and guidelines'
  },
  { 
    value: 'WorkInstruction', 
    label: 'Work Instructions', 
    color: '#F59E0B', 
    icon: 'Clipboard',
    description: 'Detailed work instructions and procedures'
  },
  { 
    value: 'Specification', 
    label: 'Specifications', 
    color: '#06B6D4', 
    icon: 'FileText',
    description: 'Product and equipment specifications'
  },
  { 
    value: 'Certification', 
    label: 'Certifications', 
    color: '#EC4899', 
    icon: 'Award',
    description: 'Compliance and certification documents'
  },
  { 
    value: 'TrainingMaterial', 
    label: 'Training Materials', 
    color: '#14B8A6', 
    icon: 'GraduationCap',
    description: 'Training documents and reference materials'
  },
];

export const getCategoryInfo = (category: DocumentCategory) => {
  return DOCUMENT_CATEGORIES.find(c => c.value === category) || DOCUMENT_CATEGORIES[0];
};

export const getStatusColor = (status: DocumentStatus): string => {
  switch (status) {
    case 'current': return '#10B981';
    case 'draft': return '#F59E0B';
    case 'expired': return '#EF4444';
    default: return '#6B7280';
  }
};

export const getStatusLabel = (status: DocumentStatus): string => {
  switch (status) {
    case 'current': return 'Current';
    case 'draft': return 'Draft';
    case 'expired': return 'Expired';
    default: return status;
  }
};

export const QR_PRINT_SIZES = [
  { id: 'small', label: 'Small (1" x 1")', width: 72, height: 72, labelSize: 8 },
  { id: 'medium', label: 'Medium (2" x 2")', width: 144, height: 144, labelSize: 10 },
  { id: 'large', label: 'Large (3" x 3")', width: 216, height: 216, labelSize: 12 },
] as const;

export type QRPrintSize = typeof QR_PRINT_SIZES[number]['id'];
