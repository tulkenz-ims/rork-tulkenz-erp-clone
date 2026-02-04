export type PermissionModule = 
  | 'dashboard'
  | 'approvals'
  | 'attendance'
  | 'benefits'
  | 'cmms'
  | 'compliance'
  | 'disciplinary'
  | 'documents'
  | 'eeoc'
  | 'employees'
  | 'finance'
  | 'fmla'
  | 'goals'
  | 'grievance'
  | 'headcount'
  | 'hr'
  | 'i9everify'
  | 'inspections'
  | 'inventory'
  | 'lms'
  | 'offboarding'
  | 'onboarding'
  | 'overtime'
  | 'performance'
  | 'planner'
  | 'portal'
  | 'procurement'
  | 'production'
  | 'quality'
  | 'recruiting'
  | 'recycling'
  | 'reports'
  | 'safety'
  | 'sanitation'
  | 'service'
  | 'settings'
  | 'succession'
  | 'surveys'
  | 'taskfeed'
  | 'timeclock';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface ModulePermissionDefinition {
  module: PermissionModule;
  name: string;
  description: string;
  actions: PermissionAction[];
}

export const MODULE_PERMISSION_DEFINITIONS: ModulePermissionDefinition[] = [
  { module: 'dashboard', name: 'Dashboard', description: 'Main dashboard access', actions: ['view'] },
  { module: 'approvals', name: 'Approvals', description: 'Approval workflows', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'attendance', name: 'Attendance', description: 'Attendance tracking', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'benefits', name: 'Benefits', description: 'Benefits management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'cmms', name: 'CMMS', description: 'Maintenance management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'compliance', name: 'Compliance', description: 'Compliance tracking', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'disciplinary', name: 'Disciplinary', description: 'Disciplinary actions', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'documents', name: 'Documents', description: 'Document management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'eeoc', name: 'EEOC', description: 'EEOC reporting', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { module: 'employees', name: 'Employees', description: 'Employee management', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { module: 'finance', name: 'Finance', description: 'Financial management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'fmla', name: 'FMLA', description: 'FMLA tracking', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'goals', name: 'Goals', description: 'Goal management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'grievance', name: 'Grievance', description: 'Grievance tracking', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'headcount', name: 'Headcount', description: 'Headcount planning', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'hr', name: 'HR', description: 'HR management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'i9everify', name: 'I-9/E-Verify', description: 'I-9 verification', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'inspections', name: 'Inspections', description: 'Inspection management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'inventory', name: 'Inventory', description: 'Inventory management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'lms', name: 'LMS', description: 'Learning management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'offboarding', name: 'Offboarding', description: 'Employee offboarding', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'onboarding', name: 'Onboarding', description: 'Employee onboarding', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'overtime', name: 'Overtime', description: 'Overtime management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'performance', name: 'Performance', description: 'Performance reviews', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'planner', name: 'Planner', description: 'Planning tools', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'portal', name: 'Portal', description: 'Employee portal', actions: ['view', 'create', 'edit'] },
  { module: 'procurement', name: 'Procurement', description: 'Procurement management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'production', name: 'Production', description: 'Production tracking', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'quality', name: 'Quality', description: 'Quality management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'recruiting', name: 'Recruiting', description: 'Recruitment management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'recycling', name: 'Recycling', description: 'Recycling tracking', actions: ['view', 'create', 'edit', 'delete'] },
  { module: 'reports', name: 'Reports', description: 'Reporting tools', actions: ['view', 'export'] },
  { module: 'safety', name: 'Safety', description: 'Safety management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'sanitation', name: 'Sanitation', description: 'Sanitation tracking', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'service', name: 'Service', description: 'Service requests', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'settings', name: 'Settings', description: 'System settings', actions: ['view', 'edit'] },
  { module: 'succession', name: 'Succession', description: 'Succession planning', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'surveys', name: 'Surveys', description: 'Survey management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { module: 'taskfeed', name: 'Task Feed', description: 'Task management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { module: 'timeclock', name: 'Time Clock', description: 'Time tracking', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
];

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Record<PermissionModule, PermissionAction[]>;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#F97316',
];

export const DEFAULT_ROLES: Partial<Role>[] = [
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Full system access',
    color: '#EF4444',
    isSystem: true,
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Department management access',
    color: '#3B82F6',
    isSystem: true,
  },
  {
    id: 'role-supervisor',
    name: 'Supervisor',
    description: 'Team supervision access',
    color: '#F59E0B',
    isSystem: true,
  },
  {
    id: 'role-employee',
    name: 'Employee',
    description: 'Basic employee access',
    color: '#10B981',
    isSystem: true,
  },
];
