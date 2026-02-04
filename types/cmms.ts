// =============================================================================
// CMMS (Computerized Maintenance Management System) Types
// =============================================================================

// =============================================================================
// PARTS MANAGEMENT
// =============================================================================

export type PartsIssueStatus = 'pending' | 'approved' | 'issued' | 'rejected' | 'cancelled';
export type PartsRequestStatus = 'draft' | 'submitted' | 'approved' | 'ordered' | 'received' | 'rejected' | 'cancelled';
export type PartsReturnStatus = 'pending' | 'inspected' | 'restocked' | 'scrapped' | 'rejected';
export type PartsReturnReason = 'excess' | 'wrong_part' | 'defective' | 'job_cancelled' | 'other';

export interface PartsIssue {
  id: string;
  issueNumber: string;
  organizationId: string;
  facilityId: string;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId?: string;
  equipmentName?: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  issuedBy?: string;
  issuedByName?: string;
  issuedAt?: string;
  status: PartsIssueStatus;
  items: PartsIssueItem[];
  totalCost: number;
  costCenter?: string;
  glAccount?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartsIssueItem {
  id: string;
  materialId: string;
  materialNumber: string;
  materialName: string;
  materialSku: string;
  quantityRequested: number;
  quantityIssued: number;
  unitCost: number;
  totalCost: number;
  location?: string;
  bin?: string;
}

export interface PartsRequest {
  id: string;
  requestNumber: string;
  organizationId: string;
  facilityId: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  neededByDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: PartsRequestStatus;
  items: PartsRequestItem[];
  totalEstimatedCost: number;
  justification: string;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId?: string;
  equipmentName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  costCenter?: string;
  glAccount?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartsRequestItem {
  id: string;
  materialId?: string;
  materialNumber?: string;
  materialName: string;
  materialSku?: string;
  description?: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityReceived?: number;
  estimatedUnitCost: number;
  actualUnitCost?: number;
  vendorId?: string;
  vendorName?: string;
  vendorPartNumber?: string;
  leadTimeDays?: number;
  isNewItem: boolean;
}

export interface PartsReturn {
  id: string;
  returnNumber: string;
  organizationId: string;
  facilityId: string;
  workOrderId?: string;
  workOrderNumber?: string;
  returnedBy: string;
  returnedByName: string;
  returnedAt: string;
  inspectedBy?: string;
  inspectedByName?: string;
  inspectedAt?: string;
  processedBy?: string;
  processedByName?: string;
  processedAt?: string;
  status: PartsReturnStatus;
  reason: PartsReturnReason;
  items: PartsReturnItem[];
  totalCreditValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartsReturnItem {
  id: string;
  materialId: string;
  materialNumber: string;
  materialName: string;
  materialSku: string;
  quantityReturned: number;
  quantityRestocked: number;
  quantityScrapped: number;
  unitCost: number;
  creditValue: number;
  condition: 'new' | 'usable' | 'damaged' | 'defective';
  inspectionNotes?: string;
  originalIssueId?: string;
  location?: string;
  bin?: string;
}

export interface StockLevel {
  id: string;
  materialId: string;
  materialNumber: string;
  materialName: string;
  materialSku: string;
  facilityId: string;
  facilityName: string;
  inventoryDepartment: number;
  category: string;
  onHand: number;
  minLevel: number;
  maxLevel: number;
  reorderPoint: number;
  reorderQty: number;
  unitCost: number;
  totalValue: number;
  location?: string;
  bin?: string;
  lastReceived?: string;
  lastIssued?: string;
  avgDailyUsage: number;
  avgMonthlyUsage: number;
  daysOfSupply: number;
  status: 'ok' | 'low' | 'critical' | 'overstock' | 'out_of_stock';
  lastCountedAt?: string;
  updatedAt: string;
}

export interface ReorderPoint {
  id: string;
  materialId: string;
  materialNumber: string;
  materialName: string;
  materialSku: string;
  facilityId: string;
  facilityName: string;
  currentOnHand: number;
  reorderPoint: number;
  reorderQty: number;
  minLevel: number;
  maxLevel: number;
  leadTimeDays: number;
  avgDailyUsage: number;
  safetyStockDays: number;
  calculatedReorderPoint: number;
  calculatedReorderQty: number;
  lastOrderDate?: string;
  lastOrderQty?: number;
  pendingOrderQty: number;
  preferredVendorId?: string;
  preferredVendorName?: string;
  unitCost: number;
  isAutoReorder: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// COST TRACKING
// =============================================================================

export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed' | 'over_budget';
export type BudgetPeriod = 'monthly' | 'quarterly' | 'annual';
export type CostCategory = 'labor' | 'parts' | 'contractor' | 'equipment_rental' | 'other';

export interface MaintenanceBudget {
  id: string;
  budgetNumber: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  departmentId?: string;
  departmentName?: string;
  name: string;
  description?: string;
  fiscalYear: number;
  period: BudgetPeriod;
  periodStart: string;
  periodEnd: string;
  status: BudgetStatus;
  allocations: BudgetAllocation[];
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  totalAvailable: number;
  percentUsed: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAllocation {
  id: string;
  category: CostCategory;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  committedAmount: number;
  availableAmount: number;
  percentUsed: number;
  glAccount?: string;
  costCenter?: string;
}

export interface LaborCost {
  id: string;
  organizationId: string;
  facilityId: string;
  workOrderId: string;
  workOrderNumber: string;
  equipmentId?: string;
  equipmentName?: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  laborType: 'regular' | 'overtime' | 'double_time' | 'contractor';
  craftCode?: string;
  craftName?: string;
  dateWorked: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  hourlyRate: number;
  totalCost: number;
  costCenter?: string;
  glAccount?: string;
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartsCost {
  id: string;
  organizationId: string;
  facilityId: string;
  workOrderId: string;
  workOrderNumber: string;
  equipmentId?: string;
  equipmentName?: string;
  partsIssueId: string;
  partsIssueNumber: string;
  materialId: string;
  materialNumber: string;
  materialName: string;
  materialSku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  costCenter?: string;
  glAccount?: string;
  issuedAt: string;
  issuedBy: string;
  issuedByName: string;
  createdAt: string;
}

export interface CostReport {
  id: string;
  reportNumber: string;
  organizationId: string;
  facilityId?: string;
  facilityName?: string;
  reportType: 'equipment' | 'work_order' | 'department' | 'facility' | 'budget_variance' | 'trend';
  reportName: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  generatedBy: string;
  generatedByName: string;
  generatedAt: string;
  parameters: CostReportParameters;
  summary: CostReportSummary;
  details: CostReportDetail[];
  createdAt: string;
}

export interface CostReportParameters {
  facilityIds?: string[];
  departmentIds?: string[];
  equipmentIds?: string[];
  costCategories?: CostCategory[];
  workOrderTypes?: string[];
  includeLabor: boolean;
  includeParts: boolean;
  includeContractor: boolean;
  includeOther: boolean;
  groupBy?: 'equipment' | 'department' | 'cost_category' | 'work_order_type' | 'month';
}

export interface CostReportSummary {
  totalLaborCost: number;
  totalPartsCost: number;
  totalContractorCost: number;
  totalOtherCost: number;
  totalCost: number;
  budgetAmount?: number;
  variance?: number;
  variancePercent?: number;
  laborHours: number;
  workOrderCount: number;
  avgCostPerWorkOrder: number;
}

export interface CostReportDetail {
  id: string;
  groupKey: string;
  groupName: string;
  laborCost: number;
  laborHours: number;
  partsCost: number;
  partsCount: number;
  contractorCost: number;
  otherCost: number;
  totalCost: number;
  workOrderCount: number;
  budgetAmount?: number;
  variance?: number;
}

// =============================================================================
// SAFETY & COMPLIANCE
// =============================================================================

export type LOTOStatus = 'draft' | 'active' | 'locked_out' | 'verified' | 'released' | 'archived';
export type EnergySourceType = 'electrical' | 'mechanical' | 'hydraulic' | 'pneumatic' | 'thermal' | 'chemical' | 'gravitational' | 'radiation' | 'other';
export type PermitStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'expired' | 'cancelled' | 'closed';
export type PermitType = 'hot_work' | 'confined_space' | 'excavation' | 'electrical' | 'roof_work' | 'crane_lift' | 'radiation' | 'other';
export type HazardSeverity = 'low' | 'medium' | 'high' | 'critical';
export type HazardStatus = 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'closed';

export interface LOTOProcedure {
  id: string;
  procedureNumber: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  equipmentId: string;
  equipmentName: string;
  equipmentTag: string;
  name: string;
  description: string;
  status: LOTOStatus;
  version: number;
  effectiveDate: string;
  reviewDate?: string;
  energySources: LOTOEnergySource[];
  lockoutSteps: LOTOStep[];
  verificationSteps: LOTOVerificationStep[];
  releaseSteps: LOTOReleaseStep[];
  authorizedEmployees: LOTOAuthorizedEmployee[];
  affectedEmployees: string[];
  requiredPPE: string[];
  specialInstructions?: string;
  attachments: LOTOAttachment[];
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LOTOEnergySource {
  id: string;
  type: EnergySourceType;
  typeName: string;
  description: string;
  location: string;
  magnitude?: string;
  isolationDevice: string;
  lockLocation: string;
  tagNumber?: string;
  order: number;
}

export interface LOTOStep {
  id: string;
  order: number;
  description: string;
  energySourceId: string;
  lockColor: string;
  lockNumber?: string;
  location: string;
  verificationMethod?: string;
  notes?: string;
}

export interface LOTOVerificationStep {
  id: string;
  order: number;
  description: string;
  method: 'try_start' | 'meter_test' | 'visual' | 'physical' | 'other';
  expectedResult: string;
  notes?: string;
}

export interface LOTOReleaseStep {
  id: string;
  order: number;
  description: string;
  responsible?: string;
  notes?: string;
}

export interface LOTOAuthorizedEmployee {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  role: 'authorized' | 'affected' | 'supervisor';
  trainingDate?: string;
  trainingExpiry?: string;
  isActive: boolean;
}

export interface LOTOAttachment {
  id: string;
  type: 'diagram' | 'photo' | 'document';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LOTOExecution {
  id: string;
  procedureId: string;
  procedureNumber: string;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId: string;
  equipmentName: string;
  facilityId: string;
  status: 'in_progress' | 'locked_out' | 'verified' | 'released' | 'cancelled';
  initiatedBy: string;
  initiatedByName: string;
  initiatedAt: string;
  locks: LOTOLockRecord[];
  verifications: LOTOVerificationRecord[];
  releasedBy?: string;
  releasedByName?: string;
  releasedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LOTOLockRecord {
  id: string;
  stepId: string;
  lockNumber: string;
  lockColor: string;
  lockedBy: string;
  lockedByName: string;
  lockedAt: string;
  removedBy?: string;
  removedByName?: string;
  removedAt?: string;
  isRemoved: boolean;
}

export interface LOTOVerificationRecord {
  id: string;
  stepId: string;
  verifiedBy: string;
  verifiedByName: string;
  verifiedAt: string;
  result: 'pass' | 'fail';
  notes?: string;
}

export interface SafetyPermit {
  id: string;
  permitNumber: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  type: PermitType;
  typeName: string;
  name: string;
  description: string;
  status: PermitStatus;
  workOrderId?: string;
  workOrderNumber?: string;
  location: string;
  area?: string;
  workDescription: string;
  hazards: string[];
  controlMeasures: string[];
  requiredPPE: string[];
  emergencyProcedures?: string;
  validFrom: string;
  validTo: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  issuedTo: PermitWorker[];
  witnesses?: PermitWitness[];
  gasTestResults?: GasTestResult[];
  atmosphereMonitoring?: AtmosphereMonitoring[];
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
  closureNotes?: string;
  attachments: SafetyPermitAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface PermitWorker {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  company?: string;
  role: 'lead' | 'worker' | 'standby' | 'rescue';
  acknowledgedAt?: string;
  isAcknowledged: boolean;
}

export interface PermitWitness {
  id: string;
  employeeId: string;
  employeeName: string;
  role: 'safety_officer' | 'supervisor' | 'area_owner';
  signedAt: string;
}

export interface GasTestResult {
  id: string;
  testTime: string;
  testedBy: string;
  testedByName: string;
  oxygen: number;
  lel: number;
  h2s: number;
  co: number;
  otherGas?: string;
  otherGasValue?: number;
  isPassing: boolean;
  notes?: string;
}

export interface AtmosphereMonitoring {
  id: string;
  monitorTime: string;
  monitoredBy: string;
  monitoredByName: string;
  temperature?: number;
  humidity?: number;
  ventilationStatus: 'adequate' | 'inadequate' | 'mechanical';
  notes?: string;
}

export interface SafetyPermitAttachment {
  id: string;
  type: 'diagram' | 'photo' | 'checklist' | 'certificate';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface PPERequirement {
  id: string;
  organizationId: string;
  facilityId?: string;
  facilityName?: string;
  name: string;
  code: string;
  category: 'head' | 'eye_face' | 'hearing' | 'respiratory' | 'hand' | 'body' | 'foot' | 'fall_protection' | 'other';
  categoryName: string;
  description: string;
  specifications?: string;
  standardReference?: string;
  imageUrl?: string;
  applicableAreas: string[];
  applicableTaskTypes: string[];
  applicableHazards: string[];
  inspectionFrequency?: string;
  replacementCriteria?: string;
  trainingRequired: boolean;
  trainingCourseId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PPEAssignment {
  id: string;
  ppeRequirementId: string;
  ppeName: string;
  ppeCode: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  facilityId: string;
  serialNumber?: string;
  issuedDate: string;
  issuedBy: string;
  issuedByName: string;
  expiryDate?: string;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  condition: 'new' | 'good' | 'fair' | 'replace';
  status: 'active' | 'returned' | 'lost' | 'damaged' | 'expired';
  returnedDate?: string;
  returnedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HazardAssessment {
  id: string;
  assessmentNumber: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  name: string;
  description: string;
  assessmentType: 'jha' | 'risk_assessment' | 'pre_task' | 'routine' | 'change_management';
  assessmentTypeName: string;
  status: HazardStatus;
  workOrderId?: string;
  workOrderNumber?: string;
  equipmentId?: string;
  equipmentName?: string;
  location: string;
  area?: string;
  taskDescription: string;
  assessedBy: string;
  assessedByName: string;
  assessedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  hazards: HazardItem[];
  overallRiskLevel: HazardSeverity;
  residualRiskLevel?: HazardSeverity;
  requiredPPE: string[];
  requiredPermits: PermitType[];
  requiredTraining: string[];
  participants: HazardAssessmentParticipant[];
  attachments: HazardAssessmentAttachment[];
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HazardItem {
  id: string;
  order: number;
  taskStep: string;
  hazardDescription: string;
  hazardType: 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'environmental' | 'psychological' | 'other';
  potentialConsequence: string;
  likelihoodBefore: 1 | 2 | 3 | 4 | 5;
  severityBefore: 1 | 2 | 3 | 4 | 5;
  riskScoreBefore: number;
  riskLevelBefore: HazardSeverity;
  controlMeasures: ControlMeasure[];
  likelihoodAfter: 1 | 2 | 3 | 4 | 5;
  severityAfter: 1 | 2 | 3 | 4 | 5;
  riskScoreAfter: number;
  riskLevelAfter: HazardSeverity;
  responsiblePerson?: string;
  responsiblePersonName?: string;
  isAccepted: boolean;
}

export interface ControlMeasure {
  id: string;
  type: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  typeName: string;
  description: string;
  implementedBy?: string;
  implementedAt?: string;
  isImplemented: boolean;
}

export interface HazardAssessmentParticipant {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  role: 'assessor' | 'participant' | 'reviewer' | 'approver';
  acknowledgedAt?: string;
  signature?: string;
}

export interface HazardAssessmentAttachment {
  id: string;
  type: 'photo' | 'diagram' | 'sds' | 'procedure' | 'other';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
}

// =============================================================================
// VENDORS
// =============================================================================

export type VendorStatus = 'active' | 'inactive' | 'pending_approval' | 'suspended' | 'blacklisted';
export type VendorType = 'parts_supplier' | 'contractor' | 'service_provider' | 'equipment_vendor' | 'other';
export type ContractStatus = 'draft' | 'pending_approval' | 'active' | 'expired' | 'cancelled' | 'renewed';
export type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'void';

export interface Vendor {
  id: string;
  vendorNumber: string;
  organizationId: string;
  name: string;
  legalName?: string;
  type: VendorType;
  typeName: string;
  status: VendorStatus;
  taxId?: string;
  dunsNumber?: string;
  website?: string;
  primaryContact: VendorContact;
  contacts: VendorContact[];
  addresses: VendorAddress[];
  paymentTerms?: string;
  paymentMethod?: 'check' | 'ach' | 'wire' | 'credit_card' | 'other';
  currency: string;
  taxExempt: boolean;
  taxExemptNumber?: string;
  certifications: VendorCertification[];
  insuranceCoverage: VendorInsurance[];
  rating?: number;
  performanceScore?: number;
  categories: string[];
  notes?: string;
  isPreferredVendor: boolean;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorContact {
  id: string;
  isPrimary: boolean;
  name: string;
  title?: string;
  department?: string;
  email: string;
  phone: string;
  mobile?: string;
  fax?: string;
  notes?: string;
}

export interface VendorAddress {
  id: string;
  type: 'billing' | 'shipping' | 'remittance' | 'main';
  isPrimary: boolean;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface VendorCertification {
  id: string;
  name: string;
  certificationNumber?: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate?: string;
  documentUrl?: string;
  isActive: boolean;
}

export interface VendorInsurance {
  id: string;
  type: 'general_liability' | 'workers_comp' | 'auto' | 'professional' | 'umbrella' | 'other';
  typeName: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  effectiveDate: string;
  expiryDate: string;
  certificateUrl?: string;
  isActive: boolean;
}

export interface VendorContract {
  id: string;
  contractNumber: string;
  organizationId: string;
  vendorId: string;
  vendorName: string;
  vendorNumber: string;
  name: string;
  description?: string;
  type: 'service' | 'supply' | 'maintenance' | 'blanket_po' | 'rental' | 'lease' | 'other';
  typeName: string;
  status: ContractStatus;
  effectiveDate: string;
  expiryDate: string;
  renewalDate?: string;
  autoRenewal: boolean;
  renewalTermMonths?: number;
  notificationDays: number;
  totalValue?: number;
  annualValue?: number;
  spentToDate: number;
  remainingValue?: number;
  paymentTerms?: string;
  scope: string;
  deliverables?: string;
  slaMetrics?: ContractSLA[];
  contacts: ContractContact[];
  facilities: ContractFacility[];
  attachments: ContractAttachment[];
  amendmentHistory: ContractAmendment[];
  performanceReviews: ContractPerformanceReview[];
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  terminatedBy?: string;
  terminatedByName?: string;
  terminatedAt?: string;
  terminationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractSLA {
  id: string;
  metric: string;
  target: string;
  measurementMethod: string;
  penalty?: string;
  isActive: boolean;
}

export interface ContractContact {
  id: string;
  name: string;
  role: 'contract_owner' | 'technical' | 'billing' | 'escalation';
  email: string;
  phone: string;
  isInternal: boolean;
}

export interface ContractFacility {
  id: string;
  facilityId: string;
  facilityName: string;
  isIncluded: boolean;
}

export interface ContractAttachment {
  id: string;
  type: 'contract' | 'amendment' | 'sow' | 'insurance' | 'other';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ContractAmendment {
  id: string;
  amendmentNumber: string;
  description: string;
  effectiveDate: string;
  valueChange?: number;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  attachmentUrl?: string;
}

export interface ContractPerformanceReview {
  id: string;
  reviewDate: string;
  reviewedBy: string;
  reviewedByName: string;
  overallRating: 1 | 2 | 3 | 4 | 5;
  qualityRating: 1 | 2 | 3 | 4 | 5;
  deliveryRating: 1 | 2 | 3 | 4 | 5;
  communicationRating: 1 | 2 | 3 | 4 | 5;
  pricingRating: 1 | 2 | 3 | 4 | 5;
  slaCompliance?: number;
  comments?: string;
  issues?: string;
  recommendations?: string;
}

export interface WarrantyTracking {
  id: string;
  warrantyNumber: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  equipmentId: string;
  equipmentName: string;
  equipmentTag: string;
  serialNumber?: string;
  vendorId: string;
  vendorName: string;
  type: 'manufacturer' | 'extended' | 'service' | 'parts_only' | 'labor_only' | 'comprehensive';
  typeName: string;
  status: WarrantyStatus;
  purchaseDate: string;
  installDate?: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  coverageDescription: string;
  exclusions?: string;
  limitations?: string;
  laborIncluded: boolean;
  partsIncluded: boolean;
  onsiteService: boolean;
  responseTime?: string;
  deductible?: number;
  maxClaimAmount?: number;
  purchasePrice?: number;
  warrantyCost?: number;
  claims: WarrantyClaim[];
  contacts: WarrantyContact[];
  attachments: WarrantyAttachment[];
  notes?: string;
  notificationDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  claimDate: string;
  claimedBy: string;
  claimedByName: string;
  issueDescription: string;
  workOrderId?: string;
  workOrderNumber?: string;
  status: 'submitted' | 'in_review' | 'approved' | 'denied' | 'completed';
  vendorReferenceNumber?: string;
  approvedAmount?: number;
  denialReason?: string;
  resolvedDate?: string;
  resolution?: string;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  notes?: string;
}

export interface WarrantyContact {
  id: string;
  type: 'claims' | 'technical' | 'general';
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface WarrantyAttachment {
  id: string;
  type: 'warranty_card' | 'receipt' | 'certificate' | 'claim' | 'other';
  name: string;
  uri: string;
  uploadedAt: string;
  uploadedBy: string;
}

// =============================================================================
// DATABASE TYPES (Snake Case for Supabase)
// =============================================================================

export interface PartsIssueDB {
  id: string;
  issue_number: string;
  organization_id: string;
  facility_id: string;
  work_order_id: string | null;
  work_order_number: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  requested_by: string;
  requested_by_name: string;
  requested_at: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  issued_by: string | null;
  issued_by_name: string | null;
  issued_at: string | null;
  status: string;
  items: PartsIssueItem[];
  total_cost: number;
  cost_center: string | null;
  gl_account: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorDB {
  id: string;
  vendor_number: string;
  organization_id: string;
  name: string;
  legal_name: string | null;
  type: string;
  status: string;
  tax_id: string | null;
  duns_number: string | null;
  website: string | null;
  primary_contact: VendorContact;
  contacts: VendorContact[];
  addresses: VendorAddress[];
  payment_terms: string | null;
  payment_method: string | null;
  currency: string;
  tax_exempt: boolean;
  tax_exempt_number: string | null;
  certifications: VendorCertification[];
  insurance_coverage: VendorInsurance[];
  rating: number | null;
  performance_score: number | null;
  categories: string[];
  notes: string | null;
  is_preferred_vendor: boolean;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceBudgetDB {
  id: string;
  budget_number: string;
  organization_id: string;
  facility_id: string;
  facility_name: string;
  department_id: string | null;
  department_name: string | null;
  name: string;
  description: string | null;
  fiscal_year: number;
  period: string;
  period_start: string;
  period_end: string;
  status: string;
  allocations: BudgetAllocation[];
  total_budget: number;
  total_spent: number;
  total_committed: number;
  total_available: number;
  percent_used: number;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface LOTOProcedureDB {
  id: string;
  procedure_number: string;
  organization_id: string;
  facility_id: string;
  facility_name: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  name: string;
  description: string;
  status: string;
  version: number;
  effective_date: string;
  review_date: string | null;
  energy_sources: LOTOEnergySource[];
  lockout_steps: LOTOStep[];
  verification_steps: LOTOVerificationStep[];
  release_steps: LOTOReleaseStep[];
  authorized_employees: LOTOAuthorizedEmployee[];
  affected_employees: string[];
  required_ppe: string[];
  special_instructions: string | null;
  attachments: LOTOAttachment[];
  created_by: string;
  created_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarrantyTrackingDB {
  id: string;
  warranty_number: string;
  organization_id: string;
  facility_id: string;
  facility_name: string;
  equipment_id: string;
  equipment_name: string;
  equipment_tag: string;
  serial_number: string | null;
  vendor_id: string;
  vendor_name: string;
  type: string;
  status: string;
  purchase_date: string;
  install_date: string | null;
  warranty_start_date: string;
  warranty_end_date: string;
  coverage_description: string;
  exclusions: string | null;
  limitations: string | null;
  labor_included: boolean;
  parts_included: boolean;
  onsite_service: boolean;
  response_time: string | null;
  deductible: number | null;
  max_claim_amount: number | null;
  purchase_price: number | null;
  warranty_cost: number | null;
  claims: WarrantyClaim[];
  contacts: WarrantyContact[];
  attachments: WarrantyAttachment[];
  notes: string | null;
  notification_days: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PARTS_ISSUE_STATUSES: Record<PartsIssueStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  issued: 'Issued',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const PARTS_REQUEST_STATUSES: Record<PartsRequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  ordered: 'Ordered',
  received: 'Received',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const PARTS_RETURN_STATUSES: Record<PartsReturnStatus, string> = {
  pending: 'Pending',
  inspected: 'Inspected',
  restocked: 'Restocked',
  scrapped: 'Scrapped',
  rejected: 'Rejected',
};

export const PARTS_RETURN_REASONS: Record<PartsReturnReason, string> = {
  excess: 'Excess Parts',
  wrong_part: 'Wrong Part',
  defective: 'Defective',
  job_cancelled: 'Job Cancelled',
  other: 'Other',
};

export const BUDGET_STATUSES: Record<BudgetStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  active: 'Active',
  closed: 'Closed',
  over_budget: 'Over Budget',
};

export const BUDGET_PERIODS: Record<BudgetPeriod, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export const COST_CATEGORIES: Record<CostCategory, string> = {
  labor: 'Labor',
  parts: 'Parts & Materials',
  contractor: 'Contractor Services',
  equipment_rental: 'Equipment Rental',
  other: 'Other',
};

export const LOTO_STATUSES: Record<LOTOStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  locked_out: 'Locked Out',
  verified: 'Verified',
  released: 'Released',
  archived: 'Archived',
};

export const ENERGY_SOURCE_TYPES: Record<EnergySourceType, string> = {
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  hydraulic: 'Hydraulic',
  pneumatic: 'Pneumatic',
  thermal: 'Thermal',
  chemical: 'Chemical',
  gravitational: 'Gravitational',
  radiation: 'Radiation',
  other: 'Other',
};

export const PERMIT_STATUSES: Record<PermitStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

export const PERMIT_TYPES: Record<PermitType, string> = {
  hot_work: 'Hot Work',
  confined_space: 'Confined Space Entry',
  excavation: 'Excavation',
  electrical: 'Electrical Work',
  roof_work: 'Roof Work',
  crane_lift: 'Crane/Lift Operations',
  radiation: 'Radiation Work',
  other: 'Other',
};

export const HAZARD_SEVERITIES: Record<HazardSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const HAZARD_STATUSES: Record<HazardStatus, string> = {
  identified: 'Identified',
  assessed: 'Assessed',
  mitigated: 'Mitigated',
  accepted: 'Accepted',
  closed: 'Closed',
};

export const VENDOR_STATUSES: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_approval: 'Pending Approval',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
};

export const VENDOR_TYPES: Record<VendorType, string> = {
  parts_supplier: 'Parts Supplier',
  contractor: 'Contractor',
  service_provider: 'Service Provider',
  equipment_vendor: 'Equipment Vendor',
  other: 'Other',
};

export const CONTRACT_STATUSES: Record<ContractStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  renewed: 'Renewed',
};

export const WARRANTY_STATUSES: Record<WarrantyStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  claimed: 'Claimed',
  void: 'Void',
};

export const PPE_CATEGORIES = {
  head: 'Head Protection',
  eye_face: 'Eye & Face Protection',
  hearing: 'Hearing Protection',
  respiratory: 'Respiratory Protection',
  hand: 'Hand Protection',
  body: 'Body Protection',
  foot: 'Foot Protection',
  fall_protection: 'Fall Protection',
  other: 'Other',
} as const;

export const CONTROL_MEASURE_TYPES = {
  elimination: 'Elimination',
  substitution: 'Substitution',
  engineering: 'Engineering Controls',
  administrative: 'Administrative Controls',
  ppe: 'PPE',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function calculateRiskScore(likelihood: number, severity: number): number {
  return likelihood * severity;
}

export function getRiskLevel(score: number): HazardSeverity {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
}

export function generatePartsIssueNumber(prefix: string = 'PI'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generatePartsRequestNumber(prefix: string = 'PR'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generatePartsReturnNumber(prefix: string = 'RT'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generateBudgetNumber(prefix: string = 'BUD'): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

export function generateLOTONumber(prefix: string = 'LOTO'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generatePermitNumber(prefix: string = 'SP'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generateHazardAssessmentNumber(prefix: string = 'HA'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generateVendorNumber(prefix: string = 'V'): string {
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}`;
}

export function generateContractNumber(prefix: string = 'CON'): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

export function generateWarrantyNumber(prefix: string = 'WAR'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generateClaimNumber(prefix: string = 'CLM'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}
