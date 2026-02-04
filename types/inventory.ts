import { MaterialClassificationType, SharedMaterialLink, ChargeRecord } from '@/constants/inventoryDepartmentCodes';

// =============================================================================
// GLOBAL MATERIAL (Organization-wide - same across ALL facilities)
// =============================================================================
// Material numbers are GLOBAL: Department prefix (0-9) + 6 digits
// Example: 1000001 = Maintenance part #1 - same part number in ALL facilities
// =============================================================================

export interface DepartmentSpecificFields {
  lotNumber?: string;
  expirationDate?: string;
  certificateOfAnalysis?: string;
  testingFrequency?: string;
  calibrationDue?: string;
  storageRequirements?: string;
  compatibleEquipment?: string[];
  oem?: string;
  oemPartNumber?: string;
  alternatePartNumbers?: string[];
  criticalSpare?: boolean;
  failureMode?: string;
  mtbf?: number;
  batchSize?: number;
  productionLine?: string;
  processStep?: string;
  qualitySpec?: string;
  sdsRequired?: boolean;
  sdsNumber?: string;
  hazardClass?: string;
  storageClass?: string;
  ppeRequired?: string[];
  inspectionInterval?: string;
  certificationRequired?: boolean;
  dilutionRatio?: string;
  applicationMethod?: string;
  contactTime?: string;
  phLevel?: string;
  epaRegistration?: string;
  packagingType?: string;
  palletQty?: number;
  caseQty?: number;
  weightPerUnit?: number;
  dimensionsLWH?: string;
  stackable?: boolean;
  assetTag?: string;
  macAddress?: string;
  serialNumber?: string;
  licenseKey?: string;
  warrantyExpiry?: string;
  supportContract?: string;
  installationDate?: string;
  buildingZone?: string;
  systemType?: string;
  serviceInterval?: string;
  energyRating?: string;
  projectCode?: string;
  budgetCode?: string;
  requisitioner?: string;
  approvedBy?: string;
}

export type MaterialStatus = 'active' | 'inactive' | 'discontinued' | 'pending_approval';

// =============================================================================
// GLOBAL MATERIAL MASTER (Organization-wide catalog)
// =============================================================================
// This is the master record for a material - SAME across all facilities
// Material number format: [DeptPrefix 0-9][6-digit sequence] = 7 digits total
// Example: 1000001 = First Maintenance part in the global catalog
// =============================================================================

export interface Material {
  id: string;
  materialNumber: string; // GLOBAL: 7 digits (dept prefix + sequence), e.g., "1000001"
  inventoryDepartment: number; // 0-9 department code (first digit of materialNumber)
  organizationId: string; // Organization this material belongs to
  
  // Core identification
  name: string;
  sku: string;
  category: string;
  subCategory?: string;
  description?: string;
  
  // Pricing (organization-wide standard pricing)
  unit_price: number;
  unit_of_measure: string;
  
  // Vendor/Manufacturer info (global for the material)
  vendor?: string;
  vendorPartNumber?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  
  // Barcodes (global identifiers)
  barcode?: string;
  qrCode?: string;
  
  // Lead time (organization-wide default)
  lead_time_days?: number;
  
  // GL/Cost accounting (shared across facilities)
  glAccount?: string;
  costCenter?: string;
  
  // Classification & charging
  classification: MaterialClassificationType;
  chargeToGLAccount?: string;
  chargeToGLDescription?: string;
  isChargeableTo?: number[]; // Which departments can be charged
  defaultChargeAccount?: string;
  
  // Shared material linking (same OEM part across departments)
  sharedMaterialLink?: SharedMaterialLink;
  
  // Department-specific fields
  departmentFields?: DepartmentSpecificFields;
  
  // Labels/tags (organization-wide)
  labels?: string[];
  
  // Status & audit
  status?: MaterialStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// =============================================================================
// FACILITY STOCK (Facility-specific inventory levels)
// =============================================================================
// Each facility maintains its own stock record for global materials
// Stock ID format: [FacilityNumber]-[MaterialNumber], e.g., "1-1000001"
// =============================================================================

export interface FacilityStock {
  id: string;
  stockId: string; // Format: [FacilityNumber]-[MaterialNumber], e.g., "1-1000001"
  materialId: string; // Reference to global Material.id
  materialNumber: string; // Global material number for convenience
  facilityId: string; // Facility this stock belongs to
  facilityNumber: number; // 1-99
  facilityName?: string;
  
  // Inventory levels (facility-specific)
  on_hand: number;
  min_level: number;
  max_level: number;
  reorder_point?: number;
  reorder_qty?: number;
  
  // Location within facility
  location?: string; // Storage location in this facility
  bin?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  
  // Usage statistics (facility-specific)
  avg_daily_usage?: number;
  avg_monthly_usage?: number;
  suggested_min?: number;
  suggested_reorder_qty?: number;
  
  // Tracking
  last_counted?: string;
  last_adjusted?: string;
  last_received?: string;
  last_issued?: string;
  
  // Associated asset in this facility
  associated_asset_id?: string;
  
  // History (facility-specific)
  adjustment_history?: AdjustmentRecord[];
  chargeHistory?: ChargeRecord[];
  
  // Consumption tracking (facility-specific)
  consumptionTracking?: {
    weeklyTarget?: number;
    buildToOrderQty?: number;
    lastConsumptionDate?: string;
    avgWeeklyConsumption?: number;
  };
  
  // Status
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// COMBINED VIEW (Material + Facility Stock for display)
// =============================================================================
// Used when displaying inventory - combines global material info with facility stock
// =============================================================================

export interface MaterialWithStock extends Material {
  facilityStock?: FacilityStock;
  // Convenience fields from facility stock
  on_hand: number;
  min_level: number;
  max_level: number;
  location?: string;
  facility_name?: string;
  last_counted?: string;
  last_adjusted?: string;
  associated_asset_id?: string;
  avg_daily_usage?: number;
  avg_monthly_usage?: number;
  suggested_min?: number;
  suggested_reorder_qty?: number;
  adjustment_history?: AdjustmentRecord[];
  chargeHistory?: ChargeRecord[];
  consumptionTracking?: {
    weeklyTarget?: number;
    buildToOrderQty?: number;
    lastConsumptionDate?: string;
    avgWeeklyConsumption?: number;
  };
}

// =============================================================================
// ORGANIZATION-WIDE STOCK SUMMARY
// =============================================================================
// Aggregated view of a material across all facilities
// =============================================================================

export interface MaterialStockSummary {
  materialId: string;
  materialNumber: string;
  materialName: string;
  totalOnHand: number;
  totalValue: number;
  facilityBreakdown: {
    facilityId: string;
    facilityNumber: number;
    facilityName: string;
    onHand: number;
    location?: string;
  }[];
}

export interface AdjustmentRecord {
  id: string;
  timestamp: string;
  quantity_before: number;
  quantity_after: number;
  change: number;
  reason: string;
  performed_by: string;
  notes?: string;
}

export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

export interface Asset {
  id: string;
  name: string;
  asset_tag: string;
  category: string;
  status: AssetStatus;
  location: string;
  facility_name: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  assigned_to?: string;
  notes?: string;
  barcode?: string;
  qrCode?: string;
  departmentCode?: string;
  costCenter?: string;
  facilityCode?: string;
  glAccount?: string;
}

export interface PartUsage {
  id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  asset_id: string;
  asset_name: string;
  asset_tag: string;
  quantity_used: number;
  used_by: string;
  used_at: string;
  work_order_id?: string;
  notes?: string;
}

export interface InventoryLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

export type InventoryAction = 'adjustment' | 'count' | 'receive' | 'issue' | 'transfer' | 'create' | 'delete';

export interface InventoryHistory {
  id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  action: InventoryAction;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reason?: string;
  performed_by: string;
  timestamp: string;
  notes?: string;
}
