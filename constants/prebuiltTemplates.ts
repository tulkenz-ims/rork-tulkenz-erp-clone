/**
 * PRE-BUILT TASK FEED TEMPLATE CONFIGURATIONS
 *
 * Department Codes:
 *   1001 = Maintenance
 *   1002 = Sanitation
 *   1003 = Production
 *   1004 = Quality
 *   1005 = Safety
 *   1006 = HR
 *   1008 = Warehouse
 *   1009 = IT / Technology
 *
 * ALL 10 templates assign ALL 5 operational departments.
 */

import { CreateTemplateInput, SuggestedForm, FormField } from '@/types/taskFeedTemplates';

// ── Department Code Constants ─────────────────────────────────
const DEPT = {
  MAINT: '1001',
  SANI: '1002',
  PROD: '1003',
  QUAL: '1004',
  SAFE: '1005',
  HR: '1006',
  WARE: '1008',
  IT: '1009',
} as const;

export const ALL_OPERATIONAL = [DEPT.QUAL, DEPT.SAFE, DEPT.SANI, DEPT.MAINT, DEPT.PROD];

// ── Form Suggestion Helper ────────────────────────────────────
const sf = (id: string, type: string, route: string, required = false): SuggestedForm => ({
  formId: id, formType: type, formRoute: route, required,
});

// ── Common Form Fields ────────────────────────────────────────
const LOCATION_FIELD: FormField = {
  id: 'location',
  label: 'Location (Room/Area)',
  fieldType: 'text_input',
  required: true,
  placeholder: 'e.g., Production Room 1, Cooler 3',
};

const DESCRIPTION_FIELD: FormField = {
  id: 'description',
  label: 'Description',
  fieldType: 'text_area',
  required: true,
  placeholder: 'Describe what happened...',
};

const SEVERITY_FIELD: FormField = {
  id: 'severity',
  label: 'Severity',
  fieldType: 'dropdown',
  required: true,
  options: [
    { value: 'low', label: 'Low — No product impact' },
    { value: 'medium', label: 'Medium — Potential product impact' },
    { value: 'high', label: 'High — Confirmed product impact' },
    { value: 'critical', label: 'Critical — Immediate danger' },
  ],
};

const PRODUCT_LINE_FIELD: FormField = {
  id: 'production_line',
  label: 'Production Line',
  fieldType: 'text_input',
  required: false,
  placeholder: 'e.g., Line 1, Line 3',
};

const IMMEDIATE_ACTION_FIELD: FormField = {
  id: 'immediate_action',
  label: 'Immediate Action Taken',
  fieldType: 'text_area',
  required: false,
  placeholder: 'What was done immediately?',
};


// ══════════════════════════════════════════════════════════════
// 1. FOREIGN MATERIAL
// ══════════════════════════════════════════════════════════════
export const FOREIGN_MATERIAL_TEMPLATE: CreateTemplateInput = {
  name: 'Foreign Material',
  description: 'Glass, plastic, metal, or other foreign material found in product or production area',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'material_type',
      label: 'Type of Foreign Material',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'glass', label: 'Glass' },
        { value: 'metal', label: 'Metal' },
        { value: 'plastic', label: 'Plastic (hard)' },
        { value: 'plastic_soft', label: 'Plastic (soft/film)' },
        { value: 'wood', label: 'Wood' },
        { value: 'rubber', label: 'Rubber' },
        { value: 'stone', label: 'Stone/Aggregate' },
        { value: 'pest', label: 'Pest/Insect' },
        { value: 'other', label: 'Other' },
      ],
    },
    DESCRIPTION_FIELD,
    SEVERITY_FIELD,
    PRODUCT_LINE_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial', true),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease', true),
      sf('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid', true),
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport'),
    ],
    [DEPT.SANI]: [
      sf('spillcleanup', 'Spill Cleanup', '/(tabs)/sanitation/spillcleanup'),
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning', true),
      sf('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 2. BROKEN GLOVE
// ══════════════════════════════════════════════════════════════
export const BROKEN_GLOVE_TEMPLATE: CreateTemplateInput = {
  name: 'Broken Glove',
  description: 'Glove fragment found — potential foreign material contamination',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'glove_type',
      label: 'Glove Type',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'nitrile', label: 'Nitrile' },
        { value: 'latex', label: 'Latex' },
        { value: 'vinyl', label: 'Vinyl' },
        { value: 'cut_resistant', label: 'Cut-Resistant' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'fragment_found',
      label: 'Was the missing fragment found?',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'yes', label: 'Yes — fragment recovered' },
        { value: 'no', label: 'No — fragment missing' },
      ],
    },
    DESCRIPTION_FIELD,
    PRODUCT_LINE_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial', true),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease', true),
      sf('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
      sf('deviation', 'Deviation Report', '/(tabs)/quality/deviation'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid', true),
      sf('ppeverification', 'PPE Verification', '/(tabs)/safety/ppeverification'),
    ],
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning', true),
      sf('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification'),
    ],
    [DEPT.MAINT]: [
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 3. EMPLOYEE INJURY
// ══════════════════════════════════════════════════════════════
export const EMPLOYEE_INJURY_TEMPLATE: CreateTemplateInput = {
  name: 'Employee Injury',
  description: 'Employee injured on the job — blood or bodily fluid contamination risk',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: false,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'injury_type',
      label: 'Type of Injury',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'cut_laceration', label: 'Cut / Laceration' },
        { value: 'burn', label: 'Burn' },
        { value: 'slip_fall', label: 'Slip / Fall' },
        { value: 'strain_sprain', label: 'Strain / Sprain' },
        { value: 'crush_pinch', label: 'Crush / Pinch' },
        { value: 'chemical_exposure', label: 'Chemical Exposure' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'blood_contact',
      label: 'Blood/Bodily Fluid Contact with Product?',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'yes', label: 'Yes — product contamination possible' },
        { value: 'no', label: 'No — no product contact' },
        { value: 'unknown', label: 'Unknown — investigating' },
      ],
    },
    DESCRIPTION_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial'),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr'),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
      sf('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
    ],
    [DEPT.SAFE]: [
      sf('accidentinvestigation', 'Accident Investigation', '/(tabs)/safety/accidentinvestigation', true),
      sf('firstaid', 'First Aid Log', '/(tabs)/safety/firstaid', true),
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport', true),
      sf('injuryillness', 'Injury/Illness Log', '/(tabs)/safety/injuryillness'),
    ],
    [DEPT.SANI]: [
      sf('spillcleanup', 'Spill Cleanup (Blood/Bodily Fluid)', '/(tabs)/sanitation/spillcleanup', true),
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
      sf('conditionmonitoring', 'Equipment Condition Check', '/(tabs)/cmms/condition'),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 4. CHEMICAL SPILL
// ══════════════════════════════════════════════════════════════
export const CHEMICAL_SPILL_TEMPLATE: CreateTemplateInput = {
  name: 'Chemical Spill',
  description: 'Chemical spill in production, storage, or common area',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'chemical_name',
      label: 'Chemical Name',
      fieldType: 'text_input',
      required: true,
      placeholder: 'e.g., Sodium Hypochlorite, PAA',
    },
    SEVERITY_FIELD,
    DESCRIPTION_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      sf('deviation', 'Deviation Report', '/(tabs)/quality/deviation'),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
    ],
    [DEPT.SAFE]: [
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport', true),
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid', true),
      sf('sdsreview', 'SDS / Chemical Safety Review', '/(tabs)/safety/sdsreview', true),
      sf('ppeverification', 'PPE Verification', '/(tabs)/safety/ppeverification'),
    ],
    [DEPT.SANI]: [
      sf('spillcleanup', 'Spill Cleanup', '/(tabs)/sanitation/spillcleanup', true),
      sf('chemicals', 'Chemical Usage Log', '/(tabs)/sanitation/chemicals', true),
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 5. METAL DETECTOR REJECT
// ══════════════════════════════════════════════════════════════
export const METAL_DETECTOR_REJECT_TEMPLATE: CreateTemplateInput = {
  name: 'Metal Detector Reject',
  description: 'Product rejected by metal detector — confirmed or suspected contamination',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    PRODUCT_LINE_FIELD,
    {
      id: 'detector_id',
      label: 'Metal Detector ID / Name',
      fieldType: 'text_input',
      required: true,
      placeholder: 'e.g., MD-01, Line 3 Detector',
    },
    {
      id: 'reject_count',
      label: 'Number of Consecutive Rejects',
      fieldType: 'number',
      required: true,
    },
    DESCRIPTION_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('metaldetectorlog', 'Metal Detector Log', '/(tabs)/quality/metaldetectorlog', true),
      sf('foreignmaterial', 'Foreign Material Investigation', '/(tabs)/quality/foreignmaterial', true),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport'),
    ],
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
      sf('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition', true),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 6. TEMPERATURE DEVIATION
// ══════════════════════════════════════════════════════════════
export const TEMPERATURE_DEVIATION_TEMPLATE: CreateTemplateInput = {
  name: 'Temperature Deviation',
  description: 'Temperature out of spec in cooler, freezer, or cooking process',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'temp_zone',
      label: 'Temperature Zone',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'cooler', label: 'Cooler (28–41°F)' },
        { value: 'freezer', label: 'Freezer (≤0°F)' },
        { value: 'cooking', label: 'Cooking / Thermal Process' },
        { value: 'holding', label: 'Hot Holding (≥135°F)' },
        { value: 'ambient', label: 'Ambient / Dry Storage' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'temp_reading',
      label: 'Actual Temperature Reading',
      fieldType: 'text_input',
      required: true,
      placeholder: 'e.g., 47°F, 165°F',
    },
    {
      id: 'temp_required',
      label: 'Required Temperature Range',
      fieldType: 'text_input',
      required: true,
      placeholder: 'e.g., 28–41°F',
    },
    DESCRIPTION_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('temperaturelog', 'Temperature Log', '/(tabs)/quality/temperaturelog', true),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease', true),
      sf('deviation', 'Deviation Report', '/(tabs)/quality/deviation'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport'),
    ],
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
      sf('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition', true),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 7. PEST SIGHTING
// ══════════════════════════════════════════════════════════════
export const PEST_SIGHTING_TEMPLATE: CreateTemplateInput = {
  name: 'Pest Sighting',
  description: 'Live or dead pest found inside the facility',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: false,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'pest_type',
      label: 'Type of Pest',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'rodent', label: 'Rodent (mouse/rat)' },
        { value: 'insect_flying', label: 'Flying insect' },
        { value: 'insect_crawling', label: 'Crawling insect' },
        { value: 'bird', label: 'Bird' },
        { value: 'droppings', label: 'Droppings / Evidence' },
        { value: 'gnaw_marks', label: 'Gnaw marks' },
        { value: 'other', label: 'Other' },
      ],
    },
    DESCRIPTION_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('ncr', 'NCR', '/(tabs)/quality/ncr', true),
      sf('roomhygienelog', 'Room Hygiene Log', '/(tabs)/quality/roomhygienelog'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid', true),
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport'),
    ],
    [DEPT.SANI]: [
      sf('dailytasks', 'Sanitation Daily Tasks', '/(tabs)/sanitation/dailytasks', true),
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new'),
      sf('conditionmonitoring', 'Facility Condition Check', '/(tabs)/cmms/condition', true),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 8. ALLERGEN CHANGEOVER (10-Phase SOP)
// Planning → End of Run → LOTO → Disassembly → Dry Pre-Clean →
// Wet Clean → Reassembly → Allergen Testing → QA Clearance →
// First Run Hold & Verification
// ══════════════════════════════════════════════════════════════
export const ALLERGEN_CHANGEOVER_TEMPLATE: CreateTemplateInput = {
  name: 'Allergen Changeover',
  description: 'Line changeover between allergen-containing products — full LOTO, disassembly, clean, swab, release',
  buttonType: 'add_task',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: false,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    PRODUCT_LINE_FIELD,
    {
      id: 'allergen_from',
      label: 'Allergen Being Removed',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'milk', label: 'Milk' },
        { value: 'eggs', label: 'Eggs' },
        { value: 'peanuts', label: 'Peanuts' },
        { value: 'tree_nuts', label: 'Tree Nuts' },
        { value: 'wheat', label: 'Wheat' },
        { value: 'soy', label: 'Soy' },
        { value: 'fish', label: 'Fish' },
        { value: 'shellfish', label: 'Shellfish' },
        { value: 'sesame', label: 'Sesame' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'allergen_to',
      label: 'Incoming Product Allergen',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'milk', label: 'Milk' },
        { value: 'eggs', label: 'Eggs' },
        { value: 'peanuts', label: 'Peanuts' },
        { value: 'tree_nuts', label: 'Tree Nuts' },
        { value: 'wheat', label: 'Wheat' },
        { value: 'soy', label: 'Soy' },
        { value: 'fish', label: 'Fish' },
        { value: 'shellfish', label: 'Shellfish' },
        { value: 'sesame', label: 'Sesame' },
        { value: 'allergen_free', label: 'Allergen-Free' },
        { value: 'other', label: 'Other' },
      ],
    },
    DESCRIPTION_FIELD,
  ],
  departmentFormSuggestions: {
    // Phase 1, 8, 9, 10: Allergen matrix, ATP swabs, allergen swabs, line release, first lot
    [DEPT.QUAL]: [
      sf('allergenchangeover', 'Allergen Changeover Verification', '/(tabs)/quality/allergenchangeover', true),
      sf('atpswab', 'ATP Swab Log', '/(tabs)/quality/atpswab', true),
      sf('environmentalswab', 'Allergen Swab Log', '/(tabs)/quality/environmentalswab', true),
      sf('preopinspection', 'QA Pre-Swab Visual Inspection', '/(tabs)/quality/preopinspection', true),
      sf('holdrelease', 'Line Release / Hold Release', '/(tabs)/quality/holdrelease', true),
      sf('ncr', 'NCR (if swab fails)', '/(tabs)/quality/ncr'),
    ],
    // Phase 3, 6: LOTO oversight, chemical safety, PPE
    [DEPT.SAFE]: [
      sf('sdsreview', 'SDS / Chemical Safety Review', '/(tabs)/safety/sdsreview', true),
      sf('ppeverification', 'PPE Verification', '/(tabs)/safety/ppeverification'),
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
    ],
    // Phase 5, 6, 7: Dry pre-clean, wet clean, chemical verification
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning Log', '/(tabs)/sanitation/equipmentcleaning', true),
      sf('cipcleaning', 'CIP Cleaning Record', '/(tabs)/sanitation/cipcleaning'),
      sf('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification', true),
      sf('chemicals', 'Cleaning Chemical Verification', '/(tabs)/sanitation/chemicals', true),
      sf('dailytasks', 'Sanitation Verification Sign-Off', '/(tabs)/sanitation/dailytasks', true),
    ],
    // Phase 3, 4, 7: LOTO, disassembly, reassembly, parts replacement
    [DEPT.MAINT]: [
      sf('emergencywo', 'Work Order (LOTO / Parts Replacement)', '/(tabs)/cmms/work-orders/new', true),
      sf('conditionmonitoring', 'Equipment Condition Check', '/(tabs)/cmms/condition'),
    ],
    // Phase 1, 2, 10: Schedule changeover, end of run, first lot
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
      sf('batchrecord', 'Batch / Lot Record', '/(tabs)/quality/batchrecord'),
      sf('materialinspection', 'Incoming Material Inspection', '/(tabs)/quality/materialinspection'),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 9. EQUIPMENT BREAKDOWN
// ══════════════════════════════════════════════════════════════
export const EQUIPMENT_BREAKDOWN_TEMPLATE: CreateTemplateInput = {
  name: 'Equipment Breakdown',
  description: 'Equipment malfunction or failure affecting production',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: true,
  isProductionHold: true,
  formFields: [
    LOCATION_FIELD,
    {
      id: 'equipment_id',
      label: 'Equipment Name / Asset ID',
      fieldType: 'text_input',
      required: true,
      placeholder: 'e.g., Filler #3, Mixer M-201',
    },
    {
      id: 'failure_type',
      label: 'Failure Type',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'mechanical', label: 'Mechanical Failure' },
        { value: 'electrical', label: 'Electrical Failure' },
        { value: 'pneumatic', label: 'Pneumatic / Hydraulic' },
        { value: 'sensor', label: 'Sensor / Controls' },
        { value: 'leak', label: 'Leak (water/oil/product)' },
        { value: 'other', label: 'Other' },
      ],
    },
    DESCRIPTION_FIELD,
    SEVERITY_FIELD,
    IMMEDIATE_ACTION_FIELD,
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('deviation', 'Deviation Report', '/(tabs)/quality/deviation', true),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr'),
      sf('holdrelease', 'Hold & Release', '/(tabs)/quality/holdrelease'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid', true),
      sf('incidentreport', 'Incident Report', '/(tabs)/safety/incidentreport'),
    ],
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
      sf('spillcleanup', 'Spill Cleanup', '/(tabs)/sanitation/spillcleanup'),
    ],
    [DEPT.MAINT]: [
      sf('emergencywo', 'Emergency Work Order', '/(tabs)/cmms/work-orders/new', true),
      sf('downtimereport', 'Downtime Report', '/(tabs)/cmms/downtime', true),
      sf('failurereport', 'Failure Report', '/(tabs)/cmms/failure'),
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// 10. CUSTOMER COMPLAINT
// ══════════════════════════════════════════════════════════════
export const CUSTOMER_COMPLAINT_TEMPLATE: CreateTemplateInput = {
  name: 'Customer Complaint',
  description: 'Customer reported quality issue with product',
  buttonType: 'report_issue',
  triggeringDepartment: DEPT.QUAL,
  assignedDepartments: ALL_OPERATIONAL,
  photoRequired: false,
  isProductionHold: false,
  formFields: [
    {
      id: 'customer_name',
      label: 'Customer Name',
      fieldType: 'text_input',
      required: true,
    },
    {
      id: 'product',
      label: 'Product / SKU',
      fieldType: 'text_input',
      required: true,
    },
    {
      id: 'complaint_type',
      label: 'Complaint Category',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'foreign_material', label: 'Foreign Material' },
        { value: 'quality', label: 'Quality / Taste / Appearance' },
        { value: 'packaging', label: 'Packaging Defect' },
        { value: 'labeling', label: 'Labeling Error' },
        { value: 'allergen', label: 'Allergen Issue' },
        { value: 'temperature', label: 'Temperature Abuse' },
        { value: 'other', label: 'Other' },
      ],
    },
    DESCRIPTION_FIELD,
    {
      id: 'lot_number',
      label: 'Lot / Batch Number (if known)',
      fieldType: 'text_input',
      required: false,
    },
  ],
  departmentFormSuggestions: {
    [DEPT.QUAL]: [
      sf('customercomplaint', 'Customer Complaint', '/(tabs)/quality/customercomplaint', true),
      sf('ncr', 'NCR', '/(tabs)/quality/ncr'),
      sf('capa', 'CAPA', '/(tabs)/quality/capa'),
      sf('rootcause', 'Root Cause Analysis', '/(tabs)/quality/rootcause'),
    ],
    [DEPT.SAFE]: [
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
    ],
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning', '/(tabs)/sanitation/equipmentcleaning'),
    ],
    [DEPT.MAINT]: [
      sf('conditionmonitoring', 'Condition Monitoring', '/(tabs)/cmms/condition'),
    ],
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck'),
    ],
  },
};


// ══════════════════════════════════════════════════════════════
// MASTER LIST
// ══════════════════════════════════════════════════════════════

export const PREBUILT_TEMPLATES: Record<string, CreateTemplateInput> = {
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

/** All pre-built templates as an array for seeding */
export const ALL_PREBUILT_TEMPLATES: CreateTemplateInput[] = Object.values(PREBUILT_TEMPLATES);

/** Get pre-built config by name */
export function getPrebuiltTemplate(name: string) {
  if (PREBUILT_TEMPLATES[name]) return PREBUILT_TEMPLATES[name];

  const lower = name.toLowerCase();
  for (const [key, template] of Object.entries(PREBUILT_TEMPLATES)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return template;
    }
  }
  return null;
}

/** List pre-built template summaries for picker UI */
export function getPrebuiltTemplateList() {
  return Object.entries(PREBUILT_TEMPLATES).map(([name, config]) => ({
    name,
    description: config.description,
    departmentCount: config.assignedDepartments.length,
    isProductionHold: config.isProductionHold || false,
    buttonType: config.buttonType,
  }));
}
