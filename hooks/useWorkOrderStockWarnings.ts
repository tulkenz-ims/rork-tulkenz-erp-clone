import { useMemo } from 'react';
{ useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { getPartRequestsByWorkOrder } from '@/mocks/partsToWorkOrderData';
import type { LowStockAlertSeverity } from '@/mocks/partsToWorkOrderData';

export interface PartStockStatus {
  materialId: string;
  materialName: string;
  materialSku: string;
  currentStock: number;
  minLevel: number;
  maxLevel: number;
  percentOfMin: number;
  severity: LowStockAlertSeverity | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
  daysUntilStockout: number | null;
  avgDailyUsage: number;
  suggestedReorderQty: number;
  vendor: string | null;
  leadTimeDays: number | null;
}

export interface WorkOrderLowStockWarning {
  materialId: string;
  materialName: string;
  materialSku: string;
  currentStock: number;
  minLevel: number;
  quantityRequested: number;
  quantityAfterUse: number;
  severity: LowStockAlertSeverity;
  isOutOfStock: boolean;
  willCauseStockout: boolean;
  daysUntilStockout: number | null;
  suggestedReorderQty: number;
  vendor: string | null;
  leadTimeDays: number | null;
}

export interface WorkOrderStockWarningsSummary {
  hasWarnings: boolean;
  hasCritical: boolean;
  hasOutOfStock: boolean;
  totalWarnings: number;
  criticalCount: number;
  warningCount: number;
  outOfStockCount: number;
  willCauseStockoutCount: number;
  warnings: WorkOrderLowStockWarning[];
}

export function useWorkOrderStockWarnings() {
  const { data: materials = [] } = useMaterialsQuery();

  const checkPartStockStatus = useMemo(() => {
    return (materialId: string): PartStockStatus | null => {
      const material = materials.find(m => m.id === materialId);
      
      if (!material) {
        console.log(`[useWorkOrderStockWarnings] Material not found: ${materialId}`);
        return null;
      }

      const percentOfMin = material.min_level > 0 
        ? Math.round((material.on_hand / material.min_level) * 100) 
        : 100;
      
      const isOutOfStock = material.on_hand === 0;
      const isLowStock = material.on_hand <= material.min_level;
      
      let severity: LowStockAlertSeverity | null = null;
      if (isOutOfStock) {
        severity = 'critical';
      } else if (percentOfMin <= 50) {
        severity = 'warning';
      } else if (isLowStock) {
        severity = 'info';
      }

      const avgDailyUsage = material.avg_daily_usage || 0;
      const daysUntilStockout = avgDailyUsage > 0 
        ? Math.floor(material.on_hand / avgDailyUsage) 
        : null;

      const suggestedReorderQty = material.suggested_reorder_qty || 
        Math.max(material.max_level - material.on_hand, material.min_level * 2);

      console.log(`[useWorkOrderStockWarnings] Stock status for ${material.sku}: ${material.on_hand}/${material.min_level} (${percentOfMin}%) - ${severity || 'OK'}`);

      return {
        materialId: material.id,
        materialName: material.name,
        materialSku: material.sku,
        currentStock: material.on_hand,
        minLevel: material.min_level,
        maxLevel: material.max_level,
        percentOfMin,
        severity,
        isLowStock,
        isOutOfStock,
        daysUntilStockout,
        avgDailyUsage,
        suggestedReorderQty,
        vendor: material.vendor || null,
        leadTimeDays: material.lead_time_days || null,
      };
    };
  }, [materials]);

  const getWorkOrderLowStockWarnings = useMemo(() => {
    return (workOrderId: string, additionalParts?: { materialId: string; quantity: number }[]): WorkOrderStockWarningsSummary => {
      console.log(`[useWorkOrderStockWarnings] Getting warnings for WO: ${workOrderId}`);
      
      const warnings: WorkOrderLowStockWarning[] = [];
      const partRequests = getPartRequestsByWorkOrder(workOrderId);
      
      const partsToCheck = new Map<string, number>();

      // Safely iterate part requests - ensure partRequests is an array
      if (Array.isArray(partRequests)) {
        partRequests.forEach(request => {
          // Safely iterate lines - ensure lines is an array
          const lines = Array.isArray(request?.lines) ? request.lines : [];
          lines.forEach(line => {
            if (line && line.materialId) {
              const currentQty = partsToCheck.get(line.materialId) || 0;
              partsToCheck.set(line.materialId, currentQty + line.quantityRequested);
            }
          });
        });
      }

      if (additionalParts) {
        additionalParts.forEach(part => {
          const currentQty = partsToCheck.get(part.materialId) || 0;
          partsToCheck.set(part.materialId, currentQty + part.quantity);
        });
      }

      partsToCheck.forEach((quantityRequested, materialId) => {
        const stockStatus = checkPartStockStatus(materialId);
        
        if (!stockStatus) return;

        const quantityAfterUse = stockStatus.currentStock - quantityRequested;
        const willCauseStockout = quantityAfterUse < 0;
        const willBeLowStock = quantityAfterUse <= stockStatus.minLevel;

        if (stockStatus.isOutOfStock || stockStatus.isLowStock || willCauseStockout || willBeLowStock) {
          let severity: LowStockAlertSeverity = 'info';
          
          if (stockStatus.isOutOfStock || willCauseStockout) {
            severity = 'critical';
          } else if (stockStatus.severity === 'warning' || quantityAfterUse <= stockStatus.minLevel * 0.5) {
            severity = 'warning';
          }

          warnings.push({
            materialId: stockStatus.materialId,
            materialName: stockStatus.materialName,
            materialSku: stockStatus.materialSku,
            currentStock: stockStatus.currentStock,
            minLevel: stockStatus.minLevel,
            quantityRequested,
            quantityAfterUse,
            severity,
            isOutOfStock: stockStatus.isOutOfStock,
            willCauseStockout,
            daysUntilStockout: stockStatus.daysUntilStockout,
            suggestedReorderQty: stockStatus.suggestedReorderQty,
            vendor: stockStatus.vendor,
            leadTimeDays: stockStatus.leadTimeDays,
          });
        }
      });

      warnings.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      const criticalCount = warnings.filter(w => w.severity === 'critical').length;
      const warningCount = warnings.filter(w => w.severity === 'warning').length;
      const outOfStockCount = warnings.filter(w => w.isOutOfStock).length;
      const willCauseStockoutCount = warnings.filter(w => w.willCauseStockout).length;

      console.log(`[useWorkOrderStockWarnings] Found ${warnings.length} warnings (${criticalCount} critical, ${warningCount} warning, ${outOfStockCount} out of stock)`);

      return {
        hasWarnings: warnings.length > 0,
        hasCritical: criticalCount > 0,
        hasOutOfStock: outOfStockCount > 0,
        totalWarnings: warnings.length,
        criticalCount,
        warningCount,
        outOfStockCount,
        willCauseStockoutCount,
        warnings,
      };
    };
  }, [checkPartStockStatus]);

  return {
    checkPartStockStatus,
    getWorkOrderLowStockWarnings,
  };
}

export function getPartStockSeverityColor(severity: LowStockAlertSeverity | null): string {
  switch (severity) {
    case 'critical':
      return '#EF4444';
    case 'warning':
      return '#F59E0B';
    case 'info':
      return '#3B82F6';
    default:
      return '#10B981';
  }
}

export function getPartStockSeverityLabel(severity: LowStockAlertSeverity | null): string {
  switch (severity) {
    case 'critical':
      return 'Out of Stock';
    case 'warning':
      return 'Low Stock';
    case 'info':
      return 'Below Minimum';
    default:
      return 'In Stock';
  }
}
