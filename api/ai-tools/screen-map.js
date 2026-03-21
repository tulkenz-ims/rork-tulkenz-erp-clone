// api/ai-tools/screen-map.js
// Maps screen names and intent to exact file paths in the repo

const SCREEN_MAP = {
  // ── Dashboard ──
  dashboard: 'app/(tabs)/index.tsx',

  // ── Task Feed ──
  task_feed: 'app/(tabs)/taskfeed/index.tsx',

  // ── CMMS / Maintenance ──
  cmms: 'app/(tabs)/cmms/index.tsx',
  work_orders: 'app/(tabs)/cmms/workorders.tsx',
  new_work_order: 'app/(tabs)/cmms/newworkorder.tsx',
  equipment: 'app/(tabs)/cmms/equipment.tsx',
  pm_schedule: 'app/(tabs)/cmms/pmschedule.tsx',
  loto: 'app/(tabs)/cmms/loto.tsx',
  downtime: 'app/(tabs)/cmms/downtime.tsx',
  cmms_kpi: 'app/(tabs)/cmms/kpi.tsx',

  // ── Inventory ──
  inventory: 'app/(tabs)/inventory/index.tsx',
  parts_inventory: 'app/(tabs)/inventory/parts.tsx',
  low_stock: 'app/(tabs)/inventory/lowstock.tsx',
  cycle_count: 'app/(tabs)/inventory/cyclecount.tsx',
  replenishment: 'app/(tabs)/inventory/replenishment.tsx',

  // ── Procurement ──
  procurement: 'app/(tabs)/procurement/index.tsx',
  purchase_orders: 'app/(tabs)/procurement/purchaseorders.tsx',
  purchase_requests: 'app/(tabs)/procurement/purchaserequests.tsx',
  vendors: 'app/(tabs)/procurement/vendors.tsx',
  receiving: 'app/(tabs)/procurement/receiving.tsx',

  // ── Production ──
  production: 'app/(tabs)/production/index.tsx',
  production_runs: 'app/(tabs)/production/runs.tsx',
  room_status: 'app/(tabs)/production/roomstatus.tsx',

  // ── Quality ──
  quality: 'app/(tabs)/quality/index.tsx',
  ncr: 'app/(tabs)/quality/ncr.tsx',
  capa: 'app/(tabs)/quality/capa.tsx',
  deviations: 'app/(tabs)/quality/deviations.tsx',
  complaints: 'app/(tabs)/quality/complaints.tsx',
  metal_detector: 'app/(tabs)/quality/metaldetector.tsx',
  pre_op: 'app/(tabs)/quality/preop.tsx',
  temp_log: 'app/(tabs)/quality/templog.tsx',

  // ── Safety ──
  safety: 'app/(tabs)/safety/index.tsx',
  safety_observations: 'app/(tabs)/safety/observations.tsx',
  incident_report: 'app/(tabs)/safety/incident.tsx',
  first_aid: 'app/(tabs)/safety/firstaid.tsx',
  osha_300: 'app/(tabs)/safety/osha300.tsx',
  emergency: 'app/(tabs)/headcount/index.tsx',
  loto_program: 'app/(tabs)/safety/lotoprogram.tsx',
  chemical_hub: 'app/(tabs)/safety/chemicalhub.tsx',

  // ── Sanitation ──
  sanitation: 'app/(tabs)/sanitation/index.tsx',
  sanitation_chemicals: 'app/(tabs)/sanitation/chemicals.tsx',
  master_sanitation: 'app/(tabs)/sanitation/master.tsx',
  daily_sanitation: 'app/(tabs)/sanitation/daily.tsx',

  // ── Compliance ──
  compliance: 'app/(tabs)/compliance/index.tsx',
  compliance_layout: 'app/(tabs)/compliance/_layout.tsx',
  audits: 'app/(tabs)/compliance/auditsessions.tsx',
  formbuilder: 'app/(tabs)/compliance/formbuilder.tsx',

  // ── Training ──
  training: 'app/(tabs)/compliance/training/index.tsx',
  training_templates: 'app/(tabs)/compliance/training/template-library.tsx',
  training_builder: 'app/(tabs)/compliance/training/template-builder.tsx',
  training_sessions: 'app/(tabs)/compliance/training/session-tracker.tsx',
  training_certifications: 'app/(tabs)/compliance/training/certifications.tsx',
  training_departments: 'app/(tabs)/compliance/training/department-requirements.tsx',

  // ── Documents ──
  documents: 'app/(tabs)/documents/index.tsx',
  sds_library: 'app/(tabs)/documents/sds.tsx',

  // ── HR ──
  hr: 'app/(tabs)/hr/index.tsx',
  employee_directory: 'app/(tabs)/hr/employees.tsx',
  time_clock: 'app/(tabs)/hr/timeclock.tsx',
  attendance: 'app/(tabs)/hr/attendance.tsx',
  time_adjustments: 'app/(tabs)/hr/timeadjustments.tsx',
  break_violations: 'app/(tabs)/hr/breakviolations.tsx',
  time_editor: 'app/(tabs)/hr/timeeditor.tsx',
  employee_self_service: 'app/(tabs)/hr/selfservice.tsx',

  // ── Finance ──
  finance: 'app/(tabs)/finance/index.tsx',
  budgets: 'app/(tabs)/finance/budgets.tsx',

  // ── Planner ──
  planner: 'app/(tabs)/planner/index.tsx',

  // ── Recycling ──
  recycling: 'app/(tabs)/recycling/index.tsx',

  // ── Portal / Employee Dashboard ──
  portal: 'app/(tabs)/portal/index.tsx',

  // ── Settings ──
  settings: 'app/(tabs)/settings/index.tsx',

  // ── Approvals ──
  approvals: 'app/(tabs)/approvals/index.tsx',

  // ── Hooks ──
  hook_timeclock: 'hooks/useSupabaseTimeClock.ts',
  hook_training: 'hooks/useTraining.ts',
  hook_sanitation: 'hooks/useSanitationModule.ts',
  hook_hygiene: 'hooks/useRoomHygieneLog.ts',
  hook_pm: 'hooks/useSupabasePMSchedules.ts',
  hook_workorders: 'hooks/useSupabaseWorkOrders.ts',
  hook_employees: 'hooks/useSupabaseEmployees.ts',
  hook_inventory: 'hooks/useSupabaseInventory.ts',

  // ── API / Cron ──
  api_ai_assist: 'api/ai-assist.js',
  api_timeclock_cleanup: 'api/cron/timeclock-cleanup.js',
  api_training_due: 'api/cron/training-due.js',
  api_pm_due: 'api/cron/pm-due.js',
  api_sanitation_due: 'api/cron/sanitation-due.js',

  // ── Layout ──
  root_layout: 'app/_layout.tsx',
  tabs_layout: 'app/(tabs)/_layout.tsx',
};

// Fuzzy match — find the best file path for a natural language description
function resolveScreenPath(input) {
  if (!input) return null;
  const lower = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // Direct key match
  if (SCREEN_MAP[lower]) return { key: lower, path: SCREEN_MAP[lower] };
  if (SCREEN_MAP[lower.replace(/\s+/g, '_')]) {
    const key = lower.replace(/\s+/g, '_');
    return { key, path: SCREEN_MAP[key] };
  }

  // Partial match — find all keys that contain the input words
  const words = lower.split(/\s+/);
  const candidates = Object.entries(SCREEN_MAP).filter(([key]) =>
    words.every(w => key.includes(w)) || words.some(w => key.includes(w))
  );

  if (candidates.length === 1) return { key: candidates[0][0], path: candidates[0][1] };
  if (candidates.length > 1) {
    // Prefer exact word matches
    const best = candidates.find(([key]) => words.every(w => key.includes(w)));
    if (best) return { key: best[0], path: best[1] };
    return { key: candidates[0][0], path: candidates[0][1] };
  }

  return null;
}

// Return all screen keys and paths as a flat list
function listAllScreens() {
  return Object.entries(SCREEN_MAP).map(([key, path]) => ({ key, path }));
}

module.exports = { SCREEN_MAP, resolveScreenPath, listAllScreens };
