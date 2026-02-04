import { CreateTemplateInput, FormField } from '@/types/taskFeedTemplates';

export const LOCATION_OPTIONS = [
  { value: 'production_line_1', label: 'Production Line 1' },
  { value: 'production_line_2', label: 'Production Line 2' },
  { value: 'production_line_3', label: 'Production Line 3' },
  { value: 'packaging_line_1', label: 'Packaging Line 1' },
  { value: 'packaging_line_2', label: 'Packaging Line 2' },
  { value: 'cooler_area', label: 'Cooler Area' },
  { value: 'freezer_area', label: 'Freezer Area' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'loading_dock', label: 'Loading Dock' },
  { value: 'receiving_area', label: 'Receiving Area' },
  { value: 'lab', label: 'Lab' },
  { value: 'office_area', label: 'Office Area' },
  { value: 'break_room', label: 'Break Room' },
  { value: 'restrooms', label: 'Restrooms' },
  { value: 'exterior', label: 'Exterior/Grounds' },
  { value: 'other', label: 'Other' },
];

export const EQUIPMENT_OPTIONS = [
  { value: 'conveyor_1', label: 'Conveyor Belt #1' },
  { value: 'conveyor_2', label: 'Conveyor Belt #2' },
  { value: 'mixer_1', label: 'Industrial Mixer #1' },
  { value: 'mixer_2', label: 'Industrial Mixer #2' },
  { value: 'oven_1', label: 'Oven #1' },
  { value: 'oven_2', label: 'Oven #2' },
  { value: 'freezer_unit_1', label: 'Freezer Unit #1' },
  { value: 'freezer_unit_2', label: 'Freezer Unit #2' },
  { value: 'cooler_unit_1', label: 'Cooler Unit #1' },
  { value: 'cooler_unit_2', label: 'Cooler Unit #2' },
  { value: 'packaging_machine_1', label: 'Packaging Machine #1' },
  { value: 'packaging_machine_2', label: 'Packaging Machine #2' },
  { value: 'forklift_1', label: 'Forklift #1' },
  { value: 'forklift_2', label: 'Forklift #2' },
  { value: 'pallet_jack', label: 'Pallet Jack' },
  { value: 'compressor', label: 'Air Compressor' },
  { value: 'hvac_unit', label: 'HVAC Unit' },
  { value: 'pump_1', label: 'Pump #1' },
  { value: 'pump_2', label: 'Pump #2' },
  { value: 'scale_1', label: 'Scale #1' },
  { value: 'scale_2', label: 'Scale #2' },
  { value: 'metal_detector', label: 'Metal Detector' },
  { value: 'x_ray_machine', label: 'X-Ray Machine' },
  { value: 'labeler', label: 'Labeling Machine' },
  { value: 'printer', label: 'Industrial Printer' },
  { value: 'other', label: 'Other Equipment' },
];

export const PROBLEM_TYPE_OPTIONS = [
  { value: 'wont_start', label: "Won't Start" },
  { value: 'wont_stop', label: "Won't Stop/Turn Off" },
  { value: 'leaking', label: 'Leaking (fluid/air)' },
  { value: 'strange_noise', label: 'Strange Noise' },
  { value: 'vibration', label: 'Excessive Vibration' },
  { value: 'overheating', label: 'Overheating' },
  { value: 'electrical', label: 'Electrical Issue' },
  { value: 'mechanical', label: 'Mechanical Failure' },
  { value: 'sensor_error', label: 'Sensor/Control Error' },
  { value: 'calibration', label: 'Out of Calibration' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'performance', label: 'Poor Performance' },
  { value: 'contamination', label: 'Contamination Risk' },
  { value: 'other', label: 'Other' },
];

export const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical - Production Stopped' },
  { value: 'high', label: 'High - Production Impacted' },
  { value: 'medium', label: 'Medium - Can Work Around' },
  { value: 'low', label: 'Low - Not Urgent' },
];

export const PASS_FAIL_OPTIONS = [
  { value: 'pass', label: 'PASS ✓' },
  { value: 'fail', label: 'FAIL ✗' },
];

export const PRE_OP_TEMPLATE: CreateTemplateInput = {
  name: 'Pre-OP',
  description: 'Pre-operational inspection task. Assigns to Quality, Production, Sanitation, Maintenance, and Safety for verification.',
  buttonType: 'add_task',
  triggeringDepartment: '1001',
  assignedDepartments: ['1004', '1003', '1002', '1001', '1005'],
  photoRequired: true,
  formFields: [
    {
      id: 'location',
      label: 'Location (Room/Area)',
      fieldType: 'dropdown',
      required: true,
      options: LOCATION_OPTIONS,
      placeholder: 'Select location',
      sortOrder: 1,
    },
    {
      id: 'notes',
      label: 'Notes',
      fieldType: 'text_area',
      required: false,
      placeholder: 'Add any observations or notes...',
      sortOrder: 2,
    },
  ],
  workflowRules: [],
  isActive: true,
  sortOrder: 1,
};

export const TOA_LAB_CHECK_TEMPLATE: CreateTemplateInput = {
  name: 'TOA Lab Check',
  description: 'Lab quality check with pass/fail result. Records batch/lot number and test outcome.',
  buttonType: 'add_task',
  triggeringDepartment: '1004',
  assignedDepartments: ['1004'],
  photoRequired: true,
  formFields: [
    {
      id: 'location',
      label: 'Location',
      fieldType: 'dropdown',
      required: true,
      options: [
        { value: 'lab_main', label: 'Main Lab' },
        { value: 'lab_micro', label: 'Microbiology Lab' },
        { value: 'lab_chemistry', label: 'Chemistry Lab' },
        { value: 'lab_qc', label: 'QC Station' },
        { value: 'production_floor', label: 'Production Floor' },
      ],
      sortOrder: 1,
    },
    {
      id: 'batch_number',
      label: 'Batch #',
      fieldType: 'text_input',
      required: true,
      placeholder: 'Enter batch number (e.g., B-2024-0001)',
      sortOrder: 2,
    },
    {
      id: 'lot_number',
      label: 'Lot #',
      fieldType: 'text_input',
      required: false,
      placeholder: 'Enter lot number if applicable',
      sortOrder: 3,
    },
    {
      id: 'result',
      label: 'Result',
      fieldType: 'radio',
      required: true,
      options: PASS_FAIL_OPTIONS,
      sortOrder: 4,
    },
    {
      id: 'notes',
      label: 'Test Notes',
      fieldType: 'text_area',
      required: false,
      placeholder: 'Add any test observations or notes...',
      sortOrder: 5,
    },
  ],
  workflowRules: [
    {
      condition: { fieldId: 'result', operator: 'equals', value: 'fail' },
      action: 'alert_personnel',
      alertPersonnel: [],
    },
  ],
  isActive: true,
  sortOrder: 2,
};

export const EQUIPMENT_FAILURE_TEMPLATE: CreateTemplateInput = {
  name: 'Equipment Failure',
  description: 'Report equipment breakdown or malfunction. Automatically creates work order for critical issues.',
  buttonType: 'report_issue',
  triggeringDepartment: 'any',
  assignedDepartments: ['1001'],
  photoRequired: true,
  formFields: [
    {
      id: 'equipment',
      label: 'Equipment',
      fieldType: 'dropdown',
      required: true,
      options: EQUIPMENT_OPTIONS,
      placeholder: 'Select equipment',
      sortOrder: 1,
    },
    {
      id: 'location',
      label: 'Location',
      fieldType: 'dropdown',
      required: true,
      options: LOCATION_OPTIONS,
      placeholder: 'Where is this equipment?',
      sortOrder: 2,
    },
    {
      id: 'problem_type',
      label: 'Problem Type',
      fieldType: 'dropdown',
      required: true,
      options: PROBLEM_TYPE_OPTIONS,
      placeholder: 'What type of problem?',
      sortOrder: 3,
    },
    {
      id: 'severity',
      label: 'Severity',
      fieldType: 'radio',
      required: true,
      options: SEVERITY_OPTIONS,
      sortOrder: 4,
    },
    {
      id: 'details',
      label: 'Additional Details',
      fieldType: 'text_area',
      required: false,
      placeholder: 'Describe what happened, when it started, any error codes...',
      sortOrder: 5,
    },
  ],
  workflowRules: [
    {
      condition: { fieldId: 'severity', operator: 'equals', value: 'critical' },
      action: 'create_work_order',
      createWorkOrderPriority: 'critical',
    },
    {
      condition: { fieldId: 'severity', operator: 'equals', value: 'high' },
      action: 'create_work_order',
      createWorkOrderPriority: 'high',
    },
  ],
  isActive: true,
  sortOrder: 3,
};

export const INITIAL_TASK_FEED_TEMPLATES: CreateTemplateInput[] = [
  PRE_OP_TEMPLATE,
  TOA_LAB_CHECK_TEMPLATE,
  EQUIPMENT_FAILURE_TEMPLATE,
];

export const getTemplateByName = (name: string): CreateTemplateInput | undefined => {
  return INITIAL_TASK_FEED_TEMPLATES.find(t => t.name === name);
};

export const isAnyDepartmentTemplate = (template: CreateTemplateInput): boolean => {
  return template.triggeringDepartment === 'any';
};
