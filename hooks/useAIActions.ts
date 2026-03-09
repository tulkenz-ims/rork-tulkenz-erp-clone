// hooks/useAIActions.ts

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateManualTaskFeedPost } from '@/hooks/useTaskFeedTemplates';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  navigate?: string;
}

interface AIActionParams { [key: string]: unknown; }

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function generatePostNumber(): string {
  const now = new Date();
  return `TF-${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(100000+Math.random()*900000)}`;
}

function generateWONumber(type = 'RE'): string {
  const now = new Date();
  return `WO-${type}-${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(100000+Math.random()*900000)}`;
}

const DEPARTMENT_NAMES: Record<string,string> = {
  '1000':'Projects / Offices','1001':'Maintenance','1002':'Sanitation',
  '1003':'Production','1004':'Quality','1005':'Safety','1006':'HR',
  '1008':'Warehouse','1009':'IT / Technology',
};

const ROOM_NAMES: Record<string,string> = {
  'PR1':'Production Room 1','PR2':'Production Room 2','PA1':'Packet Area 1',
  'PA2':'Packet Area 2','BB1':'Big Blend','SB1':'Small Blend',
};

const ALL_DEPARTMENTS = ['1001','1002','1003','1004','1005'];

const ROOM_TO_LOCATION_LABEL: Record<string,string> = {
  'PR1':'Production Room 1','PR2':'Production Room 2','PA1':'Packet Area 1',
  'PA2':'Packet Area 2','BB1':'Big Blend','SB1':'Small Blend',
};

const LINE_TO_LABEL: Record<string,string> = {
  'Line 1':'line_1','Line 2':'line_2','Line 3':'line_3','N/A':'not_applicable',
};

const TEMPLATE_REPORTING_DEPT: Record<string,{code:string;name:string}> = {
  broken_glove:          {code:'1004',name:'Quality'},
  foreign_material:      {code:'1004',name:'Quality'},
  chemical_spill:        {code:'1005',name:'Safety'},
  employee_injury:       {code:'1005',name:'Safety'},
  equipment_breakdown:   {code:'1001',name:'Maintenance'},
  metal_detector_reject: {code:'1004',name:'Quality'},
  pest_sighting:         {code:'1004',name:'Quality'},
  temperature_deviation: {code:'1004',name:'Quality'},
  customer_complaint:    {code:'1004',name:'Quality'},
};

// ══════════════════════════════════════════════════════════════════
// TABLE CONFIG — columns to select + display labels per table
// Controls what columns are fetched and shown in the results list
// ══════════════════════════════════════════════════════════════════

interface TableConfig {
  columns: string;          // Supabase select string
  primaryCol: string;       // Main display field (name/title/number)
  secondaryCol?: string;    // Sub-info field
  tertiaryCol?: string;     // Third field
  statusCol?: string;       // Status field
  dateCol?: string;         // Date field
  defaultOrder: string;     // Default order_by column
  defaultDir: 'asc'|'desc'; // Default order direction
  label: string;            // Human label for the table
}

const TABLE_CONFIG: Record<string, TableConfig> = {
  // MAINTENANCE
  work_orders:              { columns:'id,work_order_number,title,status,priority,type,equipment,location,due_date,assigned_name', primaryCol:'title', secondaryCol:'work_order_number', tertiaryCol:'equipment', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'Work Orders' },
  pm_schedules:             { columns:'id,title,equipment_name,frequency,next_due_date,status,assigned_to,location', primaryCol:'title', secondaryCol:'equipment_name', tertiaryCol:'frequency', statusCol:'status', dateCol:'next_due_date', defaultOrder:'next_due_date', defaultDir:'asc', label:'PM Schedules' },
  pm_work_orders:           { columns:'id,work_order_number,title,equipment,status,scheduled_date,completed_date,assigned_name', primaryCol:'title', secondaryCol:'work_order_number', tertiaryCol:'equipment', statusCol:'status', dateCol:'scheduled_date', defaultOrder:'scheduled_date', defaultDir:'asc', label:'PM Work Orders' },
  equipment:                { columns:'id,name,equipment_tag,location,status,manufacturer,model,serial_number', primaryCol:'name', secondaryCol:'equipment_tag', tertiaryCol:'manufacturer', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Equipment' },
  equipment_downtime_log:   { columns:'id,equipment_name,reason,duration_minutes,room,created_at', primaryCol:'equipment_name', secondaryCol:'reason', tertiaryCol:'duration_minutes', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Equipment Downtime' },
  downtime_events:          { columns:'id,equipment_name,reason,duration_minutes,room,start_time,created_at', primaryCol:'equipment_name', secondaryCol:'reason', tertiaryCol:'room', dateCol:'start_time', defaultOrder:'created_at', defaultDir:'desc', label:'Downtime Events' },
  loto_procedures:          { columns:'id,procedure_number,equipment_name,location,status,created_at', primaryCol:'equipment_name', secondaryCol:'procedure_number', statusCol:'status', dateCol:'created_at', defaultOrder:'equipment_name', defaultDir:'asc', label:'LOTO Procedures' },
  loto_events:              { columns:'id,procedure_number,equipment_name,initiated_by,status,started_at', primaryCol:'equipment_name', secondaryCol:'procedure_number', tertiaryCol:'initiated_by', statusCol:'status', dateCol:'started_at', defaultOrder:'started_at', defaultDir:'desc', label:'LOTO Events' },
  maintenance_activity_log: { columns:'id,activity_type,description,performed_by,equipment_name,created_at', primaryCol:'description', secondaryCol:'activity_type', tertiaryCol:'performed_by', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Maintenance Activity' },
  maintenance_alerts:       { columns:'id,title,severity,status,equipment_name,created_at', primaryCol:'title', secondaryCol:'equipment_name', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Maintenance Alerts' },
  work_order_chemicals:     { columns:'id,chemical_name,quantity,unit,work_order_id,created_at', primaryCol:'chemical_name', secondaryCol:'quantity', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'WO Chemicals' },
  maintenance_metrics:      { columns:'id,metric_name,value,period,department,created_at', primaryCol:'metric_name', secondaryCol:'value', tertiaryCol:'period', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Maintenance Metrics' },

  // PARTS / INVENTORY
  materials:                { columns:'id,name,material_number,sku,category,on_hand,min_level,location,vendor,unit_price,status', primaryCol:'name', secondaryCol:'material_number', tertiaryCol:'category', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Parts / Materials' },
  part_requests:            { columns:'id,request_number,part_name,quantity,requested_by,department,status,created_at', primaryCol:'part_name', secondaryCol:'request_number', tertiaryCol:'requested_by', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Part Requests' },
  parts_issues:             { columns:'id,issue_number,part_name,quantity,issued_to,work_order_number,department,created_at', primaryCol:'part_name', secondaryCol:'issue_number', tertiaryCol:'issued_to', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Parts Issued' },
  parts_returns:            { columns:'id,return_number,part_name,quantity,returned_by,reason,created_at', primaryCol:'part_name', secondaryCol:'return_number', tertiaryCol:'reason', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Parts Returns' },
  material_receipts:        { columns:'id,receipt_number,material_name,quantity,vendor,received_by,received_date', primaryCol:'material_name', secondaryCol:'receipt_number', tertiaryCol:'vendor', dateCol:'received_date', defaultOrder:'received_date', defaultDir:'desc', label:'Material Receipts' },
  inventory_adjustments:    { columns:'id,material_name,adjustment_type,quantity,reason,adjusted_by,created_at', primaryCol:'material_name', secondaryCol:'adjustment_type', tertiaryCol:'reason', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Inventory Adjustments' },
  inventory_history:        { columns:'id,material_name,action,quantity,performed_by,created_at', primaryCol:'material_name', secondaryCol:'action', tertiaryCol:'performed_by', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Inventory History' },
  low_stock_alerts:         { columns:'id,material_name,current_qty,min_level,location,status,created_at', primaryCol:'material_name', secondaryCol:'current_qty', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Low Stock Alerts' },
  hold_tags:                { columns:'id,tag_number,material_name,reason,status,location,created_by,created_at', primaryCol:'material_name', secondaryCol:'tag_number', tertiaryCol:'reason', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Hold Tags' },
  inventory_reserves:       { columns:'id,material_name,quantity,reserved_for,reserved_by,created_at', primaryCol:'material_name', secondaryCol:'reserved_for', tertiaryCol:'quantity', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Inventory Reserves' },
  count_sessions:           { columns:'id,session_number,status,location,counted_by,started_at,completed_at', primaryCol:'session_number', secondaryCol:'location', tertiaryCol:'counted_by', statusCol:'status', dateCol:'started_at', defaultOrder:'started_at', defaultDir:'desc', label:'Count Sessions' },
  replenishment_suggestions:{ columns:'id,material_name,suggested_qty,current_qty,vendor,status,created_at', primaryCol:'material_name', secondaryCol:'suggested_qty', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Replenishment Suggestions' },

  // PROCUREMENT
  purchase_orders:          { columns:'id,po_number,vendor,status,total_amount,department,created_by,created_at', primaryCol:'po_number', secondaryCol:'vendor', tertiaryCol:'total_amount', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Purchase Orders' },
  purchase_requests:        { columns:'id,request_number,title,status,requested_by,department,total_amount,created_at', primaryCol:'title', secondaryCol:'request_number', tertiaryCol:'requested_by', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Purchase Requests' },
  purchase_requisitions:    { columns:'id,requisition_number,title,status,requested_by,department,created_at', primaryCol:'title', secondaryCol:'requisition_number', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Purchase Requisitions' },
  procurement_purchase_orders:{ columns:'id,po_number,vendor,status,total_amount,created_at', primaryCol:'po_number', secondaryCol:'vendor', tertiaryCol:'total_amount', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Procurement POs' },
  blanket_purchase_orders:  { columns:'id,po_number,vendor,status,total_amount,start_date,end_date', primaryCol:'po_number', secondaryCol:'vendor', statusCol:'status', dateCol:'start_date', defaultOrder:'start_date', defaultDir:'desc', label:'Blanket POs' },
  service_requests:         { columns:'id,request_number,title,status,requested_by,department,created_at', primaryCol:'title', secondaryCol:'request_number', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Service Requests' },
  service_purchase_orders:  { columns:'id,po_number,vendor,service_description,status,total_amount,created_at', primaryCol:'service_description', secondaryCol:'po_number', tertiaryCol:'vendor', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Service POs' },
  approvals:                { columns:'id,title,type,status,requested_by,approved_by,created_at', primaryCol:'title', secondaryCol:'type', tertiaryCol:'requested_by', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Approvals' },

  // VENDORS
  vendors:                  { columns:'id,name,contact_name,email,phone,status,category,created_at', primaryCol:'name', secondaryCol:'contact_name', tertiaryCol:'category', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Vendors' },
  cmms_vendors:             { columns:'id,name,contact_name,email,phone,status,specialty,created_at', primaryCol:'name', secondaryCol:'contact_name', tertiaryCol:'specialty', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'CMMS Vendors' },
  procurement_vendors:      { columns:'id,name,contact_name,email,phone,status,created_at', primaryCol:'name', secondaryCol:'contact_name', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Procurement Vendors' },
  vendor_contracts:         { columns:'id,vendor_name,contract_number,status,start_date,end_date,value', primaryCol:'vendor_name', secondaryCol:'contract_number', statusCol:'status', dateCol:'end_date', defaultOrder:'end_date', defaultDir:'asc', label:'Vendor Contracts' },

  // QUALITY
  quality_inspections:      { columns:'id,inspection_number,inspection_type,location,status,inspector_name,created_at', primaryCol:'inspection_type', secondaryCol:'inspection_number', tertiaryCol:'location', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Quality Inspections' },
  inspection_records:       { columns:'id,inspection_number,inspection_type,location,status,inspected_by,created_at', primaryCol:'inspection_type', secondaryCol:'inspection_number', tertiaryCol:'location', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Inspection Records' },
  ncr_records:              { columns:'id,ncr_number,title,status,department,nonconformance_type,created_at', primaryCol:'title', secondaryCol:'ncr_number', tertiaryCol:'nonconformance_type', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'NCR Records' },
  capa_records:             { columns:'id,capa_number,title,status,department,due_date,created_at', primaryCol:'title', secondaryCol:'capa_number', tertiaryCol:'department', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'CAPA Records' },
  deviation_records:        { columns:'id,deviation_number,title,status,department,created_at', primaryCol:'title', secondaryCol:'deviation_number', tertiaryCol:'department', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Deviation Records' },
  customer_complaints:      { columns:'id,complaint_number,complaint_type,product_name,status,customer_name,created_at', primaryCol:'complaint_type', secondaryCol:'complaint_number', tertiaryCol:'product_name', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Customer Complaints' },
  metal_detector_logs:      { columns:'id,log_number,location,product_name,result,quantity_rejected,created_at', primaryCol:'product_name', secondaryCol:'location', tertiaryCol:'result', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Metal Detector Logs' },
  ccp_monitoring_logs:      { columns:'id,ccp_name,result,value,limit,status,monitored_by,created_at', primaryCol:'ccp_name', secondaryCol:'value', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'CCP Monitoring' },
  temperature_logs:         { columns:'id,location,temperature,unit,recorded_by,status,created_at', primaryCol:'location', secondaryCol:'temperature', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Temperature Logs' },
  allergen_changeover_forms:{ columns:'id,form_number,from_product,to_product,location,status,created_by,created_at', primaryCol:'to_product', secondaryCol:'from_product', tertiaryCol:'location', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Allergen Changeover Forms' },
  pre_op_inspections:       { columns:'id,inspection_number,room,status,inspected_by,created_at', primaryCol:'room', secondaryCol:'inspection_number', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Pre-Op Inspections' },
  production_line_checks:   { columns:'id,check_number,line,product,status,checked_by,created_at', primaryCol:'product', secondaryCol:'line', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Production Line Checks' },

  // SAFETY
  safety_observations:      { columns:'id,observation_number,observation_type,location,status,observer_name,created_at', primaryCol:'observation_type', secondaryCol:'observation_number', tertiaryCol:'location', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Safety Observations' },
  accident_investigations:  { columns:'id,investigation_number,injury_type,employee_name,location,status,incident_date', primaryCol:'injury_type', secondaryCol:'investigation_number', tertiaryCol:'employee_name', statusCol:'status', dateCol:'incident_date', defaultOrder:'incident_date', defaultDir:'desc', label:'Accident Investigations' },
  first_aid_log:            { columns:'id,log_number,employee_name,injury_description,treatment,treated_by,created_at', primaryCol:'employee_name', secondaryCol:'injury_description', tertiaryCol:'treatment', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'First Aid Log' },
  osha_300_log:             { columns:'id,case_number,employee_name,job_title,injury_type,days_away,status,incident_date', primaryCol:'employee_name', secondaryCol:'case_number', tertiaryCol:'injury_type', statusCol:'status', dateCol:'incident_date', defaultOrder:'incident_date', defaultDir:'desc', label:'OSHA 300 Log' },
  workers_comp_claims:      { columns:'id,claim_number,employee_name,injury_type,status,claim_date,insurance_carrier', primaryCol:'employee_name', secondaryCol:'claim_number', tertiaryCol:'injury_type', statusCol:'status', dateCol:'claim_date', defaultOrder:'claim_date', defaultDir:'desc', label:'Workers Comp Claims' },
  drug_alcohol_tests:       { columns:'id,test_number,employee_name,test_type,result,tested_by,test_date', primaryCol:'employee_name', secondaryCol:'test_type', tertiaryCol:'result', dateCol:'test_date', defaultOrder:'test_date', defaultDir:'desc', label:'Drug/Alcohol Tests' },
  hazard_assessments:       { columns:'id,assessment_number,hazard_type,location,risk_level,status,assessed_by,created_at', primaryCol:'hazard_type', secondaryCol:'location', tertiaryCol:'risk_level', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Hazard Assessments' },
  ppe_requirements:         { columns:'id,area,ppe_type,requirement_level,department,updated_at', primaryCol:'area', secondaryCol:'ppe_type', tertiaryCol:'requirement_level', defaultOrder:'area', defaultDir:'asc', label:'PPE Requirements' },
  safety_permits:           { columns:'id,permit_number,permit_type,location,status,issued_to,expiry_date', primaryCol:'permit_type', secondaryCol:'permit_number', tertiaryCol:'location', statusCol:'status', dateCol:'expiry_date', defaultOrder:'expiry_date', defaultDir:'asc', label:'Safety Permits' },
  safety_suggestions:       { columns:'id,suggestion_number,title,status,submitted_by,department,created_at', primaryCol:'title', secondaryCol:'suggestion_number', tertiaryCol:'submitted_by', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Safety Suggestions' },
  safety_committee_meetings:{ columns:'id,meeting_number,meeting_date,location,status,chairperson,created_at', primaryCol:'meeting_number', secondaryCol:'location', tertiaryCol:'chairperson', statusCol:'status', dateCol:'meeting_date', defaultOrder:'meeting_date', defaultDir:'desc', label:'Safety Committee Meetings' },
  fire_drill_entries:       { columns:'id,drill_number,location,status,drill_date,conducted_by,participant_count', primaryCol:'location', secondaryCol:'drill_number', tertiaryCol:'conducted_by', statusCol:'status', dateCol:'drill_date', defaultOrder:'drill_date', defaultDir:'desc', label:'Fire Drills' },
  evacuation_drill_entries: { columns:'id,drill_number,location,status,drill_date,conducted_by,participant_count', primaryCol:'location', secondaryCol:'drill_number', tertiaryCol:'conducted_by', statusCol:'status', dateCol:'drill_date', defaultOrder:'drill_date', defaultDir:'desc', label:'Evacuation Drills' },
  respirator_fit_tests:     { columns:'id,test_number,employee_name,respirator_type,result,test_date,tested_by', primaryCol:'employee_name', secondaryCol:'respirator_type', tertiaryCol:'result', dateCol:'test_date', defaultOrder:'test_date', defaultDir:'desc', label:'Respirator Fit Tests' },
  noise_monitoring:         { columns:'id,monitor_number,location,decibel_level,status,monitored_by,created_at', primaryCol:'location', secondaryCol:'decibel_level', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Noise Monitoring' },
  air_quality_monitoring:   { columns:'id,monitor_number,location,reading,substance,status,monitored_by,created_at', primaryCol:'location', secondaryCol:'substance', tertiaryCol:'reading', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Air Quality Monitoring' },
  heat_stress_monitoring:   { columns:'id,monitor_number,location,temperature,humidity,heat_index,status,created_at', primaryCol:'location', secondaryCol:'heat_index', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Heat Stress Monitoring' },
  ergonomic_assessments:    { columns:'id,assessment_number,employee_name,workstation,risk_level,status,assessed_by,created_at', primaryCol:'employee_name', secondaryCol:'workstation', tertiaryCol:'risk_level', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Ergonomic Assessments' },
  peer_safety_audits:       { columns:'id,audit_number,auditor_name,area,score,status,audit_date', primaryCol:'area', secondaryCol:'audit_number', tertiaryCol:'auditor_name', statusCol:'status', dateCol:'audit_date', defaultOrder:'audit_date', defaultDir:'desc', label:'Peer Safety Audits' },
  safety_program_documents: { columns:'id,title,document_type,version,status,reviewed_by,created_at', primaryCol:'title', secondaryCol:'document_type', tertiaryCol:'version', statusCol:'status', dateCol:'created_at', defaultOrder:'title', defaultDir:'asc', label:'Safety Program Documents' },

  // SANITATION
  sds_records:              { columns:'id,chemical_name,manufacturer,department,location,revision_date,status', primaryCol:'chemical_name', secondaryCol:'manufacturer', tertiaryCol:'department', statusCol:'status', dateCol:'revision_date', defaultOrder:'chemical_name', defaultDir:'asc', label:'SDS Records' },
  chemical_inventory:       { columns:'id,chemical_name,location,quantity,unit,category,sds_on_file,created_at', primaryCol:'chemical_name', secondaryCol:'location', tertiaryCol:'quantity', defaultOrder:'chemical_name', defaultDir:'asc', label:'Chemical Inventory' },
  room_hygiene_log:         { columns:'id,room,task_description,status,cleaned_by,created_at', primaryCol:'room', secondaryCol:'task_description', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Room Hygiene Log' },
  daily_room_hygiene_reports:{ columns:'id,room,report_date,status,submitted_by,created_at', primaryCol:'room', secondaryCol:'report_date', statusCol:'status', dateCol:'report_date', defaultOrder:'report_date', defaultDir:'desc', label:'Daily Room Hygiene Reports' },
  haz_waste:                { columns:'id,waste_type,quantity,unit,location,disposal_method,status,created_at', primaryCol:'waste_type', secondaryCol:'location', tertiaryCol:'disposal_method', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Hazardous Waste' },

  // PRODUCTION
  production_runs:          { columns:'id,run_number,room,product,status,started_at,ended_at,bag_count,started_by', primaryCol:'product', secondaryCol:'run_number', tertiaryCol:'room', statusCol:'status', dateCol:'started_at', defaultOrder:'started_at', defaultDir:'desc', label:'Production Runs' },
  production_events:        { columns:'id,event_type,description,room,severity,created_by,created_at', primaryCol:'event_type', secondaryCol:'description', tertiaryCol:'room', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Production Events' },
  production_hold_log:      { columns:'id,hold_number,reason,room,status,initiated_by,created_at', primaryCol:'reason', secondaryCol:'room', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Production Hold Log' },
  room_status:              { columns:'id,room_code,room_name,status,andon_color,updated_by,updated_at', primaryCol:'room_name', secondaryCol:'status', tertiaryCol:'andon_color', defaultOrder:'room_code', defaultDir:'asc', label:'Room Status' },
  sensor_readings:          { columns:'id,sensor_name,reading,unit,location,status,recorded_at', primaryCol:'sensor_name', secondaryCol:'reading', tertiaryCol:'location', statusCol:'status', dateCol:'recorded_at', defaultOrder:'recorded_at', defaultDir:'desc', label:'Sensor Readings' },

  // EMPLOYEES / HR
  employees:                { columns:'id,first_name,last_name,department,position,status,hire_date,email', primaryCol:'first_name', secondaryCol:'department', tertiaryCol:'position', statusCol:'status', dateCol:'hire_date', defaultOrder:'last_name', defaultDir:'asc', label:'Employees' },
  positions:                { columns:'id,title,department,status,created_at', primaryCol:'title', secondaryCol:'department', statusCol:'status', defaultOrder:'title', defaultDir:'asc', label:'Positions' },
  departments:              { columns:'id,name,code,manager_name,status', primaryCol:'name', secondaryCol:'code', tertiaryCol:'manager_name', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Departments' },
  shifts:                   { columns:'id,name,start_time,end_time,department,status', primaryCol:'name', secondaryCol:'start_time', tertiaryCol:'department', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Shifts' },
  attendance_records:       { columns:'id,employee_name,department,date,status,hours_worked,created_at', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'status', statusCol:'status', dateCol:'date', defaultOrder:'date', defaultDir:'desc', label:'Attendance Records' },
  time_entries:             { columns:'id,employee_name,department,clock_in,clock_out,hours,status', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'hours', statusCol:'status', dateCol:'clock_in', defaultOrder:'clock_in', defaultDir:'desc', label:'Time Entries' },
  time_off_requests:        { columns:'id,employee_name,department,request_type,start_date,end_date,status', primaryCol:'employee_name', secondaryCol:'request_type', tertiaryCol:'department', statusCol:'status', dateCol:'start_date', defaultOrder:'start_date', defaultDir:'desc', label:'Time Off Requests' },
  overtime_requests:        { columns:'id,employee_name,department,date,hours_requested,status,created_at', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'hours_requested', statusCol:'status', dateCol:'date', defaultOrder:'date', defaultDir:'desc', label:'Overtime Requests' },
  performance_reviews:      { columns:'id,employee_name,department,review_period,score,status,reviewer_name,review_date', primaryCol:'employee_name', secondaryCol:'review_period', tertiaryCol:'score', statusCol:'status', dateCol:'review_date', defaultOrder:'review_date', defaultDir:'desc', label:'Performance Reviews' },
  job_requisitions:         { columns:'id,requisition_number,title,department,status,positions_needed,created_at', primaryCol:'title', secondaryCol:'department', tertiaryCol:'positions_needed', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Job Requisitions' },
  candidates:               { columns:'id,first_name,last_name,position_applied,status,source,created_at', primaryCol:'first_name', secondaryCol:'position_applied', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Candidates' },
  attendance_points_balance:{ columns:'id,employee_name,department,points_balance,updated_at', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'points_balance', defaultOrder:'points_balance', defaultDir:'desc', label:'Attendance Points Balance' },
  medical_restrictions:     { columns:'id,employee_name,restriction_type,description,start_date,end_date,status', primaryCol:'employee_name', secondaryCol:'restriction_type', tertiaryCol:'description', statusCol:'status', dateCol:'start_date', defaultOrder:'start_date', defaultDir:'desc', label:'Medical Restrictions' },
  return_to_work_forms:     { columns:'id,employee_name,injury_type,return_date,restrictions,status,created_at', primaryCol:'employee_name', secondaryCol:'injury_type', statusCol:'status', dateCol:'return_date', defaultOrder:'return_date', defaultDir:'desc', label:'Return to Work Forms' },

  // RECYCLING
  recycling_cardboard:      { columns:'id,weight,location,collected_by,status,created_at', primaryCol:'location', secondaryCol:'weight', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Recycling - Cardboard' },
  recycling_metal:          { columns:'id,weight,material_type,location,collected_by,status,created_at', primaryCol:'material_type', secondaryCol:'weight', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Recycling - Metal' },
  recycling_paper:          { columns:'id,weight,location,collected_by,status,created_at', primaryCol:'location', secondaryCol:'weight', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Recycling - Paper' },
  recycling_batteries:      { columns:'id,battery_type,quantity,location,collected_by,status,created_at', primaryCol:'battery_type', secondaryCol:'quantity', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Recycling - Batteries' },
  recycling_bulbs:          { columns:'id,bulb_type,quantity,location,collected_by,status,created_at', primaryCol:'bulb_type', secondaryCol:'quantity', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Recycling - Bulbs' },
  recycling_toner:          { columns:'id,toner_type,quantity,location,collected_by,status,created_at', primaryCol:'toner_type', secondaryCol:'quantity', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Recycling - Toner' },

  // PLANNER
  planner_projects:         { columns:'id,name,status,owner_name,start_date,due_date,progress', primaryCol:'name', secondaryCol:'owner_name', tertiaryCol:'progress', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'Planner Projects' },
  planner_tasks:            { columns:'id,title,status,assigned_to,project_id,due_date,priority', primaryCol:'title', secondaryCol:'assigned_to', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'Planner Tasks' },

  // COMMUNICATIONS
  bulletin_posts:           { columns:'id,title,category,status,author_name,created_at', primaryCol:'title', secondaryCol:'category', tertiaryCol:'author_name', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Bulletin Posts' },
  portal_announcements:     { columns:'id,title,type,status,created_by,created_at', primaryCol:'title', secondaryCol:'type', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Announcements' },
  scheduled_tasks:          { columns:'id,title,status,assigned_to,department,due_date,created_at', primaryCol:'title', secondaryCol:'department', tertiaryCol:'assigned_to', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'Scheduled Tasks' },
  tasks:                    { columns:'id,title,status,assigned_to,department,due_date,priority', primaryCol:'title', secondaryCol:'department', tertiaryCol:'assigned_to', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'Tasks' },

  // DOCUMENTS / COMPLIANCE
  documents:                { columns:'id,title,document_type,version,status,category,created_at', primaryCol:'title', secondaryCol:'document_type', tertiaryCol:'version', statusCol:'status', dateCol:'created_at', defaultOrder:'title', defaultDir:'asc', label:'Documents' },
  audit_sessions:           { columns:'id,session_number,audit_type,status,auditor_name,start_date,end_date', primaryCol:'audit_type', secondaryCol:'session_number', tertiaryCol:'auditor_name', statusCol:'status', dateCol:'start_date', defaultOrder:'start_date', defaultDir:'desc', label:'Audit Sessions' },
  custom_form_templates:    { columns:'id,name,category,status,created_by,created_at', primaryCol:'name', secondaryCol:'category', statusCol:'status', dateCol:'created_at', defaultOrder:'name', defaultDir:'asc', label:'Custom Form Templates' },
  custom_form_submissions:  { columns:'id,form_name,submitted_by,department,status,created_at', primaryCol:'form_name', secondaryCol:'submitted_by', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Form Submissions' },

  // ASSETS
  assets:                   { columns:'id,name,asset_tag,category,location,status,purchase_date,value', primaryCol:'name', secondaryCol:'asset_tag', tertiaryCol:'category', statusCol:'status', dateCol:'purchase_date', defaultOrder:'name', defaultDir:'asc', label:'Assets' },
  warranty_records:         { columns:'id,asset_name,vendor,warranty_type,start_date,expiry_date,status', primaryCol:'asset_name', secondaryCol:'vendor', tertiaryCol:'warranty_type', statusCol:'status', dateCol:'expiry_date', defaultOrder:'expiry_date', defaultDir:'asc', label:'Warranty Records' },
  warranty_claims:          { columns:'id,claim_number,asset_name,issue_description,status,submitted_by,created_at', primaryCol:'asset_name', secondaryCol:'claim_number', tertiaryCol:'issue_description', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Warranty Claims' },

  // EMERGENCY
  emergency_events:         { columns:'id,event_number,event_type,location,status,initiated_by,created_at', primaryCol:'event_type', secondaryCol:'location', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Emergency Events' },
  emergency_contacts:       { columns:'id,name,role,phone,department,is_primary', primaryCol:'name', secondaryCol:'role', tertiaryCol:'phone', defaultOrder:'name', defaultDir:'asc', label:'Emergency Contacts' },
  emergency_equipment:      { columns:'id,name,equipment_type,location,status,last_inspected', primaryCol:'name', secondaryCol:'equipment_type', tertiaryCol:'location', statusCol:'status', defaultOrder:'name', defaultDir:'asc', label:'Emergency Equipment' },

  // FINANCIAL
  department_budgets:       { columns:'id,department,fiscal_year,budget_amount,spent_amount,status', primaryCol:'department', secondaryCol:'fiscal_year', tertiaryCol:'budget_amount', statusCol:'status', defaultOrder:'department', defaultDir:'asc', label:'Department Budgets' },
  maintenance_budgets:      { columns:'id,department,fiscal_year,budget_amount,spent_amount,status', primaryCol:'department', secondaryCol:'fiscal_year', tertiaryCol:'budget_amount', statusCol:'status', defaultOrder:'department', defaultDir:'asc', label:'Maintenance Budgets' },
  cost_reports:             { columns:'id,report_name,period,department,total_cost,status,created_at', primaryCol:'report_name', secondaryCol:'department', tertiaryCol:'total_cost', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Cost Reports' },

  // WORKFLOW
  workflow_instances:       { columns:'id,workflow_name,status,initiated_by,current_step,started_at,completed_at', primaryCol:'workflow_name', secondaryCol:'current_step', statusCol:'status', dateCol:'started_at', defaultOrder:'started_at', defaultDir:'desc', label:'Workflow Instances' },
  workflow_steps:           { columns:'id,step_name,workflow_id,status,assigned_to,due_date,completed_at', primaryCol:'step_name', secondaryCol:'assigned_to', statusCol:'status', dateCol:'due_date', defaultOrder:'step_name', defaultDir:'asc', label:'Workflow Steps' },
  workflow_step_history:    { columns:'id,step_name,action,performed_by,notes,created_at', primaryCol:'step_name', secondaryCol:'action', tertiaryCol:'performed_by', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Workflow Step History' },
  workflow_templates:       { columns:'id,name,category,status,created_by,created_at', primaryCol:'name', secondaryCol:'category', statusCol:'status', dateCol:'created_at', defaultOrder:'name', defaultDir:'asc', label:'Workflow Templates' },

  // VARIANCE / WEEKLY
  variance_records:         { columns:'id,variance_type,description,amount,department,status,created_by,created_at', primaryCol:'variance_type', secondaryCol:'department', tertiaryCol:'amount', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Variance Records' },
  weekly_replenishment_schedules: { columns:'id,material_name,quantity,frequency,location,status,created_at', primaryCol:'material_name', secondaryCol:'frequency', tertiaryCol:'quantity', statusCol:'status', dateCol:'created_at', defaultOrder:'material_name', defaultDir:'asc', label:'Weekly Replenishment Schedules' },

  // TIME & ATTENDANCE (additional)
  time_punches:             { columns:'id,employee_name,department,punch_type,punch_time,device,created_at', primaryCol:'employee_name', secondaryCol:'punch_type', tertiaryCol:'department', dateCol:'punch_time', defaultOrder:'punch_time', defaultDir:'desc', label:'Time Punches' },
  time_audit_logs:          { columns:'id,employee_name,action,old_value,new_value,modified_by,created_at', primaryCol:'employee_name', secondaryCol:'action', tertiaryCol:'modified_by', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Time Audit Logs' },
  time_adjustment_requests: { columns:'id,employee_name,department,adjustment_type,date,status,requested_by,created_at', primaryCol:'employee_name', secondaryCol:'adjustment_type', tertiaryCol:'department', statusCol:'status', dateCol:'date', defaultOrder:'date', defaultDir:'desc', label:'Time Adjustment Requests' },

  // TASKS (additional)
  task_verifications:       { columns:'id,task_name,verified_by,status,verification_date,notes', primaryCol:'task_name', secondaryCol:'verified_by', statusCol:'status', dateCol:'verification_date', defaultOrder:'verification_date', defaultDir:'desc', label:'Task Verifications' },
  task_locations:           { columns:'id,name,area,department,active', primaryCol:'name', secondaryCol:'area', tertiaryCol:'department', defaultOrder:'name', defaultDir:'asc', label:'Task Locations' },
  task_categories:          { columns:'id,name,color,department,active', primaryCol:'name', secondaryCol:'department', defaultOrder:'name', defaultDir:'asc', label:'Task Categories' },

  // TALENT / HR (additional)
  succession_plans:         { columns:'id,position,employee_name,successor_name,readiness_level,status,created_at', primaryCol:'position', secondaryCol:'employee_name', tertiaryCol:'successor_name', statusCol:'status', dateCol:'created_at', defaultOrder:'position', defaultDir:'asc', label:'Succession Plans' },
  talent_profiles:          { columns:'id,employee_name,department,skill_level,performance_rating,potential_rating,updated_at', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'performance_rating', defaultOrder:'employee_name', defaultDir:'asc', label:'Talent Profiles' },
  shift_swaps:              { columns:'id,requesting_employee,covering_employee,department,shift_date,status,created_at', primaryCol:'requesting_employee', secondaryCol:'covering_employee', tertiaryCol:'department', statusCol:'status', dateCol:'shift_date', defaultOrder:'shift_date', defaultDir:'desc', label:'Shift Swaps' },

  // SAFETY FOOTWEAR
  safety_footwear_records:  { columns:'id,employee_name,department,footwear_type,allowance_amount,purchase_date,status', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'footwear_type', statusCol:'status', dateCol:'purchase_date', defaultOrder:'employee_name', defaultDir:'asc', label:'Safety Footwear Records' },
  safety_footwear_allowances:{ columns:'id,department,position,allowance_amount,frequency,active', primaryCol:'department', secondaryCol:'position', tertiaryCol:'allowance_amount', defaultOrder:'department', defaultDir:'asc', label:'Safety Footwear Allowances' },

  // INVENTORY (additional)
  reorder_points:           { columns:'id,material_name,reorder_point,reorder_qty,location,vendor,active', primaryCol:'material_name', secondaryCol:'reorder_point', tertiaryCol:'vendor', defaultOrder:'material_name', defaultDir:'asc', label:'Reorder Points' },
  reorder_point_settings:   { columns:'id,material_name,min_qty,max_qty,reorder_qty,lead_time_days,updated_at', primaryCol:'material_name', secondaryCol:'min_qty', tertiaryCol:'max_qty', defaultOrder:'material_name', defaultDir:'asc', label:'Reorder Point Settings' },
  replenishment_suggestions: { columns:'id,material_name,suggested_qty,current_qty,vendor,status,created_at', primaryCol:'material_name', secondaryCol:'suggested_qty', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Replenishment Suggestions' },

  // SAFETY (additional)
  repetitive_motion_assessments: { columns:'id,employee_name,workstation,task_description,risk_level,status,assessed_by,created_at', primaryCol:'employee_name', secondaryCol:'workstation', tertiaryCol:'risk_level', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Repetitive Motion Assessments' },
  psm_compliance_records:   { columns:'id,record_number,element,description,status,due_date,responsible_person,created_at', primaryCol:'element', secondaryCol:'description', statusCol:'status', dateCol:'due_date', defaultOrder:'due_date', defaultDir:'asc', label:'PSM Compliance Records' },
  severe_weather_drill_entries: { columns:'id,drill_number,location,status,drill_date,conducted_by,participant_count', primaryCol:'location', secondaryCol:'drill_number', tertiaryCol:'conducted_by', statusCol:'status', dateCol:'drill_date', defaultOrder:'drill_date', defaultDir:'desc', label:'Severe Weather Drills' },

  // PLANNER (additional)
  planner_task_dependencies:{ columns:'id,task_id,depends_on_task_id,dependency_type,created_at', primaryCol:'task_id', secondaryCol:'depends_on_task_id', tertiaryCol:'dependency_type', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Planner Task Dependencies' },
  planner_views:            { columns:'id,name,view_type,owner_id,is_shared,created_at', primaryCol:'name', secondaryCol:'view_type', defaultOrder:'name', defaultDir:'asc', label:'Planner Views' },

  // COMMUNICATIONS (additional)
  portal_announcement_acknowledgments: { columns:'id,announcement_id,employee_name,acknowledged_at', primaryCol:'employee_name', secondaryCol:'acknowledged_at', dateCol:'acknowledged_at', defaultOrder:'acknowledged_at', defaultDir:'desc', label:'Announcement Acknowledgments' },
  portal_announcement_views:{ columns:'id,announcement_id,employee_name,viewed_at', primaryCol:'employee_name', secondaryCol:'viewed_at', dateCol:'viewed_at', defaultOrder:'viewed_at', defaultDir:'desc', label:'Announcement Views' },
  notifications:            { columns:'id,title,type,status,employee_name,created_at', primaryCol:'title', secondaryCol:'type', tertiaryCol:'employee_name', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Notifications' },

  // HR (additional)
  position_assignments:     { columns:'id,employee_name,position,department,start_date,end_date,status', primaryCol:'employee_name', secondaryCol:'position', tertiaryCol:'department', statusCol:'status', dateCol:'start_date', defaultOrder:'start_date', defaultDir:'desc', label:'Position Assignments' },
  position_history:         { columns:'id,employee_name,position,department,start_date,end_date,reason', primaryCol:'employee_name', secondaryCol:'position', tertiaryCol:'department', dateCol:'start_date', defaultOrder:'start_date', defaultDir:'desc', label:'Position History' },
  overtime_policies:        { columns:'id,name,department,threshold_hours,multiplier,active', primaryCol:'name', secondaryCol:'department', tertiaryCol:'threshold_hours', defaultOrder:'name', defaultDir:'asc', label:'Overtime Policies' },
  overtime_alerts:          { columns:'id,employee_name,department,hours_worked,threshold,status,created_at', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'hours_worked', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'Overtime Alerts' },

  // QUALITY (additional)
  ncr_paper_forms:          { columns:'id,form_number,title,department,status,created_by,created_at', primaryCol:'title', secondaryCol:'form_number', tertiaryCol:'department', statusCol:'status', dateCol:'created_at', defaultOrder:'created_at', defaultDir:'desc', label:'NCR Paper Forms' },

  // WORKSTATION
  workstation_evaluations:  { columns:'id,workstation_name,area,risk_level,evaluated_by,status,evaluation_date', primaryCol:'workstation_name', secondaryCol:'area', tertiaryCol:'risk_level', statusCol:'status', dateCol:'evaluation_date', defaultOrder:'workstation_name', defaultDir:'asc', label:'Workstation Evaluations' },

  // SDS (additional)
  sds_index:                { columns:'id,chemical_name,sds_number,department,location,revision_date,status', primaryCol:'chemical_name', secondaryCol:'sds_number', tertiaryCol:'location', statusCol:'status', dateCol:'revision_date', defaultOrder:'chemical_name', defaultDir:'asc', label:'SDS Index' },
  sds_training_records:     { columns:'id,employee_name,department,training_date,trainer_name,status,created_at', primaryCol:'employee_name', secondaryCol:'department', tertiaryCol:'trainer_name', statusCol:'status', dateCol:'training_date', defaultOrder:'training_date', defaultDir:'desc', label:'SDS Training Records' },

  // OSHA
  osha_300a_summaries:      { columns:'id,year,establishment,total_cases,days_away,restricted_days,status', primaryCol:'establishment', secondaryCol:'year', tertiaryCol:'total_cases', statusCol:'status', defaultOrder:'year', defaultDir:'desc', label:'OSHA 300A Summaries' },
  osha_301_forms:           { columns:'id,form_number,employee_name,injury_type,incident_date,status', primaryCol:'employee_name', secondaryCol:'form_number', tertiaryCol:'injury_type', statusCol:'status', dateCol:'incident_date', defaultOrder:'incident_date', defaultDir:'desc', label:'OSHA 301 Forms' },
};

// Blocklist — tables that should never be queried
const BLOCKED_TABLES = new Set(['app_secrets','user_push_tokens','backup_verification_log','notification_logs','audit_access_log']);

// ══════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════

export function useAIActions() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const createManualPost = useCreateManualTaskFeedPost();

  // ─────────────────────────────────────────────
  // insertTaskFeedPost — shared post creator
  // ─────────────────────────────────────────────

  const insertTaskFeedPost = useCallback(async ({ templateKey, templateName, formData, notes, location, departments = ALL_DEPARTMENTS, priority = 'medium', isProductionHold = false, roomLine, photoUrl }: { templateKey:string; templateName:string; formData:Record<string,unknown>; notes:string; location?:string|null; departments?:string[]; priority?:string; isProductionHold?:boolean; roomLine?:string|null; photoUrl?:string|null; }): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };
    const reportingDept = TEMPLATE_REPORTING_DEPT[templateKey] || { code:'1004', name:'Quality' };
    const resolvedLocation = location ? (ROOM_TO_LOCATION_LABEL[location] || location) : undefined;
    try {
      const result = await createManualPost.mutateAsync({ buttonType:'report_issue', title:templateName, departmentCode:reportingDept.code, assignedDepartments:departments, locationName:resolvedLocation || undefined, formData:formData as Record<string,any>, notes:`[AI] ${notes}`, productionStopped:isProductionHold, roomLine:roomLine||undefined, photoUrl:photoUrl||undefined });
      return { success:true, message:`Post ${result.postNumber} created. ${result.totalDepartments} departments notified.`, data:{ post_number:result.postNumber, post_id:result.id } };
    } catch (err:any) {
      return { success:false, message:err.message||'Failed to create task feed post' };
    }
  }, [organizationId, createManualPost]);

  // ─────────────────────────────────────────────
  // Task Feed Templates
  // ─────────────────────────────────────────────

  const createBrokenGlove = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    const locationLabel = ROOM_TO_LOCATION_LABEL[params.location as string] || params.location as string;
    const fragmentFound = (params.missing_fragment_found as string||'').toLowerCase().startsWith('yes') ? 'yes' : 'no';
    return insertTaskFeedPost({ templateKey:'broken_glove', templateName:'Broken Glove', location:params.location as string, notes:`Broken Glove at ${locationLabel}. Type: ${params.glove_type}. Fragment: ${params.missing_fragment_found}. ${params.description}`, formData:{ location:locationLabel, glove_type:(params.glove_type as string||'').toLowerCase().replace('-','_').replace(' ','_'), fragment_found:fragmentFound, description:params.description, severity:fragmentFound==='no'?'critical':'high', production_line:LINE_TO_LABEL[params.production_line as string]||'not_applicable', immediate_action:params.immediate_action_taken, productionStopped:params.production_stopped?'Yes':'No' }, priority:fragmentFound==='no'?'critical':'high', isProductionHold:params.production_stopped as boolean, roomLine:params.production_stopped?params.location as string:undefined, departments:ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  const createForeignMaterial = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'foreign_material', templateName:'Foreign Material', location:params.location as string, notes:`Foreign Material at ${params.location}. Type: ${params.material_type}. In Product: ${params.found_in_product}. ${params.description}`, formData:{ location:params.location, material_type:params.material_type, found_in_product:params.found_in_product, description:params.description, production_line:params.production_line, product_quarantined:params.product_quarantined, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:'critical', isProductionHold:params.product_quarantined as boolean, roomLine:params.product_quarantined?params.location as string:undefined, departments:ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  const createChemicalSpill = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'chemical_spill', templateName:'Chemical Spill', location:params.location as string, notes:`Chemical Spill at ${params.location}. Chemical: ${params.chemical_name}. Qty: ${params.quantity_spilled}. Product Contact: ${params.product_contact}.`, formData:{ location:params.location, chemical_name:params.chemical_name, quantity_spilled:params.quantity_spilled, product_contact:params.product_contact, immediate_action_taken:params.immediate_action_taken, area_cleared:params.area_cleared, additional_notes:params.additional_notes||'N/A' }, priority:params.product_contact==='Yes'?'critical':'high', isProductionHold:params.product_contact==='Yes', roomLine:params.product_contact==='Yes'?params.location as string:undefined, departments:ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  const createEmployeeInjury = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'employee_injury', templateName:'Employee Injury', location:params.location as string, notes:`Employee Injury at ${params.location}. Type: ${params.injury_type}. Employee: ${params.employee_name}. ${params.description}`, formData:{ location:params.location, injury_type:params.injury_type, body_part:params.body_part, employee_name:params.employee_name, description:params.description, medical_attention_required:params.medical_attention_required, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:params.medical_attention_required?'critical':'high', departments:ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  const createEquipmentBreakdown = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    const result = await insertTaskFeedPost({ templateKey:'equipment_breakdown', templateName:'Equipment Breakdown', location:params.location as string, notes:`Equipment Breakdown: ${params.equipment_name} at ${params.location}. ${params.symptom}. Impact: ${params.production_impact}.`, formData:{ location:params.location, equipment_name:params.equipment_name, symptom:params.symptom, production_impact:params.production_impact, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:params.production_impact==='Line Down'?'critical':'high', isProductionHold:params.production_impact==='Line Down', roomLine:params.production_impact==='Line Down'?params.location as string:undefined, departments:['1001','1003'] });
    if (result.success && params.create_work_order_requested) {
      await createWorkOrder({ title:`Breakdown: ${params.equipment_name}`, equipment_name:params.equipment_name, location:params.location, description:`${params.symptom}\nImmediate action: ${params.immediate_action_taken}\nTask Feed Post: ${result.data?.post_number}`, priority:params.production_impact==='Line Down'?'critical':'high', type:'reactive', _skipPost:true });
    }
    return result;
  }, [insertTaskFeedPost]);

  const createMetalDetectorReject = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'metal_detector_reject', templateName:'Metal Detector Reject', location:params.location as string, notes:`Metal Detector Reject at ${params.location}. Product: ${params.product_affected}. Qty: ${params.quantity_rejected}. Metal Found: ${params.metal_found}.`, formData:{ location:params.location, product_affected:params.product_affected, quantity_rejected:params.quantity_rejected, metal_found:params.metal_found, production_line:params.production_line, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:params.metal_found==='Yes'?'critical':'high', isProductionHold:params.metal_found==='Yes', roomLine:params.metal_found==='Yes'?params.location as string:undefined, departments:ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  const createPestSighting = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'pest_sighting', templateName:'Pest Sighting', location:params.location as string, notes:`Pest Sighting at ${params.location}. Type: ${params.pest_type}. Evidence: ${params.evidence_type}. Product Contact: ${params.product_contact}.`, formData:{ location:params.location, pest_type:params.pest_type, number_observed:params.number_observed, product_contact:params.product_contact, evidence_type:params.evidence_type, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:params.product_contact==='Yes'?'critical':'high', departments:ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  const createTemperatureDeviation = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'temperature_deviation', templateName:'Temperature Deviation', location:params.location as string, notes:`Temp Deviation at ${params.location}. Recorded: ${params.recorded_temp}. Required: ${params.required_temp}. Duration: ${params.duration}.`, formData:{ location:params.location, recorded_temp:params.recorded_temp, required_temp:params.required_temp, duration:params.duration, product_affected:params.product_affected, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:'high', departments:['1004','1001'] });
  }, [insertTaskFeedPost]);

  const createCustomerComplaint = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:'customer_complaint', templateName:'Customer Complaint', location:null, notes:`Customer Complaint. Type: ${params.complaint_type}. Product: ${params.product_name}. Lot: ${params.lot_number}. Customer: ${params.customer_name}.`, formData:{ complaint_type:params.complaint_type, product_name:params.product_name, lot_number:params.lot_number, description:params.description, customer_name:params.customer_name, immediate_action_taken:params.immediate_action_taken, additional_notes:params.additional_notes||'N/A' }, priority:'high', departments:['1004','1003'] });
  }, [insertTaskFeedPost]);

  const createGenericPost = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({ templateKey:params.post_type as string||'other', templateName:params.template_name as string||'Task Feed Post', location:params.location as string|null, notes:params.notes as string||'', formData:{ post_type:params.post_type, notes:params.notes }, priority:params.priority as string||'medium', departments:(params.departments as string[])||ALL_DEPARTMENTS });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // QUERY TASK FEED (with PM fix)
  // ─────────────────────────────────────────────

  const queryTaskFeed = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const postType = (params.post_type as string||'').toLowerCase();
      const isPMQuery = ['pm','preventive','pm_schedule','preventive_maintenance'].includes(postType);

      if (isPMQuery) {
        let q = supabase.from('work_orders').select('id,work_order_number,title,status,priority,type,equipment,location,due_date,assigned_name,created_at').eq('organization_id',organizationId).eq('type','preventive').order('due_date',{ascending:true}).limit(20);
        if (params.status && params.status !== 'all') q = q.eq('status', params.status as string);
        if (params.date_range === 'today') { const t = new Date().toISOString().split('T')[0]; q = q.gte('due_date',t).lte('due_date',t); }
        else if (params.date_range === 'this_week') { const t = new Date().toISOString().split('T')[0]; const nw = new Date(Date.now()+7*86400000).toISOString().split('T')[0]; q = q.gte('due_date',t).lte('due_date',nw); }
        const { data:pms, error } = await q;
        if (error) throw error;
        return { success:true, message:`Found ${pms?.length||0} preventive maintenance work order${pms?.length!==1?'s':''}${params.status&&params.status!=='all'?` (${params.status})`:''}`, data:{ results:pms||[], total:pms?.length||0, resultType:'work_orders' } };
      }

      let q = supabase.from('task_feed_department_tasks').select(`id,post_number,department_code,department_name,status,priority,module_reference_type,created_at,task_feed_posts(template_name,location_name,notes,created_by_name)`).eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(20);
      if (params.department_code) q = q.eq('department_code', params.department_code as string);
      if (params.status && params.status !== 'all') q = q.eq('status', params.status as string);
      if (postType && !isPMQuery) q = q.ilike('module_reference_type', `%${postType}%`);
      if (params.date_range === 'today') { const t = new Date().toISOString().split('T')[0]; q = q.gte('created_at',`${t}T00:00:00`); }
      else if (params.date_range === 'this_week') q = q.gte('created_at', new Date(Date.now()-7*86400000).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return { success:true, message:`Found ${data?.length||0} task${data?.length!==1?'s':''} — ${params.department_code?DEPARTMENT_NAMES[params.department_code as string]||params.department_code:'All departments'}, status: ${params.status||'all'}.`, data:{ results:data||[], total:data?.length||0, resultType:'tasks' } };
    } catch (err:any) {
      return { success:false, message:err.message||'Task feed query failed' };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // QUERY RECORDS — universal table search
  // ─────────────────────────────────────────────

  const queryRecords = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };

    const tableName = params.table as string;

    // Security: block sensitive tables
    if (BLOCKED_TABLES.has(tableName)) {
      return { success:false, message:`Access to ${tableName} is restricted.` };
    }

    const config = TABLE_CONFIG[tableName];
    if (!config) {
      return { success:false, message:`Unknown table: ${tableName}. Please ask about a specific module.` };
    }

    try {
      const limit = Math.min((params.limit as number)||25, 50);
      const orderBy = (params.order_by as string) || config.defaultOrder;
      const orderDir = (params.order_direction as string) || config.defaultDir;

      let query = supabase
        .from(tableName)
        .select(config.columns)
        .eq('organization_id', organizationId)
        .order(orderBy, { ascending: orderDir === 'asc' })
        .limit(limit);

      // Apply exact-match filters
      const filters = (params.filters as Record<string,any>) || {};
      for (const [col, val] of Object.entries(filters)) {
        if (val !== null && val !== undefined && val !== '') {
          query = query.eq(col, val);
        }
      }

      // Apply text search
      if (params.search_column && params.search_term) {
        query = query.ilike(params.search_column as string, `%${params.search_term}%`);
      }

      // Apply date range filter
      if (params.date_range && params.date_range !== 'all') {
        const dateCol = (params.date_filter_column as string) || config.dateCol || 'created_at';
        const now = new Date();
        let from: string | null = null;
        if (params.date_range === 'today') {
          from = now.toISOString().split('T')[0] + 'T00:00:00';
          query = query.gte(dateCol, from);
        } else if (params.date_range === 'this_week') {
          from = new Date(now.getTime() - 7*86400000).toISOString();
          query = query.gte(dateCol, from);
        } else if (params.date_range === 'this_month') {
          from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          query = query.gte(dateCol, from);
        } else if (params.date_range === 'this_year') {
          from = new Date(now.getFullYear(), 0, 1).toISOString();
          query = query.gte(dateCol, from);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const count = data?.length || 0;
      const label = config.label;

      // Build a helpful summary using the primaryCol of first result
      let summary = `Found ${count} ${label} record${count!==1?'s':''}`;
      const activeFilters = Object.entries(filters).map(([k,v]) => `${k}: ${v}`).join(', ');
      if (activeFilters) summary += ` (${activeFilters})`;
      if (params.search_term) summary += ` matching "${params.search_term}"`;
      summary += '.';

      return {
        success: true,
        message: summary,
        data: {
          results: data || [],
          total: count,
          resultType: 'generic',
          tableConfig: config,
          tableName,
          tableLabel: label,
        },
      };
    } catch (err:any) {
      console.error('[AIActions] queryRecords error:', err);
      return { success:false, message:err.message||`Failed to query ${tableName}` };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // START PRE-OP
  // ─────────────────────────────────────────────

  const startPreOp = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    const room = (params.room as string)||'PA1';
    const roomName = ROOM_NAMES[room]||room;
    const postNumber = generatePostNumber();
    try {
      const { data:post, error:postError } = await supabase.from('task_feed_posts').insert({ organization_id:organizationId, post_number:postNumber, template_id:null, template_name:`Pre-Op: ${roomName}`, created_by_id:user?.id||null, created_by_name:user?`${user.first_name} ${user.last_name}`.trim():'AI Assistant', location_name:roomName, form_data:{ source:'ai_assist', template_key:'pre_op', type:'pre_op', room, room_name:roomName, initiated_by:user?`${user.first_name} ${user.last_name}`.trim():'AI Assistant', initiated_at:new Date().toISOString(), checklist_items:getPreOpChecklist(room) }, notes:`[AI] Pre-Op inspection initiated for ${roomName}`, status:'pending', total_departments:5, completed_departments:0, completion_rate:0, is_production_hold:false, reporting_department:'1004', reporting_department_name:'Quality' }).select('id').single();
      if (postError) throw postError;
      await supabase.from('task_feed_department_tasks').insert(ALL_DEPARTMENTS.map(deptCode => ({ organization_id:organizationId, post_id:post.id, post_number:postNumber, department_code:deptCode, department_name:DEPARTMENT_NAMES[deptCode]||`Dept ${deptCode}`, status:'pending', module_reference_type:'pre_op', is_original:true, priority:'high' })));
      ['task_feed','task_feed_posts','task_feed_department_tasks','taskFeed','taskFeedPosts'].forEach(k => queryClient.invalidateQueries({ queryKey:[k] }));
      return { success:true, message:`Pre-Op started for ${roomName}. 5 departments notified. Post ${postNumber}.`, data:{ post_number:postNumber, post_id:post.id, room } };
    } catch (err:any) {
      return { success:false, message:err.message||'Failed to start Pre-Op' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // CREATE WORK ORDER (FIX 1: _skipPost flag)
  // ─────────────────────────────────────────────

  const createWorkOrder = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const woType = (params.type as string)||'reactive';
      const woNumber = generateWONumber(woType==='preventive'?'PM':'RE');
      const equipmentValue = (params.equipment_name as string)?.trim()||'N/A';
      const locationValue = (params.location as string) ? (ROOM_TO_LOCATION_LABEL[params.location as string]||(params.location as string)) : null;
      const { data:wo, error:woError } = await supabase.from('work_orders').insert({ organization_id:organizationId, work_order_number:woNumber, title:(params.title as string)||'AI Generated Work Order', description:(params.description as string)||'', status:'open', priority:(params.priority as string)||'medium', type:woType, source:'ai_assist', source_id:(params.source_post_id as string)||null, equipment_id:(params.equipment_id as string)||null, equipment:equipmentValue, location:locationValue, assigned_to:null, assigned_name:null, due_date:new Date().toISOString().split('T')[0], department:'1001', department_name:'Maintenance' }).select('id,work_order_number').single();
      if (woError) throw woError;

      if (!params._skipPost) {
        const postNumber = generatePostNumber();
        const { data:post, error:postError } = await supabase.from('task_feed_posts').insert({ organization_id:organizationId, post_number:postNumber, template_name:`WO: ${params.title||'Work Order'}`, created_by_id:user?.id||null, created_by_name:user?`${user.first_name} ${user.last_name}`.trim():'AI Assistant', location_name:locationValue||equipmentValue||null, form_data:{ source:'ai_assist', template_key:'work_order', work_order_id:wo.id, work_order_number:wo.work_order_number }, notes:`[AI] Work Order ${woNumber} — ${params.title||''}\n${params.description||''}`, status:'pending', total_departments:1, completed_departments:0, completion_rate:0, is_production_hold:false, reporting_department:'1001', reporting_department_name:'Maintenance' }).select('id').single();
        if (!postError && post) {
          await supabase.from('task_feed_department_tasks').insert({ organization_id:organizationId, post_id:post.id, post_number:postNumber, department_code:'1001', department_name:'Maintenance', status:'pending', module_reference_type:'work_order', module_reference_id:wo.id, is_original:true, priority:(params.priority as string)||'medium' });
        }
      }

      ['work_orders','task_feed','task_feed_posts','task_feed_department_tasks','taskFeed','taskFeedPosts'].forEach(k => queryClient.invalidateQueries({ queryKey:[k] }));
      return { success:true, message:`Work Order ${woNumber} created. Equipment: ${equipmentValue}. Location: ${locationValue||'not set'}.`, data:{ work_order_number:woNumber, work_order_id:wo.id, resultType:'work_orders', results:[{ work_order_number:woNumber, title:params.title, status:'open', priority:params.priority||'medium', equipment:equipmentValue, location:locationValue }] } };
    } catch (err:any) {
      return { success:false, message:err.message||'Failed to create work order' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // LOOKUP PART
  // ─────────────────────────────────────────────

  const lookupPart = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const rawQuery = (params.query as string)||'';
      const singular = rawQuery.replace(/ies$/i,'y').replace(/ses$/i,'s').replace(/s$/i,'');
      const { data:parts, error } = await supabase.from('materials').select('id,name,material_number,sku,on_hand,min_level,location,bin,aisle,rack,shelf,unit_price,vendor,vendor_part_number,manufacturer,manufacturer_part_number,status,category,description').eq('organization_id',organizationId).or(`name.ilike.%${rawQuery}%,name.ilike.%${singular}%,description.ilike.%${rawQuery}%,material_number.ilike.%${rawQuery}%,sku.ilike.%${rawQuery}%,vendor_part_number.ilike.%${rawQuery}%,manufacturer_part_number.ilike.%${rawQuery}%`).limit(10);
      if (error) throw error;
      if (!parts||parts.length===0) return { success:true, message:`No parts found matching "${rawQuery}".`, data:{ results:[], total:0, resultType:'parts' } };
      const results = parts.map(p => ({ id:p.id, name:p.name, material_number:p.material_number, sku:p.sku, in_stock:p.on_hand, location:[p.location,p.aisle,p.rack,p.shelf,p.bin].filter(Boolean).join(' › ')||'No location set', unit_price:p.unit_price, min_level:p.min_level, low_stock:(p.on_hand||0)<=(p.min_level||0), vendor:p.vendor, vendor_part:p.vendor_part_number, manufacturer:p.manufacturer, mfg_part:p.manufacturer_part_number, category:p.category }));
      const top = results[0];
      return { success:true, message:`Found ${results.length} result${results.length!==1?'s':''} for "${rawQuery}". Top: ${top.name} — ${top.in_stock>0?`${top.in_stock} in stock at ${top.location}`:'OUT OF STOCK'}${top.low_stock?' ⚠️ LOW STOCK':''}.`, data:{ results, total:results.length, resultType:'parts' } };
    } catch (err:any) {
      return { success:false, message:err.message||'Part lookup failed' };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // LOOKUP EQUIPMENT
  // ─────────────────────────────────────────────

  const lookupEquipment = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const query = (params.query as string)||'';
      const { data:equipment, error } = await supabase.from('equipment').select('id,name,equipment_tag,location,status,manufacturer,model,serial_number').eq('organization_id',organizationId).or(`name.ilike.%${query}%,equipment_tag.ilike.%${query}%,model.ilike.%${query}%`).limit(5);
      if (error) throw error;
      if (!equipment||equipment.length===0) return { success:true, message:`No equipment found matching "${query}".`, data:{ results:[], resultType:'equipment' } };
      const top = equipment[0];
      return { success:true, message:`Found ${equipment.length} result${equipment.length!==1?'s':''}. Top: ${top.name} (${top.equipment_tag||'N/A'}) — ${top.manufacturer||''} ${top.model||''} — Status: ${top.status||'active'} — Location: ${top.location||'N/A'}`, data:{ results:equipment, total:equipment.length, resultType:'equipment' } };
    } catch (err:any) {
      return { success:false, message:err.message||'Equipment lookup failed' };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // DIAGNOSE ISSUE
  // ─────────────────────────────────────────────

  const diagnoseIssue = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (params.create_work_order) {
      return createWorkOrder({ title:`Diagnosis: ${params.symptom||'Equipment Issue'}`, description:`AI Diagnosis\nEquipment: ${params.equipment}\nSymptom: ${params.symptom}`, equipment_name:params.equipment as string, priority:'medium', type:'reactive' });
    }
    return { success:true, message:'Diagnosis complete.', data:{ equipment:params.equipment, symptom:params.symptom } };
  }, [createWorkOrder]);

  // ─────────────────────────────────────────────
  // PRODUCTION
  // ─────────────────────────────────────────────

  const changeRoomStatus = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const room = (params.room as string)||'PA1';
      const status = (params.status as string)||'idle';
      const roomName = ROOM_NAMES[room]||room;
      const statusColors: Record<string,string> = { running:'green',loto:'red',cleaning:'yellow',setup:'blue',idle:'gray',down:'red' };
      const { error } = await supabase.from('room_status').upsert({ organization_id:organizationId, room_code:room, room_name:roomName, status, andon_color:statusColors[status]||'gray', updated_at:new Date().toISOString(), updated_by:user?`${user.first_name} ${user.last_name}`.trim():'AI Assistant' },{ onConflict:'organization_id,room_code' });
      if (error) console.warn('[AIActions] Room status:', error.message);
      queryClient.invalidateQueries({ queryKey:['room_status'] });
      return { success:true, message:`${roomName} → ${status}. Andon: ${statusColors[status]||'gray'}.`, data:{ room, status, color:statusColors[status] } };
    } catch (err:any) {
      return { success:false, message:err.message||'Failed to change room status' };
    }
  }, [organizationId, user, queryClient]);

  const startProductionRun = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const room = (params.room as string)||'PA1';
      const roomName = ROOM_NAMES[room]||room;
      const runNumber = (params.run_number as string)||`RUN-${Date.now()}`;
      const { data:run, error } = await supabase.from('production_runs').insert({ organization_id:organizationId, run_number:runNumber, room, room_name:roomName, product:(params.product as string)||'', status:'running', started_at:new Date().toISOString(), started_by:user?`${user.first_name} ${user.last_name}`.trim():'AI Assistant', bag_count:0 }).select('id,run_number').single();
      if (error) throw error;
      await changeRoomStatus({ room, status:'running' });
      queryClient.invalidateQueries({ queryKey:['production_runs'] });
      return { success:true, message:`Run ${runNumber} started in ${roomName}. Room set to Running.`, data:{ run_id:run.id, run_number:runNumber, room } };
    } catch (err:any) {
      return { success:false, message:err.message||'Failed to start production run' };
    }
  }, [organizationId, user, queryClient, changeRoomStatus]);

  const endProductionRun = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success:false, message:'No organization selected' };
    try {
      const room = (params.room as string)||'PA1';
      let q = supabase.from('production_runs').select('id,run_number,bag_count,started_at').eq('organization_id',organizationId).eq('status','running');
      if (params.run_number) q = q.eq('run_number', params.run_number as string);
      else q = q.eq('room', room);
      const { data:run, error:findErr } = await q.limit(1).single();
      if (findErr||!run) return { success:false, message:'No active run found.' };
      await supabase.from('production_runs').update({ status:'completed', ended_at:new Date().toISOString(), ended_by:user?`${user.first_name} ${user.last_name}`.trim():'AI Assistant' }).eq('id',run.id);
      await changeRoomStatus({ room, status:'idle' });
      queryClient.invalidateQueries({ queryKey:['production_runs'] });
      const duration = Math.round((Date.now()-new Date(run.started_at).getTime())/60000);
      return { success:true, message:`Run ${run.run_number} completed. ${duration} min. ${run.bag_count||0} bags.`, data:{ run_number:run.run_number, duration_minutes:duration, bag_count:run.bag_count } };
    } catch (err:any) {
      return { success:false, message:err.message||'Failed to end production run' };
    }
  }, [organizationId, user, queryClient, changeRoomStatus]);

  // ─────────────────────────────────────────────
  // NAVIGATE (FIX 2: modal closes first in AIAssistButton)
  // ─────────────────────────────────────────────

  const navigate = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    const screen = params.screen as string;
    const recordId = params.record_id as string|undefined;
    const ROUTE_MAP: Record<string,string> = { task_feed:'/(tabs)/task-feed', work_orders:'/(tabs)/work-orders', equipment:'/(tabs)/equipment', parts_inventory:'/(tabs)/parts', pm_schedule:'/(tabs)/pm-schedule', purchase_requests:'/(tabs)/purchase-requests', sds_library:'/(tabs)/sds', audits:'/(tabs)/audits', emergency_protocol:'/(tabs)/emergency', employee_directory:'/(tabs)/employees', production_runs:'/(tabs)/production', room_status:'/(tabs)/room-status', dashboard:'/(tabs)/dashboard', reports:'/(tabs)/reports', settings:'/(tabs)/settings', sanitation:'/(tabs)/sanitation', quality:'/(tabs)/quality', safety:'/(tabs)/safety', compliance:'/(tabs)/compliance' };
    const route = ROUTE_MAP[screen];
    if (!route) return { success:false, message:`Unknown screen: ${screen}` };
    try {
      router.push((recordId?`${route}/${recordId}`:route) as any);
      return { success:true, message:`Opening ${screen.replace(/_/g,' ')}.`, navigate:route };
    } catch (err:any) {
      return { success:false, message:`Navigation failed: ${err.message}` };
    }
  }, [router]);

  // ══════════════════════════════════════════════════════════════════
  // MAIN EXECUTOR
  // ══════════════════════════════════════════════════════════════════

  const executeAction = useCallback(async (toolName: string, params: AIActionParams): Promise<ActionResult> => {
    console.log('[AIActions] Tool:', toolName, JSON.stringify(params).substring(0,200));

    switch (toolName) {
      case 'create_task_feed_post_broken_glove':          return createBrokenGlove(params);
      case 'create_task_feed_post_foreign_material':      return createForeignMaterial(params);
      case 'create_task_feed_post_chemical_spill':        return createChemicalSpill(params);
      case 'create_task_feed_post_employee_injury':       return createEmployeeInjury(params);
      case 'create_task_feed_post_equipment_breakdown':   return createEquipmentBreakdown(params);
      case 'create_task_feed_post_metal_detector_reject': return createMetalDetectorReject(params);
      case 'create_task_feed_post_pest_sighting':         return createPestSighting(params);
      case 'create_task_feed_post_temperature_deviation': return createTemperatureDeviation(params);
      case 'create_task_feed_post_customer_complaint':    return createCustomerComplaint(params);
      case 'create_task_feed_post_generic':
      case 'create_task_feed_post':                       return createGenericPost(params);
      case 'query_task_feed':                             return queryTaskFeed(params);
      case 'query_records':                               return queryRecords(params);
      case 'start_pre_op':                                return startPreOp(params);
      case 'create_work_order':                           return createWorkOrder(params);
      case 'lookup_part':                                 return lookupPart(params);
      case 'lookup_equipment':                            return lookupEquipment(params);
      case 'diagnose_issue':                              return diagnoseIssue(params);
      case 'start_production_run':                        return startProductionRun(params);
      case 'end_production_run':                          return endProductionRun(params);
      case 'change_room_status':                          return changeRoomStatus(params);
      case 'navigate':                                    return navigate(params);
      case 'ask_clarification':
      case 'clarify':                                     return { success:true, message:'Waiting for clarification.' };
      case 'general_response':
      case 'info':                                        return { success:true, message:'Information provided.' };

      case 'lookup_work_orders': {
        const { data:wos, error } = await supabase.from('work_orders').select('id,work_order_number,title,status,priority,type,equipment,location,due_date,assigned_name,created_at').eq('organization_id',organizationId).in('status',['open','in_progress']).order('created_at',{ascending:false}).limit(10);
        if (error||!wos?.length) return { success:true, message:'No open work orders found.', data:{ results:[], resultType:'work_orders' } };
        return { success:true, message:`${wos.length} open work order${wos.length!==1?'s':''}. Most recent: ${wos[0].work_order_number} — ${wos[0].title}.`, data:{ results:wos, resultType:'work_orders' } };
      }

      default:
        console.warn('[AIActions] Unknown tool:', toolName);
        return { success:false, message:`Unknown action: ${toolName}` };
    }
  }, [organizationId, createBrokenGlove, createForeignMaterial, createChemicalSpill, createEmployeeInjury, createEquipmentBreakdown, createMetalDetectorReject, createPestSighting, createTemperatureDeviation, createCustomerComplaint, createGenericPost, queryTaskFeed, queryRecords, startPreOp, createWorkOrder, lookupPart, lookupEquipment, diagnoseIssue, startProductionRun, endProductionRun, changeRoomStatus, navigate]);

  return { executeAction };
}

function getPreOpChecklist(room: string) {
  if (room === 'PA1') {
    return [
      {number:1,department:'1004',department_name:'Quality',item:'Magnet inspection — clean and intact',status:null},
      {number:2,department:'1004',department_name:'Quality',item:'Hopper and forming tube — no residue from previous product',status:null},
      {number:3,department:'1004',department_name:'Quality',item:'Film roll — correct product, lot number matches production schedule',status:null},
      {number:4,department:'1004',department_name:'Quality',item:'Keyence printer — date code and lot number correct',status:null},
      {number:5,department:'1004',department_name:'Quality',item:'First 5 bags — seal integrity, fill weight, print quality',status:null},
      {number:6,department:'1002',department_name:'Sanitation',item:'Room floor, walls, drains — clean, no standing water',status:null},
      {number:7,department:'1002',department_name:'Sanitation',item:'Conveyor belts — clean, no product residue',status:null},
      {number:8,department:'1002',department_name:'Sanitation',item:'Avatar contact surfaces — forming tube, jaws, product chute',status:null},
      {number:9,department:'1002',department_name:'Sanitation',item:'Boxing station — clean table, no previous product labels/packaging',status:null},
      {number:10,department:'1001',department_name:'Maintenance',item:'Air pressure — main supply at 70 PSI minimum',status:null},
      {number:11,department:'1001',department_name:'Maintenance',item:'Pull belts — tension correct, no glazing or cracking',status:null},
      {number:12,department:'1001',department_name:'Maintenance',item:'Sealing jaws — heating to set temp, Teflon tape intact',status:null},
      {number:13,department:'1001',department_name:'Maintenance',item:'E-stop and safety interlocks — functional',status:null},
      {number:14,department:'1005',department_name:'Safety',item:'LOTO devices removed — all locks cleared from previous shift',status:null},
      {number:15,department:'1005',department_name:'Safety',item:'Guards and covers — all in place, properly secured',status:null},
      {number:16,department:'1005',department_name:'Safety',item:'PPE available — gloves, hearing protection, safety glasses',status:null},
      {number:17,department:'1003',department_name:'Production',item:'Supersack staged — correct product, lot number verified',status:null},
      {number:18,department:'1003',department_name:'Production',item:'Cases and packaging materials staged',status:null},
      {number:19,department:'1003',department_name:'Production',item:'HMI recipe loaded — correct product routine selected',status:null},
      {number:20,department:'1003',department_name:'Production',item:'Bag counter reset to zero',status:null},
    ];
  }
  return [
    {number:1,department:'1004',department_name:'Quality',item:'Room and equipment clean',status:null},
    {number:2,department:'1002',department_name:'Sanitation',item:'Floors, walls, drains clean',status:null},
    {number:3,department:'1001',department_name:'Maintenance',item:'Equipment operational',status:null},
    {number:4,department:'1005',department_name:'Safety',item:'Guards in place, PPE available',status:null},
    {number:5,department:'1003',department_name:'Production',item:'Materials staged',status:null},
  ];
}
