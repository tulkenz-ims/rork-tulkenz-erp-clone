/**
 * RealtimeProvider - Full app-wide Supabase Realtime subscriptions
 * 
 * Subscribes to ALL tables so every device gets live updates.
 * Tables are grouped into ~12 module channels to stay within Supabase limits.
 * 
 * PREREQUISITE: Run enable-realtime.sql in Supabase SQL Editor first.
 */

import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Full table → query key prefix mapping (auto-generated from codebase) ──
const TABLE_QUERY_KEYS: Record<string, string[]> = {
  accident_investigations: ['accident-investigations', 'first-aid-entries', 'osha-300-entries', 'osha-301-forms'],
  actions_taken: ['actions_taken', 'failure_codes', 'failure_records', 'root_causes'],
  adjustment_reasons: ['adjustment-reasons', 'inventory-adjustments', 'variance-records'],
  air_quality_monitoring: ['air_quality_monitoring', 'ergonomic_assessments', 'noise_monitoring'],
  alert_preferences: ['alert-preferences', 'alert-preferences-global'],
  applications: ['recruiting'],
  approval_tiers: ['approval_tiers', 'tier_configurations', 'tier_stats'],
  assembly_headcount_entries: ['assembly_headcount_entries', 'fire_drill_entries', 'evacuation_drill_entries'],
  assets: ['assets'],
  attendance_exceptions: ['attendance-exceptions', 'attendance-points-balance', 'attendance-records'],
  attendance_points_balance: ['all-attendance-points-balances', 'attendance-points-balance'],
  attendance_points_history: ['attendance-points-history', 'attendance-points-balance'],
  attendance_records: ['attendance-records', 'employee-daily-attendance', 'labor-metrics'],
  audit_findings: ['audit_findings', 'compliance_audits', 'compliance_requirements'],
  blanket_po_releases: ['blanket_po_releases', 'blanket_purchase_orders', 'procurement_purchase_orders'],
  blanket_purchase_orders: ['blanket_purchase_orders', 'procurement_purchase_orders'],
  break_settings: ['break-settings', 'default-break-settings'],
  break_violations: ['break-violations', 'break-history'],
  bulletin_posts: ['bulletin', 'portal'],
  candidate_notes: ['recruiting'],
  candidates: ['recruiting'],
  capa_records: ['capa_records', 'quality_inspections', 'ncr_records'],
  ccp_monitoring_logs: ['ccp_monitoring_logs'],
  certifications: ['certifications', 'compliance_audits'],
  charge_transactions: ['charge_transactions'],
  cmms_cost_reports: ['cmms'],
  cmms_hazard_assessments: ['cmms'],
  cmms_labor_costs: ['cmms'],
  cmms_loto_executions: ['cmms'],
  cmms_loto_procedures: ['cmms'],
  cmms_maintenance_budgets: ['cmms'],
  cmms_parts_costs: ['cmms'],
  cmms_parts_issues: ['cmms'],
  cmms_parts_requests: ['cmms'],
  cmms_parts_returns: ['cmms'],
  cmms_ppe_assignments: ['cmms'],
  cmms_ppe_requirements: ['cmms'],
  cmms_reorder_points: ['cmms'],
  cmms_safety_permits: ['cmms'],
  cmms_stock_levels: ['cmms'],
  cmms_vendor_contracts: ['cmms'],
  cmms_vendors: ['cmms'],
  cmms_warranty_tracking: ['cmms'],
  compliance_audits: ['compliance_audits', 'compliance_calendar', 'compliance_requirements'],
  compliance_calendar: ['compliance_calendar', 'compliance_audits'],
  compliance_requirements: ['compliance_requirements', 'compliance_audits'],
  contractor_insurance: ['contractor_insurance', 'contractor_prequals'],
  contractor_orientations: ['contractor_orientations', 'contractor_prequals'],
  contractor_prequals: ['contractor_prequals'],
  contractor_sign_ins: ['contractor_sign_ins'],
  contractor_work_auths: ['contractor_work_auths'],
  count_sessions: ['count_sessions', 'materials'],
  cross_department_docs: ['cross_department_docs', 'quality_tasks'],
  customer_complaints: ['customer_complaints', 'quality_inspections', 'capa_records'],
  daily_room_hygiene_reports: ['daily_room_hygiene_reports', 'room_hygiene_log'],
  delegation_rules: ['delegation_rules', 'workflow_instances', 'workflow_templates'],
  department_budgets: ['budgets', 'finance_stats', 'gl_accounts'],
  departments: ['departments', 'department'],
  deviation_records: ['deviation_records', 'quality_inspections', 'capa_records'],
  document_acknowledgments: ['document_acknowledgments', 'documents'],
  document_categories: ['document_categories', 'documents'],
  document_versions: ['document_versions', 'documents'],
  documents: ['documents', 'document_versions'],
  downtime_events: ['downtime_events', 'work_orders'],
  drop_ship_orders: ['drop_ship_orders', 'procurement_purchase_orders'],
  drug_alcohol_tests: ['drug_alcohol_tests', 'workers_comp_claims'],
  emergency_action_plan_entries: ['emergency_action_plan_entries', 'fire_drill_entries'],
  emergency_contacts: ['emergency_contacts'],
  emergency_events: ['emergency_events'],
  employee_goals: ['performance'],
  employee_roles: ['employee-roles', 'roles'],
  employees: ['employees', 'employee', 'all-employees-clock-status', 'users'],
  equipment: ['equipment', 'failure_records', 'reliability_stats'],
  equipment_downtime_log: ['equipment_downtime_log', 'work_orders', 'maintenance_alerts'],
  ergonomic_assessments: ['ergonomic_assessments', 'workstation_evaluations'],
  evacuation_drill_entries: ['evacuation_drill_entries', 'fire_drill_entries', 'emergency_events'],
  facilities: ['facilities', 'facility'],
  failure_codes: ['failure_codes', 'failure_records'],
  failure_records: ['failure_records', 'failure_codes', 'reliability_stats'],
  feedback_360: ['performance'],
  fire_drill_entries: ['fire_drill_entries', 'evacuation_drill_entries', 'emergency_events'],
  fire_suppression_impairments: ['fire_suppression_impairments'],
  first_aid_log: ['first-aid-entries', 'osha-300-entries'],
  footwear_types: ['footwear-types', 'safety-footwear-records'],
  form_signatures: ['form_signatures'],
  geofence_configs: ['geofence-configs'],
  gl_accounts: ['gl_accounts', 'finance_stats'],
  heat_stress_monitoring: ['heat_stress_monitoring'],
  hold_tags: ['hold_tags'],
  inspection_records: ['inspection_records', 'inspection_schedules', 'tracked_items'],
  inspection_schedules: ['inspection_schedules', 'inspection_records'],
  inspection_templates: ['inspection_templates', 'inspection_records'],
  interviews: ['recruiting'],
  inventory_adjustments: ['inventory-adjustments', 'inventory-audit-trail'],
  inventory_audit_trail: ['inventory-audit-trail', 'inventory-adjustments'],
  inventory_history: ['inventory_history', 'materials'],
  inventory_lots: ['inventory_lots', 'lot_transactions'],
  inventory_reserves: ['inventory-reserves', 'inventory-adjustments'],
  job_offers: ['recruiting'],
  job_requisitions: ['recruiting'],
  labor_costs: ['labor_entries'],
  locations: ['locations', 'location'],
  lot_transactions: ['lot_transactions', 'inventory_lots'],
  low_stock_alerts: ['low-stock-alerts'],
  maintenance_activity_log: ['maintenance_activity_log', 'work_orders', 'maintenance_alerts'],
  maintenance_alerts: ['maintenance_alerts', 'work_orders'],
  material_receipts: ['material_receipts', 'procurement_purchase_orders'],
  materials: ['materials', 'material', 'inventory_history'],
  medical_restrictions: ['medical_restrictions', 'workers_comp_claims'],
  metal_detector_logs: ['metal_detector_logs'],
  ncr_records: ['ncr_records', 'quality_inspections', 'capa_records'],
  noise_monitoring: ['noise_monitoring'],
  notifications: ['notifications', 'notifications_count'],
  offboardings: ['offboardings', 'offboarding'],
  onboarding_templates: ['onboarding-templates', 'onboardings'],
  onboardings: ['onboardings', 'onboarding'],
  osha_300_log: ['osha-300-entries'],
  osha_300a_summaries: ['osha_300a_summaries'],
  osha_301_forms: ['osha-301-forms'],
  overtime_requests: ['overtime-requests', 'overtime-requests-pending'],
  part_requests: ['part-requests', 'work_orders', 'work_order_parts'],
  parts_usage: ['parts_usage'],
  peer_safety_audits: ['peer_safety_audits', 'safety_observations'],
  performance_reviews: ['performance'],
  planner_projects: ['planner_projects', 'planner_tasks', 'planner_stats'],
  planner_task_comments: ['planner_task_comments', 'planner_tasks'],
  planner_task_time_entries: ['planner_task_time_entries', 'planner_tasks'],
  planner_tasks: ['planner_tasks', 'planner_projects', 'planner_stats'],
  pm_schedules: ['pm_schedules', 'pm_work_orders', 'work_orders'],
  po_approvals: ['po_approvals', 'procurement_purchase_orders', 'procurement_stats'],
  po_revisions: ['po_revisions', 'procurement_purchase_orders'],
  po_templates: ['po_templates', 'procurement_purchase_orders'],
  portal_announcement_acknowledgments: ['portal'],
  portal_announcement_views: ['portal'],
  portal_announcements: ['portal'],
  position_assignments: ['position-assignments', 'positions'],
  positions: ['positions', 'position-assignments'],
  pre_op_inspections: ['pre_op_inspections'],
  procurement_purchase_orders: ['procurement_purchase_orders', 'procurement_stats'],
  procurement_vendors: ['procurement_vendors', 'procurement_stats'],
  production_hold_log: ['task_feed_posts', 'task_verifications'],
  production_line_checks: ['production_line_checks'],
  production_rooms: ['production-rooms', 'active-room-sessions'],
  production_runs: ['production_runs'],
  property_damage_reports: ['property-damage-reports'],
  psm_compliance_records: ['psm_compliance_records'],
  purchase_requests: ['purchase_requests', 'procurement_stats', 'procurement_purchase_orders'],
  purchase_requisitions: ['purchase_requisitions', 'procurement_stats'],
  quality_inspections: ['quality_inspections', 'capa_records'],
  quality_task_schedules: ['quality_task_schedules', 'quality_tasks'],
  quality_tasks: ['quality_tasks', 'quality_task_schedules'],
  recycling_aerosol: ['recycling'],
  recycling_batteries: ['recycling'],
  recycling_bulbs: ['recycling'],
  recycling_cardboard: ['recycling'],
  recycling_files: ['recycling'],
  recycling_grease: ['recycling'],
  recycling_metal: ['recycling'],
  recycling_oil: ['recycling'],
  recycling_paper: ['recycling'],
  recycling_solvent: ['recycling'],
  recycling_toner: ['recycling'],
  reorder_point_settings: ['reorder-point-settings', 'replenishment-suggestions'],
  repetitive_motion_assessments: ['repetitive_motion_assessments'],
  replenishment_suggestions: ['replenishment-suggestions', 'weekly-replenishment-plans'],
  respirator_fit_tests: ['respirator-fit-tests'],
  respirator_types: ['respirator-types'],
  return_to_work_forms: ['return_to_work_forms', 'workers_comp_claims'],
  roles: ['roles', 'employee-roles'],
  room_hygiene_log: ['room_hygiene_log', 'daily_room_hygiene_reports'],
  room_sessions: ['active-room-sessions', 'room-session-history', 'room-time-summary'],
  root_cause_analyses: ['root-cause-analyses'],
  root_causes: ['root_causes', 'failure_records'],
  safety_certifications: ['safety_certifications', 'safety_trainings'],
  safety_chemical_records: ['safety_chemical_records'],
  safety_committee_meetings: ['safety_committee_meetings', 'safety_observations'],
  safety_emergency_records: ['safety_emergency_records'],
  safety_footwear_allowances: ['safety-footwear-allowances', 'safety-footwear-records'],
  safety_footwear_records: ['safety-footwear-records'],
  safety_incidents: ['safety_incidents'],
  safety_inspections: ['safety_inspections'],
  safety_observations: ['safety_observations', 'safety_recognitions'],
  safety_permits: ['safety_permits'],
  safety_ppe_records: ['safety_ppe_records'],
  safety_program_document_versions: ['safety_program_documents'],
  safety_program_documents: ['safety_program_documents'],
  safety_recognitions: ['safety_recognitions'],
  safety_suggestions: ['safety_suggestions'],
  safety_trainings: ['safety_trainings', 'safety_certifications'],
  sanitation_inspections: ['sanitation_inspections', 'sanitation_tasks'],
  sanitation_schedules: ['sanitation_schedules', 'sanitation_tasks'],
  sanitation_supplies: ['sanitation_supplies'],
  sanitation_tasks: ['sanitation_tasks', 'sanitation_schedules'],
  schedules: ['schedules', 'schedule', 'shift-assignments'],
  'sds-documents': ['sds_records'],
  sds_records: ['sds_records', 'sds_training_records'],
  sds_training_records: ['sds_training_records'],
  service_entry_sheets: ['service_entry_sheets', 'service_purchase_orders'],
  service_purchase_orders: ['service_purchase_orders'],
  service_requests: ['service_requests', 'work_orders', 'maintenance_alerts'],
  service_requisitions: ['service_requisitions'],
  severe_weather_drill_entries: ['severe_weather_drill_entries', 'fire_drill_entries'],
  shift_assignments: ['shift-assignments', 'schedules'],
  shift_swap_requests: ['shift-swap-requests'],
  shift_swaps: ['shift-swaps', 'pending-shift-swaps'],
  shift_templates: ['shift-templates', 'schedules'],
  shifts: ['shifts', 'shift', 'upcoming-shifts', 'today-shifts'],
  succession_plans: ['performance'],
  swab_tests: ['swab_tests', 'quality_tasks'],
  talent_profiles: ['performance'],
  'task-feed-photos': ['task_feed_posts', 'task_feed_post_detail'],
  task_categories: ['task_categories', 'task_verifications'],
  task_feed_department_tasks: ['task_feed_department_tasks', 'task_feed_department_tasks_for_post', 'task_feed_posts_with_tasks'],
  task_feed_form_links: ['task_feed_form_links', 'task_feed_post_detail', 'task_feed_issue_posts'],
  task_feed_posts: ['task_feed_posts', 'task_feed_posts_with_tasks', 'task_feed_post_detail', 'task_feed_post_by_number'],
  task_feed_templates: ['task_feed_templates', 'task_feed_template'],
  task_verifications: ['task_verifications', 'task_verification_stats', 'task_feed_posts'],
  temperature_logs: ['temperature_logs'],
  tier_configurations: ['tier_configurations', 'approval_tiers'],
  time_adjustment_requests: ['time-adjustment-requests', 'time-entries'],
  time_audit_logs: ['time-audit-logs'],
  time_entries: ['time-entries', 'active-time-entry', 'week-time-entries', 'all-employees-clock-status'],
  time_off_requests: ['time-off-requests', 'pending-time-off-requests'],
  time_punches: ['time-punches', 'active-time-entry', 'all-employees-clock-status', 'today-clock-activity'],
  tracked_item_changes: ['tracked_item_changes', 'tracked_items'],
  tracked_items: ['tracked_items', 'inspection_records'],
  user_push_tokens: ['notifications'],
  variance_records: ['variance-records', 'inventory-adjustments'],
  vehicle_incidents: ['vehicle-incidents'],
  vendor_documents: ['vendor_documents', 'procurement_vendors'],
  vendor_onboarding: ['vendor_onboarding'],
  vendor_ratings: ['vendor_ratings', 'procurement_vendors'],
  vendors: ['gl_accounts', 'finance_stats'],
  visitor_safety: ['visitor_safety', 'contractor_sign_ins'],
  weekly_replenishment_plans: ['weekly-replenishment-plans', 'replenishment-suggestions'],
  witness_statements: ['witness-statements'],
  'work-order-attachments': ['work_orders', 'work_order_parts'],
  work_order_chemicals: ['work_order_chemicals'],
  work_orders: ['work_orders', 'work_order_parts', 'work_order_parts_summary', 'pm_schedules'],
  workers_comp_claims: ['workers_comp_claims'],
  workflow_instances: ['workflow_instances', 'workflow_stats', 'workflow_steps'],
  workflow_step_history: ['workflow_step_history', 'workflow_instances'],
  workflow_steps: ['workflow_steps', 'workflow_instances'],
  workflow_templates: ['workflow_templates', 'workflow_instances'],
  workstation_evaluations: ['workstation_evaluations', 'ergonomic_assessments'],
};

// ── Group tables into module channels (~25 tables each) ──
const CHANNEL_GROUPS: Record<string, string[]> = {
  'emergency-safety': [
    'emergency_events', 'fire_drill_entries', 'evacuation_drill_entries',
    'severe_weather_drill_entries', 'emergency_action_plan_entries', 'emergency_contacts',
    'assembly_headcount_entries', 'safety_incidents', 'safety_inspections',
    'safety_permits', 'safety_trainings', 'safety_certifications',
    'safety_chemical_records', 'safety_emergency_records', 'safety_ppe_records',
    'safety_observations', 'safety_recognitions', 'safety_suggestions',
    'safety_committee_meetings', 'peer_safety_audits', 'safety_footwear_records',
    'safety_footwear_allowances', 'safety_program_documents', 'safety_program_document_versions',
  ],
  'task-feed': [
    'task_feed_posts', 'task_feed_department_tasks', 'task_feed_form_links',
    'task_feed_templates', 'task-feed-photos', 'task_verifications',
    'task_categories', 'form_signatures', 'production_hold_log',
    'room_hygiene_log', 'daily_room_hygiene_reports',
  ],
  'work-orders-maintenance': [
    'work_orders', 'work-order-attachments', 'work_order_chemicals',
    'pm_schedules', 'maintenance_alerts', 'maintenance_activity_log',
    'equipment_downtime_log', 'service_requests', 'part_requests',
    'parts_usage', 'equipment', 'failure_codes',
    'failure_records', 'root_causes', 'actions_taken',
    'root_cause_analyses',
  ],
  'cmms': [
    'cmms_cost_reports', 'cmms_hazard_assessments', 'cmms_labor_costs',
    'cmms_loto_executions', 'cmms_loto_procedures', 'cmms_maintenance_budgets',
    'cmms_parts_costs', 'cmms_parts_issues', 'cmms_parts_requests',
    'cmms_parts_returns', 'cmms_ppe_assignments', 'cmms_ppe_requirements',
    'cmms_reorder_points', 'cmms_safety_permits', 'cmms_stock_levels',
    'cmms_vendor_contracts', 'cmms_vendors', 'cmms_warranty_tracking',
  ],
  'time-scheduling': [
    'time_entries', 'time_punches', 'time_adjustment_requests',
    'time_audit_logs', 'time_off_requests', 'break_settings',
    'break_violations', 'room_sessions', 'production_rooms',
    'geofence_configs', 'shifts', 'shift_assignments',
    'shift_templates', 'shift_swaps', 'shift_swap_requests',
    'schedules', 'overtime_requests',
  ],
  'inventory-materials': [
    'materials', 'inventory_history', 'inventory_adjustments',
    'inventory_audit_trail', 'inventory_reserves', 'inventory_lots',
    'lot_transactions', 'low_stock_alerts', 'count_sessions',
    'adjustment_reasons', 'variance_records', 'assets',
    'reorder_point_settings', 'replenishment_suggestions',
    'weekly_replenishment_plans', 'tracked_items', 'tracked_item_changes',
    'hold_tags', 'charge_transactions',
  ],
  'procurement': [
    'procurement_purchase_orders', 'procurement_vendors', 'purchase_requests',
    'purchase_requisitions', 'po_approvals', 'po_revisions',
    'po_templates', 'material_receipts', 'blanket_purchase_orders',
    'blanket_po_releases', 'drop_ship_orders', 'vendor_documents',
    'vendor_ratings', 'vendor_onboarding', 'service_purchase_orders',
    'service_entry_sheets', 'service_requisitions',
  ],
  'quality-compliance': [
    'quality_inspections', 'quality_tasks', 'quality_task_schedules',
    'capa_records', 'ncr_records', 'deviation_records',
    'customer_complaints', 'swab_tests', 'cross_department_docs',
    'compliance_audits', 'compliance_requirements', 'compliance_calendar',
    'audit_findings', 'certifications', 'inspection_records',
    'inspection_schedules', 'inspection_templates',
    'ccp_monitoring_logs', 'metal_detector_logs', 'pre_op_inspections',
    'production_line_checks', 'temperature_logs',
  ],
  'hr-employees': [
    'employees', 'employee_roles', 'roles',
    'positions', 'position_assignments', 'onboardings',
    'onboarding_templates', 'offboardings', 'performance_reviews',
    'employee_goals', 'feedback_360', 'succession_plans',
    'talent_profiles', 'attendance_records', 'attendance_exceptions',
    'attendance_points_balance', 'attendance_points_history',
    'candidates', 'candidate_notes', 'applications',
    'interviews', 'job_requisitions', 'job_offers',
  ],
  'production-sanitation': [
    'production_runs', 'downtime_events', 'sanitation_tasks',
    'sanitation_schedules', 'sanitation_inspections', 'sanitation_supplies',
  ],
  'documents-notifications': [
    'documents', 'document_versions', 'document_categories',
    'document_acknowledgments', 'notifications', 'user_push_tokens',
    'bulletin_posts', 'portal_announcements', 'portal_announcement_views',
    'portal_announcement_acknowledgments', 'alert_preferences',
    'sds_records', 'sds_training_records', 'sds-documents',
  ],
  'finance-settings': [
    'departments', 'locations', 'facilities',
    'department_budgets', 'gl_accounts', 'vendors',
    'labor_costs', 'approval_tiers', 'tier_configurations',
    'delegation_rules', 'workflow_templates', 'workflow_instances',
    'workflow_steps', 'workflow_step_history',
  ],
  'safety-health': [
    'drug_alcohol_tests', 'medical_restrictions', 'return_to_work_forms',
    'workers_comp_claims', 'osha_300_log', 'osha_300a_summaries',
    'osha_301_forms', 'accident_investigations', 'first_aid_log',
    'property_damage_reports', 'vehicle_incidents', 'witness_statements',
    'fire_suppression_impairments', 'psm_compliance_records',
    'contractor_insurance', 'contractor_orientations', 'contractor_prequals',
    'contractor_sign_ins', 'contractor_work_auths', 'visitor_safety',
    'respirator_fit_tests', 'respirator_types', 'footwear_types',
    'air_quality_monitoring', 'noise_monitoring', 'heat_stress_monitoring',
    'ergonomic_assessments', 'repetitive_motion_assessments', 'workstation_evaluations',
  ],
  'recycling-planner': [
    'recycling_aerosol', 'recycling_batteries', 'recycling_bulbs',
    'recycling_cardboard', 'recycling_files', 'recycling_grease',
    'recycling_metal', 'recycling_oil', 'recycling_paper',
    'recycling_solvent', 'recycling_toner',
    'planner_projects', 'planner_tasks', 'planner_task_comments',
    'planner_task_time_entries',
  ],
};

// ── Context ──

interface RealtimeContextValue {
  activeSubscriptions: number;
  isConnected: boolean;
  channelCount: number;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  activeSubscriptions: 0,
  isConnected: false,
  channelCount: 0,
});

export const useRealtimeStatus = () => useContext(RealtimeContext);

interface RealtimeProviderProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function RealtimeProvider({ children, disabled = false }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const totalChannels = Object.keys(CHANNEL_GROUPS).length;

  useEffect(() => {
    if (disabled) return;

    // Clean up existing
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];
    let connectedCount = 0;

    const handleChange = (table: string) => {
      console.log(`[Realtime] 📡 Change detected on: ${table}`);
      // Debounce per table
      if (debounceTimers.current[table]) {
        clearTimeout(debounceTimers.current[table]);
      }
      debounceTimers.current[table] = setTimeout(() => {
        const queryKeys = TABLE_QUERY_KEYS[table];
        if (queryKeys) {
          console.log(`[Realtime] 🔄 Invalidating ${queryKeys.length} queries for ${table}:`, queryKeys);
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      }, 300);
    };

    const channels: RealtimeChannel[] = [];

    for (const [groupName, tables] of Object.entries(CHANNEL_GROUPS)) {
      let channel = supabase.channel(`app-rt-${groupName}`);

      for (const table of tables) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => handleChange(table)
        );
      }

      channel.subscribe((status, err) => {
        console.log(`[Realtime] Channel ${groupName}: ${status}`, err ? `Error: ${err.message}` : '');
        if (status === 'SUBSCRIBED') {
          connectedCount++;
          setActiveCount(connectedCount);
          if (connectedCount === totalChannels) {
            setIsConnected(true);
            console.log(`[Realtime] ✅ All ${totalChannels} channels connected (${Object.values(CHANNEL_GROUPS).flat().length} tables)`);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] ❌ Channel ${groupName} failed`);
        }
      });

      channels.push(channel);
    }

    channelsRef.current = channels;
    console.log(`[Realtime] 🔌 Subscribing to ${totalChannels} channels...`);

    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
      channels.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
      setActiveCount(0);
      setIsConnected(false);
    };
  }, [disabled, queryClient]);

  return (
    <RealtimeContext.Provider value={{ activeSubscriptions: activeCount, isConnected, channelCount: totalChannels }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export default RealtimeProvider;
