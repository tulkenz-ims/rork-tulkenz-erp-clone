/**
 * PRE-BUILT TASK FEED TEMPLATE CONFIGURATIONS
 * 
 * Each template defines:
 * - Which departments are auto-tagged
 * - Which forms each department should complete
 * - Whether it triggers a production hold
 * 
 * The department on the ground decides what's actually needed.
 * These suggestions just make sure nothing gets missed.
 */

import { SuggestedForm } from '@/types/taskFeedTemplates';

// ── Department Codes ──────────────────────────────────────────
export const ALL_OPERATIONAL_DEPARTMENTS = ['QUAL', 'SAFE', 'SANI', 'MAINT', 'PROD'];
export const ALL_DEPARTMENTS_WITH_WAREHOUSE = ['QUAL', 'SAFE', 'SANI', 'MAINT', 'PROD', 'WARE'];

// ── Form Route Helpers ────────────────────────────────────────
const qualForm = (id: string, type: string, route: string, required = false): SuggestedForm => ({
  formId: id, formType: type, formRoute: route, required,
});

// ── FOREIGN MATERIAL ──────────────────────────────────────────
export const FOREIGN_MATERIAL_TEMPLATE = {
  name: 'Foreign Material',
  description: 'Glass, plastic, metal, or other foreign material found in product or production area',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ALL_OPERATIONAL_DEPARTMENTS,
  photoRequired: true,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial', true),
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      qualForm('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease', true),
      qualForm('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
    SAFE: [
      qualForm('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
      qualForm('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport'),
    ],
    SANI: [
      qualForm('spillcleanup', 'Spill Cleanup', '/(tabs)/sanitation/spillcleanup'),
      qualForm('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
      qualForm('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification'),
    ],
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      qualForm('downtimereport', 'Downtime Report', '/(tabs)/cmms/downtime'),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};

// ── BROKEN GLOVE ──────────────────────────────────────────────
export const BROKEN_GLOVE_TEMPLATE = {
  name: 'Broken Glove',
  description: 'Glove fragment found — potential foreign material contamination',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ALL_OPERATIONAL_DEPARTMENTS,
  photoRequired: true,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial', true),
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      qualForm('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease', true),
      qualForm('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
      qualForm('deviation', 'Deviation Report', '/(tabs)/quality/deviation'),
    ],
    SAFE: [
      qualForm('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
    ],
    SANI: [
      qualForm('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    MAINT: [
      qualForm('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};

// ── EMPLOYEE INJURY ───────────────────────────────────────────
export const EMPLOYEE_INJURY_TEMPLATE = {
  name: 'Employee Injury',
  description: 'Employee injured on the job — blood or bodily fluid contamination risk',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ALL_OPERATIONAL_DEPARTMENTS,
  photoRequired: false,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial'),
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr'),
      qualForm('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
      qualForm('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
    ],
    SAFE: [
      qualForm('accidentinvestigation', 'Accident Investigation', '/(tabs)/safety/accidentinvestigation', true),
      qualForm('firstaid', 'First Aid Log', '/(tabs)/safety/firstaid', true),
      qualForm('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport', true),
      qualForm('injuryillness', 'Injury/Illness Log', '/(tabs)/safety/injuryillness'),
    ],
    SANI: [
      qualForm('spillcleanup', 'Spill Cleanup', '/(tabs)/sanitation/spillcleanup', true),
      qualForm('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};

// ── CHEMICAL SPILL ────────────────────────────────────────────
export const CHEMICAL_SPILL_TEMPLATE = {
  name: 'Chemical Spill',
  description: 'Chemical spill in production or storage area',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ALL_OPERATIONAL_DEPARTMENTS,
  photoRequired: true,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr'),
      qualForm('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
      qualForm('deviation', 'Deviation Report', '/(tabs)/quality/deviation'),
      qualForm('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
    ],
    SAFE: [
      qualForm('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport', true),
      qualForm('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid', true),
    ],
    SANI: [
      qualForm('spillcleanup', 'Spill Cleanup', '/(tabs)/sanitation/spillcleanup', true),
      qualForm('chemicals', 'Chemical Usage Log', '/(tabs)/sanitation/chemicals', true),
      qualForm('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
    ],
    PROD: [],
  },
};

// ── METAL DETECTOR REJECT ─────────────────────────────────────
export const METAL_DETECTOR_REJECT_TEMPLATE = {
  name: 'Metal Detector Reject',
  description: 'Product rejected by metal detector — confirmed or suspected contamination',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ['QUAL', 'MAINT', 'PROD'],
  photoRequired: true,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('metaldetectorlog', 'Metal Detector Log', '/(tabs)/quality/metaldetectorlog', true),
      qualForm('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial', true),
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      qualForm('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
    ],
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
      qualForm('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};

// ── TEMPERATURE DEVIATION ─────────────────────────────────────
export const TEMPERATURE_DEVIATION_TEMPLATE = {
  name: 'Temperature Deviation',
  description: 'Temperature out of spec in cooler, freezer, or cooking process',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ['QUAL', 'MAINT', 'PROD'],
  photoRequired: false,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('temperaturelog', 'Temperature Log', '/(tabs)/quality/temperaturelog', true),
      qualForm('ccplog', 'CCP Monitoring Log', '/(tabs)/quality/ccplog', true),
      qualForm('deviation', 'Deviation Report', '/(tabs)/quality/deviation', true),
      qualForm('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
    ],
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      qualForm('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};

// ── PEST SIGHTING ─────────────────────────────────────────────
export const PEST_SIGHTING_TEMPLATE = {
  name: 'Pest Sighting',
  description: 'Pest or evidence of pest activity found in facility',
  buttonType: 'report_issue' as const,
  isProductionHold: false,
  assignedDepartments: ['QUAL', 'SANI', 'MAINT'],
  photoRequired: true,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr'),
      qualForm('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
    ],
    SANI: [
      qualForm('dailytasks', 'Sanitation Daily Tasks', '/(tabs)/sanitation/dailytasks', true),
      qualForm('floorinspection', 'Floor Inspection', '/(tabs)/sanitation/floorinspection'),
    ],
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
    ],
  },
};

// ── ALLERGEN CHANGEOVER ───────────────────────────────────────
export const ALLERGEN_CHANGEOVER_TEMPLATE = {
  name: 'Allergen Changeover',
  description: 'Line changeover between allergen-containing products',
  buttonType: 'add_task' as const,
  isProductionHold: true,
  assignedDepartments: ['QUAL', 'SANI', 'PROD'],
  photoRequired: false,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('allergenchangeover', 'Allergen Changeover', '/(tabs)/quality/allergenchangeover', true),
      qualForm('preopinspection', 'Pre-Op Inspection', '/(tabs)/quality/preopinspection'),
      qualForm('atpswab', 'ATP Swab Log', '/(tabs)/quality/atpswab'),
      qualForm('environmentalswab', 'Environmental Swab Log', '/(tabs)/quality/environmentalswab'),
    ],
    SANI: [
      qualForm('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning', true),
      qualForm('cipcleaning', 'CIP Cleaning', '/(tabs)/sanitation/cipcleaning'),
      qualForm('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification', true),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};

// ── EQUIPMENT BREAKDOWN ───────────────────────────────────────
export const EQUIPMENT_BREAKDOWN_TEMPLATE = {
  name: 'Equipment Breakdown',
  description: 'Equipment malfunction or failure affecting production',
  buttonType: 'report_issue' as const,
  isProductionHold: true,
  assignedDepartments: ['MAINT', 'PROD', 'QUAL'],
  photoRequired: true,
  departmentFormSuggestions: {
    MAINT: [
      qualForm('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      qualForm('downtimereport', 'Downtime Report', '/(tabs)/cmms/downtime', true),
      qualForm('failurereport', 'Failure Report', '/(tabs)/cmms/failure'),
    ],
    PROD: [
      qualForm('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
    QUAL: [
      qualForm('deviation', 'Deviation Report', '/(tabs)/quality/deviation'),
    ],
  },
};

// ── CUSTOMER COMPLAINT ────────────────────────────────────────
export const CUSTOMER_COMPLAINT_TEMPLATE = {
  name: 'Customer Complaint',
  description: 'Customer reported quality issue with product',
  buttonType: 'report_issue' as const,
  isProductionHold: false,
  assignedDepartments: ['QUAL'],
  photoRequired: false,
  departmentFormSuggestions: {
    QUAL: [
      qualForm('customercomplaint', 'Customer Complaint', '/(tabs)/quality/customercomplaint', true),
      qualForm('consumerinvestigation', 'Consumer Investigation', '/(tabs)/quality/consumerinvestigation'),
      qualForm('ncr', 'NCR', '/(tabs)/quality/ncr'),
      qualForm('capa', 'CAPA', '/(tabs)/quality/capa'),
      qualForm('rootcause', 'Root Cause Analysis', '/(tabs)/quality/rootcause'),
    ],
  },
};

// ── MASTER TEMPLATE MAP ───────────────────────────────────────
// Keyed by template name for easy lookup during template creation

export const PREBUILT_TEMPLATES: Record<string, typeof FOREIGN_MATERIAL_TEMPLATE> = {
  'Foreign Material': FOREIGN_MATERIAL_TEMPLATE,
  'Broken Glove': BROKEN_GLOVE_TEMPLATE,
  'Employee Injury': EMPLOYEE_INJURY_TEMPLATE,
  'Chemical Spill': CHEMICAL_SPILL_TEMPLATE,
  'Metal Detector Reject': METAL_DETECTOR_REJECT_TEMPLATE,
  'Temperature Deviation': TEMPERATURE_DEVIATION_TEMPLATE,
  'Pest Sighting': PEST_SIGHTING_TEMPLATE,
  'Allergen Changeover': ALLERGEN_CHANGEOVER_TEMPLATE,
  'Equipment Breakdown': EQUIPMENT_BREAKDOWN_TEMPLATE,
  'Customer Complaint': CUSTOMER_COMPLAINT_TEMPLATE,
};

/** Get pre-built config for template creation screens */
export function getPrebuiltTemplate(name: string) {
  // Exact match first
  if (PREBUILT_TEMPLATES[name]) return PREBUILT_TEMPLATES[name];
  
  // Fuzzy match
  const lower = name.toLowerCase();
  for (const [key, template] of Object.entries(PREBUILT_TEMPLATES)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return template;
    }
  }
  return null;
}

/** List all pre-built template names for picker UI */
export function getPrebuiltTemplateList() {
  return Object.entries(PREBUILT_TEMPLATES).map(([name, config]) => ({
    name,
    description: config.description,
    departmentCount: config.assignedDepartments.length,
    isProductionHold: config.isProductionHold,
    buttonType: config.buttonType,
  }));
}
