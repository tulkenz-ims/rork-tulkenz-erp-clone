import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const hasValidConfig = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

if (!supabaseUrl) {
  console.error('[Supabase] ❌ MISSING: EXPO_PUBLIC_SUPABASE_URL environment variable is not set');
}
if (!supabaseAnonKey) {
  console.error('[Supabase] ❌ MISSING: EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
}
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('[Supabase] ❌ INVALID: EXPO_PUBLIC_SUPABASE_URL must start with https://');
}

if (hasValidConfig) {
  console.log('[Supabase] ✅ Initializing with URL:', supabaseUrl.substring(0, 40) + '...');
} else {
  console.error('[Supabase] ⚠️ Client will be created but API calls will fail without valid credentials');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: async (url, options = {}) => {
      if (!hasValidConfig) {
        const configError = new Error(
          'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.'
        );
        console.error('[Supabase] ❌ Configuration Error:', configError.message);
        throw configError;
      }

      if (options?.signal) {
        try {
          const response = await fetch(url, options);
          return response;
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('[Supabase] Request cancelled (component unmounted or query invalidated)');
            throw error;
          }
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Supabase] Fetch error:', errorMessage);
          throw new Error(`Supabase fetch failed: ${errorMessage}`);
        }
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[Supabase] Request timed out after 30s');
          throw new Error('Supabase request timed out after 30 seconds');
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Supabase] Fetch error:', errorMessage);
        throw new Error(`Supabase fetch failed: ${errorMessage}`);
      }
    },
  },
});

export function isSupabaseConfigured(): boolean {
  return hasValidConfig;
}

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  if (!hasValidConfig) {
    const msg = 'Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.';
    console.error('[Supabase] ❌', msg);
    return { success: false, error: msg };
  }
  
  try {
    const { error } = await supabase.from('organizations').select('id').limit(1);
    if (error) {
      console.error('[Supabase] Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
    console.log('[Supabase] ✅ Connection test successful');
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Supabase] Connection test exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export type Tables = {
  organizations: {
    id: string;
    name: string;
    code: string;
    subscription_tier: 'starter' | 'professional' | 'enterprise' | 'enterprise_plus';
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    tagline: string | null;
    website: string | null;
    support_email: string | null;
    support_phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
    industry: string | null;
    employee_count_range: string | null;
    fiscal_year_start_month: number | null;
    timezone: string | null;
    date_format: string | null;
    time_format: '12h' | '24h' | null;
    currency: string | null;
    language: string | null;
    created_at: string;
    updated_at: string;
  };
  facilities: {
    id: string;
    organization_id: string;
    name: string;
    facility_code: string;
    address: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  employees: {
    id: string;
    organization_id: string;
    facility_id: string | null;
    employee_code: string;
    pin: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    position: string;
    hire_date: string;
    status: 'active' | 'inactive' | 'on_leave';
    hourly_rate: number | null;
    pto_balance: number | null;
    department_code: string | null;
    cost_center: string | null;
    gl_account: string | null;
    manager_id: string | null;
    profile: Record<string, unknown> | null;
    availability: Record<string, unknown> | null;
    time_off_balances: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  };
  materials: {
    id: string;
    organization_id: string;
    material_number: string;
    inventory_department: number;
    name: string;
    sku: string;
    category: string;
    description: string | null;
    on_hand: number;
    min_level: number;
    max_level: number;
    unit_price: number;
    unit_of_measure: string;
    facility_id: string | null;
    location_id: string | null;
    location: string | null;
    bin: string | null;
    aisle: string | null;
    rack: string | null;
    shelf: string | null;
    barcode: string | null;
    qr_code: string | null;
    vendor: string | null;
    vendor_part_number: string | null;
    manufacturer: string | null;
    manufacturer_part_number: string | null;
    lead_time_days: number | null;
    classification: 'stock' | 'consumable' | 'chargeable' | 'shared';
    status: 'active' | 'inactive' | 'discontinued' | 'pending_approval';
    department_code: string | null;
    cost_center: string | null;
    gl_account: string | null;
    created_at: string;
    updated_at: string;
  };
  work_orders: {
    id: string;
    organization_id: string;
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'completed' | 'overdue' | 'on_hold' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    type: 'corrective' | 'preventive' | 'emergency' | 'request';
    assigned_to: string | null;
    facility_id: string;
    equipment_id: string | null;
    equipment: string | null;
    due_date: string;
    started_at: string | null;
    completed_at: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    notes: string | null;
    completion_notes: string | null;
    department: string | null;
    department_name: string | null;
    source: string | null;
    source_id: string | null;
    created_at: string;
    updated_at: string;
  };
  purchase_orders: {
    id: string;
    organization_id: string;
    order_type: 'parts' | 'service';
    vendor: string;
    total: number;
    status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'completed';
    requested_by: string;
    created_by_id: string;
    department_code: string | null;
    cost_center: string | null;
    facility_code: string | null;
    gl_account: string | null;
    requisition_number: string | null;
    po_number: string | null;
    migo_number: string | null;
    notes: string | null;
    urgency: 'low' | 'normal' | 'high' | 'critical' | null;
    created_at: string;
    updated_at: string;
  };
  equipment: {
    id: string;
    organization_id: string;
    facility_id: string;
    name: string;
    equipment_tag: string;
    category: string;
    status: 'operational' | 'down' | 'needs_maintenance' | 'retired';
    location: string;
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    install_date: string | null;
    warranty_expiry: string | null;
    criticality: 'critical' | 'high' | 'medium' | 'low';
    last_pm_date: string | null;
    next_pm_date: string | null;
    created_at: string;
    updated_at: string;
  };
  inventory_history: {
    id: string;
    organization_id: string;
    material_id: string;
    material_name: string;
    material_sku: string;
    action: 'adjustment' | 'count' | 'receive' | 'issue' | 'transfer' | 'create' | 'delete';
    quantity_before: number;
    quantity_after: number;
    quantity_change: number;
    reason: string | null;
    performed_by: string;
    notes: string | null;
    created_at: string;
  };
  inventory_labels: {
    id: string;
    organization_id: string;
    name: string;
    color: string;
    description: string | null;
    created_at: string;
  };
  count_sessions: {
    id: string;
    organization_id: string;
    name: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    facility_id: string | null;
    facility_name: string | null;
    category: string | null;
    created_by: string;
    items: Record<string, unknown>[];
    total_items: number;
    counted_items: number;
    variance_count: number;
    notes: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  assets: {
    id: string;
    organization_id: string;
    facility_id: string | null;
    name: string;
    asset_tag: string;
    category: string;
    status: 'active' | 'inactive' | 'maintenance' | 'retired';
    location: string | null;
    serial_number: string | null;
    manufacturer: string | null;
    model: string | null;
    purchase_date: string | null;
    warranty_expiry: string | null;
    assigned_to: string | null;
    barcode: string | null;
    qr_code: string | null;
    department_code: string | null;
    cost_center: string | null;
    gl_account: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  approvals: {
    id: string;
    organization_id: string;
    type: 'purchase' | 'time_off' | 'overtime' | 'schedule_change' | 'permit';
    title: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected' | 'partially_approved' | 'expired';
    requested_by: string;
    requester_id: string;
    urgency: 'low' | 'medium' | 'high';
    amount: number | null;
    created_at: string;
    updated_at: string;
  };
  vendors: {
    id: string;
    organization_id: string;
    vendor_code: string;
    name: string;
    type: 'supplier' | 'service' | 'contractor';
    status: 'active' | 'inactive' | 'pending_approval' | 'suspended';
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    payment_terms: string | null;
    tax_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  pm_schedules: {
    id: string;
    organization_id: string;
    equipment_id: string;
    name: string;
    description: string | null;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimated_hours: number;
    assigned_to: string | null;
    last_completed: string | null;
    next_due: string;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  tasks: {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    category: string | null;
    assigned_to: string | null;
    due_date: string | null;
    created_at: string;
    updated_at: string;
  };
  time_punches: {
    id: string;
    organization_id: string;
    employee_id: string;
    type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
    timestamp: string;
    location: string | null;
    notes: string | null;
    created_at: string;
  };
  time_entries: {
    id: string;
    organization_id: string;
    employee_id: string;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    break_minutes: number;
    total_hours: number;
    status: 'active' | 'completed' | 'pending_approval' | 'approved';
    shift_id: string | null;
    created_at: string;
    updated_at: string;
  };
  time_off_requests: {
    id: string;
    organization_id: string;
    employee_id: string;
    employee_name: string;
    type: 'vacation' | 'sick' | 'personal' | 'unpaid';
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    manager_id: string | null;
    manager_name: string | null;
    responded_at: string | null;
    created_at: string;
    updated_at: string;
  };
  shifts: {
    id: string;
    organization_id: string;
    employee_id: string;
    employee_name: string;
    date: string;
    start_time: string;
    end_time: string;
    facility_id: string | null;
    position: string | null;
    status: 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  procurement_vendors: {
    id: string;
    organization_id: string;
    vendor_code: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string;
    payment_terms: 'net_10' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90' | 'cod' | 'prepaid' | 'direct_pay';
    active: boolean;
    vendor_type: 'supplier' | 'service' | 'contractor' | 'distributor';
    tax_id: string | null;
    website: string | null;
    categories: string[];
    certifications: Record<string, unknown>[];
    insurance: Record<string, unknown>;
    performance: Record<string, unknown>;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  purchase_requests: {
    id: string;
    organization_id: string;
    request_number: string;
    requester_id: string | null;
    requester_name: string;
    department_id: string | null;
    department_name: string | null;
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    requested_date: string;
    needed_by_date: string | null;
    approved_date: string | null;
    approved_by: string | null;
    requisition_id: string | null;
    requisition_number: string | null;
    total_estimated: number;
    notes: string | null;
    line_items: Record<string, unknown>[];
    created_at: string;
    updated_at: string;
  };
  purchase_requisitions: {
    id: string;
    organization_id: string;
    requisition_number: string;
    source_request_id: string | null;
    source_request_number: string | null;
    created_by_id: string | null;
    created_by_name: string;
    department_id: string | null;
    department_name: string | null;
    vendor_id: string | null;
    vendor_name: string | null;
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'converted_to_po' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    requisition_type: 'material' | 'service' | 'capex';
    requested_date: string;
    needed_by_date: string | null;
    approved_date: string | null;
    approved_by: string | null;
    rejected_date: string | null;
    rejected_by: string | null;
    rejection_reason: string | null;
    po_id: string | null;
    po_number: string | null;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    notes: string | null;
    justification: string | null;
    line_items: Record<string, unknown>[];
    created_at: string;
    updated_at: string;
  };
  procurement_purchase_orders: {
    id: string;
    organization_id: string;
    po_number: string;
    po_type: 'material' | 'service' | 'capex';
    vendor_id: string | null;
    vendor_name: string;
    department_id: string | null;
    department_name: string | null;
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'submitted' | 'ordered' | 'partial_received' | 'received' | 'closed' | 'cancelled';
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    created_date: string;
    created_by: string;
    created_by_id: string | null;
    submitted_date: string | null;
    approved_date: string | null;
    approved_by: string | null;
    expected_delivery: string | null;
    received_date: string | null;
    source_requisition_id: string | null;
    source_requisition_number: string | null;
    notes: string | null;
    attachments: Record<string, unknown>[];
    line_items: Record<string, unknown>[];
    created_at: string;
    updated_at: string;
  };
  po_approvals: {
    id: string;
    organization_id: string;
    po_id: string | null;
    requisition_id: string | null;
    approval_type: 'requisition' | 'purchase_order';
    tier: number;
    tier_name: string | null;
    approver_id: string | null;
    approver_name: string;
    approver_role: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    amount_threshold: number | null;
    decision_date: string | null;
    comments: string | null;
    created_at: string;
    updated_at: string;
  };
  material_receipts: {
    id: string;
    organization_id: string;
    receipt_number: string;
    po_id: string | null;
    po_number: string | null;
    vendor_id: string | null;
    vendor_name: string | null;
    receipt_date: string;
    received_by: string | null;
    received_by_name: string;
    total_lines: number;
    notes: string | null;
    line_items: Record<string, unknown>[];
    created_at: string;
  };
  shift_swaps: {
    id: string;
    organization_id: string;
    requester_id: string;
    requester_name: string;
    requester_shift_id: string;
    target_employee_id: string | null;
    target_employee_name: string | null;
    target_shift_id: string | null;
    swap_type: 'swap' | 'giveaway' | 'pickup';
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'manager_pending' | 'manager_approved' | 'manager_rejected' | 'completed';
    reason: string | null;
    requester_date: string;
    requester_start_time: string;
    requester_end_time: string;
    target_date: string | null;
    target_start_time: string | null;
    target_end_time: string | null;
    responded_at: string | null;
    manager_id: string | null;
    manager_name: string | null;
    manager_approved_at: string | null;
    manager_notes: string | null;
    created_at: string;
    updated_at: string;
  };
  inspection_templates: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    category: 'safety' | 'quality' | 'compliance' | 'equipment' | 'custom';
    icon: string | null;
    color: string | null;
    fields: Record<string, unknown>[];
    tracked_item_type: string | null;
    frequency_required: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'as_needed' | null;
    default_day_of_week: string | null;
    default_day_of_month: number | null;
    notify_before_days: number | null;
    requires_photos: boolean;
    opl_documents: string[] | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  tracked_items: {
    id: string;
    organization_id: string;
    template_id: string;
    item_number: string;
    name: string;
    location: string | null;
    assigned_to: string | null;
    item_type: string | null;
    status: 'active' | 'inactive' | 'retired';
    date_assigned: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  };
  inspection_records: {
    id: string;
    organization_id: string;
    template_id: string;
    template_name: string;
    schedule_id: string | null;
    tracked_item_id: string | null;
    tracked_item_number: string | null;
    inspector_id: string;
    inspector_name: string;
    inspection_date: string;
    result: 'pass' | 'fail' | 'needs_attention' | 'n/a';
    field_values: Record<string, unknown>;
    notes: string | null;
    photos: string[] | null;
    attachments: Record<string, unknown>[] | null;
    corrective_action: string | null;
    follow_up_required: boolean;
    follow_up_date: string | null;
    follow_up_completed: boolean | null;
    location: string | null;
    created_at: string;
    updated_at: string;
  };
  inspection_schedules: {
    id: string;
    organization_id: string;
    template_id: string;
    template_name: string;
    name: string;
    description: string | null;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly' | 'as_needed';
    day_of_week: string | null;
    day_of_month: number | null;
    month_of_year: number | null;
    next_due: string;
    last_completed: string | null;
    assigned_to: string | null;
    assigned_name: string | null;
    facility_id: string | null;
    notify_before_days: number;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  tracked_item_changes: {
    id: string;
    organization_id: string;
    tracked_item_id: string;
    item_number: string;
    change_type: 'assignment' | 'location' | 'status' | 'metadata';
    previous_value: string | null;
    new_value: string | null;
    reason: string | null;
    changed_by: string;
    changed_at: string;
    created_at: string;
  };
  task_locations: {
    id: string;
    organization_id: string;
    code: string;
    name: string;
    department_code: string | null;
    facility_code: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  task_categories: {
    id: string;
    organization_id: string;
    name: string;
    department_code: string | null;
    locations: string[];
    actions: string[];
    requires_photo: boolean;
    requires_notes: boolean;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  task_verifications: {
    id: string;
    organization_id: string;
    department_code: string | null;
    department_name: string | null;
    facility_code: string | null;
    location_id: string | null;
    location_name: string | null;
    category_id: string | null;
    category_name: string | null;
    action: string;
    notes: string | null;
    photo_uri: string | null;
    employee_id: string;
    employee_name: string;
    status: 'verified' | 'flagged' | 'pending_review';
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    source_type: 'manual' | 'work_order' | 'pm_work_order' | 'inspection' | 'permit' | 'work_request' | 'issue_report' | null;
    source_id: string | null;
    source_number: string | null;
    linked_work_order_id: string | null;
    created_at: string;
    updated_at: string;
  };
  document_categories: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    color: string;
    icon: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  documents: {
    id: string;
    organization_id: string;
    document_number: string;
    title: string;
    description: string | null;
    document_type: 'sop' | 'policy' | 'specification' | 'manual' | 'procedure' | 'form' | 'template' | 'training' | 'certificate' | 'other';
    category_id: string | null;
    category_name: string | null;
    department_code: string | null;
    department_name: string | null;
    facility_id: string | null;
    status: 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'active' | 'revision' | 'obsolete' | 'archived';
    version: string;
    revision_number: number;
    effective_date: string | null;
    expiration_date: string | null;
    review_date: string | null;
    file_url: string | null;
    file_name: string | null;
    file_type: string | null;
    file_size: number | null;
    author: string;
    author_id: string | null;
    owner: string | null;
    owner_id: string | null;
    reviewer: string | null;
    reviewer_id: string | null;
    reviewed_at: string | null;
    approver: string | null;
    approver_id: string | null;
    approved_at: string | null;
    tags: string[];
    keywords: string[];
    is_controlled: boolean;
    requires_acknowledgment: boolean;
    access_level: 'public' | 'internal' | 'confidential' | 'restricted';
    related_documents: string[];
    supersedes_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  document_versions: {
    id: string;
    organization_id: string;
    document_id: string;
    version: string;
    revision_number: number;
    file_url: string | null;
    file_name: string | null;
    change_summary: string | null;
    changed_by: string;
    changed_by_id: string | null;
    approved_by: string | null;
    approved_by_id: string | null;
    approved_at: string | null;
    effective_date: string | null;
    created_at: string;
  };
  document_acknowledgments: {
    id: string;
    organization_id: string;
    document_id: string;
    employee_id: string;
    employee_name: string;
    acknowledged_at: string;
    version_acknowledged: string;
  };
  sds_records: {
    id: string;
    organization_id: string;
    sds_number: string;
    product_name: string;
    manufacturer: string;
    manufacturer_phone: string | null;
    manufacturer_address: string | null;
    emergency_phone: string | null;
    cas_number: string | null;
    un_number: string | null;
    chemical_family: string | null;
    synonyms: string[];
    physical_state: 'solid' | 'liquid' | 'gas' | 'aerosol' | 'paste' | 'powder' | null;
    color: string | null;
    odor: string | null;
    ph_range: string | null;
    flash_point: string | null;
    boiling_point: string | null;
    melting_point: string | null;
    vapor_pressure: string | null;
    specific_gravity: string | null;
    solubility: string | null;
    hazard_class: string[];
    ghs_pictograms: string[];
    signal_word: 'danger' | 'warning' | 'none' | null;
    hazard_statements: string[];
    precautionary_statements: string[];
    health_hazards: string | null;
    fire_hazards: string | null;
    reactivity_hazards: string | null;
    environmental_hazards: string | null;
    routes_of_exposure: string[];
    symptoms_of_exposure: string | null;
    first_aid_inhalation: string | null;
    first_aid_skin: string | null;
    first_aid_eye: string | null;
    first_aid_ingestion: string | null;
    fire_extinguishing_media: string | null;
    fire_fighting_procedures: string | null;
    spill_procedures: string | null;
    handling_precautions: string | null;
    storage_requirements: string | null;
    ppe_requirements: Record<string, unknown>;
    exposure_limits: Record<string, unknown>;
    engineering_controls: string | null;
    disposal_methods: string | null;
    transport_info: Record<string, unknown>;
    regulatory_info: Record<string, unknown>;
    file_url: string | null;
    file_name: string | null;
    file_type: string | null;
    file_size: number | null;
    revision_date: string | null;
    issue_date: string;
    expiration_date: string | null;
    review_date: string | null;
    status: 'active' | 'expired' | 'superseded' | 'archived';
    version: string;
    location_used: string[];
    department_codes: string[];
    approved_for_use: boolean;
    approved_by: string | null;
    approved_by_id: string | null;
    approved_at: string | null;
    supersedes_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  sds_training_records: {
    id: string;
    organization_id: string;
    sds_id: string;
    employee_id: string;
    employee_name: string;
    training_date: string;
    trainer: string | null;
    trainer_id: string | null;
    training_type: 'initial' | 'refresher' | 'update';
    notes: string | null;
    created_at: string;
  };
  bulletin_posts: {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    created_by: string | null;
    created_by_name: string;
    priority: 'normal' | 'important' | 'urgent';
    expires_at: string | null;
    pinned: boolean;
    created_at: string;
    updated_at: string;
  };
  part_requests: {
    id: string;
    organization_id: string;
    request_number: string;
    work_order_id: string | null;
    work_order_number: string | null;
    status: 'pending_approval' | 'approved' | 'rejected' | 'partially_issued' | 'issued' | 'completed' | 'cancelled';
    requested_by: string | null;
    requested_by_name: string;
    approved_by: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    lines: Record<string, unknown>[];
    total_estimated_cost: number;
    total_actual_cost: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  workflow_templates: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    category: 'purchase' | 'time_off' | 'permit' | 'expense' | 'contract' | 'custom';
    is_active: boolean;
    is_default: boolean;
    version: number;
    conditions: Record<string, unknown>[];
    tags: string[];
    usage_count: number;
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
  };
  workflow_steps: {
    id: string;
    organization_id: string;
    template_id: string;
    step_order: number;
    name: string;
    type: 'approval' | 'review' | 'notification' | 'condition' | 'parallel';
    description: string | null;
    approvers: Record<string, unknown>[];
    required_approvals: number;
    conditions: Record<string, unknown>[];
    skip_conditions: Record<string, unknown>[];
    escalation: Record<string, unknown> | null;
    parallel_steps: string[];
    allow_delegation: boolean;
    allow_reassign: boolean;
    timeout_days: number | null;
    created_at: string;
    updated_at: string;
  };
  delegation_rules: {
    id: string;
    organization_id: string;
    from_user_id: string;
    from_user_name: string;
    to_user_id: string;
    to_user_name: string;
    start_date: string;
    end_date: string;
    workflow_ids: string[];
    is_active: boolean;
    reason: string | null;
    created_at: string;
    updated_at: string;
  };
  workflow_instances: {
    id: string;
    organization_id: string;
    template_id: string;
    template_name: string;
    category: string;
    reference_id: string;
    reference_type: string;
    reference_title: string;
    current_step_id: string | null;
    current_step_order: number;
    status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'escalated';
    started_by: string;
    started_by_id: string | null;
    completed_at: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };
  workflow_step_history: {
    id: string;
    organization_id: string;
    instance_id: string;
    step_id: string;
    step_name: string;
    step_order: number;
    action: 'approved' | 'rejected' | 'skipped' | 'escalated' | 'delegated' | 'reassigned';
    action_by: string;
    action_by_id: string | null;
    comments: string | null;
    delegated_from: string | null;
    escalated_from: string | null;
    created_at: string;
  };
  service_requests: {
    id: string;
    organization_id: string;
    request_number: string;
    request_type: 'repair' | 'maintenance' | 'inspection' | 'installation' | 'modification' | 'safety' | 'cleaning' | 'other';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    urgency: 'low' | 'normal' | 'high' | 'urgent';
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted' | 'cancelled' | 'on_hold';
    requester_id: string;
    requester_name: string;
    requester_department: string | null;
    requester_phone: string | null;
    requester_email: string | null;
    facility_id: string | null;
    facility_name: string | null;
    equipment_id: string | null;
    equipment_name: string | null;
    equipment_tag: string | null;
    location: string | null;
    room_area: string | null;
    problem_started: string | null;
    is_equipment_down: boolean;
    is_safety_concern: boolean;
    is_production_impact: boolean;
    production_impact_description: string | null;
    reviewed_by: string | null;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    approved_by: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejected_by_name: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
    work_order_id: string | null;
    work_order_number: string | null;
    converted_at: string | null;
    converted_by: string | null;
    converted_by_name: string | null;
    preferred_date: string | null;
    preferred_time_start: string | null;
    preferred_time_end: string | null;
    availability_notes: string | null;
    estimated_cost: number | null;
    estimated_hours: number | null;
    requires_parts: boolean;
    parts_description: string | null;
    attachments: Record<string, unknown>[];
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
  };
  maintenance_alerts: {
    id: string;
    organization_id: string;
    alert_type: 'pm_due' | 'pm_overdue' | 'equipment_down' | 'equipment_critical' | 'meter_threshold' | 'warranty_expiring' | 'calibration_due' | 'inspection_due' | 'part_needed' | 'safety_concern' | 'compliance_deadline' | 'work_order_overdue' | 'recurring_failure' | 'high_downtime' | 'budget_threshold' | 'custom';
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'acknowledged' | 'snoozed' | 'resolved' | 'dismissed' | 'expired';
    title: string;
    message: string;
    details: Record<string, unknown>;
    facility_id: string | null;
    facility_name: string | null;
    equipment_id: string | null;
    equipment_name: string | null;
    equipment_tag: string | null;
    work_order_id: string | null;
    work_order_number: string | null;
    pm_schedule_id: string | null;
    metric_name: string | null;
    metric_value: number | null;
    threshold_value: number | null;
    threshold_type: 'above' | 'below' | 'equal' | 'approaching' | null;
    acknowledged_by: string | null;
    acknowledged_by_name: string | null;
    acknowledged_at: string | null;
    snoozed_until: string | null;
    snoozed_by: string | null;
    resolved_by: string | null;
    resolved_by_name: string | null;
    resolved_at: string | null;
    resolution_notes: string | null;
    dismissed_by: string | null;
    dismissed_at: string | null;
    dismiss_reason: string | null;
    notified_users: string[];
    notification_sent_at: string | null;
    escalated: boolean;
    escalated_at: string | null;
    escalated_to: string | null;
    is_auto_generated: boolean;
    generated_by: string | null;
    is_recurring: boolean;
    recurrence_count: number;
    last_occurrence: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
  };
  maintenance_activity_log: {
    id: string;
    organization_id: string;
    activity_type: string;
    facility_id: string | null;
    facility_name: string | null;
    equipment_id: string | null;
    equipment_name: string | null;
    equipment_tag: string | null;
    work_order_id: string | null;
    work_order_number: string | null;
    pm_schedule_id: string | null;
    pm_work_order_id: string | null;
    service_request_id: string | null;
    service_request_number: string | null;
    description: string;
    details: Record<string, unknown>;
    previous_value: string | null;
    new_value: string | null;
    performed_by: string;
    performed_by_name: string;
    performed_at: string;
    labor_hours: number | null;
    labor_cost: number | null;
    parts_used: Record<string, unknown>[];
    parts_cost: number | null;
    location: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  };
  equipment_downtime_log: {
    id: string;
    organization_id: string;
    equipment_id: string;
    equipment_name: string;
    equipment_tag: string;
    facility_id: string | null;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    downtime_type: 'breakdown' | 'planned_maintenance' | 'pm_scheduled' | 'emergency_repair' | 'waiting_parts' | 'waiting_approval' | 'operator_error' | 'setup_changeover' | 'calibration' | 'inspection' | 'power_outage' | 'utility_failure' | 'safety_stop' | 'quality_issue' | 'material_shortage' | 'no_operator' | 'external_factor' | 'unknown' | 'other';
    reason: string;
    root_cause: string | null;
    impact_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    production_impact: boolean;
    production_loss_units: number | null;
    production_loss_cost: number | null;
    work_order_id: string | null;
    work_order_number: string | null;
    service_request_id: string | null;
    repair_actions: string | null;
    parts_replaced: Record<string, unknown>[];
    labor_hours: number | null;
    repair_cost: number | null;
    reported_by: string;
    reported_by_name: string;
    repaired_by: string | null;
    repaired_by_name: string | null;
    failure_code: string | null;
    failure_category: string | null;
    is_recurring: boolean;
    previous_failure_id: string | null;
    status: 'ongoing' | 'resolved' | 'pending_parts' | 'pending_approval';
    notes: string | null;
    attachments: Record<string, unknown>[];
    created_at: string;
    updated_at: string;
  };
  planner_projects: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    status: 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
    priority: 'low' | 'medium' | 'high' | 'critical';
    color: string;
    icon: string | null;
    owner_id: string | null;
    owner_name: string | null;
    facility_id: string | null;
    department_code: string | null;
    department_name: string | null;
    start_date: string | null;
    target_end_date: string | null;
    actual_end_date: string | null;
    progress_percent: number;
    total_tasks: number;
    completed_tasks: number;
    budget_allocated: number | null;
    budget_used: number;
    tags: string[];
    metadata: Record<string, unknown>;
    notes: string | null;
    created_by: string;
    created_by_id: string | null;
    created_at: string;
    updated_at: string;
  };
  planner_tasks: {
    id: string;
    organization_id: string;
    task_number: string | null;
    title: string;
    description: string | null;
    status: 'pending' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string | null;
    task_type: 'task' | 'milestone' | 'meeting' | 'reminder' | 'event' | 'deadline';
    project_id: string | null;
    project_name: string | null;
    parent_task_id: string | null;
    assigned_to: string | null;
    assigned_to_name: string | null;
    assigned_by: string | null;
    assigned_by_name: string | null;
    assigned_at: string | null;
    team_members: string[];
    facility_id: string | null;
    facility_name: string | null;
    department_code: string | null;
    department_name: string | null;
    location: string | null;
    start_date: string | null;
    due_date: string | null;
    completed_date: string | null;
    start_time: string | null;
    end_time: string | null;
    all_day: boolean;
    timezone: string;
    estimated_hours: number | null;
    actual_hours: number;
    estimated_duration_minutes: number | null;
    actual_duration_minutes: number | null;
    progress_percent: number;
    is_recurring: boolean;
    recurrence_pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' | null;
    recurrence_interval: number;
    recurrence_days_of_week: number[];
    recurrence_day_of_month: number | null;
    recurrence_end_date: string | null;
    recurrence_count: number | null;
    recurring_parent_id: string | null;
    recurrence_instance_date: string | null;
    reminder_enabled: boolean;
    reminder_minutes_before: number[];
    reminder_sent: boolean;
    last_reminder_sent_at: string | null;
    depends_on: string[];
    blocks: string[];
    is_blocked: boolean;
    blocked_reason: string | null;
    work_order_id: string | null;
    work_order_number: string | null;
    equipment_id: string | null;
    equipment_name: string | null;
    pm_schedule_id: string | null;
    service_request_id: string | null;
    checklist: Record<string, unknown>[];
    checklist_completed: number;
    checklist_total: number;
    attachments: Record<string, unknown>[];
    notes: string | null;
    internal_notes: string | null;
    tags: string[];
    labels: string[];
    color: string | null;
    metadata: Record<string, unknown>;
    completed_by: string | null;
    completed_by_name: string | null;
    completion_notes: string | null;
    created_by: string;
    created_by_id: string | null;
    last_modified_by: string | null;
    last_modified_by_id: string | null;
    created_at: string;
    updated_at: string;
  };
  planner_task_dependencies: {
    id: string;
    organization_id: string;
    task_id: string;
    depends_on_task_id: string;
    dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    lag_days: number;
    is_critical: boolean;
    created_at: string;
  };
  planner_task_comments: {
    id: string;
    organization_id: string;
    task_id: string;
    content: string;
    comment_type: 'comment' | 'status_change' | 'assignment' | 'update' | 'system';
    is_internal: boolean;
    mentioned_users: string[];
    attachments: Record<string, unknown>[];
    created_by: string;
    created_by_id: string | null;
    edited_at: string | null;
    created_at: string;
  };
  planner_task_time_entries: {
    id: string;
    organization_id: string;
    task_id: string;
    employee_id: string;
    employee_name: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    is_running: boolean;
    is_billable: boolean;
    hourly_rate: number | null;
    total_cost: number | null;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  planner_task_templates: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    category: string | null;
    task_type: string;
    priority: string;
    default_duration_days: number | null;
    default_estimated_hours: number | null;
    default_assigned_to: string | null;
    default_checklist: Record<string, unknown>[];
    title_template: string;
    description_template: string | null;
    default_recurrence_pattern: string | null;
    default_recurrence_interval: number;
    tags: string[];
    is_active: boolean;
    usage_count: number;
    created_by: string;
    created_by_id: string | null;
    created_at: string;
    updated_at: string;
  };
  planner_views: {
    id: string;
    organization_id: string;
    name: string;
    view_type: 'calendar' | 'kanban' | 'list' | 'timeline' | 'gantt';
    is_default: boolean;
    is_shared: boolean;
    filters: Record<string, unknown>;
    sort_by: string | null;
    sort_direction: string;
    group_by: string | null;
    columns: Record<string, unknown>[];
    display_options: Record<string, unknown>;
    owner_id: string | null;
    owner_name: string | null;
    created_at: string;
    updated_at: string;
  };
  charge_transactions: {
    id: string;
    organization_id: string;
    transaction_number: string;
    timestamp: string;
    charge_type: 'consumable_issue' | 'chargeback' | 'interdepartmental' | 'adjustment';
    from_department: number;
    from_department_name: string;
    to_department: number;
    to_department_name: string;
    material_id: string | null;
    material_number: string;
    material_name: string;
    material_sku: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    debit_gl_account: string;
    debit_gl_account_name: string;
    credit_gl_account: string;
    credit_gl_account_name: string;
    status: 'pending' | 'approved' | 'posted' | 'rejected' | 'reversed';
    issued_by: string;
    issued_by_id: string | null;
    received_by: string | null;
    received_by_id: string | null;
    approved_by: string | null;
    approved_by_id: string | null;
    approved_at: string | null;
    posted_at: string | null;
    posted_by: string | null;
    reversed_at: string | null;
    reversed_by: string | null;
    reversed_by_id: string | null;
    reversal_reason: string | null;
    work_order_id: string | null;
    cost_center: string | null;
    project_code: string | null;
    notes: string | null;
    journal_entry_id: string | null;
    created_at: string;
    updated_at: string;
  };
  approval_tiers: {
    id: string;
    organization_id: string;
    name: string;
    description: string;
    level: number;
    category: 'purchase' | 'time_off' | 'permit' | 'expense' | 'contract' | 'custom';
    is_active: boolean;
    thresholds: Record<string, unknown>[];
    approvers: Record<string, unknown>[];
    require_all_approvers: boolean;
    auto_escalate_hours: number | null;
    auto_approve_on_timeout: boolean;
    notify_on_escalation: boolean;
    max_approval_days: number;
    color: string;
    icon: string | null;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
  };
  tier_configurations: {
    id: string;
    organization_id: string;
    name: string;
    description: string;
    category: 'purchase' | 'time_off' | 'permit' | 'expense' | 'contract' | 'custom';
    is_default: boolean;
    is_active: boolean;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
  };
  roles: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    color: string;
    is_system: boolean;
    permissions: { module: string; actions: string[] }[];
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  employee_roles: {
    id: string;
    organization_id: string;
    employee_id: string;
    role_id: string;
    assigned_by: string | null;
    assigned_at: string;
    created_at: string;
    updated_at: string;
  };
  task_feed_templates: {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    button_type: 'add_task' | 'report_issue' | 'request_purchase';
    triggering_department: string;
    assigned_departments: string[];
    form_fields: Record<string, unknown>[];
    photo_required: boolean;
    workflow_rules: Record<string, unknown>;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  task_feed_posts: {
    id: string;
    organization_id: string;
    facility_id: string | null;
    post_number: string;
    template_id: string | null;
    template_name: string;
    template_snapshot: Record<string, unknown> | null;
    button_type: 'add_task' | 'report_issue' | 'request_purchase';
    created_by: string;
    created_by_name: string;
    department: string;
    location_id: string | null;
    location_name: string | null;
    form_data: Record<string, unknown>;
    photo_url: string;
    photo_urls: string[] | null;
    notes: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'requires_followup';
    assigned_departments: string[];
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  task_feed_department_tasks: {
    id: string;
    organization_id: string;
    post_id: string;
    post_number: string;
    department_code: string;
    department_name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    completed_by: string | null;
    completed_by_name: string | null;
    completed_at: string | null;
    completion_notes: string | null;
    completion_photo_url: string | null;
    module_reference_type: string | null;
    module_reference_id: string | null;
    notified_at: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type TableName = keyof Tables;

// =============================================================================
// SUPABASE CRUD HELPER FUNCTIONS
// =============================================================================

export type QueryFilters<T> = {
  column: keyof T;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}[];

export type QueryOptions<T> = {
  filters?: QueryFilters<T>;
  orderBy?: { column: keyof T; ascending?: boolean };
  limit?: number;
  offset?: number;
  select?: string;
};

export async function fetchAll<T extends TableName>(
  table: T,
  organizationId: string,
  options?: QueryOptions<Tables[T]>
): Promise<{ data: Tables[T][] | null; error: Error | null }> {
  try {
    let query = supabase
      .from(table)
      .select(options?.select || '*')
      .eq('organization_id', organizationId);

    if (options?.filters) {
      for (const filter of options.filters) {
        const col = filter.column as string;
        switch (filter.operator) {
          case 'eq': query = query.eq(col, filter.value); break;
          case 'neq': query = query.neq(col, filter.value); break;
          case 'gt': query = query.gt(col, filter.value); break;
          case 'gte': query = query.gte(col, filter.value); break;
          case 'lt': query = query.lt(col, filter.value); break;
          case 'lte': query = query.lte(col, filter.value); break;
          case 'like': query = query.like(col, filter.value as string); break;
          case 'ilike': query = query.ilike(col, filter.value as string); break;
          case 'in': query = query.in(col, filter.value as unknown[]); break;
          case 'is': query = query.is(col, filter.value); break;
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column as string, { ascending: options.orderBy.ascending ?? true });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error(`[Supabase] fetchAll ${table} error:`, JSON.stringify(error, null, 2));
      console.error(`[Supabase] fetchAll ${table} error code:`, error.code);
      console.error(`[Supabase] fetchAll ${table} error message:`, error.message);
      console.error(`[Supabase] fetchAll ${table} error details:`, error.details);
      return { data: null, error: new Error(error.message || `Failed to fetch ${table}`) };
    }
    
    console.log(`[Supabase] fetchAll ${table}: ${data?.length || 0} records`);
    return { data: data as unknown as Tables[T][], error: null };
  } catch (err) {
    console.error(`[Supabase] fetchAll ${table} exception:`, err);
    return { data: null, error: err as Error };
  }
}

export async function fetchById<T extends TableName>(
  table: T,
  id: string,
  organizationId: string
): Promise<{ data: Tables[T] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error(`[Supabase] fetchById ${table}/${id} error:`, error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`[Supabase] fetchById ${table}/${id}: found`);
    return { data: data as unknown as Tables[T], error: null };
  } catch (err) {
    console.error(`[Supabase] fetchById ${table}/${id} exception:`, err);
    return { data: null, error: err as Error };
  }
}

export async function insertRecord<T extends TableName>(
  table: T,
  record: Omit<Tables[T], 'id' | 'created_at' | 'updated_at'> & { organization_id: string }
): Promise<{ data: Tables[T] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(record as Record<string, unknown>)
      .select()
      .single();

    if (error) {
      console.error(`[Supabase] insert ${table} error:`, error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`[Supabase] insert ${table}: created ${data?.id}`);
    return { data: data as unknown as Tables[T], error: null };
  } catch (err) {
    console.error(`[Supabase] insert ${table} exception:`, err);
    return { data: null, error: err as Error };
  }
}

export async function insertMany<T extends TableName>(
  table: T,
  records: (Omit<Tables[T], 'id' | 'created_at' | 'updated_at'> & { organization_id: string })[]
): Promise<{ data: Tables[T][] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(records as Record<string, unknown>[])
      .select();

    if (error) {
      console.error(`[Supabase] insertMany ${table} error:`, error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`[Supabase] insertMany ${table}: created ${data?.length || 0} records`);
    return { data: data as unknown as Tables[T][], error: null };
  } catch (err) {
    console.error(`[Supabase] insertMany ${table} exception:`, err);
    return { data: null, error: err as Error };
  }
}

export async function updateRecord<T extends TableName>(
  table: T,
  id: string,
  updates: Partial<Tables[T]>,
  organizationId: string
): Promise<{ data: Tables[T] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error(`[Supabase] update ${table}/${id} error:`, error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`[Supabase] update ${table}/${id}: success`);
    return { data: data as unknown as Tables[T], error: null };
  } catch (err) {
    console.error(`[Supabase] update ${table}/${id} exception:`, err);
    return { data: null, error: err as Error };
  }
}

export async function deleteRecord<T extends TableName>(
  table: T,
  id: string,
  organizationId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      console.error(`[Supabase] delete ${table}/${id} error:`, error);
      return { success: false, error: new Error(error.message) };
    }

    console.log(`[Supabase] delete ${table}/${id}: success`);
    return { success: true, error: null };
  } catch (err) {
    console.error(`[Supabase] delete ${table}/${id} exception:`, err);
    return { success: false, error: err as Error };
  }
}

export async function upsertRecord<T extends TableName>(
  table: T,
  record: Partial<Tables[T]> & { organization_id: string },
  onConflict?: string
): Promise<{ data: Tables[T] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(record as Record<string, unknown>, { onConflict })
      .select()
      .single();

    if (error) {
      console.error(`[Supabase] upsert ${table} error:`, error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`[Supabase] upsert ${table}: success`);
    return { data: data as unknown as Tables[T], error: null };
  } catch (err) {
    console.error(`[Supabase] upsert ${table} exception:`, err);
    return { data: null, error: err as Error };
  }
}

export async function countRecords<T extends TableName>(
  table: T,
  organizationId: string,
  filters?: QueryFilters<Tables[T]>
): Promise<{ count: number | null; error: Error | null }> {
  try {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (filters) {
      for (const filter of filters) {
        const col = filter.column as string;
        switch (filter.operator) {
          case 'eq': query = query.eq(col, filter.value); break;
          case 'neq': query = query.neq(col, filter.value); break;
          case 'gt': query = query.gt(col, filter.value); break;
          case 'gte': query = query.gte(col, filter.value); break;
          case 'lt': query = query.lt(col, filter.value); break;
          case 'lte': query = query.lte(col, filter.value); break;
          case 'like': query = query.like(col, filter.value as string); break;
          case 'ilike': query = query.ilike(col, filter.value as string); break;
          case 'in': query = query.in(col, filter.value as unknown[]); break;
          case 'is': query = query.is(col, filter.value); break;
        }
      }
    }

    const { count, error } = await query;

    if (error) {
      console.error(`[Supabase] count ${table} error:`, error);
      return { count: null, error: new Error(error.message) };
    }

    return { count, error: null };
  } catch (err) {
    console.error(`[Supabase] count ${table} exception:`, err);
    return { count: null, error: err as Error };
  }
}
