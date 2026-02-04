export type AdjustmentReason = 
  | 'cycle_count'
  | 'physical_inventory'
  | 'damage'
  | 'theft'
  | 'expired'
  | 'quality_hold'
  | 'production_usage'
  | 'receiving_error'
  | 'shipping_error'
  | 'data_correction'
  | 'transfer'
  | 'other';

export interface AdjustmentReasonInfo {
  value: AdjustmentReason;
  label: string;
  requiresApproval: boolean;
  color: string;
}

export const ADJUSTMENT_REASONS: AdjustmentReasonInfo[] = [
  { value: 'cycle_count', label: 'Cycle Count Adjustment', requiresApproval: false, color: '#3B82F6' },
  { value: 'physical_inventory', label: 'Physical Inventory', requiresApproval: false, color: '#3B82F6' },
  { value: 'damage', label: 'Damaged Goods', requiresApproval: true, color: '#EF4444' },
  { value: 'theft', label: 'Theft/Shrinkage', requiresApproval: true, color: '#DC2626' },
  { value: 'expired', label: 'Expired Product', requiresApproval: true, color: '#F97316' },
  { value: 'quality_hold', label: 'Quality Hold', requiresApproval: true, color: '#F59E0B' },
  { value: 'production_usage', label: 'Production Usage', requiresApproval: false, color: '#10B981' },
  { value: 'receiving_error', label: 'Receiving Error', requiresApproval: true, color: '#8B5CF6' },
  { value: 'shipping_error', label: 'Shipping Error', requiresApproval: true, color: '#8B5CF6' },
  { value: 'data_correction', label: 'Data Correction', requiresApproval: true, color: '#6366F1' },
  { value: 'transfer', label: 'Location Transfer', requiresApproval: false, color: '#06B6D4' },
  { value: 'other', label: 'Other', requiresApproval: true, color: '#6B7280' },
];

export const getAdjustmentReasonLabel = (reason: AdjustmentReason): string => {
  const found = ADJUSTMENT_REASONS.find(r => r.value === reason);
  return found?.label || reason;
};

export const getAdjustmentReasonColor = (reason: AdjustmentReason): string => {
  const found = ADJUSTMENT_REASONS.find(r => r.value === reason);
  return found?.color || '#6B7280';
};
