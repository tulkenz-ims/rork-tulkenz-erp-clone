import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useMemo, useCallback } from 'react';

export type QualityTaskFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type QualityTaskStatus = 'scheduled' | 'available' | 'in_progress' | 'completed' | 'missed' | 'skipped';
export type QualityTaskType = 'line_check' | 'temp_check' | 'swab_test' | 'calibration' | 'inspection' | 'verification' | 'sign_off' | 'audit' | 'other';
export type QualityTaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type QualityTaskResult = 'pass' | 'fail' | 'conditional' | 'needs_review';

export type ReminderStatus = 'upcoming' | 'can_start' | 'due_now' | 'almost_late' | 'overdue';

export interface QualityTaskSchedule {
  id: string;
  organization_id: string;
  schedule_number: string;
  schedule_name: string;
  task_type: QualityTaskType;
  frequency: QualityTaskFrequency;
  priority: QualityTaskPriority;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  line_id: string | null;
  line_name: string | null;
  description: string | null;
  instructions: string | null;
  checklist_items: ChecklistItem[];
  parameters_to_record: ParameterConfig[];
  start_time: string;
  end_time: string | null;
  grace_period_before_minutes: number;
  grace_period_after_minutes: number;
  days_of_week: number[] | null;
  days_of_month: number[] | null;
  months_of_year: number[] | null;
  assigned_role: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  requires_sign_off: boolean;
  sign_off_role: string | null;
  cross_department_required: boolean;
  cross_department_type: string | null;
  is_active: boolean;
  effective_date: string;
  end_date: string | null;
  notification_settings: NotificationSettings;
  created_at: string;
  updated_at: string;
}

export interface QualityTask {
  id: string;
  organization_id: string;
  task_number: string;
  schedule_id: string | null;
  schedule_name: string | null;
  task_type: QualityTaskType;
  status: QualityTaskStatus;
  priority: QualityTaskPriority;
  result: QualityTaskResult | null;
  facility_id: string | null;
  department_code: string | null;
  department_name: string | null;
  location: string | null;
  line_id: string | null;
  line_name: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  scheduled_date: string;
  scheduled_time: string;
  window_start: string;
  window_end: string;
  due_time: string;
  assigned_to: string | null;
  assigned_to_id: string | null;
  started_at: string | null;
  started_by: string | null;
  started_by_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_id: string | null;
  duration_minutes: number | null;
  checklist_items: ChecklistItem[];
  recorded_parameters: RecordedParameter[];
  issues_found: string | null;
  corrective_action: string | null;
  ncr_required: boolean;
  ncr_id: string | null;
  photos: string[];
  notes: string | null;
  requires_sign_off: boolean;
  signed_off_by: string | null;
  signed_off_by_id: string | null;
  signed_off_at: string | null;
  sign_off_notes: string | null;
  cross_department_doc_id: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrossDepartmentDoc {
  id: string;
  organization_id: string;
  doc_number: string;
  doc_type: 'equipment_work' | 'part_introduction' | 'maintenance' | 'sanitation' | 'other';
  status: 'pending_quality' | 'approved' | 'rejected' | 'needs_action';
  facility_id: string | null;
  location: string | null;
  equipment_id: string | null;
  equipment_name: string | null;
  work_performed: string;
  work_date: string;
  work_start_time: string | null;
  work_end_time: string | null;
  performed_by: string;
  performed_by_id: string | null;
  performed_by_department: string | null;
  sanitation_required: boolean;
  sanitation_completed: boolean;
  sanitation_completed_by: string | null;
  sanitation_completed_at: string | null;
  swab_test_required: boolean;
  swab_test_id: string | null;
  swab_test_result: string | null;
  quality_sign_off_required: boolean;
  quality_signed_off_by: string | null;
  quality_signed_off_by_id: string | null;
  quality_signed_off_at: string | null;
  quality_notes: string | null;
  food_safety_compromised: boolean;
  corrective_actions: string | null;
  photos: string[];
  attachments: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SwabTest {
  id: string;
  organization_id: string;
  swab_number: string;
  test_type: 'atp' | 'micro' | 'allergen' | 'listeria' | 'salmonella' | 'environmental' | 'other';
  status: 'pending' | 'in_progress' | 'awaiting_results' | 'completed' | 'failed';
  result: 'pass' | 'fail' | 'pending' | null;
  facility_id: string | null;
  location: string;
  zone: '1' | '2' | '3' | '4' | null;
  equipment_id: string | null;
  equipment_name: string | null;
  surface_type: string | null;
  reason: 'scheduled' | 'new_part' | 'post_maintenance' | 'post_sanitation' | 'investigation' | 'other';
  related_doc_id: string | null;
  sampled_by: string;
  sampled_by_id: string | null;
  sampled_at: string;
  sample_id: string | null;
  atp_reading: number | null;
  atp_threshold: number | null;
  sent_to_lab: boolean;
  lab_name: string | null;
  lab_sample_id: string | null;
  results_received_at: string | null;
  results_entered_by: string | null;
  results_entered_by_id: string | null;
  detailed_results: any;
  corrective_action_required: boolean;
  corrective_action: string | null;
  retest_required: boolean;
  retest_id: string | null;
  photos: string[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ChecklistItem {
  id: string;
  item: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

interface ParameterConfig {
  id: string;
  name: string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  target_value: number | null;
  required: boolean;
}

interface RecordedParameter {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  in_spec: boolean;
  recorded_at: string;
}

interface NotificationSettings {
  notify_on_available: boolean;
  notify_on_due: boolean;
  notify_before_late_minutes: number;
  notify_on_missed: boolean;
  escalate_to_supervisor: boolean;
  escalation_delay_minutes: number;
}

const MOCK_SCHEDULES: QualityTaskSchedule[] = [
  {
    id: 'QSCHED001',
    organization_id: 'org1',
    schedule_number: 'QS-2501-0001',
    schedule_name: 'Hourly Temperature Check - Line 1',
    task_type: 'temp_check',
    frequency: 'hourly',
    priority: 'high',
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Production Floor',
    line_id: 'LINE001',
    line_name: 'Line 1',
    description: 'Hourly temperature verification for Line 1 production',
    instructions: 'Check ambient temp, product temp at 3 points, and equipment temp',
    checklist_items: [
      { id: '1', item: 'Verify thermometer is calibrated', required: true, completed: false },
      { id: '2', item: 'Record ambient temperature', required: true, completed: false },
      { id: '3', item: 'Record product temperature (3 samples)', required: true, completed: false },
      { id: '4', item: 'Check equipment display matches readings', required: true, completed: false },
    ],
    parameters_to_record: [
      { id: 'p1', name: 'Ambient Temp', unit: '°F', min_value: 35, max_value: 45, target_value: 40, required: true },
      { id: 'p2', name: 'Product Temp 1', unit: '°F', min_value: 32, max_value: 40, target_value: 36, required: true },
      { id: 'p3', name: 'Product Temp 2', unit: '°F', min_value: 32, max_value: 40, target_value: 36, required: true },
      { id: 'p4', name: 'Product Temp 3', unit: '°F', min_value: 32, max_value: 40, target_value: 36, required: true },
    ],
    start_time: '06:00',
    end_time: '18:00',
    grace_period_before_minutes: 15,
    grace_period_after_minutes: 15,
    days_of_week: [1, 2, 3, 4, 5],
    days_of_month: null,
    months_of_year: null,
    assigned_role: 'QA Technician',
    assigned_to: null,
    assigned_to_id: null,
    requires_sign_off: false,
    sign_off_role: null,
    cross_department_required: false,
    cross_department_type: null,
    is_active: true,
    effective_date: '2025-01-01',
    end_date: null,
    notification_settings: {
      notify_on_available: true,
      notify_on_due: true,
      notify_before_late_minutes: 5,
      notify_on_missed: true,
      escalate_to_supervisor: true,
      escalation_delay_minutes: 30,
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'QSCHED002',
    organization_id: 'org1',
    schedule_number: 'QS-2501-0002',
    schedule_name: 'Daily Pre-Op Line Inspection',
    task_type: 'inspection',
    frequency: 'daily',
    priority: 'critical',
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Production Floor',
    line_id: null,
    line_name: 'All Lines',
    description: 'Daily pre-operational inspection of all production lines',
    instructions: 'Complete full pre-op checklist before production starts',
    checklist_items: [
      { id: '1', item: 'Verify sanitation completed', required: true, completed: false },
      { id: '2', item: 'Check equipment cleanliness', required: true, completed: false },
      { id: '3', item: 'Inspect conveyor belts', required: true, completed: false },
      { id: '4', item: 'Verify no foreign materials', required: true, completed: false },
      { id: '5', item: 'Check allergen controls', required: true, completed: false },
    ],
    parameters_to_record: [],
    start_time: '05:00',
    end_time: null,
    grace_period_before_minutes: 30,
    grace_period_after_minutes: 30,
    days_of_week: [1, 2, 3, 4, 5, 6],
    days_of_month: null,
    months_of_year: null,
    assigned_role: 'QA Supervisor',
    assigned_to: null,
    assigned_to_id: null,
    requires_sign_off: true,
    sign_off_role: 'Production Supervisor',
    cross_department_required: false,
    cross_department_type: null,
    is_active: true,
    effective_date: '2025-01-01',
    end_date: null,
    notification_settings: {
      notify_on_available: true,
      notify_on_due: true,
      notify_before_late_minutes: 10,
      notify_on_missed: true,
      escalate_to_supervisor: true,
      escalation_delay_minutes: 15,
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'QSCHED003',
    organization_id: 'org1',
    schedule_number: 'QS-2501-0003',
    schedule_name: 'Weekly Calibration Verification',
    task_type: 'calibration',
    frequency: 'weekly',
    priority: 'high',
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Lab / Production',
    line_id: null,
    line_name: null,
    description: 'Weekly verification of all critical measuring equipment',
    instructions: 'Verify calibration of thermometers, scales, pH meters, and metal detectors',
    checklist_items: [
      { id: '1', item: 'Thermometers (ice point check)', required: true, completed: false },
      { id: '2', item: 'Scales (test weights)', required: true, completed: false },
      { id: '3', item: 'pH meters (buffer solutions)', required: true, completed: false },
      { id: '4', item: 'Metal detectors (test wands)', required: true, completed: false },
    ],
    parameters_to_record: [],
    start_time: '08:00',
    end_time: null,
    grace_period_before_minutes: 60,
    grace_period_after_minutes: 120,
    days_of_week: [1],
    days_of_month: null,
    months_of_year: null,
    assigned_role: 'QA Technician',
    assigned_to: null,
    assigned_to_id: null,
    requires_sign_off: true,
    sign_off_role: 'QA Manager',
    cross_department_required: false,
    cross_department_type: null,
    is_active: true,
    effective_date: '2025-01-01',
    end_date: null,
    notification_settings: {
      notify_on_available: true,
      notify_on_due: true,
      notify_before_late_minutes: 30,
      notify_on_missed: true,
      escalate_to_supervisor: true,
      escalation_delay_minutes: 60,
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const MOCK_TASKS: QualityTask[] = [
  {
    id: 'QTASK001',
    organization_id: 'org1',
    task_number: 'QT-2501-0001',
    schedule_id: 'QSCHED001',
    schedule_name: 'Hourly Temperature Check - Line 1',
    task_type: 'temp_check',
    status: 'completed',
    priority: 'high',
    result: 'pass',
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Production Floor',
    line_id: 'LINE001',
    line_name: 'Line 1',
    title: '9:00 AM Temperature Check - Line 1',
    description: 'Hourly temperature verification',
    instructions: 'Check ambient temp, product temp at 3 points',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00',
    window_start: '08:45',
    window_end: '09:15',
    due_time: '09:00',
    assigned_to: 'John Smith',
    assigned_to_id: 'EMP001',
    started_at: new Date().toISOString(),
    started_by: 'John Smith',
    started_by_id: 'EMP001',
    completed_at: new Date().toISOString(),
    completed_by: 'John Smith',
    completed_by_id: 'EMP001',
    duration_minutes: 8,
    checklist_items: [
      { id: '1', item: 'Verify thermometer is calibrated', required: true, completed: true },
      { id: '2', item: 'Record ambient temperature', required: true, completed: true },
      { id: '3', item: 'Record product temperature (3 samples)', required: true, completed: true },
      { id: '4', item: 'Check equipment display matches readings', required: true, completed: true },
    ],
    recorded_parameters: [
      { id: 'p1', name: 'Ambient Temp', value: 38, unit: '°F', in_spec: true, recorded_at: new Date().toISOString() },
      { id: 'p2', name: 'Product Temp 1', value: 35, unit: '°F', in_spec: true, recorded_at: new Date().toISOString() },
      { id: 'p3', name: 'Product Temp 2', value: 36, unit: '°F', in_spec: true, recorded_at: new Date().toISOString() },
      { id: 'p4', name: 'Product Temp 3', value: 35, unit: '°F', in_spec: true, recorded_at: new Date().toISOString() },
    ],
    issues_found: null,
    corrective_action: null,
    ncr_required: false,
    ncr_id: null,
    photos: [],
    notes: null,
    requires_sign_off: false,
    signed_off_by: null,
    signed_off_by_id: null,
    signed_off_at: null,
    sign_off_notes: null,
    cross_department_doc_id: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'QTASK002',
    organization_id: 'org1',
    task_number: 'QT-2501-0002',
    schedule_id: 'QSCHED001',
    schedule_name: 'Hourly Temperature Check - Line 1',
    task_type: 'temp_check',
    status: 'available',
    priority: 'high',
    result: null,
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Production Floor',
    line_id: 'LINE001',
    line_name: 'Line 1',
    title: '10:00 AM Temperature Check - Line 1',
    description: 'Hourly temperature verification',
    instructions: 'Check ambient temp, product temp at 3 points',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '10:00',
    window_start: '09:45',
    window_end: '10:15',
    due_time: '10:00',
    assigned_to: null,
    assigned_to_id: null,
    started_at: null,
    started_by: null,
    started_by_id: null,
    completed_at: null,
    completed_by: null,
    completed_by_id: null,
    duration_minutes: null,
    checklist_items: [
      { id: '1', item: 'Verify thermometer is calibrated', required: true, completed: false },
      { id: '2', item: 'Record ambient temperature', required: true, completed: false },
      { id: '3', item: 'Record product temperature (3 samples)', required: true, completed: false },
      { id: '4', item: 'Check equipment display matches readings', required: true, completed: false },
    ],
    recorded_parameters: [],
    issues_found: null,
    corrective_action: null,
    ncr_required: false,
    ncr_id: null,
    photos: [],
    notes: null,
    requires_sign_off: false,
    signed_off_by: null,
    signed_off_by_id: null,
    signed_off_at: null,
    sign_off_notes: null,
    cross_department_doc_id: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'QTASK003',
    organization_id: 'org1',
    task_number: 'QT-2501-0003',
    schedule_id: 'QSCHED001',
    schedule_name: 'Hourly Temperature Check - Line 1',
    task_type: 'temp_check',
    status: 'scheduled',
    priority: 'high',
    result: null,
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Production Floor',
    line_id: 'LINE001',
    line_name: 'Line 1',
    title: '11:00 AM Temperature Check - Line 1',
    description: 'Hourly temperature verification',
    instructions: 'Check ambient temp, product temp at 3 points',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '11:00',
    window_start: '10:45',
    window_end: '11:15',
    due_time: '11:00',
    assigned_to: null,
    assigned_to_id: null,
    started_at: null,
    started_by: null,
    started_by_id: null,
    completed_at: null,
    completed_by: null,
    completed_by_id: null,
    duration_minutes: null,
    checklist_items: [],
    recorded_parameters: [],
    issues_found: null,
    corrective_action: null,
    ncr_required: false,
    ncr_id: null,
    photos: [],
    notes: null,
    requires_sign_off: false,
    signed_off_by: null,
    signed_off_by_id: null,
    signed_off_at: null,
    sign_off_notes: null,
    cross_department_doc_id: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'QTASK004',
    organization_id: 'org1',
    task_number: 'QT-2501-0004',
    schedule_id: 'QSCHED002',
    schedule_name: 'Daily Pre-Op Line Inspection',
    task_type: 'inspection',
    status: 'completed',
    priority: 'critical',
    result: 'pass',
    facility_id: 'FAC001',
    department_code: 'QA',
    department_name: 'Quality Assurance',
    location: 'Production Floor',
    line_id: null,
    line_name: 'All Lines',
    title: 'Daily Pre-Op Inspection',
    description: 'Pre-operational inspection of all production lines',
    instructions: 'Complete full pre-op checklist before production starts',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '05:00',
    window_start: '04:30',
    window_end: '05:30',
    due_time: '05:00',
    assigned_to: 'Maria Garcia',
    assigned_to_id: 'EMP002',
    started_at: new Date().toISOString(),
    started_by: 'Maria Garcia',
    started_by_id: 'EMP002',
    completed_at: new Date().toISOString(),
    completed_by: 'Maria Garcia',
    completed_by_id: 'EMP002',
    duration_minutes: 35,
    checklist_items: [
      { id: '1', item: 'Verify sanitation completed', required: true, completed: true },
      { id: '2', item: 'Check equipment cleanliness', required: true, completed: true },
      { id: '3', item: 'Inspect conveyor belts', required: true, completed: true },
      { id: '4', item: 'Verify no foreign materials', required: true, completed: true },
      { id: '5', item: 'Check allergen controls', required: true, completed: true },
    ],
    recorded_parameters: [],
    issues_found: null,
    corrective_action: null,
    ncr_required: false,
    ncr_id: null,
    photos: [],
    notes: 'All lines ready for production',
    requires_sign_off: true,
    signed_off_by: 'Tom Wilson',
    signed_off_by_id: 'EMP003',
    signed_off_at: new Date().toISOString(),
    sign_off_notes: 'Approved for production',
    cross_department_doc_id: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_CROSS_DEPT_DOCS: CrossDepartmentDoc[] = [
  {
    id: 'CDD001',
    organization_id: 'org1',
    doc_number: 'EHR-2501-0001',
    doc_type: 'equipment_work',
    status: 'pending_quality',
    facility_id: 'FAC001',
    location: 'Production Floor - Line 1',
    equipment_id: 'EQ001',
    equipment_name: 'Mixer #1',
    work_performed: 'Replaced agitator blade and seals',
    work_date: new Date().toISOString().split('T')[0],
    work_start_time: '06:00',
    work_end_time: '08:30',
    performed_by: 'Mike Johnson',
    performed_by_id: 'EMP010',
    performed_by_department: 'Maintenance',
    sanitation_required: true,
    sanitation_completed: true,
    sanitation_completed_by: 'Maria Garcia',
    sanitation_completed_at: new Date().toISOString(),
    swab_test_required: true,
    swab_test_id: 'SWAB001',
    swab_test_result: 'pending',
    quality_sign_off_required: true,
    quality_signed_off_by: null,
    quality_signed_off_by_id: null,
    quality_signed_off_at: null,
    quality_notes: null,
    food_safety_compromised: false,
    corrective_actions: null,
    photos: [],
    attachments: [],
    notes: 'Regular maintenance per PM schedule',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_SWAB_TESTS: SwabTest[] = [
  {
    id: 'SWAB001',
    organization_id: 'org1',
    swab_number: 'SW-2501-0001',
    test_type: 'atp',
    status: 'awaiting_results',
    result: 'pending',
    facility_id: 'FAC001',
    location: 'Production Floor - Line 1',
    zone: '1',
    equipment_id: 'EQ001',
    equipment_name: 'Mixer #1',
    surface_type: 'Food contact surface',
    reason: 'post_maintenance',
    related_doc_id: 'CDD001',
    sampled_by: 'John Smith',
    sampled_by_id: 'EMP001',
    sampled_at: new Date().toISOString(),
    sample_id: 'ATP-001',
    atp_reading: null,
    atp_threshold: 30,
    sent_to_lab: false,
    lab_name: null,
    lab_sample_id: null,
    results_received_at: null,
    results_entered_by: null,
    results_entered_by_id: null,
    detailed_results: null,
    corrective_action_required: false,
    corrective_action: null,
    retest_required: false,
    retest_id: null,
    photos: [],
    notes: 'Post-maintenance swab for Mixer #1 agitator replacement',
    reviewed_by: null,
    reviewed_by_id: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

type CreateScheduleInput = Omit<QualityTaskSchedule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateTaskInput = Omit<QualityTask, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateCrossDeptDocInput = Omit<CrossDepartmentDoc, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateSwabTestInput = Omit<SwabTest, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabaseQualityTasks() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const schedulesQuery = useQuery({
    queryKey: ['quality_task_schedules', organizationId],
    queryFn: async () => {
      // Table not yet migrated — skip Supabase call
      return MOCK_SCHEDULES as QualityTaskSchedule[];
    },
    enabled: true,
  });

  const tasksQuery = useQuery({
    queryKey: ['quality_tasks', organizationId],
    queryFn: async () => {
      return MOCK_TASKS as QualityTask[];
    },
    enabled: true,
  });

  const todaysTasksQuery = useQuery({
    queryKey: ['quality_tasks', 'today', organizationId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return MOCK_TASKS.filter(t => t.scheduled_date === today) as QualityTask[];
    },
    enabled: true,
  });

  const crossDeptDocsQuery = useQuery({
    queryKey: ['cross_department_docs', organizationId],
    queryFn: async () => {
      return MOCK_CROSS_DEPT_DOCS as CrossDepartmentDoc[];
    },
    enabled: true,
  });

  const pendingSignOffsQuery = useQuery({
    queryKey: ['cross_department_docs', 'pending', organizationId],
    queryFn: async () => {
      return MOCK_CROSS_DEPT_DOCS.filter(d => d.status === 'pending_quality') as CrossDepartmentDoc[];
    },
    enabled: true,
  });

  const swabTestsQuery = useQuery({
    queryKey: ['swab_tests', organizationId],
    queryFn: async () => {
      return MOCK_SWAB_TESTS as SwabTest[];
    },
    enabled: true,
  });

  const getTaskReminderStatus = useCallback((task: QualityTask): ReminderStatus => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (task.scheduled_date !== today) {
      return 'upcoming';
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [windowStartHour, windowStartMin] = task.window_start.split(':').map(Number);
    const [dueHour, dueMin] = task.due_time.split(':').map(Number);
    const [windowEndHour, windowEndMin] = task.window_end.split(':').map(Number);
    
    const windowStartMins = windowStartHour * 60 + windowStartMin;
    const dueMins = dueHour * 60 + dueMin;
    const windowEndMins = windowEndHour * 60 + windowEndMin;
    const almostLateMins = windowEndMins - 5;
    
    if (currentTime < windowStartMins) {
      return 'upcoming';
    } else if (currentTime >= windowStartMins && currentTime < dueMins) {
      return 'can_start';
    } else if (currentTime >= dueMins && currentTime < almostLateMins) {
      return 'due_now';
    } else if (currentTime >= almostLateMins && currentTime <= windowEndMins) {
      return 'almost_late';
    } else {
      return 'overdue';
    }
  }, []);

  const getReminderMessage = useCallback((task: QualityTask): string => {
    const status = getTaskReminderStatus(task);
    switch (status) {
      case 'upcoming':
        return `Upcoming at ${task.scheduled_time}`;
      case 'can_start':
        return `${task.title} can be started now`;
      case 'due_now':
        return `${task.title} is due`;
      case 'almost_late':
        return `You have 5 minutes to complete ${task.title}`;
      case 'overdue':
        return `${task.title} is overdue!`;
      default:
        return '';
    }
  }, [getTaskReminderStatus]);

  const dashboardStats = useMemo(() => {
    const tasks = tasksQuery.data || [];
    const today = new Date().toISOString().split('T')[0];
    
    const todaysTasks = tasks.filter(t => t.scheduled_date === today);
    const openTasks = todaysTasks.filter(t => 
      t.status === 'scheduled' || t.status === 'available' || t.status === 'in_progress'
    ).length;
    
    const completedToday = todaysTasks.filter(t => t.status === 'completed').length;
    
    const pendingSignOffs = (crossDeptDocsQuery.data || []).filter(
      d => d.status === 'pending_quality'
    ).length;
    
    const pendingSwabs = (swabTestsQuery.data || []).filter(
      s => s.status === 'pending' || s.status === 'awaiting_results'
    ).length;
    
    const pendingReview = pendingSignOffs + pendingSwabs + tasks.filter(
      t => t.requires_sign_off && !t.signed_off_at && t.status === 'completed'
    ).length;
    
    const allCompletedTasks = tasks.filter(t => t.status === 'completed');
    const passedTasks = allCompletedTasks.filter(t => t.result === 'pass').length;
    const firstPassYield = allCompletedTasks.length > 0 
      ? Math.round((passedTasks / allCompletedTasks.length) * 100 * 10) / 10 
      : 100;
    
    const onTimeTasks = allCompletedTasks.filter(t => {
      if (!t.completed_at) return false;
      const completedTime = new Date(t.completed_at);
      const [endHour, endMin] = t.window_end.split(':').map(Number);
      const windowEnd = new Date(t.scheduled_date);
      windowEnd.setHours(endHour, endMin, 0, 0);
      return completedTime <= windowEnd;
    }).length;
    
    const complianceRate = allCompletedTasks.length > 0
      ? Math.round((onTimeTasks / allCompletedTasks.length) * 100)
      : 100;
    
    return {
      openTasks,
      completedToday,
      pendingReview,
      firstPassYield,
      complianceRate,
    };
  }, [tasksQuery.data, crossDeptDocsQuery.data, swabTestsQuery.data]);

  const createScheduleMutation = useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQualityTasks] Creating schedule:', input.schedule_name);

      const { data, error } = await supabase
        .from('quality_task_schedules')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as QualityTaskSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_task_schedules'] });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualityTaskSchedule> & { id: string }) => {
      console.log('[useSupabaseQualityTasks] Updating schedule:', id);

      const { data, error } = await supabase
        .from('quality_task_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QualityTaskSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_task_schedules'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQualityTasks] Creating task:', input.task_number);

      const { data, error } = await supabase
        .from('quality_tasks')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as QualityTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_tasks'] });
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: async ({ id, startedBy, startedById }: { id: string; startedBy: string; startedById?: string }) => {
      console.log('[useSupabaseQualityTasks] Starting task:', id);

      const { data, error } = await supabase
        .from('quality_tasks')
        .update({
          status: 'in_progress' as QualityTaskStatus,
          started_at: new Date().toISOString(),
          started_by: startedBy,
          started_by_id: startedById || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QualityTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_tasks'] });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ 
      id, 
      completedBy, 
      completedById, 
      result, 
      checklist_items,
      recorded_parameters,
      issues_found,
      corrective_action,
      ncr_required,
      notes 
    }: { 
      id: string; 
      completedBy: string; 
      completedById?: string; 
      result: QualityTaskResult;
      checklist_items?: ChecklistItem[];
      recorded_parameters?: RecordedParameter[];
      issues_found?: string;
      corrective_action?: string;
      ncr_required?: boolean;
      notes?: string;
    }) => {
      console.log('[useSupabaseQualityTasks] Completing task:', id);

      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      const { data, error } = await supabase
        .from('quality_tasks')
        .update({
          status: 'completed' as QualityTaskStatus,
          completed_at: completedAt,
          completed_by: completedBy,
          completed_by_id: completedById || null,
          result,
          checklist_items: checklist_items || [],
          recorded_parameters: recorded_parameters || [],
          issues_found: issues_found || null,
          corrective_action: corrective_action || null,
          ncr_required: ncr_required || false,
          duration_minutes: durationMinutes,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QualityTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_tasks'] });
    },
  });

  const signOffTaskMutation = useMutation({
    mutationFn: async ({ id, signedOffBy, signedOffById, notes }: { id: string; signedOffBy: string; signedOffById?: string; notes?: string }) => {
      console.log('[useSupabaseQualityTasks] Signing off task:', id);

      const { data, error } = await supabase
        .from('quality_tasks')
        .update({
          signed_off_by: signedOffBy,
          signed_off_by_id: signedOffById || null,
          signed_off_at: new Date().toISOString(),
          sign_off_notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QualityTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality_tasks'] });
    },
  });

  const createCrossDeptDocMutation = useMutation({
    mutationFn: async (input: CreateCrossDeptDocInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQualityTasks] Creating cross-dept doc:', input.doc_number);

      const { data, error } = await supabase
        .from('cross_department_docs')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as CrossDepartmentDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross_department_docs'] });
    },
  });

  const signOffCrossDeptDocMutation = useMutation({
    mutationFn: async ({ 
      id, 
      signedOffBy, 
      signedOffById, 
      status, 
      foodSafetyCompromised,
      correctiveActions,
      notes 
    }: { 
      id: string; 
      signedOffBy: string; 
      signedOffById?: string; 
      status: 'approved' | 'rejected' | 'needs_action';
      foodSafetyCompromised?: boolean;
      correctiveActions?: string;
      notes?: string;
    }) => {
      console.log('[useSupabaseQualityTasks] Signing off cross-dept doc:', id);

      const { data, error } = await supabase
        .from('cross_department_docs')
        .update({
          status,
          quality_signed_off_by: signedOffBy,
          quality_signed_off_by_id: signedOffById || null,
          quality_signed_off_at: new Date().toISOString(),
          food_safety_compromised: foodSafetyCompromised || false,
          corrective_actions: correctiveActions || null,
          quality_notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CrossDepartmentDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cross_department_docs'] });
    },
  });

  const createSwabTestMutation = useMutation({
    mutationFn: async (input: CreateSwabTestInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseQualityTasks] Creating swab test:', input.swab_number);

      const { data, error } = await supabase
        .from('swab_tests')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SwabTest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swab_tests'] });
    },
  });

  const recordSwabResultMutation = useMutation({
    mutationFn: async ({ 
      id, 
      result, 
      atpReading,
      detailedResults,
      enteredBy, 
      enteredById,
      correctiveActionRequired,
      correctiveAction,
      retestRequired
    }: { 
      id: string; 
      result: 'pass' | 'fail';
      atpReading?: number;
      detailedResults?: any;
      enteredBy: string; 
      enteredById?: string;
      correctiveActionRequired?: boolean;
      correctiveAction?: string;
      retestRequired?: boolean;
    }) => {
      console.log('[useSupabaseQualityTasks] Recording swab result:', id);

      const { data, error } = await supabase
        .from('swab_tests')
        .update({
          status: 'completed',
          result,
          atp_reading: atpReading || null,
          detailed_results: detailedResults || null,
          results_received_at: new Date().toISOString(),
          results_entered_by: enteredBy,
          results_entered_by_id: enteredById || null,
          corrective_action_required: correctiveActionRequired || false,
          corrective_action: correctiveAction || null,
          retest_required: retestRequired || false,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SwabTest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swab_tests'] });
    },
  });

  const generateScheduleNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QS-${year}${month}-${random}`;
  };

  const generateTaskNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QT-${year}${month}-${random}`;
  };

  const generateCrossDeptDocNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `EHR-${year}${month}-${random}`;
  };

  const generateSwabNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SW-${year}${month}-${random}`;
  };

  const getTasksByType = (type: QualityTaskType) => {
    return tasksQuery.data?.filter(task => task.task_type === type) || [];
  };

  const getTasksByStatus = (status: QualityTaskStatus) => {
    return tasksQuery.data?.filter(task => task.status === status) || [];
  };

  const getAvailableTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return (tasksQuery.data || []).filter(task => {
      if (task.scheduled_date !== today) return false;
      const status = getTaskReminderStatus(task);
      return status === 'can_start' || status === 'due_now' || status === 'almost_late';
    });
  };

  const getOverdueTasks = () => {
    return (tasksQuery.data || []).filter(task => {
      if (task.status === 'completed' || task.status === 'skipped') return false;
      const status = getTaskReminderStatus(task);
      return status === 'overdue';
    });
  };

  return {
    schedules: schedulesQuery.data || [],
    tasks: tasksQuery.data || [],
    todaysTasks: todaysTasksQuery.data || [],
    crossDeptDocs: crossDeptDocsQuery.data || [],
    pendingSignOffs: pendingSignOffsQuery.data || [],
    swabTests: swabTestsQuery.data || [],
    dashboardStats,
    isLoading: schedulesQuery.isLoading || tasksQuery.isLoading,

    createSchedule: createScheduleMutation.mutateAsync,
    updateSchedule: updateScheduleMutation.mutateAsync,
    createTask: createTaskMutation.mutateAsync,
    startTask: startTaskMutation.mutateAsync,
    completeTask: completeTaskMutation.mutateAsync,
    signOffTask: signOffTaskMutation.mutateAsync,
    createCrossDeptDoc: createCrossDeptDocMutation.mutateAsync,
    signOffCrossDeptDoc: signOffCrossDeptDocMutation.mutateAsync,
    createSwabTest: createSwabTestMutation.mutateAsync,
    recordSwabResult: recordSwabResultMutation.mutateAsync,

    generateScheduleNumber,
    generateTaskNumber,
    generateCrossDeptDocNumber,
    generateSwabNumber,

    getTaskReminderStatus,
    getReminderMessage,
    getTasksByType,
    getTasksByStatus,
    getAvailableTasks,
    getOverdueTasks,

    refetch: () => {
      schedulesQuery.refetch();
      tasksQuery.refetch();
      todaysTasksQuery.refetch();
      crossDeptDocsQuery.refetch();
      pendingSignOffsQuery.refetch();
      swabTestsQuery.refetch();
    },
  };
}
