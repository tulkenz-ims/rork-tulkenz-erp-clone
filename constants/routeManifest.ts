// constants/routeManifest.ts
// AI Assistant Route Manifest — lists every screen and its Expo Router path
// Update this file whenever you add a new screen
// The AI assistant uses this to know what routes exist and how to navigate

export interface RouteEntry {
  path: string;           // Exact Expo Router path
  screen: string;         // AI navigate tool screen name
  label: string;          // Human-readable name
  aliases: string[];      // Words/phrases that map to this screen
  description: string;    // What this screen does
  module: string;         // Which module/section it belongs to
}

export const ROUTE_MANIFEST: RouteEntry[] = [
  // ── Dashboard ────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/dashboard',
    screen: 'dashboard',
    label: 'Executive Dashboard',
    aliases: ['dashboard', 'home', 'overview', 'main screen', 'summary'],
    description: 'Executive KPI dashboard with line status, metrics, budget cards, and compliance countdown',
    module: 'Dashboard',
  },

  // ── Task Feed ─────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/task-feed',
    screen: 'task_feed',
    label: 'Task Feed',
    aliases: ['task feed', 'tasks', 'feed', 'posts', 'incidents', 'reports'],
    description: 'Cross-department task feed for reporting incidents, issues, and creating tasks',
    module: 'Task Feed',
  },

  // ── Work Orders ───────────────────────────────────────────────────────────
  {
    path: '/(tabs)/work-orders',
    screen: 'work_orders',
    label: 'Work Orders',
    aliases: ['work orders', 'work order', 'maintenance orders', 'WO', 'repairs'],
    description: 'Maintenance work order management — create, assign, and track repair jobs',
    module: 'Maintenance',
  },

  // ── Equipment ─────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/equipment',
    screen: 'equipment',
    label: 'Equipment',
    aliases: ['equipment', 'machines', 'assets', 'machinery', 'equipment list'],
    description: 'Equipment registry with specs, maintenance history, and LOTO procedures',
    module: 'Maintenance',
  },

  // ── PM Schedule ───────────────────────────────────────────────────────────
  {
    path: '/(tabs)/pm-schedule',
    screen: 'pm_schedule',
    label: 'PM Schedule',
    aliases: ['pm schedule', 'preventive maintenance', 'PMs', 'scheduled maintenance', 'pm'],
    description: 'Preventive maintenance scheduling and tracking',
    module: 'Maintenance',
  },

  // ── Inventory / Item Records ───────────────────────────────────────────────
  {
    path: '/(tabs)/inventory/materials',
    screen: 'parts_inventory',
    label: 'Item Records',
    aliases: ['item records', 'materials', 'parts', 'inventory', 'items', 'spare parts', 'stock', 'item records'],
    description: 'Master inventory / Item Records — all parts, materials, and supplies with on-hand quantities',
    module: 'Inventory',
  },

  // ── Purchase Requests ─────────────────────────────────────────────────────
  {
    path: '/(tabs)/purchase-requests',
    screen: 'purchase_requests',
    label: 'Purchase Requests',
    aliases: ['purchase requests', 'purchase request', 'PR', 'buying', 'procurement', 'order requests'],
    description: 'Submit and track purchase requests for parts, supplies, and equipment',
    module: 'Procurement',
  },

  // ── SDS Library ───────────────────────────────────────────────────────────
  {
    path: '/(tabs)/sds',
    screen: 'sds_library',
    label: 'SDS Library',
    aliases: ['SDS', 'safety data sheets', 'chemical safety', 'MSDS', 'chemical library', 'sds library'],
    description: 'Safety Data Sheet library for all chemicals used in the facility',
    module: 'Safety',
  },

  // ── Audits ────────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/audits',
    screen: 'audits',
    label: 'Audits',
    aliases: ['audits', 'audit', 'inspections', 'compliance audits', 'food safety audit'],
    description: 'Audit management across SQF, FSMA, OSHA, and other frameworks',
    module: 'Compliance',
  },

  // ── Emergency Protocol ────────────────────────────────────────────────────
  {
    path: '/(tabs)/emergency',
    screen: 'emergency_protocol',
    label: 'Emergency Protocol',
    aliases: ['emergency', 'emergency protocol', 'emergency plan', 'evacuation', 'emergency response'],
    description: 'Emergency action plans, contacts, roll calls, and drills',
    module: 'Safety',
  },

  // ── Employees ─────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/employees',
    screen: 'employee_directory',
    label: 'Employee Directory',
    aliases: ['employees', 'employee directory', 'staff', 'workers', 'team', 'personnel', 'directory'],
    description: 'Employee directory with contact info, roles, departments, and HR records',
    module: 'HR',
  },

  // ── Production ────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/production',
    screen: 'production_runs',
    label: 'Production Runs',
    aliases: ['production', 'production runs', 'runs', 'production log', 'batch', 'line runs'],
    description: 'Production run management — start, monitor, and close production runs',
    module: 'Production',
  },

  // ── Room Status ───────────────────────────────────────────────────────────
  {
    path: '/(tabs)/room-status',
    screen: 'room_status',
    label: 'Room Status',
    aliases: ['room status', 'rooms', 'line status', 'room dashboard', 'PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'],
    description: 'Real-time room and production line status — running, down, cleaning, LOTO, idle',
    module: 'Production',
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/reports',
    screen: 'reports',
    label: 'Reports',
    aliases: ['reports', 'report', 'analytics', 'data reports'],
    description: 'Facility reports and analytics across all modules',
    module: 'Reporting',
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/settings',
    screen: 'settings',
    label: 'Settings',
    aliases: ['settings', 'configuration', 'config', 'preferences', 'admin'],
    description: 'App configuration, user preferences, and admin settings',
    module: 'Settings',
  },

  // ── Sanitation ────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/sanitation',
    screen: 'sanitation',
    label: 'Sanitation',
    aliases: ['sanitation', 'cleaning', 'hygiene', 'sanitation log', 'daily hygiene'],
    description: 'Sanitation logs, daily hygiene reports, and chemical inventory',
    module: 'Sanitation',
  },

  // ── Quality ───────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/quality',
    screen: 'quality',
    label: 'Quality',
    aliases: ['quality', 'QA', 'quality control', 'QC', 'inspections', 'NCR', 'CAPA', 'deviations'],
    description: 'Quality inspections, NCRs, CAPAs, deviations, and compliance monitoring',
    module: 'Quality',
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/safety',
    screen: 'safety',
    label: 'Safety',
    aliases: ['safety', 'safety observations', 'accidents', 'OSHA', 'incidents', 'safety log'],
    description: 'Safety observations, accident investigations, OSHA logs, and safety programs',
    module: 'Safety',
  },

  // ── Compliance ────────────────────────────────────────────────────────────
  {
    path: '/(tabs)/compliance',
    screen: 'compliance',
    label: 'Compliance',
    aliases: ['compliance', 'regulatory', 'documents', 'SQF', 'FSMA', 'food safety'],
    description: 'Regulatory compliance documents, forms, and audit framework management',
    module: 'Compliance',
  },
];

// Quick lookup: screen name → full RouteEntry
export const ROUTE_BY_SCREEN: Record<string, RouteEntry> =
  Object.fromEntries(ROUTE_MANIFEST.map(r => [r.screen, r]));

// Quick lookup: Expo path → full RouteEntry
export const ROUTE_BY_PATH: Record<string, RouteEntry> =
  Object.fromEntries(ROUTE_MANIFEST.map(r => [r.path, r]));

// Compact string for injecting into AI system prompts
export function getRouteManifestForAI(): string {
  const lines = ['AVAILABLE SCREENS (screen_name → path | description):'];
  for (const r of ROUTE_MANIFEST) {
    lines.push(`  ${r.screen} → ${r.path} | aliases: ${r.aliases.slice(0,4).join(', ')} | ${r.description}`);
  }
  return lines.join('\n');
}
