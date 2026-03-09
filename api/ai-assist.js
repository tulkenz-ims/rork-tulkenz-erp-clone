// api/ai-assist.js
// Vercel Serverless Function — TulKenz OPS AI Assistant v3
// Uses Claude TOOL USE (function calling) — reliable, schema-enforced actions

const Anthropic = require('@anthropic-ai/sdk').default;

const SYSTEM_PROMPT = `You are the TulKenz OPS AI Assistant for NextLN, a food manufacturing facility (Chike brand). You help operators, technicians, supervisors, and managers execute tasks through the TulKenz OPS platform using tools.

## HOW YOU WORK
You have tools for every action in the app. When a user asks you to do something, pick the right tool and fill in ALL parameters from what they said. If a required field is missing, use ask_clarification. For optional fields not mentioned, use "N/A".

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

USE navigate when someone says "go to", "open", "take me to" a screen.

## BEHAVIOR RULES
1. ALWAYS use a tool. Never just describe what you would do.
2. Be conversational — talk like a knowledgeable maintenance supervisor.
3. Keep responses under 3 sentences unless detail is requested.

## FACILITY
Rooms: PR1, PR2, PA1, PA2, BB1, SB1
Departments: 1001=Maintenance, 1002=Sanitation, 1003=Production, 1004=Quality, 1005=Safety`;

const TOOLS = [

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
    description: 'Search and list records from ANY module or table in the app. Use for any "show me", "list", "find", "pull up", "what are" request about data. Covers all 200+ tables including parts, work orders, equipment, employees, vendors, SDS, LOTO, CAPA, NCR, purchase orders, PM schedules, production runs, safety records, quality records, recycling, planner, attendance, and everything else.',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Exact Supabase table name. Examples: materials, work_orders, pm_schedules, employees, vendors, sds_records, loto_procedures, capa_records, ncr_records, purchase_orders, purchase_requests, production_runs, safety_observations, quality_inspections, chemical_inventory, downtime_events, parts_issues, inventory_adjustments, attendance_records, time_entries, planner_projects, recycling_cardboard, etc.',
        },
        filters: {
          type: 'object',
          description: 'Exact match filters as key:value pairs. Common: {"status":"open"}, {"department":"Maintenance"}, {"location":"PA1"}, {"category":"Electrical"}, {"priority":"high"}, {"type":"preventive"}',
          additionalProperties: true,
        },
        search_column: {
          type: 'string',
          description: 'Column for text search (ilike). Use: "name" for parts/equipment/chemicals, "title" for work orders/tasks, "first_name" or "last_name" for employees, "chemical_name" for SDS, "procedure_number" for LOTO, "equipment_name" for PM schedules.',
        },
        search_term: {
          type: 'string',
          description: 'Text to search for in search_column.',
        },
        order_by: {
          type: 'string',
          description: 'Sort column. Default: created_at. Use due_date for WOs/PMs, name for parts/equipment lists, incident_date for safety/OSHA records.',
        },
        order_direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'asc or desc. Default desc for dates, asc for name lists.',
        },
        date_filter_column: {
          type: 'string',
          description: 'Column for date filtering: created_at, due_date, incident_date, started_at, scheduled_date, next_due_date.',
        },
        date_range: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month', 'this_year', 'all'],
          description: 'Time range filter. Only set if user specified.',
        },
        limit: {
          type: 'number',
          description: 'Max records. Default 25. Use 50 for "all" or "everything" requests.',
        },
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
      properties: { room: { type: 'string', enum: ['PA1', 'PA2', 'PR1', 'PR2', 'BB1', 'SB1'] } },
      required: ['room'],
    },
  },

  // ── Parts & Equipment ────────────────────────

  {
    name: 'lookup_part',
    description: 'Search parts inventory by name, number, or description.',
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

  // ── Navigation ───────────────────────────────

  {
    name: 'navigate',
    description: 'Navigate to any screen. Modal closes before navigating.',
    input_schema: {
      type: 'object',
      properties: {
        screen: {
          type: 'string',
          enum: ['task_feed', 'work_orders', 'equipment', 'parts_inventory', 'pm_schedule', 'purchase_requests', 'sds_library', 'audits', 'emergency_protocol', 'employee_directory', 'production_runs', 'room_status', 'dashboard', 'reports', 'settings', 'sanitation', 'quality', 'safety', 'compliance'],
        },
        record_id: { type: 'string' },
      },
      required: ['screen'],
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

    const userContent = [];

    if (image) {
      let imageData = image.data || '';
      if (imageData.includes(',')) imageData = imageData.split(',')[1];
      if (!imageData || imageData.length < 100) return res.status(400).json({ error: 'Invalid image data' });
      userContent.push({ type: 'image', source: { type: 'base64', media_type: image.media_type || 'image/jpeg', data: imageData } });
    }

    const contextStr = context
      ? `\n\n[Context: Screen="${context.screen||'unknown'}", User=${context.userName||'unknown'} (${context.userRole||'unknown'}), Dept=${context.userDepartment||'unknown'}, Room=${context.currentRoom||'none'}]`
      : '';

    userContent.push({ type: 'text', text: (command || 'What do you see in this image?') + contextStr });

    const messages = [];
    if (conversation && Array.isArray(conversation)) conversation.forEach(m => messages.push(m));
    messages.push({ role: 'user', content: userContent });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    const result = {
      success: true, action: null, tool_name: null, params: null,
      speech: null, needs_photo: false, conversation_continue: false,
      assistant_message: { role: 'assistant', content: response.content },
    };

    const photoTemplates = ['create_task_feed_post_broken_glove','create_task_feed_post_chemical_spill','create_task_feed_post_equipment_breakdown','create_task_feed_post_foreign_material','create_task_feed_post_metal_detector_reject','create_task_feed_post_pest_sighting','create_task_feed_post_temperature_deviation'];

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

    if (result.tool_name === 'ask_clarification') { result.conversation_continue = true; result.speech = result.params?.question || result.speech; result.action = 'clarify'; }
    if (result.tool_name === 'general_response') { result.speech = result.params?.message || result.speech; result.action = 'info'; }
    if (result.tool_name === 'navigate') { result.action = 'navigate'; result.speech = result.speech || `Opening ${result.params?.screen}.`; }

    return res.status(200).json(result);

  } catch (err) {
    console.error('[ai-assist] Error:', err?.message);
    return res.status(500).json({ error: 'AI processing failed', details: err.message });
  }
};
