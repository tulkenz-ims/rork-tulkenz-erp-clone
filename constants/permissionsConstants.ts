// ── Permission Modules ─────────────────────────────────────────
// These match the actual module names stored in the roles.permissions
// JSON field in Supabase. Do NOT change these strings — they are
// the keys used in the database.

export type PermissionModule =
  | 'work_orders'
  | 'preventive_maintenance'
  | 'inventory'
  | 'procurement'
  | 'approvals'
  | 'vendors'
  | 'budgeting'
  | 'inspections'
  | 'task_feed'
  | 'recycling'
  | 'portal'
  | 'lms'
  | 'quality'
  | 'safety'
  | 'compliance'
  | 'employees'
  | 'hr'
  | 'finance'
  | 'finance_ap'
  | 'finance_ar'
  | 'finance_gl'
  | 'payroll'
  | 'taxes'
  | 'reports'
  | 'settings'
  | 'dashboard'
  | 'production'
  | 'sanitation'
  | 'timeclock'
  | 'headcount';

// ── Permission Actions ─────────────────────────────────────────
export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'export'
  | 'import'
  | 'adjust_time'
  | 'adjust_quantity'
  | 'verify'
  | 'review'
  | 'manage_settings'
  | 'post_entries'
  | 'process_payment'
  | 'manage_customers'
  | 'manage_vendors'
  | 'run_payroll'
  | 'file_taxes';

// ── Module Definitions ─────────────────────────────────────────
export interface ModulePermissionDefinition {
  module: PermissionModule;
  name: string;
  description: string;
  department: string; // which dept this primarily belongs to
  actions: { action: PermissionAction; label: string }[];
}

export const MODULE_PERMISSION_DEFINITIONS: ModulePermissionDefinition[] = [

  // ── MAINTENANCE ──────────────────────────────────────────────
  {
    module: 'work_orders',
    name: 'Work Orders',
    description: 'Create and manage maintenance work orders',
    department: 'Maintenance',
    actions: [
      { action: 'view',        label: 'View' },
      { action: 'create',      label: 'Create' },
      { action: 'edit',        label: 'Edit' },
      { action: 'delete',      label: 'Delete' },
      { action: 'assign',      label: 'Assign' },
      { action: 'adjust_time', label: 'Adjust Time' },
      { action: 'approve',     label: 'Approve' },
      { action: 'export',      label: 'Export' },
    ],
  },
  {
    module: 'preventive_maintenance',
    name: 'Preventive Maintenance',
    description: 'PM schedules, templates, and completion',
    department: 'Maintenance',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'assign', label: 'Assign' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'inventory',
    name: 'Parts & Inventory',
    description: 'MRO inventory, parts catalog, and stock management',
    department: 'Maintenance',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'adjust_quantity', label: 'Adjust Quantity' },
      { action: 'import',          label: 'Import' },
      { action: 'export',          label: 'Export' },
      { action: 'manage_settings', label: 'Manage Settings' },
    ],
  },
  {
    module: 'vendors',
    name: 'Vendors',
    description: 'Vendor management and approvals',
    department: 'Maintenance',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'approve',         label: 'Approve' },
      { action: 'manage_vendors',  label: 'Manage Vendors' },
      { action: 'export',          label: 'Export' },
    ],
  },

  // ── PRODUCTION ───────────────────────────────────────────────
  {
    module: 'production',
    name: 'Production',
    description: 'Production runs, scheduling, and output tracking',
    department: 'Production',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'timeclock',
    name: 'Roll Call / Time Clock',
    description: 'Check in/out, room assignment, and shift tracking',
    department: 'Production',
    actions: [
      { action: 'view',        label: 'View' },
      { action: 'create',      label: 'Check In/Out' },
      { action: 'edit',        label: 'Edit Entries' },
      { action: 'assign',      label: 'Assign to Room' },
      { action: 'adjust_time', label: 'Adjust Time' },
      { action: 'approve',     label: 'Approve' },
      { action: 'export',      label: 'Export' },
    ],
  },

  // ── QUALITY ──────────────────────────────────────────────────
  {
    module: 'quality',
    name: 'Quality',
    description: 'QA inspections, CAPA, deviations, and audits',
    department: 'Quality',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'inspections',
    name: 'Inspections',
    description: 'Pre-op, in-process, and audit inspections',
    department: 'Quality',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'approve',         label: 'Approve' },
      { action: 'manage_settings', label: 'Manage Settings' },
      { action: 'export',          label: 'Export' },
    ],
  },
  {
    module: 'compliance',
    name: 'Compliance',
    description: 'SQF, FSMA, regulatory compliance tracking',
    department: 'Quality',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },

  // ── SANITATION ───────────────────────────────────────────────
  {
    module: 'sanitation',
    name: 'Sanitation',
    description: 'SSOPs, EMP, pre-op records, and sanitation logs',
    department: 'Sanitation',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },

  // ── SAFETY ───────────────────────────────────────────────────
  {
    module: 'safety',
    name: 'Safety',
    description: 'Incidents, hazard assessments, JSAs, and LOTO',
    department: 'Safety',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },

  // ── WAREHOUSE ────────────────────────────────────────────────
  {
    module: 'procurement',
    name: 'Procurement',
    description: 'Purchase orders, requisitions, and approvals',
    department: 'Warehouse',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'reject', label: 'Reject' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'recycling',
    name: 'Recycling',
    description: 'Recycling and waste tracking',
    department: 'Warehouse',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'export', label: 'Export' },
    ],
  },

  // ── HR ───────────────────────────────────────────────────────
  {
    module: 'employees',
    name: 'Employee Directory',
    description: 'Employee records, profiles, and org management',
    department: 'HR',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'assign',          label: 'Assign Role' },
      { action: 'export',          label: 'Export' },
    ],
  },
  {
    module: 'hr',
    name: 'HR Management',
    description: 'Onboarding, offboarding, disciplines, and HR records',
    department: 'HR',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'approve',         label: 'Approve' },
      { action: 'manage_settings', label: 'Manage Settings' },
      { action: 'export',          label: 'Export' },
    ],
  },
  {
    module: 'lms',
    name: 'Training / LMS',
    description: 'Training programs, assignments, and completion tracking',
    department: 'HR',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'assign',          label: 'Assign' },
      { action: 'approve',         label: 'Approve' },
      { action: 'manage_settings', label: 'Manage Settings' },
      { action: 'export',          label: 'Export' },
    ],
  },
  {
    module: 'headcount',
    name: 'Workforce Planning',
    description: 'Headcount, positions, org chart, and staffing',
    department: 'HR',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },

  // ── FINANCE ──────────────────────────────────────────────────
  {
    module: 'finance',
    name: 'Finance',
    description: 'Financial management, budgets, and reporting',
    department: 'Finance',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'approve',         label: 'Approve' },
      { action: 'manage_settings', label: 'Manage Settings' },
      { action: 'export',          label: 'Export' },
    ],
  },
  {
    module: 'finance_ap',
    name: 'Accounts Payable',
    description: 'Vendor invoices, payment runs, and AP aging',
    department: 'Finance',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Create' },
      { action: 'edit',            label: 'Edit' },
      { action: 'delete',          label: 'Delete' },
      { action: 'approve',         label: 'Approve' },
      { action: 'process_payment', label: 'Process Payment' },
      { action: 'export',          label: 'Export' },
    ],
  },
  {
    module: 'finance_ar',
    name: 'Accounts Receivable',
    description: 'Customer invoicing, collections, and AR aging',
    department: 'Finance',
    actions: [
      { action: 'view',              label: 'View' },
      { action: 'create',            label: 'Create' },
      { action: 'edit',              label: 'Edit' },
      { action: 'delete',            label: 'Delete' },
      { action: 'process_payment',   label: 'Process Payment' },
      { action: 'manage_customers',  label: 'Manage Customers' },
      { action: 'export',            label: 'Export' },
    ],
  },
  {
    module: 'finance_gl',
    name: 'General Ledger',
    description: 'Journal entries, account reconciliation, and GL reporting',
    department: 'Finance',
    actions: [
      { action: 'view',         label: 'View' },
      { action: 'create',       label: 'Create' },
      { action: 'edit',         label: 'Edit' },
      { action: 'post_entries', label: 'Post Entries' },
      { action: 'approve',      label: 'Approve' },
      { action: 'export',       label: 'Export' },
    ],
  },
  {
    module: 'payroll',
    name: 'Payroll',
    description: 'Payroll processing, approvals, and reporting',
    department: 'Finance',
    actions: [
      { action: 'view',        label: 'View' },
      { action: 'create',      label: 'Create' },
      { action: 'edit',        label: 'Edit' },
      { action: 'run_payroll', label: 'Run Payroll' },
      { action: 'approve',     label: 'Approve' },
      { action: 'export',      label: 'Export' },
    ],
  },
  {
    module: 'taxes',
    name: 'Taxes',
    description: 'Tax filings, records, and compliance',
    department: 'Finance',
    actions: [
      { action: 'view',       label: 'View' },
      { action: 'create',     label: 'Create' },
      { action: 'file_taxes', label: 'File Taxes' },
      { action: 'export',     label: 'Export' },
    ],
  },
  {
    module: 'budgeting',
    name: 'Budgeting',
    description: 'Department budgets, forecasts, and variance tracking',
    department: 'Finance',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'approve', label: 'Approve' },
      { action: 'export', label: 'Export' },
    ],
  },

  // ── CROSS-DEPARTMENT ─────────────────────────────────────────
  {
    module: 'task_feed',
    name: 'Task Feed',
    description: 'Interdepartmental tasks, issues, and assignments',
    department: 'All',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit',   label: 'Edit' },
      { action: 'delete', label: 'Delete' },
      { action: 'assign', label: 'Assign' },
      { action: 'review', label: 'Review' },
      { action: 'verify', label: 'Verify/Close' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'approvals',
    name: 'Approvals',
    description: 'Approval workflows across all departments',
    department: 'All',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'approve', label: 'Approve' },
      { action: 'reject', label: 'Reject' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'reports',
    name: 'Reports',
    description: 'Cross-department reporting and analytics',
    department: 'All',
    actions: [
      { action: 'view',   label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'export', label: 'Export' },
    ],
  },
  {
    module: 'portal',
    name: 'Employee Portal',
    description: 'Employee self-service portal',
    department: 'All',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'create',          label: 'Submit Requests' },
      { action: 'edit',            label: 'Edit Profile' },
      { action: 'manage_settings', label: 'Manage Settings' },
    ],
  },
  {
    module: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard and KPI overview',
    department: 'All',
    actions: [
      { action: 'view', label: 'View' },
    ],
  },
  {
    module: 'settings',
    name: 'System Settings',
    description: 'Application configuration and system settings',
    department: 'Administration',
    actions: [
      { action: 'view',            label: 'View' },
      { action: 'edit',            label: 'Edit' },
      { action: 'manage_settings', label: 'Full Settings Access' },
    ],
  },
];

// ── Dept grouping for UI filter ────────────────────────────────
export const PERMISSION_DEPARTMENTS = [
  'All',
  'Maintenance',
  'Production',
  'Quality',
  'Sanitation',
  'Safety',
  'Warehouse',
  'HR',
  'Finance',
  'Administration',
] as const;

export type PermissionDepartment = typeof PERMISSION_DEPARTMENTS[number];

// ── Role interface ─────────────────────────────────────────────
export interface RolePermission {
  module: PermissionModule;
  actions: PermissionAction[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: RolePermission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Role colors ────────────────────────────────────────────────
export const ROLE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
];
