// hooks/useAIActions.ts
// Executes AI Assistant tool calls against Supabase
// Routes on tool_name from new tool-use system (ai-assist.js v3)
// Also handles legacy action strings for backward compatibility

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  navigate?: string;
}

interface AIActionParams {
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function generatePostNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(100000 + Math.random() * 900000));
  return `TF-${yy}${mm}${dd}-${rand}`;
}

function generateWONumber(type: string = 'RE'): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(100000 + Math.random() * 900000));
  return `WO-${type}-${yy}${mm}${dd}-${rand}`;
}

const DEPARTMENT_NAMES: Record<string, string> = {
  '1000': 'Projects / Offices',
  '1001': 'Maintenance',
  '1002': 'Sanitation',
  '1003': 'Production',
  '1004': 'Quality',
  '1005': 'Safety',
  '1006': 'HR',
  '1008': 'Warehouse',
  '1009': 'IT / Technology',
};

const ROOM_NAMES: Record<string, string> = {
  'PR1': 'Production Room 1',
  'PR2': 'Production Room 2',
  'PA1': 'Packet Area 1',
  'PA2': 'Packet Area 2',
  'BB1': 'Big Blend',
  'SB1': 'Small Blend',
};

// Templates that dispatch to all 5 departments
const ALL_DEPARTMENTS = ['1001', '1002', '1003', '1004', '1005'];

// Reporting department per template category
const TEMPLATE_REPORTING_DEPT: Record<string, { code: string; name: string }> = {
  broken_glove:           { code: '1004', name: 'Quality' },
  foreign_material:       { code: '1004', name: 'Quality' },
  chemical_spill:         { code: '1005', name: 'Safety' },
  employee_injury:        { code: '1005', name: 'Safety' },
  equipment_breakdown:    { code: '1001', name: 'Maintenance' },
  metal_detector_reject:  { code: '1004', name: 'Quality' },
  pest_sighting:          { code: '1004', name: 'Quality' },
  temperature_deviation:  { code: '1004', name: 'Quality' },
  customer_complaint:     { code: '1004', name: 'Quality' },
};

// ══════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════

export function useAIActions() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────
  // SHARED: Insert a Task Feed post + dept tasks
  // ─────────────────────────────────────────────

  const insertTaskFeedPost = useCallback(async ({
    templateKey,
    templateName,
    formData,
    notes,
    location,
    departments = ALL_DEPARTMENTS,
    priority = 'medium',
    isProductionHold = false,
  }: {
    templateKey: string;
    templateName: string;
    formData: Record<string, unknown>;
    notes: string;
    location?: string | null;
    departments?: string[];
    priority?: string;
    isProductionHold?: boolean;
  }): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    const postNumber = generatePostNumber();
    const reportingDept = TEMPLATE_REPORTING_DEPT[templateKey] || { code: '1004', name: 'Quality' };

    try {
      const { data: post, error: postError } = await supabase
        .from('task_feed_posts')
        .insert({
          organization_id: organizationId,
          post_number: postNumber,
          template_id: null,
          template_name: templateName,
          created_by_id: user?.id || null,
          created_by_name: user?.name || 'AI Assistant',
          location_name: location || null,
          form_data: {
            source: 'ai_assist',
            template_key: templateKey,
            ...formData,
          },
          notes: `[AI] ${notes}`,
          status: 'pending',
          total_departments: departments.length,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: isProductionHold,
          reporting_department: reportingDept.code,
          reporting_department_name: reportingDept.name,
        })
        .select('id')
        .single();

      if (postError) throw postError;

      const deptTasks = departments.map((deptCode: string) => ({
        organization_id: organizationId,
        post_id: post.id,
        post_number: postNumber,
        department_code: deptCode,
        department_name: DEPARTMENT_NAMES[deptCode] || `Dept ${deptCode}`,
        status: 'pending',
        module_reference_type: 'task_feed',
        is_original: true,
        priority,
      }));

      const { error: deptError } = await supabase
        .from('task_feed_department_tasks')
        .insert(deptTasks);

      if (deptError) console.error('[AIActions] Dept tasks error:', deptError);

      // Invalidate all task feed related queries regardless of exact key used in screens
      queryClient.invalidateQueries({ queryKey: ['task_feed'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskFeed'] });
      queryClient.invalidateQueries({ queryKey: ['taskFeedPosts'] });

      return {
        success: true,
        message: `Post ${postNumber} created. ${departments.length} departments notified.`,
        data: { post_number: postNumber, post_id: post.id },
      };
    } catch (err: any) {
      console.error('[AIActions] insertTaskFeedPost error:', err);
      return { success: false, message: err.message || 'Failed to create task feed post' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Broken Glove
  // ─────────────────────────────────────────────

  const createBrokenGlove = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'broken_glove',
      templateName: 'Broken Glove',
      location: params.location as string,
      notes: `Broken Glove at ${params.location}. Type: ${params.glove_type}. Fragment: ${params.missing_fragment_found}. ${params.description}`,
      formData: {
        location: params.location,
        glove_type: params.glove_type,
        missing_fragment_found: params.missing_fragment_found,
        description: params.description,
        production_line: params.production_line,
        immediate_action_taken: params.immediate_action_taken,
        production_stopped: params.production_stopped,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: (params.missing_fragment_found === 'No - fragment missing') ? 'critical' : 'high',
      isProductionHold: params.production_stopped as boolean,
      departments: ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Foreign Material
  // ─────────────────────────────────────────────

  const createForeignMaterial = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'foreign_material',
      templateName: 'Foreign Material',
      location: params.location as string,
      notes: `Foreign Material at ${params.location}. Type: ${params.material_type}. In Product: ${params.found_in_product}. ${params.description}`,
      formData: {
        location: params.location,
        material_type: params.material_type,
        found_in_product: params.found_in_product,
        description: params.description,
        production_line: params.production_line,
        product_quarantined: params.product_quarantined,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: 'critical',
      isProductionHold: params.product_quarantined as boolean,
      departments: ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Chemical Spill
  // ─────────────────────────────────────────────

  const createChemicalSpill = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'chemical_spill',
      templateName: 'Chemical Spill',
      location: params.location as string,
      notes: `Chemical Spill at ${params.location}. Chemical: ${params.chemical_name}. Qty: ${params.quantity_spilled}. Product Contact: ${params.product_contact}.`,
      formData: {
        location: params.location,
        chemical_name: params.chemical_name,
        quantity_spilled: params.quantity_spilled,
        product_contact: params.product_contact,
        immediate_action_taken: params.immediate_action_taken,
        area_cleared: params.area_cleared,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: params.product_contact === 'Yes' ? 'critical' : 'high',
      isProductionHold: params.product_contact === 'Yes',
      departments: ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Employee Injury
  // ─────────────────────────────────────────────

  const createEmployeeInjury = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'employee_injury',
      templateName: 'Employee Injury',
      location: params.location as string,
      notes: `Employee Injury at ${params.location}. Type: ${params.injury_type}. Employee: ${params.employee_name}. ${params.description}`,
      formData: {
        location: params.location,
        injury_type: params.injury_type,
        body_part: params.body_part,
        employee_name: params.employee_name,
        description: params.description,
        medical_attention_required: params.medical_attention_required,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: params.medical_attention_required ? 'critical' : 'high',
      departments: ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Equipment Breakdown
  // ─────────────────────────────────────────────

  const createEquipmentBreakdown = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    const result = await insertTaskFeedPost({
      templateKey: 'equipment_breakdown',
      templateName: 'Equipment Breakdown',
      location: params.location as string,
      notes: `Equipment Breakdown: ${params.equipment_name} at ${params.location}. ${params.symptom}. Impact: ${params.production_impact}.`,
      formData: {
        location: params.location,
        equipment_name: params.equipment_name,
        symptom: params.symptom,
        production_impact: params.production_impact,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: params.production_impact === 'Line Down' ? 'critical' : 'high',
      isProductionHold: params.production_impact === 'Line Down',
      departments: ['1001', '1003'],
    });

    // Optionally also create a work order
    if (result.success && params.create_work_order_requested) {
      await createWorkOrder({
        title: `Breakdown: ${params.equipment_name}`,
        equipment_name: params.equipment_name,
        description: `${params.symptom}\nImmediate action: ${params.immediate_action_taken}\nTask Feed Post: ${result.data?.post_number}`,
        priority: params.production_impact === 'Line Down' ? 'critical' : 'high',
        type: 'reactive',
      });
    }

    return result;
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Metal Detector Reject
  // ─────────────────────────────────────────────

  const createMetalDetectorReject = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'metal_detector_reject',
      templateName: 'Metal Detector Reject',
      location: params.location as string,
      notes: `Metal Detector Reject at ${params.location}. Product: ${params.product_affected}. Qty Rejected: ${params.quantity_rejected}. Metal Found: ${params.metal_found}.`,
      formData: {
        location: params.location,
        product_affected: params.product_affected,
        quantity_rejected: params.quantity_rejected,
        metal_found: params.metal_found,
        production_line: params.production_line,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: params.metal_found === 'Yes' ? 'critical' : 'high',
      isProductionHold: params.metal_found === 'Yes',
      departments: ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Pest Sighting
  // ─────────────────────────────────────────────

  const createPestSighting = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'pest_sighting',
      templateName: 'Pest Sighting',
      location: params.location as string,
      notes: `Pest Sighting at ${params.location}. Type: ${params.pest_type}. Evidence: ${params.evidence_type}. Product Contact: ${params.product_contact}.`,
      formData: {
        location: params.location,
        pest_type: params.pest_type,
        number_observed: params.number_observed,
        product_contact: params.product_contact,
        evidence_type: params.evidence_type,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: params.product_contact === 'Yes' ? 'critical' : 'high',
      departments: ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Temperature Deviation
  // ─────────────────────────────────────────────

  const createTemperatureDeviation = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'temperature_deviation',
      templateName: 'Temperature Deviation',
      location: params.location as string,
      notes: `Temp Deviation at ${params.location}. Recorded: ${params.recorded_temp}. Required: ${params.required_temp}. Duration: ${params.duration}.`,
      formData: {
        location: params.location,
        recorded_temp: params.recorded_temp,
        required_temp: params.required_temp,
        duration: params.duration,
        product_affected: params.product_affected,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: 'high',
      departments: ['1004', '1001'],
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Customer Complaint
  // ─────────────────────────────────────────────

  const createCustomerComplaint = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: 'customer_complaint',
      templateName: 'Customer Complaint',
      location: null,
      notes: `Customer Complaint. Type: ${params.complaint_type}. Product: ${params.product_name}. Lot: ${params.lot_number}. Customer: ${params.customer_name}.`,
      formData: {
        complaint_type: params.complaint_type,
        product_name: params.product_name,
        lot_number: params.lot_number,
        description: params.description,
        customer_name: params.customer_name,
        immediate_action_taken: params.immediate_action_taken,
        additional_notes: params.additional_notes || 'N/A',
      },
      priority: 'high',
      departments: ['1004', '1003'],
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // TEMPLATE: Generic Post
  // ─────────────────────────────────────────────

  const createGenericPost = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    return insertTaskFeedPost({
      templateKey: params.post_type as string || 'other',
      templateName: params.template_name as string || 'Task Feed Post',
      location: params.location as string | null,
      notes: params.notes as string || '',
      formData: {
        post_type: params.post_type,
        notes: params.notes,
      },
      priority: params.priority as string || 'medium',
      departments: (params.departments as string[]) || ALL_DEPARTMENTS,
    });
  }, [insertTaskFeedPost]);

  // ─────────────────────────────────────────────
  // QUERY TASK FEED
  // ─────────────────────────────────────────────

  const queryTaskFeed = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      let query = supabase
        .from('task_feed_department_tasks')
        .select(`
          id, post_number, department_code, department_name, status, priority,
          module_reference_type, created_at,
          task_feed_posts(template_name, location_name, notes, created_by_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (params.department_code) {
        query = query.eq('department_code', params.department_code as string);
      }

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status as string);
      }

      if (params.post_type) {
        query = query.ilike('module_reference_type', `%${params.post_type}%`);
      }

      if (params.date_range === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('created_at', `${today}T00:00:00`);
      } else if (params.date_range === 'this_week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', weekAgo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const count = data?.length || 0;
      const deptName = params.department_code
        ? DEPARTMENT_NAMES[params.department_code as string] || params.department_code
        : 'All departments';

      return {
        success: true,
        message: `Found ${count} task(s) — ${deptName}, status: ${params.status || 'all'}.`,
        data: { results: data || [], total: count },
      };
    } catch (err: any) {
      console.error('[AIActions] queryTaskFeed error:', err);
      return { success: false, message: err.message || 'Task feed query failed' };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // START PRE-OP
  // ─────────────────────────────────────────────

  const startPreOp = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    const room = (params.room as string) || 'PA1';
    const roomName = ROOM_NAMES[room] || room;
    const postNumber = generatePostNumber();

    try {
      const { data: post, error: postError } = await supabase
        .from('task_feed_posts')
        .insert({
          organization_id: organizationId,
          post_number: postNumber,
          template_id: null,
          template_name: `Pre-Op: ${roomName}`,
          created_by_id: user?.id || null,
          created_by_name: user?.name || 'AI Assistant',
          location_name: roomName,
          form_data: {
            source: 'ai_assist',
            template_key: 'pre_op',
            type: 'pre_op',
            room,
            room_name: roomName,
            initiated_by: user?.name || 'AI Assistant',
            initiated_at: new Date().toISOString(),
            checklist_items: getPreOpChecklist(room),
          },
          notes: `[AI] Pre-Op inspection initiated for ${roomName} by ${user?.name || 'AI Assistant'}`,
          status: 'pending',
          total_departments: 5,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: false,
          reporting_department: '1004',
          reporting_department_name: 'Quality',
        })
        .select('id')
        .single();

      if (postError) throw postError;

      const deptTasks = ALL_DEPARTMENTS.map((deptCode) => ({
        organization_id: organizationId,
        post_id: post.id,
        post_number: postNumber,
        department_code: deptCode,
        department_name: DEPARTMENT_NAMES[deptCode] || `Dept ${deptCode}`,
        status: 'pending',
        module_reference_type: 'pre_op',
        is_original: true,
        priority: 'high',
      }));

      await supabase.from('task_feed_department_tasks').insert(deptTasks);

      // Invalidate all task feed related queries regardless of exact key used in screens
      queryClient.invalidateQueries({ queryKey: ['task_feed'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskFeed'] });
      queryClient.invalidateQueries({ queryKey: ['taskFeedPosts'] });

      return {
        success: true,
        message: `Pre-Op started for ${roomName}. 5 departments notified. Post ${postNumber}.`,
        data: { post_number: postNumber, post_id: post.id, room },
      };
    } catch (err: any) {
      console.error('[AIActions] startPreOp error:', err);
      return { success: false, message: err.message || 'Failed to start Pre-Op' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // CREATE WORK ORDER
  // ─────────────────────────────────────────────

  const createWorkOrder = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const woType = (params.type as string) || 'reactive';
      const prefix = woType === 'preventive' ? 'PM' : 'RE';
      const woNumber = generateWONumber(prefix);

      const { data: wo, error: woError } = await supabase
        .from('work_orders')
        .insert({
          organization_id: organizationId,
          work_order_number: woNumber,
          title: (params.title as string) || 'AI Generated Work Order',
          description: (params.description as string) || '',
          status: 'open',
          priority: (params.priority as string) || 'medium',
          type: woType,
          source: 'ai_assist',
          equipment_id: (params.equipment_id as string) || null,
          equipment: (params.equipment_name as string) || null,
          assigned_to: null,
          due_date: new Date().toISOString().split('T')[0],
          department: '1001',
          department_name: 'Maintenance',
        })
        .select('id, work_order_number')
        .single();

      if (woError) throw woError;

      // Also post to Task Feed
      const postNumber = generatePostNumber();
      const { data: post, error: postError } = await supabase
        .from('task_feed_posts')
        .insert({
          organization_id: organizationId,
          post_number: postNumber,
          template_name: `WO: ${params.title || 'Work Order'}`,
          created_by_id: user?.id || null,
          created_by_name: user?.name || 'AI Assistant',
          location_name: (params.equipment_name as string) || null,
          form_data: {
            source: 'ai_assist',
            template_key: 'work_order',
            work_order_id: wo.id,
            work_order_number: wo.work_order_number,
          },
          notes: `[AI] Work Order ${woNumber} — ${params.title || ''}\n${params.description || ''}`,
          status: 'pending',
          total_departments: 1,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: false,
          reporting_department: '1001',
          reporting_department_name: 'Maintenance',
        })
        .select('id')
        .single();

      if (!postError && post) {
        await supabase.from('task_feed_department_tasks').insert({
          organization_id: organizationId,
          post_id: post.id,
          post_number: postNumber,
          department_code: '1001',
          department_name: 'Maintenance',
          status: 'pending',
          module_reference_type: 'work_order',
          module_reference_id: wo.id,
          is_original: true,
          priority: (params.priority as string) || 'medium',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      // Invalidate all task feed related queries regardless of exact key used in screens
      queryClient.invalidateQueries({ queryKey: ['task_feed'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskFeed'] });
      queryClient.invalidateQueries({ queryKey: ['taskFeedPosts'] });

      return {
        success: true,
        message: `Work Order ${woNumber} created. Posted to Task Feed as ${postNumber}.`,
        data: { work_order_number: woNumber, work_order_id: wo.id, post_number: postNumber },
      };
    } catch (err: any) {
      console.error('[AIActions] createWorkOrder error:', err);
      return { success: false, message: err.message || 'Failed to create work order' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // LOOKUP PART
  // ─────────────────────────────────────────────

  const lookupPart = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const rawQuery = (params.query as string) || '';
      const singular = rawQuery.replace(/ies$/i, 'y').replace(/ses$/i, 's').replace(/s$/i, '');

      const { data: parts, error } = await supabase
        .from('materials')
        .select('id, name, material_number, sku, on_hand, min_level, location, bin, aisle, rack, shelf, unit_price, vendor, vendor_part_number, manufacturer, manufacturer_part_number, status, category, description')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${rawQuery}%,name.ilike.%${singular}%,description.ilike.%${rawQuery}%,material_number.ilike.%${rawQuery}%,sku.ilike.%${rawQuery}%,vendor_part_number.ilike.%${rawQuery}%,manufacturer_part_number.ilike.%${rawQuery}%`)
        .limit(10);

      if (error) throw error;

      if (!parts || parts.length === 0) {
        return { success: true, message: `No parts found matching "${rawQuery}".`, data: { results: [] } };
      }

      const results = parts.map(p => ({
        name: p.name,
        material_number: p.material_number,
        sku: p.sku,
        in_stock: p.on_hand,
        location: [p.location, p.aisle, p.rack, p.shelf, p.bin].filter(Boolean).join(' > ') || 'No location set',
        unit_price: p.unit_price,
        min_level: p.min_level,
        low_stock: (p.on_hand || 0) <= (p.min_level || 0),
        vendor: p.vendor,
        vendor_part: p.vendor_part_number,
        manufacturer: p.manufacturer,
        mfg_part: p.manufacturer_part_number,
        category: p.category,
      }));

      const top = results[0];
      const stockStatus = top.in_stock > 0
        ? `${top.in_stock} in stock at ${top.location}`
        : 'OUT OF STOCK';
      const lowWarn = top.low_stock ? ' ⚠️ LOW STOCK' : '';

      return {
        success: true,
        message: `Found ${results.length} result(s). Top: ${top.name} (${top.material_number || top.sku || 'N/A'}) — ${stockStatus}${lowWarn}. Vendor: ${top.vendor || 'N/A'}.`,
        data: { results, total: results.length },
      };
    } catch (err: any) {
      console.error('[AIActions] lookupPart error:', err);
      return { success: false, message: err.message || 'Part lookup failed' };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // LOOKUP EQUIPMENT
  // ─────────────────────────────────────────────

  const lookupEquipment = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const query = (params.query as string) || '';
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select('id, name, equipment_tag, location, status, manufacturer, model, serial_number')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${query}%,equipment_tag.ilike.%${query}%,model.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      if (!equipment || equipment.length === 0) {
        return { success: true, message: `No equipment found matching "${query}".`, data: { results: [] } };
      }

      const top = equipment[0];
      return {
        success: true,
        message: `Found: ${top.name} (${top.equipment_tag || 'N/A'}) — ${top.manufacturer || ''} ${top.model || ''} — Status: ${top.status || 'active'} — Location: ${top.location || 'N/A'}`,
        data: { results: equipment, total: equipment.length },
      };
    } catch (err: any) {
      console.error('[AIActions] lookupEquipment error:', err);
      return { success: false, message: err.message || 'Equipment lookup failed' };
    }
  }, [organizationId]);

  // ─────────────────────────────────────────────
  // DIAGNOSE ISSUE
  // ─────────────────────────────────────────────

  const diagnoseIssue = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (params.create_work_order) {
      return createWorkOrder({
        title: `Diagnosis: ${params.symptom || 'Equipment Issue'}`,
        description: `AI Diagnosis\nEquipment: ${params.equipment}\nSymptom: ${params.symptom}`,
        equipment_name: params.equipment as string,
        priority: 'medium',
        type: 'reactive',
      });
    }
    return {
      success: true,
      message: 'Diagnosis complete.',
      data: { equipment: params.equipment, symptom: params.symptom },
    };
  }, [createWorkOrder]);

  // ─────────────────────────────────────────────
  // START / END PRODUCTION RUN
  // ─────────────────────────────────────────────

  const startProductionRun = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      const roomName = ROOM_NAMES[room] || room;
      const runNumber = (params.run_number as string) || `RUN-${Date.now()}`;

      const { data: run, error } = await supabase
        .from('production_runs')
        .insert({
          organization_id: organizationId,
          run_number: runNumber,
          room,
          room_name: roomName,
          product: (params.product as string) || '',
          status: 'running',
          started_at: new Date().toISOString(),
          started_by: user?.name || 'AI Assistant',
          bag_count: 0,
        })
        .select('id, run_number')
        .single();

      if (error) throw error;

      await changeRoomStatus({ room, status: 'running' });
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });

      return {
        success: true,
        message: `Run ${runNumber} started in ${roomName}. Room set to Running.`,
        data: { run_id: run.id, run_number: runNumber, room },
      };
    } catch (err: any) {
      console.error('[AIActions] startProductionRun error:', err);
      return { success: false, message: err.message || 'Failed to start production run' };
    }
  }, [organizationId, user, queryClient]);

  const endProductionRun = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      let q = supabase
        .from('production_runs')
        .select('id, run_number, bag_count, started_at')
        .eq('organization_id', organizationId)
        .eq('status', 'running');

      if (params.run_number) {
        q = q.eq('run_number', params.run_number as string);
      } else {
        q = q.eq('room', room);
      }

      const { data: run, error: findErr } = await q.limit(1).single();
      if (findErr || !run) return { success: false, message: 'No active run found.' };

      await supabase.from('production_runs').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        ended_by: user?.name || 'AI Assistant',
      }).eq('id', run.id);

      await changeRoomStatus({ room, status: 'idle' });
      queryClient.invalidateQueries({ queryKey: ['production_runs'] });

      const duration = Math.round((Date.now() - new Date(run.started_at).getTime()) / 60000);

      return {
        success: true,
        message: `Run ${run.run_number} completed. ${duration} min. ${run.bag_count || 0} bags.`,
        data: { run_number: run.run_number, duration_minutes: duration, bag_count: run.bag_count },
      };
    } catch (err: any) {
      console.error('[AIActions] endProductionRun error:', err);
      return { success: false, message: err.message || 'Failed to end production run' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // CHANGE ROOM STATUS
  // ─────────────────────────────────────────────

  const changeRoomStatus = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      const status = (params.status as string) || 'idle';
      const roomName = ROOM_NAMES[room] || room;
      const statusColors: Record<string, string> = {
        running: 'green', loto: 'red', cleaning: 'yellow',
        setup: 'blue', idle: 'gray', down: 'red',
      };

      const { error } = await supabase
        .from('room_status')
        .upsert({
          organization_id: organizationId,
          room_code: room,
          room_name: roomName,
          status,
          andon_color: statusColors[status] || 'gray',
          updated_at: new Date().toISOString(),
          updated_by: user?.name || 'AI Assistant',
        }, { onConflict: 'organization_id,room_code' });

      if (error) console.warn('[AIActions] Room status (table may not exist):', error.message);

      queryClient.invalidateQueries({ queryKey: ['room_status'] });

      return {
        success: true,
        message: `${roomName} → ${status}. Andon: ${statusColors[status] || 'gray'}.`,
        data: { room, status, color: statusColors[status] },
      };
    } catch (err: any) {
      console.error('[AIActions] changeRoomStatus error:', err);
      return { success: false, message: err.message || 'Failed to change room status' };
    }
  }, [organizationId, user, queryClient]);

  // ─────────────────────────────────────────────
  // NAVIGATE
  // ─────────────────────────────────────────────

  const navigate = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    const screen = params.screen as string;
    const recordId = params.record_id as string | undefined;

    const ROUTE_MAP: Record<string, string> = {
      task_feed:         '/(tabs)/task-feed',
      work_orders:       '/(tabs)/work-orders',
      equipment:         '/(tabs)/equipment',
      parts_inventory:   '/(tabs)/parts',
      pm_schedule:       '/(tabs)/pm-schedule',
      purchase_requests: '/(tabs)/purchase-requests',
      sds_library:       '/(tabs)/sds',
      audits:            '/(tabs)/audits',
      emergency_protocol:'/(tabs)/emergency',
      employee_directory:'/(tabs)/employees',
      production_runs:   '/(tabs)/production',
      room_status:       '/(tabs)/room-status',
      dashboard:         '/(tabs)/dashboard',
      reports:           '/(tabs)/reports',
      settings:          '/(tabs)/settings',
      sanitation:        '/(tabs)/sanitation',
      quality:           '/(tabs)/quality',
      safety:            '/(tabs)/safety',
      compliance:        '/(tabs)/compliance',
    };

    const route = ROUTE_MAP[screen];
    if (!route) {
      return { success: false, message: `Unknown screen: ${screen}` };
    }

    const fullRoute = recordId ? `${route}/${recordId}` : route;

    try {
      router.push(fullRoute as any);
      return {
        success: true,
        message: `Opening ${screen.replace(/_/g, ' ')}.`,
        navigate: fullRoute,
      };
    } catch (err: any) {
      return { success: false, message: `Navigation failed: ${err.message}` };
    }
  }, [router]);

  // ══════════════════════════════════════════════════════════════════
  // MAIN EXECUTOR — routes tool_name to the right handler
  // ══════════════════════════════════════════════════════════════════

  const executeAction = useCallback(async (toolName: string, params: AIActionParams): Promise<ActionResult> => {
    console.log('[AIActions] Tool:', toolName, JSON.stringify(params).substring(0, 200));

    switch (toolName) {

      // ── Task Feed Templates ──
      case 'create_task_feed_post_broken_glove':
        return createBrokenGlove(params);

      case 'create_task_feed_post_foreign_material':
        return createForeignMaterial(params);

      case 'create_task_feed_post_chemical_spill':
        return createChemicalSpill(params);

      case 'create_task_feed_post_employee_injury':
        return createEmployeeInjury(params);

      case 'create_task_feed_post_equipment_breakdown':
        return createEquipmentBreakdown(params);

      case 'create_task_feed_post_metal_detector_reject':
        return createMetalDetectorReject(params);

      case 'create_task_feed_post_pest_sighting':
        return createPestSighting(params);

      case 'create_task_feed_post_temperature_deviation':
        return createTemperatureDeviation(params);

      case 'create_task_feed_post_customer_complaint':
        return createCustomerComplaint(params);

      case 'create_task_feed_post_generic':
      // Legacy action name fallback
      case 'create_task_feed_post':
        return createGenericPost(params);

      // ── Task Feed Query ──
      case 'query_task_feed':
        return queryTaskFeed(params);

      // ── Pre-Op ──
      case 'start_pre_op':
        return startPreOp(params);

      // ── Work Orders ──
      case 'create_work_order':
        return createWorkOrder(params);

      // ── Parts & Equipment ──
      case 'lookup_part':
        return lookupPart(params);

      case 'lookup_equipment':
        return lookupEquipment(params);

      case 'diagnose_issue':
        return diagnoseIssue(params);

      // ── Production ──
      case 'start_production_run':
        return startProductionRun(params);

      case 'end_production_run':
        return endProductionRun(params);

      case 'change_room_status':
        return changeRoomStatus(params);

      // ── Navigation ──
      case 'navigate':
        return navigate(params);

      // ── Utility ──
      case 'ask_clarification':
      case 'clarify':
        return { success: true, message: 'Waiting for clarification.' };

      case 'general_response':
      case 'info':
        return { success: true, message: 'Information provided.' };

      // ── Legacy lookup_work_orders ──
      case 'lookup_work_orders': {
        const { data: workOrders, error } = await supabase
          .from('work_orders')
          .select('id, work_order_number, title, status, priority, type, equipment, created_at')
          .eq('organization_id', organizationId)
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (error || !workOrders?.length) {
          return { success: true, message: 'No open work orders found.', data: { results: [] } };
        }
        return {
          success: true,
          message: `${workOrders.length} open work order(s). Most recent: ${workOrders[0].work_order_number} — ${workOrders[0].title} (${workOrders[0].priority}, ${workOrders[0].status}).`,
          data: { results: workOrders },
        };
      }

      default:
        console.warn('[AIActions] Unknown tool:', toolName);
        return { success: false, message: `Unknown action: ${toolName}` };
    }
  }, [
    organizationId,
    createBrokenGlove, createForeignMaterial, createChemicalSpill,
    createEmployeeInjury, createEquipmentBreakdown, createMetalDetectorReject,
    createPestSighting, createTemperatureDeviation, createCustomerComplaint,
    createGenericPost, queryTaskFeed, startPreOp, createWorkOrder,
    lookupPart, lookupEquipment, diagnoseIssue,
    startProductionRun, endProductionRun, changeRoomStatus, navigate,
  ]);

  return { executeAction };
}

// ══════════════════════════════════════════════════════════════════
// PRE-OP CHECKLIST
// ══════════════════════════════════════════════════════════════════

function getPreOpChecklist(room: string) {
  if (room === 'PA1') {
    return [
      { number: 1, department: '1004', department_name: 'Quality', item: 'Magnet inspection — clean and intact', status: null },
      { number: 2, department: '1004', department_name: 'Quality', item: 'Hopper and forming tube — no residue from previous product', status: null },
      { number: 3, department: '1004', department_name: 'Quality', item: 'Film roll — correct product, lot number matches production schedule', status: null },
      { number: 4, department: '1004', department_name: 'Quality', item: 'Keyence printer — date code and lot number correct', status: null },
      { number: 5, department: '1004', department_name: 'Quality', item: 'First 5 bags — seal integrity, fill weight, print quality', status: null },
      { number: 6, department: '1002', department_name: 'Sanitation', item: 'Room floor, walls, drains — clean, no standing water', status: null },
      { number: 7, department: '1002', department_name: 'Sanitation', item: 'Conveyor belts — clean, no product residue', status: null },
      { number: 8, department: '1002', department_name: 'Sanitation', item: 'Avatar contact surfaces — forming tube, jaws, product chute', status: null },
      { number: 9, department: '1002', department_name: 'Sanitation', item: 'Boxing station — clean table, no previous product labels/packaging', status: null },
      { number: 10, department: '1001', department_name: 'Maintenance', item: 'Air pressure — main supply at 70 PSI minimum', status: null },
      { number: 11, department: '1001', department_name: 'Maintenance', item: 'Pull belts — tension correct, no glazing or cracking', status: null },
      { number: 12, department: '1001', department_name: 'Maintenance', item: 'Sealing jaws — heating to set temp, Teflon tape intact', status: null },
      { number: 13, department: '1001', department_name: 'Maintenance', item: 'E-stop and safety interlocks — functional', status: null },
      { number: 14, department: '1005', department_name: 'Safety', item: 'LOTO devices removed — all locks cleared from previous shift', status: null },
      { number: 15, department: '1005', department_name: 'Safety', item: 'Guards and covers — all in place, properly secured', status: null },
      { number: 16, department: '1005', department_name: 'Safety', item: 'PPE available — gloves, hearing protection, safety glasses', status: null },
      { number: 17, department: '1003', department_name: 'Production', item: 'Supersack staged — correct product, lot number verified', status: null },
      { number: 18, department: '1003', department_name: 'Production', item: 'Cases and packaging materials staged', status: null },
      { number: 19, department: '1003', department_name: 'Production', item: 'HMI recipe loaded — correct product routine selected', status: null },
      { number: 20, department: '1003', department_name: 'Production', item: 'Bag counter reset to zero', status: null },
    ];
  }
  return [
    { number: 1, department: '1004', department_name: 'Quality', item: 'Room and equipment clean', status: null },
    { number: 2, department: '1002', department_name: 'Sanitation', item: 'Floors, walls, drains clean', status: null },
    { number: 3, department: '1001', department_name: 'Maintenance', item: 'Equipment operational', status: null },
    { number: 4, department: '1005', department_name: 'Safety', item: 'Guards in place, PPE available', status: null },
    { number: 5, department: '1003', department_name: 'Production', item: 'Materials staged', status: null },
  ];
}
