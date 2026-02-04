export type DepartmentType = 'maintenance' | 'safety' | 'quality' | 'compliance' | 'calibration';

export interface Department {
  id: DepartmentType;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 'maintenance', name: 'Maintenance', color: '#3B82F6', icon: 'Wrench', description: 'Equipment repair and preventive maintenance' },
  { id: 'safety', name: 'Safety', color: '#EF4444', icon: 'ShieldAlert', description: 'Safety inspections, hazard assessments, OSHA compliance' },
  { id: 'quality', name: 'Quality', color: '#10B981', icon: 'CheckCircle2', description: 'Quality control, SQF audits, hygiene reports' },
  { id: 'compliance', name: 'Compliance', color: '#8B5CF6', icon: 'FileCheck', description: 'FDA audits, regulatory compliance, documentation' },
  { id: 'calibration', name: 'Calibration', color: '#F59E0B', icon: 'Gauge', description: 'Equipment calibration and verification' },
];

export const WORK_ORDER_TYPES = [
  { id: 'corrective', name: 'Corrective', description: 'Repair or fix a breakdown or malfunction', color: '#EF4444' },
  { id: 'preventive', name: 'Preventive', description: 'Scheduled maintenance to prevent failures', color: '#3B82F6' },
  { id: 'emergency', name: 'Emergency', description: 'Urgent work requiring immediate attention', color: '#DC2626' },
  { id: 'request', name: 'Request', description: 'Work order created from employee request', color: '#8B5CF6' },
] as const;

export type DocumentationSectionType = 
  | 'pre_op_inspection'
  | 'post_op_inspection'
  | 'hygiene_report'
  | 'wet_clean'
  | 'dry_wipe'
  | 'safety_inspection'
  | 'hazard_assessment'
  | 'quality_check'
  | 'sqf_audit'
  | 'fda_audit'
  | 'osha_compliance'
  | 'calibration_record'
  | 'vendor_verification'
  | 'brittle_plastic_check'
  | 'glass_audit';

export interface DocumentationField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'textarea' | 'signature';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DocumentationSectionTemplate {
  id: DocumentationSectionType;
  name: string;
  department: DepartmentType;
  color: string;
  icon: string;
  description: string;
  fields: DocumentationField[];
  requiresSignature: boolean;
  nextDepartment?: DepartmentType;
}

export const DOCUMENTATION_TEMPLATES: DocumentationSectionTemplate[] = [
  {
    id: 'pre_op_inspection',
    name: 'Pre-Operation Inspection',
    department: 'maintenance',
    color: '#3B82F6',
    icon: 'ClipboardCheck',
    description: 'Pre-operation equipment inspection checklist',
    requiresSignature: true,
    nextDepartment: 'safety',
    fields: [
      { id: 'equipment_clean', label: 'Equipment Clean', type: 'boolean', required: true },
      { id: 'guards_in_place', label: 'All Guards in Place', type: 'boolean', required: true },
      { id: 'lubrication_checked', label: 'Lubrication Checked', type: 'boolean', required: true },
      { id: 'no_leaks', label: 'No Visible Leaks', type: 'boolean', required: true },
      { id: 'safety_devices_working', label: 'Safety Devices Working', type: 'boolean', required: true },
      { id: 'notes', label: 'Notes', type: 'textarea', required: false, placeholder: 'Any observations or concerns...' },
    ],
  },
  {
    id: 'post_op_inspection',
    name: 'Post-Operation Inspection',
    department: 'maintenance',
    color: '#3B82F6',
    icon: 'ClipboardList',
    description: 'Post-operation equipment inspection and cleanup',
    requiresSignature: true,
    nextDepartment: 'quality',
    fields: [
      { id: 'equipment_shutdown_properly', label: 'Equipment Shutdown Properly', type: 'boolean', required: true },
      { id: 'area_cleaned', label: 'Work Area Cleaned', type: 'boolean', required: true },
      { id: 'tools_returned', label: 'Tools Returned', type: 'boolean', required: true },
      { id: 'waste_disposed', label: 'Waste Properly Disposed', type: 'boolean', required: true },
      { id: 'issues_found', label: 'Issues Found During Operation', type: 'textarea', required: false },
      { id: 'next_maintenance_needed', label: 'Next Maintenance Needed', type: 'select', required: true, options: ['None', 'Within 1 Week', 'Within 1 Month', 'Scheduled PM'] },
    ],
  },
  {
    id: 'safety_inspection',
    name: 'Safety Inspection',
    department: 'safety',
    color: '#EF4444',
    icon: 'ShieldCheck',
    description: 'Safety department inspection and hazard assessment',
    requiresSignature: true,
    nextDepartment: 'quality',
    fields: [
      { id: 'loto_verified', label: 'LOTO Procedure Verified', type: 'boolean', required: true },
      { id: 'ppe_compliance', label: 'PPE Compliance Verified', type: 'boolean', required: true },
      { id: 'permits_valid', label: 'All Permits Valid', type: 'boolean', required: true },
      { id: 'hazards_identified', label: 'Hazards Identified', type: 'textarea', required: false },
      { id: 'corrective_actions', label: 'Corrective Actions Required', type: 'textarea', required: false },
      { id: 'safe_to_proceed', label: 'Safe to Proceed', type: 'select', required: true, options: ['Yes', 'No - Corrections Needed', 'No - Stop Work'] },
    ],
  },
  {
    id: 'hazard_assessment',
    name: 'Hazard Assessment',
    department: 'safety',
    color: '#EF4444',
    icon: 'AlertTriangle',
    description: 'Job hazard analysis and risk assessment',
    requiresSignature: true,
    fields: [
      { id: 'hazard_type', label: 'Hazard Type', type: 'select', required: true, options: ['Chemical', 'Electrical', 'Mechanical', 'Ergonomic', 'Environmental', 'Fire', 'Other'] },
      { id: 'risk_level', label: 'Risk Level', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'hazard_description', label: 'Hazard Description', type: 'textarea', required: true },
      { id: 'control_measures', label: 'Control Measures', type: 'textarea', required: true },
      { id: 'residual_risk', label: 'Residual Risk After Controls', type: 'select', required: true, options: ['Acceptable', 'Monitor', 'Additional Controls Needed'] },
    ],
  },
  {
    id: 'hygiene_report',
    name: 'Hygiene Report',
    department: 'quality',
    color: '#10B981',
    icon: 'Sparkles',
    description: 'Sanitation and hygiene verification',
    requiresSignature: true,
    nextDepartment: 'compliance',
    fields: [
      { id: 'visual_inspection_passed', label: 'Visual Inspection Passed', type: 'boolean', required: true },
      { id: 'atp_reading', label: 'ATP Reading (RLU)', type: 'number', required: true, placeholder: 'Enter ATP reading' },
      { id: 'atp_pass_fail', label: 'ATP Result', type: 'select', required: true, options: ['Pass (<10 RLU)', 'Caution (10-30 RLU)', 'Fail (>30 RLU)'] },
      { id: 'swab_location', label: 'Swab Location', type: 'text', required: true },
      { id: 'sanitizer_concentration', label: 'Sanitizer Concentration (ppm)', type: 'number', required: true },
      { id: 'reclean_required', label: 'Re-clean Required', type: 'boolean', required: false },
      { id: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
  },
  {
    id: 'wet_clean',
    name: 'Wet Clean Verification',
    department: 'quality',
    color: '#10B981',
    icon: 'Droplets',
    description: 'Wet cleaning procedure verification',
    requiresSignature: true,
    fields: [
      { id: 'pre_rinse_completed', label: 'Pre-Rinse Completed', type: 'boolean', required: true },
      { id: 'detergent_applied', label: 'Detergent Applied', type: 'boolean', required: true },
      { id: 'detergent_concentration', label: 'Detergent Concentration (%)', type: 'number', required: true },
      { id: 'contact_time_met', label: 'Contact Time Met (min)', type: 'number', required: true },
      { id: 'rinse_completed', label: 'Final Rinse Completed', type: 'boolean', required: true },
      { id: 'sanitizer_applied', label: 'Sanitizer Applied', type: 'boolean', required: true },
      { id: 'visual_inspection', label: 'Visual Inspection Passed', type: 'boolean', required: true },
    ],
  },
  {
    id: 'dry_wipe',
    name: 'Dry Wipe Verification',
    department: 'quality',
    color: '#10B981',
    icon: 'Wind',
    description: 'Dry wipe cleaning procedure verification',
    requiresSignature: true,
    fields: [
      { id: 'debris_removed', label: 'All Debris Removed', type: 'boolean', required: true },
      { id: 'wipe_type', label: 'Wipe Type Used', type: 'select', required: true, options: ['Disposable', 'Microfiber', 'Lint-Free', 'Other'] },
      { id: 'surface_dry', label: 'Surface Completely Dry', type: 'boolean', required: true },
      { id: 'visual_inspection', label: 'Visual Inspection Passed', type: 'boolean', required: true },
      { id: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
  },
  {
    id: 'quality_check',
    name: 'Quality Check',
    department: 'quality',
    color: '#10B981',
    icon: 'BadgeCheck',
    description: 'Quality assurance verification',
    requiresSignature: true,
    nextDepartment: 'compliance',
    fields: [
      { id: 'work_meets_specs', label: 'Work Meets Specifications', type: 'boolean', required: true },
      { id: 'documentation_complete', label: 'Documentation Complete', type: 'boolean', required: true },
      { id: 'no_defects_found', label: 'No Defects Found', type: 'boolean', required: true },
      { id: 'equipment_functional', label: 'Equipment Functional', type: 'boolean', required: true },
      { id: 'defects_description', label: 'Defects Description (if any)', type: 'textarea', required: false },
      { id: 'disposition', label: 'Disposition', type: 'select', required: true, options: ['Approved', 'Approved with Conditions', 'Rejected - Rework Required', 'Rejected - Scrap'] },
    ],
  },
  {
    id: 'sqf_audit',
    name: 'SQF Audit Checklist',
    department: 'compliance',
    color: '#8B5CF6',
    icon: 'ClipboardCheck',
    description: 'SQF (Safe Quality Food) compliance audit',
    requiresSignature: true,
    fields: [
      { id: 'food_safety_plan_followed', label: 'Food Safety Plan Followed', type: 'boolean', required: true },
      { id: 'haccp_compliance', label: 'HACCP Compliance Verified', type: 'boolean', required: true },
      { id: 'allergen_controls', label: 'Allergen Controls in Place', type: 'boolean', required: true },
      { id: 'traceability_maintained', label: 'Traceability Maintained', type: 'boolean', required: true },
      { id: 'deviation_found', label: 'Deviation Found', type: 'boolean', required: false },
      { id: 'deviation_description', label: 'Deviation Description', type: 'textarea', required: false },
      { id: 'corrective_action', label: 'Corrective Action Taken', type: 'textarea', required: false },
    ],
  },
  {
    id: 'fda_audit',
    name: 'FDA Compliance Check',
    department: 'compliance',
    color: '#8B5CF6',
    icon: 'FileCheck',
    description: 'FDA regulatory compliance verification',
    requiresSignature: true,
    fields: [
      { id: 'cgmp_compliance', label: 'cGMP Compliance', type: 'boolean', required: true },
      { id: 'documentation_accurate', label: 'Documentation Accurate', type: 'boolean', required: true },
      { id: 'equipment_validated', label: 'Equipment Validated', type: 'boolean', required: true },
      { id: 'cleaning_validated', label: 'Cleaning Validated', type: 'boolean', required: true },
      { id: 'deviations', label: 'Deviations Noted', type: 'textarea', required: false },
      { id: 'regulatory_status', label: 'Regulatory Status', type: 'select', required: true, options: ['Compliant', 'Minor Deviation', 'Major Deviation', 'Critical Finding'] },
    ],
  },
  {
    id: 'osha_compliance',
    name: 'OSHA Compliance Check',
    department: 'safety',
    color: '#EF4444',
    icon: 'Shield',
    description: 'OSHA regulatory compliance verification',
    requiresSignature: true,
    fields: [
      { id: 'hazcom_compliance', label: 'HazCom Compliance', type: 'boolean', required: true },
      { id: 'ppe_available', label: 'Required PPE Available', type: 'boolean', required: true },
      { id: 'training_current', label: 'Training Current', type: 'boolean', required: true },
      { id: 'recordkeeping_complete', label: 'Recordkeeping Complete', type: 'boolean', required: true },
      { id: 'violations_found', label: 'Violations Found', type: 'boolean', required: false },
      { id: 'violation_description', label: 'Violation Description', type: 'textarea', required: false },
      { id: 'abatement_date', label: 'Abatement Date (if applicable)', type: 'date', required: false },
    ],
  },
  {
    id: 'glass_audit',
    name: 'Glass & Brittle Plastic Audit',
    department: 'quality',
    color: '#10B981',
    icon: 'AlertOctagon',
    description: 'Glass and brittle plastic inspection',
    requiresSignature: true,
    fields: [
      { id: 'glass_inventory_checked', label: 'Glass Inventory Checked', type: 'boolean', required: true },
      { id: 'brittle_plastic_checked', label: 'Brittle Plastic Items Checked', type: 'boolean', required: true },
      { id: 'all_items_accounted', label: 'All Items Accounted For', type: 'boolean', required: true },
      { id: 'breakage_found', label: 'Breakage Found', type: 'boolean', required: false },
      { id: 'breakage_description', label: 'Breakage Description', type: 'textarea', required: false },
      { id: 'containment_actions', label: 'Containment Actions Taken', type: 'textarea', required: false },
      { id: 'area_cleared', label: 'Area Cleared for Production', type: 'boolean', required: true },
    ],
  },
  {
    id: 'calibration_record',
    name: 'Calibration Record',
    department: 'calibration',
    color: '#F59E0B',
    icon: 'Gauge',
    description: 'Equipment calibration verification',
    requiresSignature: true,
    fields: [
      { id: 'instrument_id', label: 'Instrument ID', type: 'text', required: true },
      { id: 'calibration_standard', label: 'Calibration Standard Used', type: 'text', required: true },
      { id: 'standard_traceable', label: 'Standard NIST Traceable', type: 'boolean', required: true },
      { id: 'as_found_reading', label: 'As Found Reading', type: 'text', required: true },
      { id: 'as_left_reading', label: 'As Left Reading', type: 'text', required: true },
      { id: 'tolerance', label: 'Tolerance (+/-)', type: 'text', required: true },
      { id: 'pass_fail', label: 'Result', type: 'select', required: true, options: ['Pass', 'Fail - Adjusted', 'Fail - Out of Service'] },
      { id: 'next_calibration_date', label: 'Next Calibration Date', type: 'date', required: true },
    ],
  },
  {
    id: 'vendor_verification',
    name: 'Vendor Verification',
    department: 'compliance',
    color: '#8B5CF6',
    icon: 'Building',
    description: 'Vendor and contractor verification',
    requiresSignature: true,
    fields: [
      { id: 'vendor_name', label: 'Vendor/Contractor Name', type: 'text', required: true },
      { id: 'insurance_verified', label: 'Insurance Verified', type: 'boolean', required: true },
      { id: 'certifications_current', label: 'Certifications Current', type: 'boolean', required: true },
      { id: 'safety_orientation_completed', label: 'Safety Orientation Completed', type: 'boolean', required: true },
      { id: 'work_permit_issued', label: 'Work Permit Issued', type: 'boolean', required: true },
      { id: 'escort_required', label: 'Escort Required', type: 'boolean', required: false },
      { id: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
  },
];

export function getTemplatesByDepartment(department: DepartmentType): DocumentationSectionTemplate[] {
  return DOCUMENTATION_TEMPLATES.filter(t => t.department === department);
}

export function getDepartmentById(id: DepartmentType): Department | undefined {
  return DEPARTMENTS.find(d => d.id === id);
}
