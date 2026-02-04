import { useMemo } from 'react';
import { useSupabaseLowStockAlerts, type LowStockAlert } from '@/hooks/useSupabaseLowStockAlerts';
import type { LowStockAlertSeverity } from '@/constants/mroPartsConstants';

export interface DashboardAlertSummary {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  outOfStockCount: number;
  topAlerts: {
    id: string;
    materialId: string;
    materialName: string;
    materialSku: string;
    currentStock: number;
    minLevel: number;
    severity: LowStockAlertSeverity;
    percentOfMin: number;
  }[];
  alertsByCategory: { category: string; count: number }[];
  alertsByFacility: { facility: string; count: number }[];
  totalEstimatedImpact: number;
  requiresImmediateAction: number;
  hasCriticalAlerts: boolean;
  hasWarningAlerts: boolean;
}

export function useDashboardAlertWidget(): DashboardAlertSummary {
  const { activeAlerts, isLoading } = useSupabaseLowStockAlerts();

  return useMemo(() => {
    if (isLoading || !activeAlerts.length) {
      return {
        totalAlerts: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        outOfStockCount: 0,
        topAlerts: [],
        alertsByCategory: [],
        alertsByFacility: [],
        totalEstimatedImpact: 0,
        requiresImmediateAction: 0,
        hasCriticalAlerts: false,
        hasWarningAlerts: false,
      };
    }

    const alertsWithSeverity = activeAlerts.map((a: LowStockAlert) => ({
      id: a.id,
      materialId: a.material_id,
      materialName: a.material_name,
      materialSku: a.material_sku,
      currentStock: a.current_stock,
      minLevel: a.min_level,
      severity: a.severity as LowStockAlertSeverity,
      percentOfMin: a.percent_of_min ?? 0,
      category: a.category || 'Uncategorized',
      facility: a.facility_name || 'Unassigned',
    }));

    const criticalAlerts = alertsWithSeverity.filter(a => a.severity === 'critical');
    const warningAlerts = alertsWithSeverity.filter(a => a.severity === 'warning');
    const infoAlerts = alertsWithSeverity.filter(a => a.severity === 'info');
    const outOfStockAlerts = activeAlerts.filter(a => a.current_stock === 0);

    const sortedAlerts = [...alertsWithSeverity].sort((a, b) => {
      const severityOrder: Record<LowStockAlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.percentOfMin - b.percentOfMin;
    });

    const topAlerts = sortedAlerts.slice(0, 5).map(a => ({
      id: a.id,
      materialId: a.materialId,
      materialName: a.materialName,
      materialSku: a.materialSku,
      currentStock: a.currentStock,
      minLevel: a.minLevel,
      severity: a.severity,
      percentOfMin: a.percentOfMin,
    }));

    const categoryMap = new Map<string, number>();
    const facilityMap = new Map<string, number>();
    
    alertsWithSeverity.forEach(a => {
      categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
      facilityMap.set(a.facility, (facilityMap.get(a.facility) || 0) + 1);
    });

    const alertsByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const alertsByFacility = Array.from(facilityMap.entries())
      .map(([facility, count]) => ({ facility, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAlerts: alertsWithSeverity.length,
      criticalCount: criticalAlerts.length,
      warningCount: warningAlerts.length,
      infoCount: infoAlerts.length,
      outOfStockCount: outOfStockAlerts.length,
      topAlerts,
      alertsByCategory,
      alertsByFacility,
      totalEstimatedImpact: 0,
      requiresImmediateAction: criticalAlerts.length + warningAlerts.length,
      hasCriticalAlerts: criticalAlerts.length > 0,
      hasWarningAlerts: warningAlerts.length > 0,
    };
  }, [activeAlerts, isLoading]);
}
