import {
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MessageSquare,
  Clock,
  Settings,
  LucideIcon,
  Cog,
  Package,
  CheckSquare,
  Users,
  ShoppingCart,
  Recycle,
  FolderOpen,
  UserCog,
  DollarSign,
  Factory,
} from 'lucide-react-native';

export interface NavigationModule {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  alwaysVisible?: boolean;
  managerOnly?: boolean;
  superAdminOnly?: boolean;
}

export const NAVIGATION_MODULES: NavigationModule[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '(dashboard)', alwaysVisible: true },
  { key: 'taskfeed', label: 'Task Feed', icon: MessageSquare, route: 'taskfeed', alwaysVisible: true },
  { key: 'timeclock', label: 'Time Clock', icon: Clock, route: 'timeclock' },
  { key: 'cmms', label: 'CMMS', icon: Cog, route: 'cmms' },
  { key: 'inventory', label: 'Inventory', icon: Package, route: 'inventory' },
  { key: 'documents', label: 'Documents', icon: FolderOpen, route: 'documents' },
  { key: 'employees', label: 'Labor Tracking', icon: Users, route: 'employees', managerOnly: true },
  { key: 'procurement', label: 'Procurement', icon: ShoppingCart, route: 'procurement' },
  { key: 'approvals', label: 'Approvals', icon: CheckSquare, route: 'approvals', managerOnly: true },
  { key: 'quality', label: 'Quality', icon: ShieldCheck, route: 'quality' },
  { key: 'safety', label: 'Safety', icon: AlertTriangle, route: 'safety' },
  { key: 'sanitation', label: 'Sanitation', icon: Sparkles, route: 'sanitation' },
  { key: 'production', label: 'Production', icon: Factory, route: 'production' },
  { key: 'compliance', label: 'Compliance', icon: FileText, route: 'compliance' },
  { key: 'recycling', label: 'Recycling', icon: Recycle, route: 'recycling' },
  { key: 'hr', label: 'HR', icon: UserCog, route: 'hr', superAdminOnly: true },
  { key: 'finance', label: 'Finance', icon: DollarSign, route: 'finance', superAdminOnly: true },
  { key: 'settings', label: 'Settings', icon: Settings, route: 'settings' },
];

export const MODULE_KEYS = NAVIGATION_MODULES.map(m => m.key);

export type NavigationModuleKey = typeof MODULE_KEYS[number];

export interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

export const DEFAULT_MODULE_PERMISSIONS: ModulePermissions = {
  canView: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canViewReports: false,
  canManageSettings: false,
};

export const FULL_MODULE_PERMISSIONS: ModulePermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
  canViewReports: true,
  canManageSettings: true,
};

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  modules: string[];
  color: string;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'maintenance-tech',
    name: 'Maintenance Tech',
    description: 'CMMS, Safety, Time Clock',
    modules: ['dashboard', 'cmms', 'safety', 'timeclock', 'taskfeed', 'recycling'],
    color: '#10B981',
  },
  {
    id: 'quality-tech',
    name: 'Quality Tech',
    description: 'Quality, Compliance, Time Clock',
    modules: ['dashboard', 'quality', 'compliance', 'timeclock', 'taskfeed', 'documents'],
    color: '#3B82F6',
  },
  {
    id: 'sanitation-lead',
    name: 'Sanitation Lead',
    description: 'Sanitation, Quality, Time Clock',
    modules: ['dashboard', 'sanitation', 'quality', 'timeclock', 'taskfeed', 'recycling'],
    color: '#8B5CF6',
  },
  {
    id: 'safety-coordinator',
    name: 'Safety Coordinator',
    description: 'Safety, Compliance, Time Clock',
    modules: ['dashboard', 'safety', 'compliance', 'timeclock', 'taskfeed', 'documents'],
    color: '#F59E0B',
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Most modules with limited admin access',
    modules: ['dashboard', 'cmms', 'sanitation', 'quality', 'safety', 'compliance', 'taskfeed', 'timeclock', 'inventory', 'documents', 'recycling'],
    color: '#EC4899',
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'All modules with full access',
    modules: ['dashboard', 'cmms', 'taskfeed', 'timeclock', 'inventory', 'documents', 'employees', 'procurement', 'approvals', 'quality', 'safety', 'sanitation', 'compliance', 'recycling', 'settings'],
    color: '#6366F1',
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all modules and settings',
    modules: ['dashboard', 'cmms', 'taskfeed', 'timeclock', 'inventory', 'documents', 'employees', 'procurement', 'approvals', 'quality', 'safety', 'sanitation', 'compliance', 'recycling', 'settings'],
    color: '#EF4444',
  },
];
