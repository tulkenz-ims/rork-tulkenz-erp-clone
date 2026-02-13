import { useMemo } from 'react';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import type { LowStockAlertSeverity } from '@/mocks/partsToWorkOrderData';

export interface TabBadgeCount {
  count: number;
  severity: LowStockAlertSeverity | null;
  hasCritical: boolean;
  hasWarning: boolean;
}

export interface TabBadgeCounts {
  inventory: TabBadgeCount;
  cmms: TabBadgeCount;
  procurement: TabBadgeCount;
  approvals: TabBadgeCount;
  dashboard: TabBadgeCount;
}

export function useTabBadgeCounts(): TabBadgeCounts {
  const { data: materials = [] } = useMaterialsQuery();
  const { data: workOrders = [] } = useWorkOrdersQuery();

  return useMemo(() => {
    console.log('[useTabBadgeCounts] Calculating badge counts...');

    const lowStockMaterials = materials.filter(m => m.on_hand <= m.min_level);
    const outOfStockMaterials = materials.filter(m => m.on_hand === 0);
    
    const criticalStockCount = outOfStockMaterials.length;
    const warningStockCount = lowStockMaterials.filter(m => {
      const percentOfMin = m.min_level > 0 ? (m.on_hand / m.min_level) * 100 : 100;
      return m.on_hand > 0 && percentOfMin <= 50;
    }).length;

    const inventoryBadge: TabBadgeCount = {
      count: criticalStockCount + warningStockCount,
      severity: criticalStockCount > 0 ? 'critical' : warningStockCount > 0 ? 'warning' : null,
      hasCritical: criticalStockCount > 0,
      hasWarning: warningStockCount > 0,
    };

    const overdueWorkOrders = workOrders.filter(wo => 
      wo.status === 'overdue'
    ).length;
    
    const openWorkOrders = workOrders.filter(wo => 
      wo.status === 'open' || wo.status === 'in_progress'
    ).length;

    const cmmsBadge: TabBadgeCount = {
      count: overdueWorkOrders + openWorkOrders,
      severity: overdueWorkOrders > 0 ? 'critical' : openWorkOrders > 0 ? 'info' : null,
      hasCritical: overdueWorkOrders > 0,
      hasWarning: false,
    };

    const lowStockRequiringPO = lowStockMaterials.filter(m => 
      m.on_hand === 0 || (m.min_level > 0 && (m.on_hand / m.min_level) * 100 <= 50)
    ).length;

    const procurementBadge: TabBadgeCount = {
      count: lowStockRequiringPO,
      severity: lowStockRequiringPO > 0 ? 'info' : null,
      hasCritical: false,
      hasWarning: false,
    };

    const pendingApprovals = workOrders.filter(wo => 
      wo.status === 'open'
    ).length;

    const approvalsBadge: TabBadgeCount = {
      count: pendingApprovals,
      severity: pendingApprovals > 0 ? 'info' : null,
      hasCritical: false,
      hasWarning: false,
    };

    const totalCriticalAlerts = criticalStockCount + overdueWorkOrders;
    const dashboardBadge: TabBadgeCount = {
      count: totalCriticalAlerts,
      severity: criticalStockCount > 0 ? 'critical' : overdueWorkOrders > 0 ? 'warning' : null,
      hasCritical: criticalStockCount > 0,
      hasWarning: overdueWorkOrders > 0,
    };

    console.log(`[useTabBadgeCounts] Inventory: ${inventoryBadge.count}, CMMS: ${cmmsBadge.count}, Procurement: ${procurementBadge.count}`);

    return {
      inventory: inventoryBadge,
      cmms: cmmsBadge,
      procurement: procurementBadge,
      approvals: approvalsBadge,
      dashboard: dashboardBadge,
    };
  }, [materials, workOrders]);
}

export function getBadgeSeverityColor(severity: LowStockAlertSeverity | null): string {
  switch (severity) {
    case 'critical':
      return '#EF4444';
    case 'warning':
      return '#F59E0B';
    case 'info':
      return '#3B82F6';
    default:
      return '#6B7280';
  }
}
