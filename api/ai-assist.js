// api/ai-assist.js
// Vercel Serverless Function — TulKenz OPS AI Assistant v3
// Uses Claude TOOL USE (function calling) — reliable, schema-enforced actions
// Supports multi-turn conversation history for follow-up questions

const Anthropic = require('@anthropic-ai/sdk').default;

// ══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are the TulKenz OPS AI Assistant for NextLN, a food manufacturing facility (Chike brand). You help operators, technicians, supervisors, and managers execute tasks through the TulKenz OPS platform using tools.

## HOW YOU WORK

You have tools for every action in the app. When a user asks you to do something, pick the right tool and fill in ALL parameters from what they said. If a required field is missing, use ask_clarification — never guess on required fields. For optional fields the user didn't mention, use "N/A".

## CRITICAL ROUTING RULES

USE TASK FEED TEMPLATES when someone says:
- "Report..." / "Log..." / "Found a..." / "There's a..." / "We have a..."
- Any incident, finding, issue, complaint, or observation
- Broken glove, foreign material, chemical spill, pest, injury, equipment problem, temp issue, metal detector hit, customer complaint

USE create_work_order ONLY when someone says:
- "Schedule maintenance on..." / "Create a work order for..." / "Need to repair..."
- Planned repairs or follow-up work after an issue was already reported

USE query_task_feed when someone says:
- "Show me open PMs for maintenance"
- "What reactive tasks does quality have?"
- "Pull up scheduled tasks for this week"
- Any "show me / pull up / what's" about task feed items

USE navigate when someone says:
- "Go to..." / "Open..." / "Show me the screen for..." / "Take me to..."

## BEHAVIOR RULES

1. ALWAYS use a tool to take action. Never just describe what you would do.
2. Be conversational — talk like a knowledgeable maintenance supervisor.
3. Keep responses under 3 sentences unless the user asks for detail.
4. When you need a signature (initials + PIN), use ask_clarification to request it.
5. Check the user's role from context before navigating to restricted screens.

## FACILITY REFERENCE

Rooms: PR1 (Production Room 1), PR2 (Production Room 2), PA1 (Packet Area 1), PA2 (Packet Area 2), BB1 (Big Blend), SB1 (Small Blend)
Departments: 1001=Maintenance, 1002=Sanitation, 1003=Production, 1004=Quality, 1005=Safety`;

// ══════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ══════════════════════════════════════════════════════════════════

const TOOLS = [

  // ─────────────────────────────────────────────
  // TASK FEED — Quality Templates
  // ─────────────────────────────────────────────

  {
    name: 'create_task_feed_post_broken_glove',
    description: 'Report a broken glove incident. Use when someone found a torn, ripped, broken, or damaged glove. Dispatches to ALL 5 departments. Remind user a photo is required if they did not provide one.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Room or area where the glove was found (PR1, PR2, PA1, PA2, BB1, SB1, or description like Warehouse)' },
        glove_type: { type: 'string', enum: ['Nitrile', 'Latex', 'Vinyl', 'Cut-Resistant', 'Other'] },
        missing_fragment_found: { type: 'string', enum: ['Yes - fragment recovered', 'No - fragment missing'] },
        description: { type: 'string', description: 'How the glove broke, where it was found, contamination risk' },
        production_line: { type: 'string', enum: ['Line 1', 'Line 2', 'Line 3', 'N/A'] },
        immediate_action_taken: { type: 'string', description: 'What was done immediately — e.g. Stopped the line, Segregated product' },
        production_stopped: { type: 'boolean', description: 'Whether production was stopped' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'glove_type', 'missing_fragment_found', 'description', 'production_line', 'immediate_action_taken', 'production_stopped'],
    },
  },

  {
    name: 'create_task_feed_post_foreign_material',
    description: 'Report a foreign material finding. Use when someone found an object, debris, or contamination in product or on the line.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Where the foreign material was found' },
        material_type: { type: 'string', enum: ['Metal', 'Plastic', 'Glass', 'Wood', 'Rubber', 'Bone', 'Insect', 'Other'] },
        found_in_product: { type: 'string', enum: ['Yes', 'No', 'Unknown'] },
        description: { type: 'string', description: 'Description of the object and how it was found' },
        production_line: { type: 'string', enum: ['Line 1', 'Line 2', 'Line 3', 'N/A'] },
        product_quarantined: { type: 'boolean', description: 'Whether affected product was quarantined' },
        immediate_action_taken: { type: 'string', description: 'What was done immediately' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'material_type', 'found_in_product', 'description', 'production_line', 'product_quarantined', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_chemical_spill',
    description: 'Report a chemical spill. Use when a cleaning chemical, lubricant, or other chemical has spilled.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Where the spill occurred' },
        chemical_name: { type: 'string', description: 'Name of the chemical spilled' },
        quantity_spilled: { type: 'string', description: 'Approximate amount spilled (e.g. 1 gallon, small amount)' },
        product_contact: { type: 'string', enum: ['Yes', 'No', 'Unknown'], description: 'Did the chemical contact any product?' },
        immediate_action_taken: { type: 'string', description: 'Containment and cleanup actions taken' },
        area_cleared: { type: 'boolean', description: 'Whether the area was cleared of personnel' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
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
        location: { type: 'string', description: 'Where the injury occurred' },
        injury_type: { type: 'string', enum: ['Cut', 'Burn', 'Strain/Sprain', 'Slip/Fall', 'Chemical Exposure', 'Near Miss', 'Other'] },
        body_part: { type: 'string', description: 'Body part affected (e.g. right hand, lower back)' },
        employee_name: { type: 'string', description: 'Name of injured employee (or Unknown)' },
        description: { type: 'string', description: 'What happened' },
        medical_attention_required: { type: 'boolean' },
        immediate_action_taken: { type: 'string', description: 'First aid or actions taken' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'injury_type', 'body_part', 'employee_name', 'description', 'medical_attention_required', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_equipment_breakdown',
    description: 'Report equipment that has broken down, stopped working, or is malfunctioning.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Room or area where equipment is located' },
        equipment_name: { type: 'string', description: 'Name or tag of the equipment (e.g. Avatar A-1200, Conveyor PR1)' },
        symptom: { type: 'string', description: 'What is happening — error codes, sounds, behavior' },
        production_impact: { type: 'string', enum: ['Line Down', 'Reduced Speed', 'No Impact', 'Unknown'] },
        immediate_action_taken: { type: 'string', description: 'What was done immediately' },
        create_work_order_requested: { type: 'boolean', description: 'Whether the user also wants a work order created' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'equipment_name', 'symptom', 'production_impact', 'immediate_action_taken', 'create_work_order_requested'],
    },
  },

  {
    name: 'create_task_feed_post_metal_detector_reject',
    description: 'Report a metal detector reject event.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Which metal detector or room' },
        product_affected: { type: 'string', description: 'Product name or lot number' },
        quantity_rejected: { type: 'string', description: 'How many bags/units were rejected' },
        metal_found: { type: 'string', enum: ['Yes', 'No', 'Under Investigation'] },
        production_line: { type: 'string', enum: ['Line 1', 'Line 2', 'Line 3', 'N/A'] },
        immediate_action_taken: { type: 'string', description: 'Product segregation, investigation steps' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'product_affected', 'quantity_rejected', 'metal_found', 'production_line', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_pest_sighting',
    description: 'Report a pest sighting (rodent, insect, bird, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Exact location where pest was sighted' },
        pest_type: { type: 'string', enum: ['Rodent', 'Cockroach', 'Fly', 'Ant', 'Bird', 'Other Insect', 'Other'] },
        number_observed: { type: 'string', description: 'How many were seen (e.g. 1, 2-3, multiple)' },
        product_contact: { type: 'string', enum: ['Yes', 'No', 'Unknown'] },
        evidence_type: { type: 'string', enum: ['Live', 'Dead', 'Droppings', 'Damage', 'Tracks', 'Other'] },
        immediate_action_taken: { type: 'string', description: 'What was done immediately' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'pest_type', 'number_observed', 'product_contact', 'evidence_type', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_temperature_deviation',
    description: 'Report a temperature deviation — cooler, freezer, room temp, or process temp out of spec.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Which room, cooler, or equipment' },
        recorded_temp: { type: 'string', description: 'Temperature that was recorded (e.g. 45°F)' },
        required_temp: { type: 'string', description: 'What the temperature should be (e.g. 38°F max)' },
        duration: { type: 'string', description: 'How long out of spec (e.g. 2 hours, unknown)' },
        product_affected: { type: 'string', description: 'Product that may be affected, or N/A' },
        immediate_action_taken: { type: 'string', description: 'Corrective actions taken' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['location', 'recorded_temp', 'required_temp', 'duration', 'product_affected', 'immediate_action_taken'],
    },
  },

  {
    name: 'create_task_feed_post_customer_complaint',
    description: 'Log a customer complaint received about a product.',
    input_schema: {
      type: 'object',
      properties: {
        complaint_type: { type: 'string', enum: ['Foreign Material', 'Off Flavor/Odor', 'Underfill', 'Seal Failure', 'Label Issue', 'Allergen Concern', 'Other'] },
        product_name: { type: 'string', description: 'Product name from the complaint' },
        lot_number: { type: 'string', description: 'Lot number if provided by customer, or Unknown' },
        description: { type: 'string', description: 'Details of the complaint' },
        customer_name: { type: 'string', description: 'Customer or account name, or Unknown' },
        immediate_action_taken: { type: 'string', description: 'Initial response or hold actions' },
        additional_notes: { type: 'string', description: 'Any extra info. Use N/A if nothing to add.' },
      },
      required: ['complaint_type', 'product_name', 'lot_number', 'description', 'customer_name', 'immediate_action_taken'],
    },
  },

  // ─────────────────────────────────────────────
  // TASK FEED — Generic + Query
  // ─────────────────────────────────────────────

  {
    name: 'create_task_feed_post_generic',
    description: 'Create a generic task feed post, purchase request, or create task when no specific template matches.',
    input_schema: {
      type: 'object',
      properties: {
        post_type: { type: 'string', enum: ['report_issue', 'create_task', 'purchase_request', 'pre_op', 'other'], description: 'Type of task feed post' },
        template_name: { type: 'string', description: 'Name or title for the post' },
        departments: { type: 'array', items: { type: 'string' }, description: 'Department codes to dispatch to (1001=Maintenance, 1002=Sanitation, 1003=Production, 1004=Quality, 1005=Safety)' },
        location: { type: 'string', description: 'Room or area, or N/A' },
        notes: { type: 'string', description: 'Full description of the task or issue' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['post_type', 'template_name', 'departments', 'notes', 'priority'],
    },
  },

  {
    name: 'query_task_feed',
    description: 'Search or filter task feed posts. Use when the user asks to see open tasks, PMs, reactive tasks, scheduled items, etc.',
    input_schema: {
      type: 'object',
      properties: {
        department_code: { type: 'string', description: 'Filter by department code (1001-1005), or omit for all departments' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'all'], description: 'Filter by status' },
        post_type: { type: 'string', description: 'Filter by type: PM, reactive, pre_op, purchase_request, etc. Omit for all types.' },
        date_range: { type: 'string', enum: ['today', 'this_week', 'this_month', 'all'], description: 'Date range filter' },
      },
      required: ['status'],
    },
  },

  // ─────────────────────────────────────────────
  // WORK ORDERS
  // ─────────────────────────────────────────────

  {
    name: 'create_work_order',
    description: 'Create a maintenance work order for scheduled or follow-up repairs. Do NOT use for reporting incidents — use task feed templates instead.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the work order' },
        equipment_name: { type: 'string', description: 'Name of equipment needing work' },
        description: { type: 'string', description: 'Detailed description of work needed' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        type: { type: 'string', enum: ['reactive', 'preventive', 'predictive'] },
        parts_needed: { type: 'array', items: { type: 'string' }, description: 'List of parts needed, if known' },
      },
      required: ['title', 'equipment_name', 'description', 'priority', 'type'],
    },
  },

  // ─────────────────────────────────────────────
  // PRE-OP
  // ─────────────────────────────────────────────

  {
    name: 'start_pre_op',
    description: 'Start a Pre-Op inspection for a room. Dispatches checklist tasks to all 5 departments.',
    input_schema: {
      type: 'object',
      properties: {
        room: { type: 'string', enum: ['PA1', 'PA2', 'PR1', 'PR2', 'BB1', 'SB1'] },
      },
      required: ['room'],
    },
  },

  // ─────────────────────────────────────────────
  // EQUIPMENT & PARTS
  // ─────────────────────────────────────────────

  {
    name: 'lookup_part',
    description: 'Search parts inventory for a specific part by name, part number, or description.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Part name, number, or description to search for' },
      },
      required: ['query'],
    },
  },

  {
    name: 'lookup_equipment',
    description: 'Get equipment details, specs, PM history, troubleshooting info, or manual content.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Equipment name or tag to look up' },
        section: { type: 'string', enum: ['specs', 'manual', 'troubleshooting', 'pm_history', 'parts'], description: 'What info to retrieve' },
      },
      required: ['query'],
    },
  },

  {
    name: 'diagnose_issue',
    description: 'Analyze an equipment problem from a description or photo and suggest causes, fixes, and parts needed.',
    input_schema: {
      type: 'object',
      properties: {
        equipment: { type: 'string', description: 'Equipment name (e.g. Avatar A-1200)' },
        symptom: { type: 'string', description: 'What the user describes — the problem' },
        create_work_order: { type: 'boolean', description: 'Whether to also create a work order for this issue' },
      },
      required: ['equipment', 'symptom', 'create_work_order'],
    },
  },

  // ─────────────────────────────────────────────
  // PRODUCTION
  // ─────────────────────────────────────────────

  {
    name: 'start_production_run',
    description: 'Start a production run for a room.',
    input_schema: {
      type: 'object',
      properties: {
        room: { type: 'string', enum: ['PA1', 'PA2', 'PR1', 'PR2', 'BB1', 'SB1'] },
        run_number: { type: 'string', description: 'Production run number from the schedule' },
        product: { type: 'string', description: 'Product name or SKU being produced' },
      },
      required: ['room', 'run_number', 'product'],
    },
  },

  {
    name: 'end_production_run',
    description: 'End the active production run for a room.',
    input_schema: {
      type: 'object',
      properties: {
        room: { type: 'string', enum: ['PA1', 'PA2', 'PR1', 'PR2', 'BB1', 'SB1'] },
        run_number: { type: 'string', description: 'Run number to end, if known' },
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

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────

  {
    name: 'navigate',
    description: 'Navigate to any screen in the app. Use for "go to", "open", "show me the screen for", "take me to".',
    input_schema: {
      type: 'object',
      properties: {
        screen: {
          type: 'string',
          enum: [
            'task_feed', 'work_orders', 'equipment', 'parts_inventory',
            'pm_schedule', 'purchase_requests', 'sds_library',
            'audits', 'emergency_protocol', 'employee_directory',
            'production_runs', 'room_status', 'dashboard', 'reports',
            'settings', 'sanitation', 'quality', 'safety', 'compliance',
          ],
          description: 'Screen to navigate to',
        },
        record_id: { type: 'string', description: 'Optional: specific record ID to open (e.g. equipment tag PA1-AVT-001)' },
      },
      required: ['screen'],
    },
  },

  // ─────────────────────────────────────────────
  // UTILITY
  // ─────────────────────────────────────────────

  {
    name: 'ask_clarification',
    description: 'Ask the user for more information when required fields are missing. Include what you already know so you do not ask again.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The specific question to ask' },
        partial_data: { type: 'object', description: 'Fields already collected from the user', additionalProperties: true },
        awaiting_template: { type: 'string', description: 'The tool name you were about to call, so the app can resume after the answer' },
      },
      required: ['question'],
    },
  },

  {
    name: 'general_response',
    description: 'Respond to general questions, greetings, or informational requests that do not require an app action.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Your response to the user' },
      },
      required: ['message'],
    },
  },
];

// ══════════════════════════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[ai-assist] ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const { command, image, context, conversation } = req.body;

    if (!command && !image) {
      return res.status(400).json({ error: 'No command or image provided' });
    }

    const client = new Anthropic({ apiKey });

    // Build user message
    const userContent = [];

    if (image) {
      // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
      // The Anthropic API requires raw base64 only — no prefix
      let imageData = image.data || '';
      if (imageData.includes(',')) {
        imageData = imageData.split(',')[1];
      }

      // Validate we actually have data
      if (!imageData || imageData.length < 100) {
        console.error('[ai-assist] Image data missing or too small');
        return res.status(400).json({ error: 'Invalid image data — please try again' });
      }

      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.media_type || 'image/jpeg',
          data: imageData,
        },
      });
    }

    const contextStr = context
      ? `\n\n[Context: Screen="${context.screen || 'unknown'}", User=${context.userName || 'unknown'} (${context.userRole || 'unknown'}), Department=${context.userDepartment || 'unknown'}, Room=${context.currentRoom || 'none'}, ActiveRecord=${context.activeRecordId || 'none'}]`
      : '';

    userContent.push({
      type: 'text',
      text: (command || 'What do you see in this image?') + contextStr,
    });

    // Build full message history
    // conversation = prior turns only (current message NOT included)
    // We append the current user message here
    const messages = [];

    if (conversation && Array.isArray(conversation) && conversation.length > 0) {
      conversation.forEach((msg) => messages.push(msg));
    }

    // Always append current user message last
    messages.push({ role: 'user', content: userContent });

    // Call Claude with tools
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    console.log('[ai-assist] Stop reason:', response.stop_reason);

    // Build result
    const result = {
      success: true,
      action: null,
      tool_name: null,
      params: null,
      speech: null,
      needs_photo: false,
      conversation_continue: false,
      assistant_message: { role: 'assistant', content: response.content },
    };

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        result.action = 'tool_call';
        result.tool_name = block.name;
        result.params = block.input;
        result.tool_use_id = block.id;

        const photoTemplates = [
          'create_task_feed_post_broken_glove',
          'create_task_feed_post_chemical_spill',
          'create_task_feed_post_equipment_breakdown',
          'create_task_feed_post_foreign_material',
          'create_task_feed_post_metal_detector_reject',
          'create_task_feed_post_pest_sighting',
          'create_task_feed_post_temperature_deviation',
        ];

        if (photoTemplates.includes(block.name) && !image) {
          result.needs_photo = true;
        }

        console.log('[ai-assist] Tool:', block.name, '| Params:', JSON.stringify(block.input).substring(0, 300));
      }

      if (block.type === 'text') {
        result.speech = block.text;
      }
    }

    // Special handling for utility tools
    if (result.tool_name === 'ask_clarification') {
      result.conversation_continue = true;
      result.speech = result.params?.question || result.speech;
      result.action = 'clarify';
    }

    if (result.tool_name === 'general_response') {
      result.speech = result.params?.message || result.speech;
      result.action = 'info';
    }

    if (result.tool_name === 'navigate') {
      result.action = 'navigate';
      result.speech = result.speech || `Opening ${result.params?.screen || 'screen'}.`;
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('[ai-assist] Error type:', err?.constructor?.name);
    console.error('[ai-assist] Error message:', err?.message);
    console.error('[ai-assist] Error status:', err?.status);
    console.error('[ai-assist] Error body:', JSON.stringify(err?.error || err?.body || {}));
    return res.status(500).json({
      error: 'AI processing failed',
      details: err.message,
      type: err?.constructor?.name,
    });
  }
};
