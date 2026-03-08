// api/ai-assist.js
// Vercel Serverless Function — TulKenz OPS AI Assistant v2
// Uses Claude TOOL USE (function calling) instead of JSON prompting
// Each task feed template = a tool with exact field schemas
// Claude picks the right tool + fills every field from the user's message

const Anthropic = require('@anthropic-ai/sdk').default;

// ══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — shorter now, behavior rules only
// Template knowledge is encoded in the tools themselves
// ══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are the TulKenz OPS AI Assistant for a food manufacturing facility (NextLN, Chike brand). You help operators, technicians, supervisors, and managers execute tasks through the TulKenz OPS platform using tools.

## HOW YOU WORK

You have tools for every action in the app. When a user asks you to do something, pick the right tool and fill in ALL parameters from what they said. If they didn't mention a required field, ASK them for it before calling the tool — never guess on required fields.

## CRITICAL RULES

1. ALWAYS use a tool to take action. Never just describe what you would do.
2. Every field marked required MUST be filled. If the user didn't provide it, use the ask_clarification tool to ask.
3. For optional fields the user didn't mention, use "N/A".
4. Reporting an issue = Task Feed post (pick the right template). NOT a work order.
5. Work orders are for scheduled maintenance or follow-up repairs, not for reporting incidents.
6. Match the user's description to the most specific template available. "Broken glove" = broken_glove template, "found metal" = foreign_material template, etc.
7. Be conversational in your text responses — talk like a knowledgeable maintenance supervisor.
8. Keep responses under 3 sentences unless asked for detail.

## ROUTING RULES — Task Feed vs Work Order

USE TASK FEED (create_task_feed_post_*) when someone says:
- "Report..." / "Log..." / "Found a..." / "There's a..." / "We have a..."
- Any incident, finding, issue, complaint, or observation
- Broken glove, foreign material, chemical spill, pest, injury, equipment problem, temp issue, metal detector hit, customer complaint

USE WORK ORDER (create_work_order) ONLY when someone says:
- "Schedule maintenance on..." / "Create a work order for..." / "Need to repair..."
- Planned repairs or follow-up work after an issue was already reported

## FACILITY REFERENCE

Rooms: PR1 (Production Room 1), PR2 (Production Room 2), PA1 (Packet Area 1), PA2 (Packet Area 2), BB1 (Big Blend), SB1 (Small Blend)
Production Lines: Line 1, Line 2, Line 3
Departments: 1001=Maintenance, 1002=Sanitation, 1003=Production, 1004=Quality, 1005=Safety
`;

// ══════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// Each task feed template = one tool with exact field schema
// Claude CAN'T deviate from these — it's enforced by the API
// ══════════════════════════════════════════════════════════════════

const TOOLS = [
  // ────────────────────────────────────────────
  // TASK FEED: Quality Templates
  // ────────────────────────────────────────────
  {
    name: "create_task_feed_post_broken_glove",
    description: "Report a broken glove incident. Use when someone found a torn, ripped, broken, or damaged glove. This is a Quality department task feed post that dispatches to ALL 5 departments. Photo is required — remind the user if they didn't provide one.",
    input_schema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Room or area where the glove was found. Use room codes: PR1, PR2, PA1, PA2, BB1, SB1, or describe area like 'Cooler 3', 'Warehouse'",
        },
        glove_type: {
          type: "string",
          enum: ["Nitrile", "Latex", "Vinyl", "Cut-Resistant", "Other"],
          description: "Type of glove that was broken",
        },
        missing_fragment_found: {
          type: "string",
          enum: ["Yes - fragment recovered", "No - fragment missing"],
          description: "Whether the missing piece/fragment of the glove was found and recovered",
        },
        description: {
          type: "string",
          description: "What happened — how the glove broke, where it was found, any details about contamination risk",
        },
        production_line: {
          type: "string",
          enum: ["Line 1", "Line 2", "Line 3", "N/A"],
          description: "Which production line this occurred on. Use 'N/A' if not on a production line.",
        },
        immediate_action_taken: {
          type: "string",
          description: "What was done immediately after discovery — e.g. 'Stopped the line', 'Segregated product', 'Replaced glove'",
        },
        production_stopped: {
          type: "boolean",
          description: "Whether production was stopped due to this incident",
        },
        additional_notes: {
          type: "string",
          description: "Any extra information. Use 'N/A' if nothing to add.",
        },
      },
      required: ["location", "glove_type", "missing_fragment_found", "description", "production_line", "immediate_action_taken", "production_stopped"],
    },
  },

  // PLACEHOLDER — add each template as we build them:
  // create_task_feed_post_chemical_spill
  // create_task_feed_post_customer_complaint
  // create_task_feed_post_employee_injury
  // create_task_feed_post_equipment_breakdown
  // create_task_feed_post_foreign_material
  // create_task_feed_post_metal_detector_reject
  // create_task_feed_post_pest_sighting
  // create_task_feed_post_temperature_deviation

  // ────────────────────────────────────────────
  // WORK ORDERS
  // ────────────────────────────────────────────
  {
    name: "create_work_order",
    description: "Create a maintenance work order for scheduled repair or follow-up maintenance. Do NOT use this for reporting incidents — use the appropriate task feed template instead.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for the work order" },
        equipment_name: { type: "string", description: "Name of equipment needing work" },
        description: { type: "string", description: "Detailed description of work needed" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        type: { type: "string", enum: ["reactive", "preventive", "predictive"] },
      },
      required: ["title", "equipment_name", "description", "priority", "type"],
    },
  },

  // ────────────────────────────────────────────
  // EQUIPMENT & PARTS
  // ────────────────────────────────────────────
  {
    name: "lookup_part",
    description: "Search parts inventory for a specific part by name, part number, or description",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part name, number, or description to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_equipment",
    description: "Get equipment details, specs, PM history, troubleshooting info, or manual content",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Equipment name or tag to look up" },
        section: { type: "string", enum: ["specs", "manual", "troubleshooting", "pm_history", "parts"], description: "What info to retrieve" },
      },
      required: ["query"],
    },
  },
  {
    name: "diagnose_issue",
    description: "Analyze an equipment problem from a description or photo and suggest causes, fixes, and parts needed",
    input_schema: {
      type: "object",
      properties: {
        equipment: { type: "string", description: "Equipment name (e.g. 'Avatar A-1200')" },
        symptom: { type: "string", description: "What's happening — the problem the user describes" },
      },
      required: ["equipment", "symptom"],
    },
  },

  // ────────────────────────────────────────────
  // PRODUCTION
  // ────────────────────────────────────────────
  {
    name: "change_room_status",
    description: "Change a room's andon light status",
    input_schema: {
      type: "object",
      properties: {
        room: { type: "string", enum: ["PR1", "PR2", "PA1", "PA2", "BB1", "SB1"] },
        status: { type: "string", enum: ["running", "loto", "cleaning", "setup", "idle", "down"] },
      },
      required: ["room", "status"],
    },
  },

  // ────────────────────────────────────────────
  // UTILITY
  // ────────────────────────────────────────────
  {
    name: "ask_clarification",
    description: "Ask the user for more information when you don't have enough detail to fill required fields. Always try to fill what you can and only ask about what's missing.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "What you need to know" },
        partial_data: {
          type: "object",
          description: "Fields you already know from the user's message, so you don't ask again",
          additionalProperties: true,
        },
      },
      required: ["question"],
    },
  },
  {
    name: "general_response",
    description: "Respond to general questions, greetings, or informational requests that don't require an app action",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Your response to the user" },
      },
      required: ["message"],
    },
  },
];

// ══════════════════════════════════════════════════════════════════
// HANDLER
// ══════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  // CORS
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

    // Build user message content
    const userContent = [];

    // Add image if provided (base64)
    if (image) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.media_type || 'image/jpeg',
          data: image.data,
        },
      });
    }

    // Add context about where the user is in the app
    const contextStr = context
      ? `\n\n[Context: Screen="${context.screen || 'unknown'}", User=${context.userName || 'unknown'} (${context.userRole || 'unknown'}), Room=${context.currentRoom || 'none'}]`
      : '';

    userContent.push({
      type: 'text',
      text: (command || 'What do you see in this image?') + contextStr,
    });

    // Build messages array — support multi-turn conversation
    const messages = [];

    // Add conversation history if provided (for follow-up questions)
    if (conversation && Array.isArray(conversation)) {
      conversation.forEach((msg) => {
        messages.push(msg);
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userContent });

    // Call Claude with TOOLS
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: messages,
    });

    console.log('[ai-assist] Stop reason:', response.stop_reason);

    // Process response — could be tool_use, text, or both
    const result = {
      success: true,
      action: null,
      tool_name: null,
      params: null,
      speech: null,
      needs_photo: false,
      conversation_continue: false,
    };

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        result.action = 'tool_call';
        result.tool_name = block.name;
        result.params = block.input;
        result.tool_use_id = block.id;

        // Check if this template requires a photo
        const photoRequired = [
          'create_task_feed_post_broken_glove',
          'create_task_feed_post_chemical_spill',
          'create_task_feed_post_equipment_breakdown',
          'create_task_feed_post_foreign_material',
          'create_task_feed_post_metal_detector_reject',
          'create_task_feed_post_pest_sighting',
          'create_task_feed_post_temperature_deviation',
        ];
        if (photoRequired.includes(block.name) && !image) {
          result.needs_photo = true;
        }

        console.log('[ai-assist] Tool:', block.name, '| Params:', JSON.stringify(block.input).substring(0, 200));
      }

      if (block.type === 'text') {
        result.speech = block.text;
      }
    }

    // If Claude asked for clarification, flag for multi-turn
    if (result.tool_name === 'ask_clarification') {
      result.conversation_continue = true;
      result.speech = result.params?.question || result.speech;
    }

    // If general response, just pass the message
    if (result.tool_name === 'general_response') {
      result.speech = result.params?.message || result.speech;
      result.action = 'info';
    }

    // Build assistant message for conversation history
    result.assistant_message = { role: 'assistant', content: response.content };

    return res.status(200).json(result);

  } catch (err) {
    console.error('[ai-assist] Error:', err);
    return res.status(500).json({
      error: 'AI processing failed',
      details: err.message,
    });
  }
};
