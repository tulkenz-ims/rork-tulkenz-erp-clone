// ── ALLERGEN CHANGEOVER ───────────────────────────────────────
// 10-Phase SOP: Planning → End of Run → LOTO → Disassembly →
// Dry Pre-Clean → Wet Clean → Reassembly → Allergen Testing →
// QA Clearance → First Run Hold & Verification
// All 5 operational departments involved
// ───────────────────────────────────────────────────────────────
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
    // ── QUALITY (1004) ──
    // Phase 1: Allergen matrix review
    // Phase 8: ATP swabs, allergen swabs, pre-swab visual
    // Phase 9: QA clearance, line release
    // Phase 10: First lot hold, disposition
    [DEPT.QUAL]: [
      sf('allergenchangeover', 'Allergen Changeover Verification', '/(tabs)/quality/allergenchangeover', true),
      sf('atpswab', 'ATP Swab Log', '/(tabs)/quality/atpswab', true),
      sf('environmentalswab', 'Allergen Swab Log', '/(tabs)/quality/environmentalswab', true),
      sf('preopinspection', 'QA Pre-Swab Visual Inspection', '/(tabs)/quality/preopinspection', true),
      sf('holdrelease', 'Line Release / Hold Release', '/(tabs)/quality/holdrelease', true),
      sf('ncr', 'NCR (if swab fails)', '/(tabs)/quality/ncr'),
    ],

    // ── SANITATION (1002) ──
    // Phase 5: Dry pre-clean (HEPA vacuum)
    // Phase 6: Wet clean (wash, rinse, second wash, final rinse)
    // Phase 7: Reassembly support
    [DEPT.SANI]: [
      sf('equipmentcleaning', 'Equipment Cleaning Log', '/(tabs)/sanitation/equipmentcleaning', true),
      sf('cipcleaning', 'CIP Cleaning Record', '/(tabs)/sanitation/cipcleaning'),
      sf('preopverification', 'Pre-Op Verification', '/(tabs)/sanitation/preopverification', true),
      sf('chemicals', 'Cleaning Chemical Verification', '/(tabs)/sanitation/chemicals', true),
      sf('dailytasks', 'Sanitation Verification Sign-Off', '/(tabs)/sanitation/dailytasks', true),
    ],

    // ── MAINTENANCE (1001) ──
    // Phase 3: LOTO — lockout/tagout all equipment
    // Phase 4: Disassembly — remove product-contact parts, inspect gaskets/o-rings
    // Phase 7: Reassembly — reinstall parts, remove LOTO, verify equipment runs
    [DEPT.MAINT]: [
      sf('lotopermit', 'LOTO Permit Log', '/(tabs)/cmms/loto', true),
      sf('disassemblylog', 'Disassembly / Reassembly Log', '/(tabs)/cmms/disassembly', true),
      sf('emergencywo', 'Work Order (Parts Replacement)', '/(tabs)/cmms/work-orders/new'),
      sf('conditionmonitoring', 'Equipment Condition Check', '/(tabs)/cmms/condition'),
    ],

    // ── SAFETY (1005) ──
    // Phase 3: LOTO oversight — verify zero energy state
    // Phase 6: Chemical safety — SDS verification, PPE
    // Phase 3/7: LOTO compliance verification on lock/unlock
    [DEPT.SAFE]: [
      sf('lotoverification', 'LOTO Safety Verification', '/(tabs)/safety/lotoverification', true),
      sf('sdsreview', 'SDS / Chemical Safety Review', '/(tabs)/safety/sdsreview', true),
      sf('ppeverification', 'PPE Verification', '/(tabs)/safety/ppeverification'),
      sf('hazardid', 'Hazard Identification', '/(tabs)/safety/hazardid'),
    ],

    // ── PRODUCTION (1003) ──
    // Phase 1: Schedule changeover, stage incoming materials
    // Phase 2: End of run — close out peanut lot, clear room
    // Phase 10: Open new production run, first lot documentation
    [DEPT.PROD]: [
      sf('productionlinecheck', 'Production Line Check', '/(tabs)/quality/productionlinecheck', true),
      sf('batchrecord', 'Batch / Lot Record', '/(tabs)/quality/batchrecord'),
      sf('materialinspection', 'Incoming Material Inspection', '/(tabs)/quality/materialinspection'),
    ],
  },
};
