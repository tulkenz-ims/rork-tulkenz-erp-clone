export type VendorStatus = 'active' | 'inactive';

export type POType = 'material' | 'service' | 'capex';

export type POStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected'
  | 'submitted' 
  | 'ordered' 
  | 'partial_received'
  | 'received' 
  | 'pending_service'
  | 'service_complete'
  | 'pending_invoice'
  | 'closed'
  | 'cancelled';

export type PaymentTerms = 'net_10' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90' | 'cod' | 'prepaid' | 'direct_pay';

export interface ProcurementVendor {
  vendor_id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  payment_terms: PaymentTerms;
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  po_id: string;
  po_number: string;
  po_type: POType;
  vendor_id: string;
  vendor_name: string;
  department_id: string;
  department_name: string;
  status: POStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  created_date: string;
  created_by: string;
  submitted_date?: string;
  approved_date?: string;
  approved_by?: string;
  expected_delivery?: string;
  received_date?: string;
  notes?: string;
  line_items: POLineItem[];
}

export interface POLineItem {
  line_id: string;
  po_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_stock: boolean;
  is_deleted: boolean;
  received_qty: number;
  uom?: string;
  notes?: string;
}

export interface PurchaseRequest {
  request_id: string;
  request_number: string;
  requester_id: string;
  requester_name: string;
  department_id: string;
  department_name: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'converted_to_po' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requested_date: string;
  needed_by_date?: string;
  approved_date?: string;
  approved_by?: string;
  po_id?: string;
  po_number?: string;
  total_estimated: number;
  notes?: string;
  line_items: PurchaseRequestLineItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestLineItem {
  line_id: string;
  request_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  estimated_unit_price: number;
  estimated_total: number;
  suggested_vendor_id?: string;
  suggested_vendor_name?: string;
  is_stock: boolean;
  notes?: string;
}

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  net_10: 'Net 10',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
  net_90: 'Net 90',
  cod: 'COD',
  prepaid: 'Prepaid',
  direct_pay: 'Direct Pay',
};

export const PO_TYPE_LABELS: Record<POType, string> = {
  material: 'Material',
  service: 'Service',
  capex: 'CapEx',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  submitted: 'Submitted',
  ordered: 'Ordered',
  partial_received: 'Partial Received',
  received: 'Received',
  pending_service: 'Pending Service',
  service_complete: 'Service Complete',
  pending_invoice: 'Pending Invoice',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft: '#6B7280',
  pending_approval: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  submitted: '#3B82F6',
  ordered: '#8B5CF6',
  partial_received: '#F97316',
  received: '#059669',
  pending_service: '#F97316',
  service_complete: '#06B6D4',
  pending_invoice: '#8B5CF6',
  closed: '#374151',
  cancelled: '#DC2626',
};

export type RequestStatus = 'draft' | 'submitted' | 'under_review' | 'pending_manager_approval' | 'approved' | 'rejected' | 'converted' | 'cancelled';

export type RequisitionStatus = 'draft' | 'pending_tier2_approval' | 'pending_tier3_approval' | 'ready_for_po' | 'rejected' | 'converted_to_po' | 'cancelled';

export interface PurchaseRequisition {
  requisition_id: string;
  requisition_number: string;
  source_request_id?: string;
  source_request_number?: string;
  created_by_id: string;
  created_by_name: string;
  department_id: string;
  department_name: string;
  vendor_id?: string;
  vendor_name?: string;
  status: RequisitionStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requisition_type: POType;
  requested_date: string;
  needed_by_date?: string;
  approved_date?: string;
  approved_by?: string;
  rejected_date?: string;
  rejected_by?: string;
  rejection_reason?: string;
  po_id?: string;
  po_number?: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
  justification?: string;
  line_items: RequisitionLineItem[];
  created_at: string;
  updated_at: string;
}

export interface RequisitionLineItem {
  line_id: string;
  requisition_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  suggested_vendor_id?: string;
  suggested_vendor_name?: string;
  is_stock: boolean;
  gl_account?: string;
  cost_center?: string;
  uom?: string;
  notes?: string;
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  pending_manager_approval: 'Pending Manager Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted to Requisition',
  cancelled: 'Cancelled',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  draft: '#6B7280',
  submitted: '#3B82F6',
  under_review: '#F59E0B',
  pending_manager_approval: '#8B5CF6',
  approved: '#10B981',
  rejected: '#EF4444',
  converted: '#8B5CF6',
  cancelled: '#DC2626',
};

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: 'Draft',
  pending_tier2_approval: 'Pending Tier 2 Approval',
  pending_tier3_approval: 'Pending Tier 3 Approval',
  ready_for_po: 'Ready for PO',
  rejected: 'Rejected',
  converted_to_po: 'Converted to PO',
  cancelled: 'Cancelled',
};

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  draft: '#6B7280',
  pending_tier2_approval: '#F59E0B',
  pending_tier3_approval: '#8B5CF6',
  ready_for_po: '#10B981',
  rejected: '#EF4444',
  converted_to_po: '#3B82F6',
  cancelled: '#DC2626',
};

export const APPROVAL_TIER_THRESHOLDS = {
  TIER_2: 1000,
  TIER_3: 5000,
};

export const APPROVAL_TIER_LABELS: Record<number, string> = {
  1: 'Department Manager',
  2: 'Plant Manager',
  3: 'Owner/Executive',
};

export function getRequiredApprovalTiers(amount: number): number[] {
  if (amount >= APPROVAL_TIER_THRESHOLDS.TIER_3) {
    return [2, 3];
  } else if (amount >= APPROVAL_TIER_THRESHOLDS.TIER_2) {
    return [2];
  }
  return [];
}

export type SESStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'posted';

export interface ServiceEntrySheet {
  ses_id: string;
  ses_number: string;
  po_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  department_id: string;
  department_name: string;
  status: SESStatus;
  completion_date: string;
  total_amount: number;
  notes?: string;
  attachments?: string[];
  created_date: string;
  created_by: string;
  submitted_date?: string;
  approved_date?: string;
  approved_by?: string;
  posted_date?: string;
  line_items: SESLineItem[];
}

export interface SESLineItem {
  line_id: string;
  ses_id: string;
  po_line_id: string;
  description: string;
  ordered_qty: number;
  actual_qty: number;
  rate: number;
  line_total: number;
  notes?: string;
}

export type FixedAssetStatus = 'active' | 'disposed' | 'transferred' | 'under_maintenance';

export interface FixedAsset {
  asset_id: string;
  asset_tag: string;
  description: string;
  category: 'equipment' | 'machinery' | 'building_improvement' | 'technology' | 'furniture' | 'vehicles';
  po_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  department_id: string;
  department_name: string;
  location: string;
  cost: number;
  useful_life_years: number;
  placed_in_service_date: string;
  status: FixedAssetStatus;
  created_date: string;
  created_by: string;
  notes?: string;
}

export interface MaterialReceipt {
  receipt_id: string;
  receipt_number: string;
  po_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  receipt_date: string;
  received_by: string;
  total_lines: number;
  notes?: string;
  line_items: MaterialReceiptLine[];
}

export interface MaterialReceiptLine {
  line_id: string;
  receipt_id: string;
  po_line_id: string;
  material_id?: string;
  material_sku?: string;
  description: string;
  ordered_qty: number;
  previously_received: number;
  received_qty: number;
  is_stock: boolean;
  uom?: string;
}

export const SES_STATUS_LABELS: Record<SESStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Posted',
};

export const SES_STATUS_COLORS: Record<SESStatus, string> = {
  draft: '#6B7280',
  pending_approval: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  posted: '#059669',
};

export const ASSET_CATEGORY_LABELS: Record<FixedAsset['category'], string> = {
  equipment: 'Equipment',
  machinery: 'Machinery',
  building_improvement: 'Building Improvement',
  technology: 'Technology',
  furniture: 'Furniture',
  vehicles: 'Vehicles',
};

export type VendorDocumentType = 'contract' | 'warranty' | 'guarantee' | 'certificate' | 'insurance' | 'other';

export type VendorDocumentStatus = 'active' | 'expired' | 'pending' | 'cancelled';

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: VendorDocumentType;
  title: string;
  description?: string;
  document_number?: string;
  start_date: string;
  end_date?: string;
  expiration_date?: string;
  value?: number;
  terms?: string;
  status: VendorDocumentStatus;
  file_url?: string;
  file_name?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VendorRating {
  id: string;
  vendor_id: string;
  rating_period: string;
  quality_score: number;
  delivery_score: number;
  price_score: number;
  service_score: number;
  overall_score: number;
  comments?: string;
  rated_by: string;
  rated_by_name: string;
  created_at: string;
}

export const VENDOR_DOCUMENT_TYPE_LABELS: Record<VendorDocumentType, string> = {
  contract: 'Contract',
  warranty: 'Warranty',
  guarantee: 'Guarantee',
  certificate: 'Certificate',
  insurance: 'Insurance',
  other: 'Other',
};

export const VENDOR_DOCUMENT_STATUS_LABELS: Record<VendorDocumentStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

export const VENDOR_DOCUMENT_STATUS_COLORS: Record<VendorDocumentStatus, string> = {
  active: '#10B981',
  expired: '#EF4444',
  pending: '#F59E0B',
  cancelled: '#6B7280',
};

export type ServiceRequisitionStatus = 
  | 'draft' 
  | 'pending_tier2_approval' 
  | 'pending_tier3_approval' 
  | 'approved' 
  | 'rejected' 
  | 'posted';

export interface ServiceRequisition {
  id: string;
  requisition_number: string;
  source_po_id: string;
  source_po_number: string;
  vendor_id: string;
  vendor_name: string;
  department_id: string;
  department_name: string;
  service_type: string;
  service_category: string;
  service_description: string;
  scope_of_work?: string;
  status: ServiceRequisitionStatus;
  invoice_number?: string;
  invoice_date?: string;
  invoice_amount: number;
  original_estimate: number;
  variance: number;
  variance_percent: number;
  variance_reason?: string;
  service_completion_date?: string;
  service_start_date?: string;
  service_end_date?: string;
  gl_account?: string;
  cost_center?: string;
  current_approval_tier: number;
  required_tiers: number[];
  tier2_approved_by?: string;
  tier2_approved_at?: string;
  tier3_approved_by?: string;
  tier3_approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_by: string;
  created_by_id?: string;
  notes?: string;
  line_items: ServiceRequisitionLineItem[];
  created_at: string;
  updated_at: string;
}

export interface ServiceRequisitionLineItem {
  line_id: string;
  requisition_id: string;
  line_number: number;
  description: string;
  estimated_hours: number;
  actual_hours: number;
  hourly_rate: number;
  estimated_total: number;
  actual_total: number;
  variance: number;
  notes?: string;
}

export const SERVICE_REQUISITION_STATUS_LABELS: Record<ServiceRequisitionStatus, string> = {
  draft: 'Draft',
  pending_tier2_approval: 'Pending Plant Manager',
  pending_tier3_approval: 'Pending Owner/Exec',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Posted to SES',
};

export const SERVICE_REQUISITION_STATUS_COLORS: Record<ServiceRequisitionStatus, string> = {
  draft: '#6B7280',
  pending_tier2_approval: '#F59E0B',
  pending_tier3_approval: '#8B5CF6',
  approved: '#10B981',
  rejected: '#EF4444',
  posted: '#059669',
};

export function getServiceReqApprovalTiers(amount: number): number[] {
  if (amount >= APPROVAL_TIER_THRESHOLDS.TIER_3) {
    return [2, 3];
  } else if (amount >= APPROVAL_TIER_THRESHOLDS.TIER_2) {
    return [2];
  }
  return [];
}
