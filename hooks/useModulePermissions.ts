import { useMemo } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { PermissionModule, PermissionAction } from '@/contexts/PermissionsContext';

export function useModulePermissions(module: PermissionModule) {
  const { hasPermission, hasAnyPermission, currentUserRole, isLoading } = usePermissions();

  const permissions = useMemo(() => ({
    canView: hasPermission(module, 'view'),
    canCreate: hasPermission(module, 'create'),
    canEdit: hasPermission(module, 'edit'),
    canDelete: hasPermission(module, 'delete'),
    canExport: hasPermission(module, 'export'),
    canImport: hasPermission(module, 'import'),
    canApprove: hasPermission(module, 'approve'),
    canReject: hasPermission(module, 'reject'),
    canAssign: hasPermission(module, 'assign'),
    canAdjustQuantity: hasPermission(module, 'adjust_quantity'),
    canAdjustTime: hasPermission(module, 'adjust_time'),
    canManageSettings: hasPermission(module, 'manage_settings'),
  }), [hasPermission, module]);

  const check = (action: PermissionAction): boolean => {
    return hasPermission(module, action);
  };

  const hasAccess = hasAnyPermission(module);

  return {
    ...permissions,
    check,
    hasAccess,
    currentUserRole,
    isLoading,
  };
}

export type { PermissionModule, PermissionAction };
