export type StockStatus = 'in_stock' | 'low_stock' | 'critical' | 'out_of_stock' | 'overstocked';
export type LowStockAlertSeverity = 'critical' | 'warning' | 'info';
export type PartCriticality = 'critical' | 'essential' | 'standard' | 'non_critical';

export const getStockStatusColor = (status: StockStatus): string => {
  const colors: Record<StockStatus, string> = {
    in_stock: '#10B981',
    low_stock: '#F59E0B',
    critical: '#F97316',
    out_of_stock: '#EF4444',
    overstocked: '#3B82F6',
  };
  return colors[status] || '#6B7280';
};

export const getStockStatusLabel = (status: StockStatus): string => {
  const labels: Record<StockStatus, string> = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    critical: 'Critical',
    out_of_stock: 'Out of Stock',
    overstocked: 'Overstocked',
  };
  return labels[status] || status;
};

export const getCriticalityColor = (criticality: PartCriticality): string => {
  const colors: Record<PartCriticality, string> = {
    critical: '#DC2626',
    essential: '#F59E0B',
    standard: '#3B82F6',
    non_critical: '#6B7280',
  };
  return colors[criticality] || '#6B7280';
};

export const getCriticalityLabel = (criticality: PartCriticality): string => {
  const labels: Record<PartCriticality, string> = {
    critical: 'Critical',
    essential: 'Essential',
    standard: 'Standard',
    non_critical: 'Non-Critical',
  };
  return labels[criticality] || criticality;
};

export interface MROPartBasic {
  id: string;
  partNumber: string;
  name: string;
  category: string;
}

export function searchParts(parts: MROPartBasic[], query: string): MROPartBasic[] {
  if (!query.trim()) return parts;
  const lowerQuery = query.toLowerCase();
  return parts.filter(
    part =>
      part.partNumber.toLowerCase().includes(lowerQuery) ||
      part.name.toLowerCase().includes(lowerQuery) ||
      part.category.toLowerCase().includes(lowerQuery)
  );
}
