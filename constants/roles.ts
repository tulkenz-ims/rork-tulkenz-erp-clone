export const ROLE_TYPES = {
  PLATFORM_ADMIN: 'platform_admin',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  EMPLOYEE: 'employee',
} as const;

export type RoleType = typeof ROLE_TYPES[keyof typeof ROLE_TYPES];

export const ROLE_HIERARCHY: RoleType[] = [
  ROLE_TYPES.PLATFORM_ADMIN,
  ROLE_TYPES.SUPER_ADMIN,
  ROLE_TYPES.ADMIN,
  ROLE_TYPES.MANAGER,
  ROLE_TYPES.SUPERVISOR,
  ROLE_TYPES.EMPLOYEE,
];

export const ROLE_DISPLAY_NAMES: Record<RoleType, string> = {
  [ROLE_TYPES.PLATFORM_ADMIN]: 'Platform Admin',
  [ROLE_TYPES.SUPER_ADMIN]: 'Super Admin',
  [ROLE_TYPES.ADMIN]: 'Admin',
  [ROLE_TYPES.MANAGER]: 'Manager',
  [ROLE_TYPES.SUPERVISOR]: 'Supervisor',
  [ROLE_TYPES.EMPLOYEE]: 'Employee',
};

export const ROLE_COLORS: Record<RoleType, string> = {
  [ROLE_TYPES.PLATFORM_ADMIN]: '#F59E0B',
  [ROLE_TYPES.SUPER_ADMIN]: '#8B5CF6',
  [ROLE_TYPES.ADMIN]: '#3B82F6',
  [ROLE_TYPES.MANAGER]: '#10B981',
  [ROLE_TYPES.SUPERVISOR]: '#F97316',
  [ROLE_TYPES.EMPLOYEE]: '#6B7280',
};

export const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  [ROLE_TYPES.PLATFORM_ADMIN]: 'Platform owner with access to all organizations',
  [ROLE_TYPES.SUPER_ADMIN]: 'Organization administrator with full access',
  [ROLE_TYPES.ADMIN]: 'Administrator with elevated permissions',
  [ROLE_TYPES.MANAGER]: 'Department manager with team oversight',
  [ROLE_TYPES.SUPERVISOR]: 'Team supervisor with limited admin access',
  [ROLE_TYPES.EMPLOYEE]: 'Standard employee access',
};

export const SUPER_ADMIN_ROLES: RoleType[] = [
  ROLE_TYPES.PLATFORM_ADMIN,
  ROLE_TYPES.SUPER_ADMIN,
  ROLE_TYPES.ADMIN,
];

export const MANAGEMENT_ROLES: RoleType[] = [
  ROLE_TYPES.PLATFORM_ADMIN,
  ROLE_TYPES.SUPER_ADMIN,
  ROLE_TYPES.ADMIN,
  ROLE_TYPES.MANAGER,
  ROLE_TYPES.SUPERVISOR,
];

export function isSuperAdminRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase().replace(/[\s-]/g, '_');
  return SUPER_ADMIN_ROLES.includes(normalizedRole as RoleType) ||
         normalizedRole === 'superadmin';
}

export function isManagementRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase().replace(/[\s-]/g, '_');
  return MANAGEMENT_ROLES.includes(normalizedRole as RoleType) ||
         normalizedRole === 'superadmin';
}

export function getRoleDisplayName(role: string | undefined | null): string {
  if (!role) return 'User';
  const normalizedRole = role.toLowerCase().replace(/[\s-]/g, '_');
  if (normalizedRole === 'superadmin') return ROLE_DISPLAY_NAMES[ROLE_TYPES.SUPER_ADMIN];
  return ROLE_DISPLAY_NAMES[normalizedRole as RoleType] || role;
}

export function getRoleColor(role: string | undefined | null): string {
  if (!role) return ROLE_COLORS[ROLE_TYPES.EMPLOYEE];
  const normalizedRole = role.toLowerCase().replace(/[\s-]/g, '_');
  if (normalizedRole === 'superadmin') return ROLE_COLORS[ROLE_TYPES.SUPER_ADMIN];
  return ROLE_COLORS[normalizedRole as RoleType] || ROLE_COLORS[ROLE_TYPES.EMPLOYEE];
}

export function getRoleHierarchyLevel(role: string | undefined | null): number {
  if (!role) return ROLE_HIERARCHY.length;
  const normalizedRole = role.toLowerCase().replace(/[\s-]/g, '_');
  if (normalizedRole === 'superadmin') return ROLE_HIERARCHY.indexOf(ROLE_TYPES.SUPER_ADMIN);
  const index = ROLE_HIERARCHY.indexOf(normalizedRole as RoleType);
  return index === -1 ? ROLE_HIERARCHY.length : index;
}

export function hasRoleAccess(userRole: string | undefined | null, requiredRole: RoleType): boolean {
  return getRoleHierarchyLevel(userRole) <= ROLE_HIERARCHY.indexOf(requiredRole);
}
