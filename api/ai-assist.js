// api/ai-assist.js
// Vercel Serverless Function — TulKenz OPS AI Assistant v3
// Uses Claude TOOL USE (function calling) — reliable, schema-enforced actions

const Anthropic = require('@anthropic-ai/sdk').default;
const { handleCodeEditorTool } = require('./ai-tools/code-editor');

let getSchema;
try {
  getSchema = require('./schema').getSchema;
} catch (e) {
  console.warn('[ai-assist] schema.js not found — schema injection disabled:', e.message);
  getSchema = async () => null;
}

const SYSTEM_PROMPT = `You are the TulKenz OPS AI Assistant for Admin Organization, a food manufacturing facility operating under the TulKenz platform.

## LANGUAGE
You are fully bilingual — English and Spanish. 
- ALWAYS detect the language of the user's message and respond in that same language.
- If they write in Spanish → respond entirely in Spanish.
- If they write in English → respond in English.
- If context.language is set, honor it. But if the user's actual message is in a different language, match the message language — it overrides the setting.
- Tool field names, enum values, and table names always stay in English regardless of response language.
- Short confirmations: "Done" → "Listo", "Opening..." → "Abriendo...", "Got it" → "Entendido"
- Never mix languages in a single response sentence.

## HOW YOU WORK
You have tools for every action in the app. When a user asks you to do something, pick the right tool and fill in ALL parameters from what they said. If a required field is missing, use ask_clarification. For optional fields not mentioned, use "N/A".

## WHO YOU ARE TALKING TO
You know the current user's name, role, department, and what screen they are on from the context block at the end of each message. Use this to be more helpful:
- A maintenance tech asking about equipment → they probably want a work order or part lookup
- A sanitation supervisor on the hygiene log screen → they are logging room status
- A QA manager → they care about NCRs, CAPAs, and inspections
- A production operator → they care about room status, pre-ops, and runs
- Always address them by name when starting a conversation or confirming an action.

## WHAT YOU KNOW ABOUT THIS FACILITY
Organization: Admin Organization
Brand: TulKenz — food manufacturing platform (client brand TBD)
Facility: Headquarters — Anson, TX (America/Chicago — CST)
Organization ID: 74ce281d-5630-422d-8326-e5d36cfc1d5e

PRODUCTION ROOMS & AREAS:
- PR1 — Production Room 1 (active)
- PR2 — Production Room 2 (active)
- PA1 — Packet Area 1 (active)
- PA2 — Packet Area 2 (inactive)
- BB1 — Big Blend (active)
- SB1 — Small Blend (active)
- PW1 — Pre-Weigh (active)
- PO1 — Packout 1 (active)
- PO2 — Packout 2 (active)
- PO3 — Packout 3 (active)
- WB1 — Washbay
- PROD-001 — Production Floor
- MAINT-001 — Maintenance
- MAINT-002 — Maintenance Cage

DEPARTMENTS (use department_code for filters):
1001 — Maintenance
1002 — Sanitation
1003 — Production
1004 — Quality
1005 — Safety
1006 — HR
1008 — Warehouse
1009 — IT / Technology
1010 — Facilities

## MODULES IN THIS APP
- CMMS: Work orders, PM schedules, equipment, LOTO, downtime tracking
- Inventory: Parts/materials, purchase requests, receiving, cycle counts
- Procurement: Purchase orders, vendors, approvals, blanket POs
- Production: Room status, production runs, pre-op inspections, line checks
- Quality: NCRs, CAPAs, deviations, customer complaints, metal detector logs, temp logs
- Safety: Safety observations, incidents, OSHA 300, emergency protocols, fire drills
- Sanitation: Room hygiene logs, chemical inventory, SDS library, master sanitation schedule
- Compliance: Audits, food safety plan, FSMA, SQF documentation, form builder
- HR: Employees, time clock (Check In/Check Out), time adjustments, break violations
- Training: Training templates (OJT 4-step), sessions, certifications, department requirements — SQF 2.9.1
- Documents: SOPs, OPLs, policies, work instructions, specifications, SDS
- Task Feed: Central audit trail — all events, incidents, reports, and actions post here
- Planner: Projects and tasks
- Recycling: Cardboard, metal, paper, batteries, bulbs, toner
- Finance: Budgets, cost reports, labor costs

## CRITICAL ROUTING RULES

USE TASK FEED TEMPLATES when someone says:
- "Report..." / "Log..." / "Found a..." / "There's a..." / "We have a..."
- Any incident, finding, issue, complaint, or observation
- Broken glove, foreign material, chemical spill, pest, injury, equipment problem, temp issue, metal detector hit, customer complaint

USE create_work_order ONLY when someone says:
- "Schedule maintenance on..." / "Create a work order for..." / "Need to repair..."

USE query_task_feed when someone says:
- "Show me open PMs" / "What PMs are pending?" → set post_type="preventive"
- "What reactive tasks does quality have?" → set department_code + post_type="reactive"
- IMPORTANT: For any PM / preventive maintenance question, ALWAYS set post_type="preventive"

USE query_records when someone says ANYTHING like:
- "Show me...", "List...", "Find...", "Pull up...", "What are...", "Get me..." about any data
- Browsing, searching, or filtering records in any module or submodule
- Examples: "show me all parts for production", "list open purchase orders",
  "find employees in maintenance", "show chemical inventory", "pull up LOTO procedures",
  "list all vendors", "show SDS records for sanitizers", "what CAPAs are open",
  "list downtime events this week", "show inspection records", "find open NCRs",
  "list employees on attendance points", "show recycling records", "pull up safety observations",
  "show me item records in inventory", "list all PM schedules", "show purchase requests"
- SPANISH EQUIVALENTS: "Muéstrame...", "Lista...", "Encuentra...", "¿Qué...hay?", "Dame..." → same rules apply

TABLE MAP — match user intent to exact table name:
MAINTENANCE: work_orders, pm_schedules, pm_work_orders, equipment, equipment_sensors, equipment_downtime_log, downtime_events, loto_procedures, loto_events, maintenance_activity_log, maintenance_alerts, work_order_chemicals, maintenance_metrics, maintenance_budgets
PARTS/INVENTORY: materials, part_requests, parts_issues, parts_returns, parts_costs, material_receipts, inventory_adjustments, inventory_history, inventory_audit_trail, inventory_reserves, inventory_labels, low_stock_alerts, count_sessions, hold_tags, reorder_points, replenishment_suggestions, global_materials, adjustment_reasons
PROCUREMENT: purchase_orders, purchase_requests, purchase_requisitions, procurement_purchase_orders, blanket_purchase_orders, blanket_po_releases, po_approvals, po_revisions, po_templates, drop_ship_orders, service_purchase_orders, service_requests, approvals
VENDORS: vendors, cmms_vendors, procurement_vendors, vendor_contracts, vendor_onboarding
QUALITY: quality_inspections, inspection_records, inspection_templates, ncr_records, ncr_paper_forms, capa_records, deviation_records, customer_complaints, metal_detector_logs, ccp_monitoring_logs, temperature_logs, allergen_changeover_forms, pre_op_inspections, production_line_checks
SAFETY: safety_observations, accident_investigations, first_aid_log, osha_300_log, osha_300a_summaries, osha_301_forms, workers_comp_claims, drug_alcohol_tests, ergonomic_assessments, repetitive_motion_assessments, noise_monitoring, air_quality_monitoring, heat_stress_monitoring, hazard_assessments, ppe_requirements, safety_permits, safety_suggestions, safety_committee_meetings, safety_recognitions, safety_program_documents, loto_procedures, loto_events, fire_drill_entries, evacuation_drill_entries, severe_weather_drill_entries, peer_safety_audits, return_to_work_forms, medical_restrictions, workstation_evaluations, job_specific_safety_training, psm_compliance_records, fire_suppression_impairments, respirator_fit_tests, break_violations
SANITATION: room_hygiene_log, daily_room_hygiene_reports, chemical_inventory, haz_waste, sds_records, sds_index, sds_training_records
PRODUCTION: production_runs, production_events, production_hold_log, room_status, room_equipment, sensor_readings, downtime_events
COMPLIANCE/AUDITS: audit_sessions, capa_records, deviation_records, documents, document_versions, document_categories, document_acknowledgments, custom_form_templates, custom_form_submissions, form_signatures, inspection_templates, inspection_records
TRAINING: training_templates, training_sessions, training_session_steps, training_session_attempts, training_certifications, department_required_training
EMPLOYEES/HR: employees, positions, departments, shifts, attendance_records, time_entries, time_punches, time_off_requests, overtime_requests, overtime_alerts, performance_reviews, employee_goals, feedback_360, succession_plans, talent_profiles, drug_alcohol_tests, job_requisitions, candidates, interviews, job_offers, position_assignments, position_history, medical_restrictions, return_to_work_forms, attendance_points_balance, attendance_points_history, break_violations, shift_swaps
RECYCLING: recycling_cardboard, recycling_metal, recycling_paper, recycling_batteries, recycling_bulbs, recycling_toner, recycling_files
PLANNER: planner_projects, planner_tasks, planner_task_comments, planner_task_time_entries, planner_task_templates
COMMUNICATIONS: bulletin_posts, portal_announcements, notifications, scheduled_tasks, tasks
FINANCIAL: department_budgets, maintenance_budgets, cost_reports, labor_costs, parts_costs, gl_accounts
ASSETS: assets, warranty_records, warranty_claims, locations, facilities
EMERGENCY: emergency_events, emergency_contacts, emergency_equipment, emergency_action_plan_entries, emergency_roll_calls

FILTER GUIDANCE — common filter columns:
- status: open, pending, closed, active, inactive, completed, in_progress
- department / department_name / department_code
- location / room / room_code
- category / type / priority
- Use filters object for exact matches

USE mark_employee_safe for a single name: "[name] checked in", "[name] is safe", "[name] is here", "mark [name]", "[name] for the drill", "[name] accounted for".
  - Extract ONLY the name. "John Smith checked in for the drill" → employee_name: "John Smith"
  - Works by name, first name only, last name only, or partial match.
  - SPANISH: "[nombre] está seguro", "[nombre] llegó", "marca a [nombre]" → same tool

USE mark_multiple_employees_safe when several names come at once:
  - "John, Maria, and Carlos are all here" → employee_names: ["John", "Maria", "Carlos"]
  - "East side is clear — Smith, Garcia, Thompson" → employee_names: ["Smith", "Garcia", "Thompson"]
  - SPANISH: "Juan, María y Carlos están aquí" → employee_names: ["Juan", "María", "Carlos"]

USE get_roll_call_status when asked: "who's missing", "how many left", "roll call status", "who hasn't checked in", "who do we still need"
  - SPANISH: "¿quién falta?", "¿cuántos faltan?", "estado del pase de lista"

USE initiate_roll_call when already on the screen: "start it", "begin", "initiate", "go", "hit start", "start the drill"
  - SPANISH: "empieza", "inicia", "comienza", "dale"

USE end_emergency_protocol: "end protocol", "end the emergency", "wrap it up", "end drill", "close it out"
  - SPANISH: "termina el protocolo", "fin del simulacro", "ciérralo"

USE cancel_emergency_event: "cancel", "false alarm", "started by accident", "cancel the drill", "cancel the event"
  - SPANISH: "cancela", "falsa alarma", "fue un error"

USE save_emergency_details: "save details", "save and close", "close the event", or when they provide severity/location/notes
USE view_emergency_log: "view the log", "show event log", "see history"
  - SPANISH: "ver el registro", "historial de eventos"
USE close_emergency_screen: "close", "go back", "dismiss", "skip details"

USE start_emergency_protocol when someone says:
- "fire", "there's a fire", "fire emergency" → emergency_type: "fire"
- "tornado", "tornado warning", "take cover" → emergency_type: "tornado"
- "active shooter", "shooter" → emergency_type: "active_shooter"
- "chemical spill", "chemical leak" → emergency_type: "chemical_spill"
- "gas leak", "smell gas" → emergency_type: "gas_leak"
- "bomb threat", "bomb" → emergency_type: "bomb_threat"
- "medical emergency", "someone is hurt", "person down", "heart attack" → emergency_type: "medical_emergency"
- "power outage", "power is out", "lights out" → emergency_type: "power_outage"
- "flood", "flooding" → emergency_type: "flood"
- "earthquake" → emergency_type: "earthquake"
- "structural collapse", "building collapse" → emergency_type: "structural_collapse"
- SPANISH: "incendio", "hay fuego" → fire | "tornado" → tornado | "tirador activo" → active_shooter
  "derrame químico" → chemical_spill | "fuga de gas" → gas_leak | "amenaza de bomba" → bomb_threat
  "emergencia médica", "alguien está herido" → medical_emergency | "corte de luz" → power_outage
  "inundación" → flood | "terremoto" → earthquake
- Add is_drill: true if they say "drill", "practice", "test", "simulacro", "práctica" — otherwise default false
- CRITICAL: For any real emergency, set is_drill: false.

NAVIGATE SCREEN NAMES (say the exact screen name):
- "dashboard", "home", "inicio" → dashboard
- "task feed", "tasks", "feed", "posts", "tareas" → task_feed
- "maintenance", "cmms", "mantenimiento" → cmms
- "work orders", "WO", "repairs", "órdenes de trabajo" → work_orders
- "equipment", "machines", "assets", "equipos" → equipment
- "PM schedule", "preventive maintenance", "PMs", "mantenimiento preventivo" → pm_schedule
- "item records", "materials", "parts", "inventory", "items", "stock", "inventario", "partes" → parts_inventory
- "inventory hub", "centro de inventario" → inventory
- "purchase orders", "POs", "órdenes de compra" → purchase_orders
- "purchase requests", "requisitions", "PR", "solicitudes de compra" → purchase_requests
- "vendors", "supplier list", "proveedores" → vendors
- "procurement", "compras" → procurement
- "production runs", "runs", "batches", "corridas", "producción" → production_runs
- "room status", "room dashboard", "rooms", "line status", "cuartos", "líneas" → room_status
- "quality", "QA", "QC", "calidad" → quality
- "NCR", "non-conformance", "no conformidad" → ncr
- "CAPA", "corrective action", "acción correctiva" → capa
- "safety", "EHS", "seguridad" → safety
- "incidents", "incident report", "incidentes" → incident_report
- "emergency", "emergency hub", "emergencia" → emergency
- "LOTO", "lockout tagout" → loto
- "sanitation", "cleaning", "hygiene", "sanitización", "limpieza" → sanitation
- "chemicals", "chemical hub", "químicos" → chemical_hub
- "SDS", "safety data sheets", "hojas de seguridad" → sds_library
- "documents", "document library", "documentos" → documents
- "compliance", "regulatory", "cumplimiento" → compliance
- "training", "entrenamiento", "capacitación" → training
- "audits", "audit sessions", "auditorías" → audits
- "employees", "staff", "directory", "empleados", "directorio" → employee_directory
- "time clock", "check in", "check out", "reloj", "entrada", "salida" → time_clock
- "attendance", "asistencia" → attendance
- "HR", "human resources", "recursos humanos" → hr
- "finance", "accounting", "finanzas" → finance
- "payroll", "nómina" → payroll
- "reports", "analytics", "reportes", "informes" → reports
- "planner", "projects", "proyectos" → planner
- "recycling", "waste", "reciclaje" → recycling
- "portal", "announcements", "bulletin", "anuncios" → portal
- "settings", "config", "admin", "configuración" → settings
- "approvals", "aprobaciones" → approvals

## PARTS LOOKUP RULES
When someone asks about a part or needs to find a part:
1. ALWAYS call lookup_part first — this searches the Item Records (master materials/parts inventory).
2. If lookup_part returns results → show them (in stock location, quantity, price, vendor part #).
3. If lookup_part returns zero results → immediately use web_search to find manufacturer specs, where to buy, pricing, compatible alternatives.
4. Tell the user the part wasn't found in Item Records, then give them what you found online.
- SPANISH: "busca la parte", "¿tienes [parte]?", "necesito [parte]" → same lookup rules

## WEB SEARCH RULES
Use web_search when:
- lookup_part returned no results
- User explicitly asks to search online for a part, spec sheet, or manual
- User asks about industry standards, equipment specs, or regulatory requirements
Keep web search results concise — summarize key specs and sourcing info in 2-3 sentences.

## CODE EDITING RULES
When someone asks you to change, fix, add, or update anything in the app:
1. Call read_screen first to get the current code (unless you already read it this conversation)
2. Call edit_screen with a precise instruction — be specific about what to add/change/remove
3. Present the diff to the user and wait for approval
4. Only call deploy_change after the user says "looks good", "deploy it", "yes", "sí", "publícalo"
5. Never call deploy_change without prior edit_screen approval in the same conversation
6. If the user says "change X first" after seeing the diff — call edit_screen again with the updated instruction before deploying
- SPANISH: "publícalo", "despliégalo", "sí", "dale" → deploy | "cámbia X primero" → edit again first

## BEHAVIOR RULES
1. ALWAYS use a tool. Never just describe what you would do.
2. Be conversational — talk like a knowledgeable maintenance supervisor who is also fluent in Spanish.
3. Keep responses under 3 sentences unless detail is requested.
4. Use the user's name when confirming actions.
5. If you know the user's department from context, tailor your response to what matters to them.
6. The time clock is called "Check In / Check Out" — never say "clock in" or "clock out".

## FACILITY
Rooms: PR1, PR2, PA1, BB1, SB1, PW1, PO1, PO2, PO3, WB1
Departments: 1001=Maintenance, 1002=Sanitation, 1003=Production, 1004=Quality, 1005=Safety, 1006=HR, 1008=Warehouse`;

const TOOLS = [

  // ── Web Search ───────────────────────────────
  {
    type: 'web_search_20250305',
    name: 'web_search',
  },

  // ── Task Feed Templates ──────────────────────

  {
    name: 'create_task_feed_post_broken_glove',
    description: 'Report a broken glove incident.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        glove_type: { type: 'string', enum: ['Nitrile', 'Latex', 'Vinyl', 'Cut-Resistant', 'Other'] },
        missing_fragment_found: { type: 'string', enum: ['Yes - fragment recovered', 'No - fragment missing'] },
        description: { type: 'string' },
        production_line: { type: 'string', enum: ['Line 1', 'Line 2', 'Line 3', 'N/A'] },
        immediate_action_taken: { type: 'string' },
        production_stopped: { type: 'boolean' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'glove_type', 'missing_fragment_found', 'description', 'production_line', 'immediate_action_taken', 'production_stopped'],
    },
  },

  {
    name: 'create_task_feed_post_foreign_material',
    description: 'Report a foreign material finding.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        material_type: { type: 'string', enum: ['Metal', 'Plastic', 'Glass', 'Wood', 'Rubber', 'Bone', 'Insect', 'Other'] },
        found_in_product: { type: 'string', enum: ['Yes', 'No', 'Unknown'] },
        description: { type: 'string' },
        production_line: { type: 'string', enum: ['Line 1', 'Line 2', 'Line 3', 'N/A'] },
        product_quarantined: { type: 'boolean' },
        immediate_action_taken: { type: 'string' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'material_type', 'found_in_product', 'description', 'production_line', 'product_quarantined', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_chemical_spill',
    description: 'Report a chemical spill.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        chemical_name: { type: 'string' },
        quantity_spilled: { type: 'string' },
        product_contact: { type: 'string', enum: ['Yes', 'No', 'Unknown'] },
        immediate_action_taken: { type: 'string' },
        area_cleared: { type: 'boolean' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'chemical_name', 'quantity_spilled', 'product_contact', 'immediate_action_taken', 'area_cleared'],
    },
  },

  {
    name: 'create_task_feed_post_employee_injury',
    description: 'Report an employee injury or near miss.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        injury_type: { type: 'string', enum: ['Cut', 'Burn', 'Strain/Sprain', 'Slip/Fall', 'Chemical Exposure', 'Near Miss', 'Other'] },
        body_part: { type: 'string' },
        employee_name: { type: 'string' },
        description: { type: 'string' },
        medical_attention_required: { type: 'boolean' },
        immediate_action_taken: { type: 'string' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'injury_type', 'body_part', 'employee_name', 'description', 'medical_attention_required', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_equipment_breakdown',
    description: 'Report equipment breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        equipment_name: { type: 'string' },
        symptom: { type: 'string' },
        production_impact: { type: 'string', enum: ['Line Down', 'Reduced Speed', 'No Impact', 'Unknown'] },
        immediate_action_taken: { type: 'string' },
        create_work_order_requested: { type: 'boolean' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'equipment_name', 'symptom', 'production_impact', 'immediate_action_taken', 'create_work_order_requested'],
    },
  },

  {
    name: 'create_task_feed_post_metal_detector_reject',
    description: 'Report a metal detector reject.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        product_affected: { type: 'string' },
        quantity_rejected: { type: 'string' },
        metal_found: { type: 'string', enum: ['Yes', 'No', 'Under Investigation'] },
        production_line: { type: 'string', enum: ['Line 1', 'Line 2', 'Line 3', 'N/A'] },
        immediate_action_taken: { type: 'string' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'product_affected', 'quantity_rejected', 'metal_found', 'production_line', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_pest_sighting',
    description: 'Report a pest sighting.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        pest_type: { type: 'string', enum: ['Rodent', 'Cockroach', 'Fly', 'Ant', 'Bird', 'Other Insect', 'Other'] },
        number_observed: { type: 'string' },
        product_contact: { type: 'string', enum: ['Yes', 'No', 'Unknown'] },
        evidence_type: { type: 'string', enum: ['Live', 'Dead', 'Droppings', 'Damage', 'Tracks', 'Other'] },
        immediate_action_taken: { type: 'string' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'pest_type', 'number_observed', 'product_contact', 'evidence_type', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_temperature_deviation',
    description: 'Report a temperature deviation.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        recorded_temp: { type: 'string' },
        required_temp: { type: 'string' },
        duration: { type: 'string' },
        product_affected: { type: 'string' },
        immediate_action_taken: { type: 'string' },
        additional_notes: { type: 'string' },
      },
      required: ['location', 'recorded_temp', 'required_temp', 'duration', 'product_affected', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_customer_complaint',
    description: 'Log a customer complaint.',
    input_schema: {
      type: 'object',
      properties: {
        complaint_type: { type: 'string', enum: ['Foreign Material', 'Off Flavor/Odor', 'Underfill', 'Seal Failure', 'Label Issue', 'Allergen Concern', 'Other'] },
        product_name: { type: 'string' },
        lot_number: { type: 'string' },
        description: { type: 'string' },
        customer_name: { type: 'string' },
        immediate_action_taken: { type: 'string' },
        additional_notes: { type: 'string' },
      },
      required: ['complaint_type', 'product_name', 'lot_number', 'description', 'customer_name', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_generic',
    description: 'Create a generic task feed post when no specific template matches.',
    input_schema: {
      type: 'object',
      properties: {
        post_type: { type: 'string', enum: ['report_issue', 'create_task', 'purchase_request', 'pre_op', 'other'] },
        template_name: { type: 'string' },
        departments: { type: 'array', items: { type: 'string' } },
        location: { type: 'string' },
        notes: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['post_type', 'template_name', 'departments', 'notes', 'priority'],
    },
  },

  // ── Task Feed Query ──────────────────────────

  {
    name: 'query_task_feed',
    description: 'Search task feed posts and work orders. For PMs set post_type="preventive".',
    input_schema: {
      type: 'object',
      properties: {
        department_code: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'all'] },
        post_type: { type: 'string', description: '"preventive" for PMs, "reactive" for reactive WOs' },
        date_range: { type: 'string', enum: ['today', 'this_week', 'this_month', 'all'] },
      },
      required: ['status'],
    },
  },

  // ── Universal Record Query ───────────────────

  {
    name: 'query_records',
    description: 'Search and list records from ANY module or table in the app. Use for any "show me", "list", "find", "pull up", "what are" request about data. Also handles Spanish equivalents: "muéstrame", "lista", "encuentra", "dame", "¿qué hay en...?". Covers all 200+ tables.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Exact Supabase table name.' },
        filters: { type: 'object', description: 'Exact match filters as key:value pairs.', additionalProperties: true },
        search_column: { type: 'string' },
        search_term: { type: 'string' },
        order_by: { type: 'string' },
        order_direction: { type: 'string', enum: ['asc', 'desc'] },
        date_filter_column: { type: 'string' },
        date_range: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_year', 'all'] },
        limit: { type: 'number' },
      },
      required: ['table'],
    },
  },

  // ── Work Orders ──────────────────────────────

  {
    name: 'create_work_order',
    description: 'Create a maintenance work order for repairs. Do NOT use for reporting incidents.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        equipment_name: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        type: { type: 'string', enum: ['reactive', 'preventive', 'predictive'] },
        parts_needed: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'equipment_name', 'description', 'priority', 'type'],
    },
  },

  // ── Pre-Op ───────────────────────────────────

  {
    name: 'start_pre_op',
    description: 'Start a Pre-Op inspection for a room.',
    input_schema: {
      type: 'object',
      properties: { room: { type: 'string', enum: ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1', 'PW1', 'PO1', 'PO2', 'PO3', 'WB1'] } },
      required: ['room'],
    },
  },

  // ── Parts & Equipment ────────────────────────

  {
    name: 'lookup_part',
    description: 'Search Item Records by name, part number, SKU, vendor part number, or manufacturer part number. Always try this first before web search.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },

  {
    name: 'lookup_equipment',
    description: 'Get equipment details or troubleshooting info.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        section: { type: 'string', enum: ['specs', 'manual', 'troubleshooting', 'pm_history', 'parts'] },
      },
      required: ['query'],
    },
  },

  {
    name: 'diagnose_issue',
    description: 'Analyze equipment problem from description or photo.',
    input_schema: {
      type: 'object',
      properties: {
        equipment: { type: 'string' },
        symptom: { type: 'string' },
        create_work_order: { type: 'boolean' },
      },
      required: ['equipment', 'symptom', 'create_work_order'],
    },
  },

  // ── Production ───────────────────────────────

  {
    name: 'start_production_run',
    description: 'Start a production run for a room.',
    input_schema: {
      type: 'object',
      properties: {
        room: { type: 'string', enum: ['PA1', 'PA2', 'PR1', 'PR2', 'BB1', 'SB1'] },
        run_number: { type: 'string' },
        product: { type: 'string' },
      },
      required: ['room', 'run_number', 'product'],
    },
  },

  {
    name: 'end_production_run',
    description: 'End the active production run.',
    input_schema: {
      type: 'object',
      properties: {
        room: { type: 'string', enum: ['PA1', 'PA2', 'PR1', 'PR2', 'BB1', 'SB1'] },
        run_number: { type: 'string' },
      },
      required: ['room'],
    },
  },

  {
    name: 'change_room_status',
    description: 'Change a room andon light status.',
    input_schema: {
      type: 'object',
      properties: {
        room: { type: 'string', enum: ['PR1', 'PR2', 'PA1', 'PA2', 'BB1', 'SB1'] },
        status: { type: 'string', enum: ['running', 'loto', 'cleaning', 'setup', 'idle', 'down'] },
      },
      required: ['room', 'status'],
    },
  },

  // ── Emergency Protocol ───────────────────────

  {
    name: 'mark_employee_safe',
    description: 'Mark an employee as safe/accounted for during an active emergency roll call or drill.',
    input_schema: {
      type: 'object',
      properties: { employee_name: { type: 'string' } },
      required: ['employee_name'],
    },
  },

  {
    name: 'mark_multiple_employees_safe',
    description: 'Mark multiple employees safe at once.',
    input_schema: {
      type: 'object',
      properties: { employee_names: { type: 'array', items: { type: 'string' } } },
      required: ['employee_names'],
    },
  },

  {
    name: 'get_roll_call_status',
    description: 'Get the current roll call status.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'initiate_roll_call',
    description: 'Press the INITIATE button on the emergency protocol screen to start the roll call.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'end_emergency_protocol',
    description: 'End the emergency protocol early and mark the event as resolved.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'cancel_emergency_event',
    description: 'Cancel the emergency event entirely — false alarm or started by accident.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'save_emergency_details',
    description: 'Save post-event details after everyone is accounted for.',
    input_schema: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['critical','high','medium','low'] },
        location: { type: 'string' },
        notes: { type: 'string' },
        emergency_services_called: { type: 'boolean' },
      },
      required: [],
    },
  },

  {
    name: 'view_emergency_log',
    description: 'Navigate to the emergency event log.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'close_emergency_screen',
    description: 'Close the emergency protocol screen without saving details.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'start_emergency_protocol',
    description: 'Initiate an emergency protocol or drill.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_type: {
          type: 'string',
          enum: ['fire','tornado','active_shooter','chemical_spill','gas_leak','bomb_threat','medical_emergency','earthquake','flood','power_outage','structural_collapse','other'],
        },
        is_drill: { type: 'boolean' },
      },
      required: ['emergency_type'],
    },
  },

  // ── Navigation ───────────────────────────────

  {
    name: 'navigate',
    description: 'Navigate to any screen in the app.',
    input_schema: {
      type: 'object',
      properties: {
        screen: {
          type: 'string',
          enum: [
            'dashboard',
            'task_feed',
            'cmms', 'work_orders', 'new_work_order', 'equipment', 'pm_schedule', 'parts_list', 'downtime', 'loto', 'cmms_kpi', 'cmms_vendors',
            'inventory', 'parts_inventory', 'on_hand', 'low_stock', 'cycle_count', 'lot_tracking', 'replenishment', 'transfers',
            'procurement', 'purchase_orders', 'purchase_requests', 'vendors', 'receiving', 'po_approvals',
            'production', 'production_runs', 'room_status', 'production_materials',
            'quality', 'ncr', 'capa', 'deviations', 'complaints', 'metal_detector', 'pre_op', 'temp_log',
            'safety', 'safety_observations', 'incident_report', 'first_aid', 'osha_300', 'emergency', 'loto_program', 'chemical_hub',
            'sanitation', 'sanitation_chemicals', 'master_sanitation', 'daily_sanitation',
            'compliance', 'audits', 'food_safety_plan', 'recall_plan', 'compliance_calendar',
            'training', 'training_templates', 'training_sessions', 'training_certifications',
            'documents', 'sds_library',
            'hr', 'employee_directory', 'attendance', 'time_clock', 'overtime', 'performance', 'onboarding',
            'finance', 'budgets', 'payroll',
            'planner', 'recycling', 'portal', 'reports', 'settings', 'users', 'departments', 'approvals',
          ],
        },
        record_id: { type: 'string' },
      },
      required: ['screen'],
    },
  },

  // ── Code Editor ──────────────────────────────

  {
    name: 'list_screens',
    description: 'List all screens, hooks, and API files in the TulKenz OPS codebase. Use when someone asks "what screens are there", "what files exist", "show me the file map".',
    input_schema: { type: 'object', properties: {}, required: [] },
  },

  {
    name: 'read_screen',
    description: 'Read the current source code of any screen, hook, or API file in the app. Use before editing so you know exactly what is there.',
    input_schema: {
      type: 'object',
      properties: {
        screen_name: {
          type: 'string',
          description: 'Screen name from the map — e.g. "quality", "training_sessions", "hook_timeclock". Use this OR file_path.',
        },
        file_path: {
          type: 'string',
          description: 'Exact file path — e.g. "app/(tabs)/quality/index.tsx". Use this OR screen_name.',
        },
      },
      required: [],
    },
  },

  {
    name: 'edit_screen',
    description: 'Read a file and generate an edited version based on the instruction. Shows the user a diff before committing. ALWAYS use read_screen first if you have not already read the file in this conversation.',
    input_schema: {
      type: 'object',
      properties: {
        screen_name: {
          type: 'string',
          description: 'Screen name from the map. Use this OR file_path.',
        },
        file_path: {
          type: 'string',
          description: 'Exact file path. Use this OR screen_name.',
        },
        instruction: {
          type: 'string',
          description: 'Clear description of what to change. Be specific.',
        },
      },
      required: ['instruction'],
    },
  },

  {
    name: 'deploy_change',
    description: 'Commit an approved code change to GitHub main branch. Only call this after the user has reviewed the diff from edit_screen and approved it. Triggers Vercel auto-deploy (~35 seconds).',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'File path being committed.' },
        new_content: { type: 'string', description: 'The complete new file content from the edit_screen result.' },
        original_sha: { type: 'string', description: 'The SHA from the read_screen result — required by GitHub API.' },
        commit_message: { type: 'string', description: 'Git commit message describing the change.' },
      },
      required: ['file_path', 'new_content', 'original_sha'],
    },
  },

  // ── Utility ──────────────────────────────────

  {
    name: 'ask_clarification',
    description: 'Ask user for more info when required fields are missing.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        partial_data: { type: 'object', additionalProperties: true },
        awaiting_template: { type: 'string' },
      },
      required: ['question'],
    },
  },

  {
    name: 'general_response',
    description: 'Respond to general questions or greetings that need no app action.',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
];

const { createClient } = require('@supabase/supabase-js');

function extractTableNames(command, tableMap) {
  if (!command) return [];
  const lower = command.toLowerCase();
  return Object.keys(tableMap).filter(t => lower.includes(t.replace(/_/g,' ')) || lower.includes(t));
}

async function buildSchemaBlock(command) {
  try {
    const schema = await getSchema();
    if (!schema) return '';

    const alwaysInclude = ['materials','work_orders','employees','equipment','pm_schedules','task_feed_posts','purchase_orders','vendors','training_sessions','training_templates','training_certifications'];
    const mentioned = extractTableNames(command || '', schema);
    const tables = [...new Set([...alwaysInclude, ...mentioned])].filter(t => schema[t]);

    if (tables.length === 0) return '';

    const lines = ['## EXACT SUPABASE COLUMN NAMES (use ONLY these — no guessing)'];
    for (const t of tables) {
      const cols = schema[t].map(c => `${c.name}(${c.type.replace('timestamp with time zone','ts').replace('character varying','text').replace('integer','int')})`).join(', ');
      lines.push(`${t}: ${cols}`);
    }
    lines.push('CRITICAL: Never use a column name not listed above.');
    return lines.join('\n');
  } catch (e) {
    console.warn('[ai-assist] buildSchemaBlock failed:', e.message);
    return '';
  }
}

function getSupabaseAdmin() {
  const url  = process.env.EXPO_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function loadMemory(orgId, userId) {
  try {
    const sb = getSupabaseAdmin();
    if (!sb) return { memories: [], summaries: [] };

    const { data: memories } = await sb
      .from('ai_assistant_memory')
      .select('category,key,value,context,times_confirmed')
      .eq('organization_id', orgId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('times_confirmed', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(40);

    const { data: summaries } = await sb
      .from('ai_conversation_summaries')
      .select('summary,topics,actions_taken,unresolved,created_at')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    return { memories: memories || [], summaries: summaries || [] };
  } catch (e) {
    console.warn('[ai-assist] loadMemory failed:', e.message);
    return { memories: [], summaries: [] };
  }
}

function buildMemoryBlock(memories, summaries) {
  const lines = [];

  if (summaries.length > 0) {
    lines.push('## RECENT CONVERSATION HISTORY');
    summaries.forEach((s) => {
      const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      lines.push(`[${date}] ${s.summary}`);
      if (s.unresolved) lines.push(`  ↳ Unresolved: ${s.unresolved}`);
    });
    lines.push('');
  }

  if (memories.length > 0) {
    lines.push('## WHAT I KNOW ABOUT THIS USER');
    const byCategory = {};
    memories.forEach(m => {
      if (!byCategory[m.category]) byCategory[m.category] = [];
      byCategory[m.category].push(`${m.key}: ${m.value}${m.context ? ` (${m.context})` : ''}`);
    });
    Object.entries(byCategory).forEach(([cat, facts]) => {
      lines.push(`${cat.toUpperCase()}: ${facts.join(' | ')}`);
    });
    lines.push('');
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

async function extractAndSaveMemory(orgId, userId, userName, conversation, sb) {
  if (!sb || !conversation || conversation.length < 2) return;
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return;
    const client = new Anthropic({ apiKey });

    const convoText = conversation.map(m =>
      `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
    ).join('\n');

    const extractResp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a memory extractor for an AI assistant used in a food manufacturing facility.

From this conversation, extract:
1. A 2-3 sentence SUMMARY of what happened
2. Any FACTS to remember about this user (preferences, shortcuts they use, equipment nicknames, frequent tasks, their role patterns)
3. Note the language used (English or Spanish)

Conversation:
${convoText}

Respond ONLY with valid JSON:
{
  "summary": "...",
  "topics": ["topic1","topic2"],
  "actions_taken": ["action1"],
  "unresolved": "anything left open or null",
  "memories": [
    { "category": "preference|part|equipment|shorthand|workflow|person|language", "key": "short_key", "value": "value", "context": "optional detail or null" }
  ]
}`
      }],
    });

    const raw = extractResp.content[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.summary) {
      await sb.from('ai_conversation_summaries').insert({
        organization_id: orgId,
        user_id: userId,
        user_name: userName,
        summary: parsed.summary,
        topics: parsed.topics || [],
        actions_taken: parsed.actions_taken || [],
        unresolved: parsed.unresolved || null,
        message_count: conversation.length,
      });
    }

    if (parsed.memories?.length > 0) {
      for (const mem of parsed.memories) {
        if (!mem.key || !mem.value) continue;
        const { data: existing } = await sb
          .from('ai_assistant_memory')
          .select('id,times_confirmed')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .eq('category', mem.category)
          .eq('key', mem.key)
          .maybeSingle();

        if (existing) {
          await sb.from('ai_assistant_memory').update({
            value: mem.value,
            context: mem.context,
            times_confirmed: (existing.times_confirmed || 1) + 1,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await sb.from('ai_assistant_memory').insert({
            organization_id: orgId,
            user_id: userId,
            category: mem.category,
            key: mem.key,
            value: mem.value,
            context: mem.context || null,
          });
        }
      }
    }
  } catch (e) {
    console.warn('[ai-assist] extractAndSaveMemory failed:', e.message);
  }
}

function detectLanguage(text) {
  if (!text) return 'en';
  const spanishIndicators = [
    /\b(el|la|los|las|un|una|unos|unas)\b/i,
    /\b(es|son|está|están|hay|tiene|tienen)\b/i,
    /\b(que|qué|cómo|dónde|cuándo|quién|cuál)\b/i,
    /\b(muéstrame|lista|encuentra|dame|abre|crea|inicia|termina|cancela)\b/i,
    /\b(por favor|gracias|hola|buenos|buenas|sí|no)\b/i,
    /[áéíóúüñ¿¡]/i,
  ];
  const matches = spanishIndicators.filter(r => r.test(text)).length;
  return matches >= 2 ? 'es' : 'en';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI service not configured' });

  try {
    const { command, image, context, conversation } = req.body;
    if (!command && !image) return res.status(400).json({ error: 'No command or image provided' });

    const client = new Anthropic({ apiKey });

    const orgId    = context?.organizationId || null;
    const userId   = context?.userId || null;
    const userName = context?.userName || 'Operator';

    const detectedLang = detectLanguage(command || '');
    const contextLang  = context?.language || 'en';
    const userLanguage = detectedLang === 'es' ? 'es' : contextLang;

    const sb = getSupabaseAdmin();

    const [memoryResult, schemaBlock] = await Promise.all([
      (orgId && userId) ? loadMemory(orgId, userId) : Promise.resolve({ memories: [], summaries: [] }),
      buildSchemaBlock(command),
    ]);
    const memoryBlock = buildMemoryBlock(memoryResult.memories, memoryResult.summaries);

    const extras = [memoryBlock, schemaBlock].filter(Boolean).join('\n\n');
    const dynamicSystem = extras ? `${SYSTEM_PROMPT}\n\n${extras}` : SYSTEM_PROMPT;

    const userContent = [];

    if (image) {
      let imageData = image.data || '';
      if (imageData.includes(',')) imageData = imageData.split(',')[1];
      if (!imageData || imageData.length < 100) return res.status(400).json({ error: 'Invalid image data' });
      userContent.push({ type: 'image', source: { type: 'base64', media_type: image.media_type || 'image/jpeg', data: imageData } });
    }

    const contextStr = context
      ? `\n\n[Context: Screen="${context.screen||'unknown'}", User=${context.userName||'unknown'} (${context.userRole||'unknown'}), Dept=${context.userDepartment||'unknown'}, Room=${context.currentRoom||'none'}, Language=${userLanguage}]`
      : '';

    userContent.push({ type: 'text', text: (command || 'What do you see in this image?') + contextStr });

    const messages = [];
    if (conversation && Array.isArray(conversation)) conversation.forEach(m => messages.push(m));
    messages.push({ role: 'user', content: userContent });

    const photoTemplates = ['create_task_feed_post_broken_glove','create_task_feed_post_chemical_spill','create_task_feed_post_equipment_breakdown','create_task_feed_post_foreign_material','create_task_feed_post_metal_detector_reject','create_task_feed_post_pest_sighting','create_task_feed_post_temperature_deviation'];

    let response;
    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (loopCount < MAX_LOOPS) {
      loopCount++;
      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: dynamicSystem,
        tools: TOOLS,
        messages,
      });

      const hasWebSearch = response.content.some(b => b.type === 'server_tool_use');
      if (!hasWebSearch || response.stop_reason === 'end_turn') break;

      messages.push({ role: 'assistant', content: response.content });

      const toolResults = response.content
        .filter(b => b.type === 'server_tool_use')
        .map(b => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: b.output || '',
        }));

      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
    }

    const result = {
      success: true, action: null, tool_name: null, params: null,
      speech: null, needs_photo: false, conversation_continue: false,
      assistant_message: { role: 'assistant', content: response.content },
    };

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        result.action = 'tool_call';
        result.tool_name = block.name;
        result.params = block.input;
        result.tool_use_id = block.id;
        if (photoTemplates.includes(block.name) && !image) result.needs_photo = true;
        console.log('[ai-assist] Tool:', block.name, JSON.stringify(block.input).substring(0, 200));
      }
      if (block.type === 'text') result.speech = block.text;
    }

    const es = userLanguage === 'es';

    // ── Code Editor tool handling ────────────────────────────────────────────
    const codeEditorTools = ['list_screens', 'read_screen', 'edit_screen', 'deploy_change'];
    if (result.tool_name && codeEditorTools.includes(result.tool_name)) {
      const editorResult = await handleCodeEditorTool(
        result.tool_name,
        result.params || {},
        userLanguage
      );
      result.action = editorResult.action || result.tool_name;
      result.speech = editorResult.speech || result.speech;
      result.code_editor = editorResult;

      if (result.tool_name === 'edit_screen' && editorResult.pending_commit) {
        result.pending_diff = {
          path: editorResult.path,
          new_content: editorResult.new_content,
          original_sha: editorResult.original_sha,
          diff_summary: editorResult.diff_summary,
        };
        result.conversation_continue = true;
      }
    }

    // ── Standard tool speech fallbacks ──────────────────────────────────────
    if (result.tool_name === 'ask_clarification') { result.conversation_continue = true; result.speech = result.params?.question || result.speech; result.action = 'clarify'; }
    if (result.tool_name === 'general_response') { result.speech = result.params?.message || result.speech; result.action = 'info'; }
    if (result.tool_name === 'navigate') {
      result.action = 'navigate';
      const rawScreen = result.params?.screen || '';
      const humanScreen = rawScreen.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      result.speech = result.speech || (es ? `Abriendo ${humanScreen}.` : `Opening ${humanScreen}.`);
    }
    if (result.tool_name === 'mark_employee_safe') {
      result.action = 'mark_employee_safe';
      const name = result.params?.employee_name || '';
      result.speech = result.speech || (es ? `Marcando a ${name} como seguro.` : `Marking ${name} safe.`);
    }
    if (result.tool_name === 'mark_multiple_employees_safe') {
      result.action = 'mark_multiple_employees_safe';
      const names = (result.params?.employee_names || []).join(', ');
      result.speech = result.speech || (es ? `Marcando como seguros: ${names}.` : `Marking ${names} safe.`);
    }
    if (result.tool_name === 'get_roll_call_status') { result.action = 'get_roll_call_status'; result.speech = result.speech || (es ? 'Verificando el estado del pase de lista.' : 'Checking roll call status.'); }
    if (result.tool_name === 'initiate_roll_call') { result.action = 'initiate_roll_call'; result.speech = result.speech || (es ? 'Iniciando el pase de lista ahora.' : 'Initiating roll call now.'); }
    if (result.tool_name === 'end_emergency_protocol') { result.action = 'end_emergency_protocol'; result.speech = result.speech || (es ? 'Protocolo finalizado.' : 'Ending protocol and resolving event.'); }
    if (result.tool_name === 'cancel_emergency_event') { result.action = 'cancel_emergency_event'; result.speech = result.speech || (es ? 'Evento cancelado.' : 'Cancelling event.'); }
    if (result.tool_name === 'save_emergency_details') { result.action = 'save_emergency_details'; result.speech = result.speech || (es ? 'Detalles guardados.' : 'Saving event details.'); }
    if (result.tool_name === 'view_emergency_log') { result.action = 'view_emergency_log'; result.speech = result.speech || (es ? 'Abriendo el registro de eventos.' : 'Opening event log.'); }
    if (result.tool_name === 'close_emergency_screen') { result.action = 'close_emergency_screen'; result.speech = result.speech || (es ? 'Cerrando pantalla.' : 'Closing protocol screen.'); }
    if (result.tool_name === 'start_emergency_protocol') {
      result.action = 'emergency_protocol';
      const isDrill = result.params?.is_drill === true;
      const type = result.params?.emergency_type || 'fire';
      const labelEN = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const labelES = type.replace(/_/g, ' ');
      result.speech = result.speech || (es
        ? (isDrill ? `Iniciando simulacro de ${labelES}.` : `⚠️ Protocolo de emergencia: ${labelES}. Iniciando pase de lista.`)
        : (isDrill ? `Starting ${labelEN} drill. Navigating to roll call now.` : `⚠️ Initiating ${labelEN} emergency protocol. Roll call starting immediately.`));
    }

    if (orgId && userId && sb && conversation && conversation.length >= 4) {
      const fullConvo = [...(conversation || []),
        { role: 'user', content: command || '' },
        { role: 'assistant', content: result.speech || '' },
      ];
      setImmediate(() => extractAndSaveMemory(orgId, userId, userName, fullConvo, sb));
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('[ai-assist] Error:', err?.message);
    return res.status(500).json({ error: 'AI processing failed', details: err.message });
  }
};
