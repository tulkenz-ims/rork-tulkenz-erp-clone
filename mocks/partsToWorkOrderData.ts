export type PartRequestStatus = 'pending_approval' | 'approved' | 'partially_issued' | 'issued' | 'completed' | 'rejected' | 'cancelled';
export type PartLineStatus = 'pending' | 'approved' | 'issued' | 'consumed' | 'returned';

export interface WorkOrderPartLine {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  materialNumber: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityIssued: number;
  quantityReturned: number;
  unitOfMeasure: string;
  unitCost: number;
  totalCost: number;
  status: PartLineStatus;
  warehouseLocation?: string;
  binLocation?: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
}

export interface WorkOrderPartRequest {
  id: string;
  requestNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  status: PartRequestStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  lines: WorkOrderPartLine[];
  totalLinesRequested: number;
  totalLinesIssued: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartIssueRecord {
  id: string;
  issueNumber: string;
  partRequestId: string;
  partRequestNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  quantityIssued: number;
  unitOfMeasure: string;
  unitCostAtIssue: number;
  totalCost: number;
  issuedFromWarehouse: string;
  issuedFromBin?: string;
  lotNumber?: string;
  serialNumber?: string;
  issuedBy: string;
  issuedByName: string;
  issuedAt: string;
  notes?: string;
}

export interface PartReturnRecord {
  id: string;
  returnNumber: string;
  partIssueId: string;
  issueNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  quantityReturned: number;
  unitOfMeasure: string;
  creditAmount: number;
  totalCreditAmount: number;
  returnedToWarehouse: string;
  returnedToBin?: string;
  condition: 'new' | 'used' | 'damaged';
  returnedBy: string;
  returnedByName: string;
  returnedAt: string;
  reason: string;
  notes?: string;
}

export interface WorkOrderPartSummary {
  workOrderId: string;
  totalPartRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  totalLinesRequested: number;
  totalLinesIssued: number;
  totalQuantityRequested: number;
  totalQuantityIssued: number;
  totalQuantityReturned: number;
  totalQuantityConsumed: number;
  totalEstimatedCost: number;
  totalIssuedCost: number;
  totalReturnCredit: number;
  totalActualCost: number;
}

export type LowStockAlertStatus = 'active' | 'acknowledged' | 'snoozed' | 'resolved' | 'auto_resolved';
export type LowStockAlertSeverity = 'critical' | 'warning' | 'info';
export type LowStockTriggerType = 'stockout' | 'below_min' | 'approaching_min' | 'below_safety_stock' | 'high_consumption';

export interface AlertAction {
  id: string;
  alertId: string;
  actionType: 'acknowledge' | 'snooze' | 'resolve' | 'comment' | 'create_po' | 'create_requisition';
  performedBy: string;
  performedByName: string;
  performedAt: string;
  comment?: string;
  snoozeUntil?: string;
  linkedDocumentId?: string;
  linkedDocumentNumber?: string;
}

export interface LowStockAlert {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  materialNumber: string;
  category: string;
  facilityId: string;
  facilityName: string;
  currentStock: number;
  minLevel: number;
  safetyStock?: number;
  reorderPoint?: number;
  percentOfMin: number;
  percentOfSafety?: number;
  severity: LowStockAlertSeverity;
  status: LowStockAlertStatus;
  triggerType: LowStockTriggerType;
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  snoozedUntil?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  resolvedReason?: string;
  pendingPOId?: string;
  pendingPONumber?: string;
  pendingPOQty?: number;
  pendingPOExpectedDate?: string;
  estimatedStockoutCost?: number;
  actions: AlertAction[];
}

export interface LowStockAlertSummary {
  totalAlerts: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  acknowledgedCount: number;
  unresolvedCount: number;
  stockoutCount: number;
  alertsByCategory: { category: string; count: number }[];
  alertsByFacility: { facility: string; count: number }[];
  totalEstimatedImpact: number;
  alertsRequiringAction: number;
}

export function generatePartRequestNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR-${timestamp.toString().slice(-6)}-${random}`;
}

export function generateIssueNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ISS-${timestamp.toString().slice(-6)}-${random}`;
}

export function getWorkOrderPartSummary(
  partRequestsOrWorkOrderId: WorkOrderPartRequest[] | string,
  partIssues?: PartIssueRecord[],
  partReturns?: PartReturnRecord[],
  workOrderId?: string
): WorkOrderPartSummary | null {
  // Handle legacy call with just workOrderId
  if (typeof partRequestsOrWorkOrderId === 'string') {
    return null; // Return null when called with just workOrderId - caller should handle this
  }
  
  const partRequests = partRequestsOrWorkOrderId;
  const actualWorkOrderId = workOrderId || '';
  
  if (!Array.isArray(partRequests)) {
    return null;
  }
  
  const requests = partRequests.filter(pr => pr.workOrderId === actualWorkOrderId);
  const issues = partIssues.filter(pi => pi.workOrderId === workOrderId);
  const returns = partReturns.filter(pr => pr.workOrderId === workOrderId);

  const allLines = requests.flatMap(r => r.lines);

  return {
    workOrderId,
    totalPartRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'pending_approval').length,
    approvedRequests: requests.filter(r => ['approved', 'issued', 'completed'].includes(r.status)).length,
    totalLinesRequested: allLines.length,
    totalLinesIssued: allLines.filter(l => l.quantityIssued > 0).length,
    totalQuantityRequested: allLines.reduce((sum, l) => sum + l.quantityRequested, 0),
    totalQuantityIssued: allLines.reduce((sum, l) => sum + l.quantityIssued, 0),
    totalQuantityReturned: allLines.reduce((sum, l) => sum + l.quantityReturned, 0),
    totalQuantityConsumed: allLines.reduce((sum, l) => sum + l.quantityIssued - l.quantityReturned, 0),
    totalEstimatedCost: requests.reduce((sum, r) => sum + r.totalEstimatedCost, 0),
    totalIssuedCost: issues.reduce((sum, i) => sum + i.totalCost, 0),
    totalReturnCredit: returns.reduce((sum, r) => sum + r.totalCreditAmount, 0),
    totalActualCost: issues.reduce((sum, i) => sum + i.totalCost, 0) - returns.reduce((sum, r) => sum + r.totalCreditAmount, 0),
  };
}

export function getPartRequestsByWorkOrder(partRequests: WorkOrderPartRequest[] | undefined | null, workOrderId: string): WorkOrderPartRequest[] {
  if (!Array.isArray(partRequests)) {
    return [];
  }
  return partRequests.filter(pr => pr.workOrderId === workOrderId);
}
