// constants/routeManifest.ts
// Single source of truth for every screen route in TulKenz OPS
// AI assistant uses this — update when adding new screens

export interface RouteEntry {
  path: string;
  screen: string;
  label: string;
  aliases: string[];
  description: string;
  module: string;
}

export const ROUTE_MANIFEST: RouteEntry[] = [

  // ── Dashboard ─────────────────────────────────────────────────────────────
  { path:'/(tabs)/(dashboard)', screen:'dashboard', label:'Dashboard', aliases:['dashboard','home','overview','main','kpi'], description:'Executive KPI dashboard with line status, metrics, and compliance countdown', module:'Dashboard' },

  // ── Task Feed ─────────────────────────────────────────────────────────────
  { path:'/(tabs)/taskfeed', screen:'task_feed', label:'Task Feed', aliases:['task feed','taskfeed','tasks','feed','posts','incidents','reports'], description:'Cross-department task feed for reporting incidents, issues, and creating tasks', module:'Task Feed' },

  // ── CMMS / Maintenance ────────────────────────────────────────────────────
  { path:'/(tabs)/cmms', screen:'cmms', label:'CMMS', aliases:['cmms','maintenance','maintenance hub'], description:'CMMS maintenance hub', module:'Maintenance' },
  { path:'/(tabs)/cmms/workorders', screen:'work_orders', label:'Work Orders', aliases:['work orders','work order','WO','repairs','corrective maintenance'], description:'Maintenance work order management', module:'Maintenance' },
  { path:'/(tabs)/cmms/newworkorder', screen:'new_work_order', label:'New Work Order', aliases:['new work order','create work order','add work order'], description:'Create a new work order', module:'Maintenance' },
  { path:'/(tabs)/cmms/equipmentlist', screen:'equipment', label:'Equipment List', aliases:['equipment','machines','assets','machinery','equipment list'], description:'Equipment registry', module:'Maintenance' },
  { path:'/(tabs)/cmms/pmschedule', screen:'pm_schedule', label:'PM Schedule', aliases:['pm schedule','preventive maintenance','PMs','scheduled maintenance','pm'], description:'Preventive maintenance scheduling', module:'Maintenance' },
  { path:'/(tabs)/cmms/partslist', screen:'parts_list', label:'Parts List', aliases:['parts list','cmms parts','spare parts list'], description:'Parts list in CMMS', module:'Maintenance' },
  { path:'/(tabs)/cmms/downtime', screen:'downtime', label:'Downtime', aliases:['downtime','equipment downtime','downtime log'], description:'Equipment downtime tracking', module:'Maintenance' },
  { path:'/(tabs)/cmms/lotoprocedures', screen:'loto', label:'LOTO Procedures', aliases:['loto','lockout tagout','loto procedures'], description:'Lockout/tagout procedures', module:'Maintenance' },
  { path:'/(tabs)/cmms/kpidashboard', screen:'cmms_kpi', label:'CMMS KPI Dashboard', aliases:['cmms kpi','maintenance kpi','maintenance dashboard'], description:'Maintenance KPI and metrics dashboard', module:'Maintenance' },
  { path:'/(tabs)/cmms/vendorlist', screen:'cmms_vendors', label:'Vendor List', aliases:['vendors','vendor list','supplier list'], description:'Vendor and supplier management', module:'Maintenance' },

  // ── Inventory ─────────────────────────────────────────────────────────────
  { path:'/(tabs)/inventory', screen:'inventory', label:'Inventory', aliases:['inventory','inventory hub','stock hub'], description:'Inventory management hub', module:'Inventory' },
  { path:'/(tabs)/inventory/itemrecords', screen:'parts_inventory', label:'Item Records', aliases:['item records','materials','parts','items','spare parts','stock','inventory items'], description:'Master Item Records — all parts and materials with on-hand quantities', module:'Inventory' },
  { path:'/(tabs)/inventory/onhand', screen:'on_hand', label:'On Hand', aliases:['on hand','on hand inventory','current stock'], description:'Current on-hand inventory quantities', module:'Inventory' },
  { path:'/(tabs)/inventory/lowstockalerts', screen:'low_stock', label:'Low Stock Alerts', aliases:['low stock','low stock alerts','reorder alerts'], description:'Items below minimum stock levels', module:'Inventory' },
  { path:'/(tabs)/inventory/cyclecounting', screen:'cycle_count', label:'Cycle Counting', aliases:['cycle count','cycle counting','inventory count'], description:'Cycle counting and physical inventory sessions', module:'Inventory' },
  { path:'/(tabs)/inventory/lottracking', screen:'lot_tracking', label:'Lot Tracking', aliases:['lot tracking','lot numbers','traceability'], description:'Lot and batch tracking for traceability', module:'Inventory' },
  { path:'/(tabs)/inventory/replenishment', screen:'replenishment', label:'Replenishment', aliases:['replenishment','reorder','weekly replenishment'], description:'Inventory replenishment management', module:'Inventory' },
  { path:'/(tabs)/inventory/transfers', screen:'transfers', label:'Transfers', aliases:['transfers','inventory transfers','stock transfers'], description:'Inventory transfers between locations', module:'Inventory' },

  // ── Procurement ───────────────────────────────────────────────────────────
  { path:'/(tabs)/procurement', screen:'procurement', label:'Procurement', aliases:['procurement','purchasing hub'], description:'Procurement and purchasing hub', module:'Procurement' },
  { path:'/(tabs)/procurement/purchaseorders', screen:'purchase_orders', label:'Purchase Orders', aliases:['purchase orders','POs','purchase order list'], description:'Purchase order management', module:'Procurement' },
  { path:'/(tabs)/procurement/requests', screen:'purchase_requests', label:'Purchase Requests', aliases:['purchase requests','purchase request','requisitions','PR'], description:'Purchase request submission and tracking', module:'Procurement' },
  { path:'/(tabs)/procurement/vendors', screen:'vendors', label:'Vendors', aliases:['vendors','vendor master','supplier master'], description:'Vendor master list', module:'Procurement' },
  { path:'/(tabs)/procurement/receive', screen:'receiving', label:'Receiving', aliases:['receiving','PO receiving','receive parts'], description:'Receive items against purchase orders', module:'Procurement' },
  { path:'/(tabs)/procurement/poapprovals', screen:'po_approvals', label:'PO Approvals', aliases:['PO approvals','approve PO','purchase order approvals'], description:'Purchase order approval queue', module:'Procurement' },

  // ── Production ────────────────────────────────────────────────────────────
  { path:'/(tabs)/production', screen:'production', label:'Production', aliases:['production','production hub'], description:'Production management hub', module:'Production' },
  { path:'/(tabs)/production/productionruns', screen:'production_runs', label:'Production Runs', aliases:['production runs','runs','batch records','line runs'], description:'Production run management — start, monitor, and close runs', module:'Production' },
  { path:'/(tabs)/production/room-dashboard', screen:'room_status', label:'Room Dashboard', aliases:['room status','room dashboard','rooms','line status','PR1','PR2','PA1','PA2','BB1','SB1'], description:'Real-time room and production line status', module:'Production' },
  { path:'/(tabs)/production/materials', screen:'production_materials', label:'Production Materials', aliases:['production materials','raw materials','ingredients'], description:'Materials used in production', module:'Production' },

  // ── Quality ───────────────────────────────────────────────────────────────
  { path:'/(tabs)/quality', screen:'quality', label:'Quality', aliases:['quality','QA','quality hub','QC'], description:'Quality management hub', module:'Quality' },
  { path:'/(tabs)/quality/ncr', screen:'ncr', label:'NCRs', aliases:['NCR','nonconformance','non-conformance records'], description:'Non-conformance records', module:'Quality' },
  { path:'/(tabs)/quality/capa', screen:'capa', label:'CAPA', aliases:['CAPA','corrective action','preventive action'], description:'Corrective and preventive actions', module:'Quality' },
  { path:'/(tabs)/quality/deviation', screen:'deviations', label:'Deviations', aliases:['deviations','deviation records'], description:'Production and process deviations', module:'Quality' },
  { path:'/(tabs)/quality/customercomplaint', screen:'complaints', label:'Customer Complaints', aliases:['customer complaints','complaints','consumer complaints'], description:'Customer complaint tracking', module:'Quality' },
  { path:'/(tabs)/quality/metaldetectorlog', screen:'metal_detector', label:'Metal Detector Log', aliases:['metal detector','MD log','metal detector log'], description:'Metal detector monitoring logs', module:'Quality' },
  { path:'/(tabs)/quality/preopinspection', screen:'pre_op', label:'Pre-Op Inspection', aliases:['pre-op','pre op','pre-op inspection','pre-start'], description:'Pre-operational inspection records', module:'Quality' },
  { path:'/(tabs)/quality/temperaturelog', screen:'temp_log', label:'Temperature Log', aliases:['temperature log','temp log','temperature monitoring'], description:'Temperature monitoring and CCP logs', module:'Quality' },

  // ── Safety ────────────────────────────────────────────────────────────────
  { path:'/(tabs)/safety', screen:'safety', label:'Safety', aliases:['safety','safety hub','EHS'], description:'Safety management hub', module:'Safety' },
  { path:'/(tabs)/safety/safetyobservation', screen:'safety_observations', label:'Safety Observations', aliases:['safety observations','safety obs','safety report'], description:'Safety observation reporting', module:'Safety' },
  { path:'/(tabs)/safety/incidentreport', screen:'incident_report', label:'Incident Report', aliases:['incident','accident','incident report'], description:'Incident and accident reporting', module:'Safety' },
  { path:'/(tabs)/safety/firstaidlog', screen:'first_aid', label:'First Aid Log', aliases:['first aid','first aid log'], description:'First aid incident log', module:'Safety' },
  { path:'/(tabs)/safety/osha300', screen:'osha_300', label:'OSHA 300 Log', aliases:['OSHA 300','OSHA log','recordable injuries'], description:'OSHA 300 injury and illness log', module:'Safety' },
  { path:'/(tabs)/safety/emergencyhub', screen:'emergency', label:'Emergency Hub', aliases:['emergency','emergency hub','emergency protocol','emergency contacts'], description:'Emergency response hub — contacts, action plans, drills', module:'Safety' },
  { path:'/(tabs)/safety/lotoprogram', screen:'loto_program', label:'LOTO Program', aliases:['loto program','lockout tagout program'], description:'LOTO safety program management', module:'Safety' },
  { path:'/(tabs)/safety/chemicalhub', screen:'chemical_hub', label:'Chemical Hub', aliases:['chemical hub','chemicals','chemical management'], description:'Chemical safety and inventory hub', module:'Safety' },

  // ── Sanitation ────────────────────────────────────────────────────────────
  { path:'/(tabs)/sanitation', screen:'sanitation', label:'Sanitation', aliases:['sanitation','cleaning','hygiene','sanitation hub'], description:'Sanitation management hub', module:'Sanitation' },
  { path:'/(tabs)/sanitation/chemicals', screen:'sanitation_chemicals', label:'Sanitation Chemicals', aliases:['sanitation chemicals','cleaning chemicals','chemical inventory'], description:'Sanitation chemical inventory and management', module:'Sanitation' },
  { path:'/(tabs)/sanitation/mss', screen:'master_sanitation', label:'Master Sanitation Schedule', aliases:['MSS','master sanitation schedule','master sanitation'], description:'Master sanitation schedule', module:'Sanitation' },
  { path:'/(tabs)/sanitation/dailytasks', screen:'daily_sanitation', label:'Daily Sanitation Tasks', aliases:['daily sanitation','daily cleaning tasks'], description:'Daily sanitation task assignments', module:'Sanitation' },

  // ── Compliance ────────────────────────────────────────────────────────────
  { path:'/(tabs)/compliance', screen:'compliance', label:'Compliance', aliases:['compliance','regulatory','compliance hub'], description:'Regulatory compliance management hub', module:'Compliance' },
  { path:'/(tabs)/compliance/auditsessions', screen:'audits', label:'Audit Sessions', aliases:['audits','audit sessions','compliance audits','SQF audit','FSMA audit'], description:'Audit session management across all frameworks', module:'Compliance' },
  { path:'/(tabs)/compliance/foodsafetyplan', screen:'food_safety_plan', label:'Food Safety Plan', aliases:['food safety plan','FSMA plan','HACCP','food safety'], description:'FSMA food safety plan documentation', module:'Compliance' },
  { path:'/(tabs)/compliance/recallplan', screen:'recall_plan', label:'Recall Plan', aliases:['recall plan','recall','mock recall'], description:'Product recall plan and procedures', module:'Compliance' },
  { path:'/(tabs)/compliance/compliancecalendar', screen:'compliance_calendar', label:'Compliance Calendar', aliases:['compliance calendar','regulatory calendar','compliance schedule'], description:'Compliance and regulatory event calendar', module:'Compliance' },

  // ── Documents / SDS ───────────────────────────────────────────────────────
  { path:'/(tabs)/documents', screen:'documents', label:'Documents', aliases:['documents','document library','docs'], description:'Document management library', module:'Documents' },
  { path:'/(tabs)/documents/sds', screen:'sds_library', label:'SDS Library', aliases:['SDS','safety data sheets','SDS library','MSDS','chemical SDS'], description:'Safety Data Sheet library', module:'Documents' },

  // ── HR ────────────────────────────────────────────────────────────────────
  { path:'/(tabs)/hr', screen:'hr', label:'HR', aliases:['HR','human resources','HR hub'], description:'Human resources management hub', module:'HR' },
  { path:'/(tabs)/employees', screen:'employee_directory', label:'Employee Directory', aliases:['employees','employee directory','staff','workers','team','personnel'], description:'Employee directory with contact info and HR records', module:'HR' },
  { path:'/(tabs)/attendance', screen:'attendance', label:'Attendance', aliases:['attendance','attendance records','attendance log'], description:'Employee attendance tracking', module:'HR' },
  { path:'/(tabs)/timeclock', screen:'time_clock', label:'Time Clock', aliases:['time clock','check in','check out','timeclock'], description:'Employee time clock — check in and check out', module:'HR' },
  { path:'/(tabs)/overtime', screen:'overtime', label:'Overtime', aliases:['overtime','overtime requests','OT'], description:'Overtime tracking and requests', module:'HR' },
  { path:'/(tabs)/performance', screen:'performance', label:'Performance Reviews', aliases:['performance','performance reviews','reviews'], description:'Employee performance reviews and goals', module:'HR' },
  { path:'/(tabs)/onboarding', screen:'onboarding', label:'Onboarding', aliases:['onboarding','new hire','new employee'], description:'Employee onboarding management', module:'HR' },

  // ── Finance ───────────────────────────────────────────────────────────────
  { path:'/(tabs)/finance', screen:'finance', label:'Finance', aliases:['finance','financial','accounting','finance hub'], description:'Financial management hub', module:'Finance' },
  { path:'/(tabs)/finance/budgets', screen:'budgets', label:'Budgets', aliases:['budgets','budget','department budgets'], description:'Department budget management', module:'Finance' },
  { path:'/(tabs)/finance/payroll', screen:'payroll', label:'Payroll', aliases:['payroll','pay','wages'], description:'Payroll management', module:'Finance' },

  // ── Other Modules ─────────────────────────────────────────────────────────
  { path:'/(tabs)/planner', screen:'planner', label:'Planner', aliases:['planner','project planner','projects','tasks'], description:'Project and task planner', module:'Planner' },
  { path:'/(tabs)/recycling', screen:'recycling', label:'Recycling', aliases:['recycling','recycling hub','waste'], description:'Recycling and waste management hub', module:'Recycling' },
  { path:'/(tabs)/portal', screen:'portal', label:'Employee Portal', aliases:['portal','employee portal','bulletin','announcements'], description:'Employee portal with bulletins and announcements', module:'Portal' },
  { path:'/(tabs)/reports', screen:'reports', label:'Reports', aliases:['reports','report','analytics'], description:'Facility-wide reports and analytics', module:'Reports' },
  { path:'/(tabs)/settings', screen:'settings', label:'Settings', aliases:['settings','configuration','config','admin','preferences'], description:'App settings and administration', module:'Settings' },
  { path:'/(tabs)/settings/users', screen:'users', label:'Users', aliases:['users','user management','manage users'], description:'User account management', module:'Settings' },
  { path:'/(tabs)/settings/departments', screen:'departments', label:'Departments', aliases:['departments','department settings'], description:'Department configuration', module:'Settings' },
  { path:'/(tabs)/approvals', screen:'approvals', label:'Approvals', aliases:['approvals','approval queue','pending approvals'], description:'Cross-module approval management', module:'Approvals' },
];

// Lookups
export const ROUTE_BY_SCREEN: Record<string, RouteEntry> =
  Object.fromEntries(ROUTE_MANIFEST.map(r => [r.screen, r]));

export const ROUTE_BY_PATH: Record<string, RouteEntry> =
  Object.fromEntries(ROUTE_MANIFEST.map(r => [r.path, r]));

export function getRouteManifestForAI(): string {
  const lines = ['AVAILABLE SCREENS (screen_name → path | aliases):'];
  for (const r of ROUTE_MANIFEST) {
    lines.push(`  ${r.screen} → ${r.path} | ${r.aliases.slice(0,4).join(', ')}`);
  }
  return lines.join('\n');
}
