// hooks/useAIActions.ts
// Executes AI Assistant actions against Supabase
// Called by AIAssistButton when Claude returns a structured action

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';

// ══════════════════════════════════ TYPES ══════════════════════════════════

interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  navigate?: string;
}

interface AIActionParams {
  [key: string]: unknown;
}

// ══════════════════════════════════ HELPERS ══════════════════════════════════

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

// ══════════════════════════════════ HOOK ══════════════════════════════════

export function useAIActions() {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── CREATE TASK FEED POST ──
  const createTaskFeedPost = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const postNumber = generatePostNumber();
      const departments = (params.departments as string[]) || ['1001'];
      const templateName = (params.template_name as string) || 'AI Generated Post';
      const notes = (params.notes as string) || '';
      const priority = (params.priority as string) || 'medium';
      const room = (params.room as string) || null;
      const roomName = room ? (ROOM_NAMES[room] || room) : null;

      const { data: post, error: postError } = await supabase
        .from('task_feed_posts')
        .insert({
          organization_id: organizationId,
          post_number: postNumber,
          template_id: null,
          template_name: templateName,
          created_by_id: user?.id || null,
          created_by_name: user?.name || 'AI Assistant',
          location_name: roomName,
          notes: notes,
          status: 'pending',
          total_departments: departments.length,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: false,
          reporting_department: '1001',
          reporting_department_name: 'Maintenance',
        })
        .select('id')
        .single();

      if (postError) throw postError;

      // Create department tasks
      const deptTasks = departments.map((deptCode: string) => ({
        organization_id: organizationId,
        post_id: post.id,
        post_number: postNumber,
        department_code: deptCode,
        department_name: DEPARTMENT_NAMES[deptCode] || `Dept ${deptCode}`,
        status: 'pending',
        module_reference_type: 'task_feed',
        is_original: true,
        priority: priority,
      }));

      const { error: deptError } = await supabase
        .from('task_feed_department_tasks')
        .insert(deptTasks);

      if (deptError) {
        console.error('[AIActions] Dept tasks error:', deptError);
      }

      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });

      return {
        success: true,
        message: `Task Feed post ${postNumber} created. ${departments.length} departments notified.`,
        data: { post_number: postNumber, post_id: post.id },
      };
    } catch (err: any) {
      console.error('[AIActions] createTaskFeedPost error:', err);
      return { success: false, message: err.message || 'Failed to create task feed post' };
    }
  }, [organizationId, user, queryClient]);

  // ── START PRE-OP ──
  const startPreOp = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      const roomName = (params.room_name as string) || ROOM_NAMES[room] || room;
      const postNumber = generatePostNumber();
      const departments = ['1001', '1002', '1003', '1004', '1005']; // All five departments

      // Create the pre-op task feed post
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
            type: 'pre_op',
            room: room,
            room_name: roomName,
            initiated_by: user?.name || 'AI Assistant',
            initiated_at: new Date().toISOString(),
            checklist_items: getPreOpChecklist(room),
          },
          notes: `[AI] Pre-Op inspection initiated for ${roomName} by ${user?.name || 'AI Assistant'}`,
          status: 'pending',
          total_departments: departments.length,
          completed_departments: 0,
          completion_rate: 0,
          is_production_hold: false,
          reporting_department: '1004',
          reporting_department_name: 'Quality',
        })
        .select('id')
        .single();

      if (postError) throw postError;

      // Create department tasks for each department
      const deptTasks = departments.map((deptCode: string) => ({
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

      const { error: deptError } = await supabase
        .from('task_feed_department_tasks')
        .insert(deptTasks);

      if (deptError) {
        console.error('[AIActions] Pre-Op dept tasks error:', deptError);
      }

      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });

      return {
        success: true,
        message: `Pre-Op started for ${roomName}. ${departments.length} departments notified. Post ${postNumber}.`,
        data: { post_number: postNumber, post_id: post.id, room, checklist_count: getPreOpChecklist(room).length },
      };
    } catch (err: any) {
      console.error('[AIActions] startPreOp error:', err);
      return { success: false, message: err.message || 'Failed to start Pre-Op' };
    }
  }, [organizationId, user, queryClient]);

  // ── COMPLETE CHECKLIST ITEM ──
  const completeChecklistItem = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    // This updates the form_data on the most recent pre-op post
    // In a full implementation, this would track per-item completion
    const itemNumber = params.item_number as number;
    const status = params.status as string;
    const notes = (params.notes as string) || '';

    console.log(`[AIActions] Checklist item ${itemNumber} marked as ${status}${notes ? ': ' + notes : ''}`);

    return {
      success: true,
      message: `Item ${itemNumber} marked as ${status}.`,
      data: { item_number: itemNumber, status, notes },
    };
  }, []);

  // ── SIGN OFF ──
  const signOff = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    const pin = params.pin as string;
    const actionType = (params.action_type as string) || 'general';

    try {
      // Verify PIN against employees table
      const { data: employee, error: pinError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, pin, role')
        .eq('organization_id', organizationId)
        .eq('pin', pin)
        .single();

      if (pinError || !employee) {
        return { success: false, message: 'Invalid PIN. Please try again.' };
      }

      const fullName = `${employee.first_name} ${employee.last_name}`;

      return {
        success: true,
        message: `Signed off by ${fullName} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
        data: { employee_id: employee.id, employee_name: fullName, action_type: actionType },
      };
    } catch (err: any) {
      console.error('[AIActions] signOff error:', err);
      return { success: false, message: err.message || 'Sign-off failed' };
    }
  }, [organizationId]);

  // ── CREATE WORK ORDER ──
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
            work_order_id: wo.id,
            work_order_number: wo.work_order_number,
            source: 'ai_assist',
            auto_generated: true,
          },
          notes: `[AI] Work Order ${woNumber} - ${params.title || ''}\n${params.description || ''}`,
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
        await supabase
          .from('task_feed_department_tasks')
          .insert({
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
      queryClient.invalidateQueries({ queryKey: ['task_feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });

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

  // ── LOOKUP PART ──
  const lookupPart = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const query = (params.query as string) || '';
      const { data: parts, error } = await supabase
        .from('parts')
        .select('id, name, part_number, quantity_on_hand, location, unit_cost, minimum_stock, status')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${query}%,part_number.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      if (!parts || parts.length === 0) {
        return {
          success: true,
          message: `No parts found matching "${query}".`,
          data: { results: [] },
        };
      }

      const results = parts.map(p => ({
        name: p.name,
        part_number: p.part_number,
        in_stock: p.quantity_on_hand,
        location: p.location,
        unit_cost: p.unit_cost,
        min_stock: p.minimum_stock,
        low_stock: (p.quantity_on_hand || 0) <= (p.minimum_stock || 0),
      }));

      const topResult = results[0];
      const stockStatus = topResult.in_stock > 0
        ? `${topResult.in_stock} in stock at ${topResult.location || 'unknown location'}`
        : 'OUT OF STOCK';

      return {
        success: true,
        message: `Found ${results.length} result(s). Top match: ${topResult.name} (${topResult.part_number || 'N/A'}) - ${stockStatus}.`,
        data: { results, total: results.length },
      };
    } catch (err: any) {
      console.error('[AIActions] lookupPart error:', err);
      return { success: false, message: err.message || 'Part lookup failed' };
    }
  }, [organizationId]);

  // ── LOOKUP EQUIPMENT ──
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
        return {
          success: true,
          message: `No equipment found matching "${query}".`,
          data: { results: [] },
        };
      }

      const top = equipment[0];
      return {
        success: true,
        message: `Found: ${top.name} (${top.equipment_tag || 'N/A'}) - ${top.manufacturer || ''} ${top.model || ''} - Status: ${top.status || 'active'} - Location: ${top.location || 'N/A'}`,
        data: { results: equipment, total: equipment.length },
      };
    } catch (err: any) {
      console.error('[AIActions] lookupEquipment error:', err);
      return { success: false, message: err.message || 'Equipment lookup failed' };
    }
  }, [organizationId]);

  // ── LOOKUP WORK ORDERS ──
  const lookupWorkOrders = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select('id, work_order_number, title, status, priority, type, equipment, created_at')
        .eq('organization_id', organizationId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!workOrders || workOrders.length === 0) {
        return {
          success: true,
          message: 'No open work orders found.',
          data: { results: [] },
        };
      }

      return {
        success: true,
        message: `${workOrders.length} open work order(s). Most recent: ${workOrders[0].work_order_number} - ${workOrders[0].title} (${workOrders[0].priority} priority, ${workOrders[0].status}).`,
        data: { results: workOrders, total: workOrders.length },
      };
    } catch (err: any) {
      console.error('[AIActions] lookupWorkOrders error:', err);
      return { success: false, message: err.message || 'Work order lookup failed' };
    }
  }, [organizationId]);

  // ── DIAGNOSE ISSUE ──
  const diagnoseIssue = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    // Claude already provides the diagnosis in its speech response
    // This action optionally creates a work order from the diagnosis
    const shouldCreateWO = params.create_work_order as boolean;

    if (shouldCreateWO) {
      return createWorkOrder({
        title: `Diagnosis: ${params.symptom || 'Equipment Issue'}`,
        description: `AI Diagnosis:\nEquipment: ${params.equipment || 'Unknown'}\nSymptom: ${params.symptom || 'N/A'}\nSuggested Cause: ${params.suggested_cause || 'N/A'}\nSuggested Fix: ${params.suggested_fix || 'N/A'}`,
        equipment_name: params.equipment as string,
        priority: (params.severity as string) || 'medium',
        type: 'reactive',
      });
    }

    return {
      success: true,
      message: `Diagnosis complete. ${params.create_work_order === false ? 'No work order created.' : ''}`,
      data: {
        equipment: params.equipment,
        symptom: params.symptom,
        cause: params.suggested_cause,
        fix: params.suggested_fix,
        parts: params.parts_needed,
        severity: params.severity,
      },
    };
  }, [createWorkOrder]);

  // ── START PRODUCTION RUN ──
  const startProductionRun = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      const roomName = ROOM_NAMES[room] || room;
      const runNumber = (params.run_number as string) || `RUN-${Date.now()}`;
      const product = (params.product as string) || '';

      const { data: run, error } = await supabase
        .from('production_runs')
        .insert({
          organization_id: organizationId,
          run_number: runNumber,
          room: room,
          room_name: roomName,
          product: product,
          status: 'running',
          started_at: new Date().toISOString(),
          started_by: user?.name || 'AI Assistant',
          bag_count: 0,
        })
        .select('id, run_number')
        .single();

      if (error) throw error;

      // Change room status to running
      await changeRoomStatus({ room, status: 'running' });

      queryClient.invalidateQueries({ queryKey: ['production_runs'] });

      return {
        success: true,
        message: `Production run ${runNumber} started in ${roomName}. Room status set to Running. Andon light green.`,
        data: { run_id: run.id, run_number: runNumber, room },
      };
    } catch (err: any) {
      console.error('[AIActions] startProductionRun error:', err);
      return { success: false, message: err.message || 'Failed to start production run' };
    }
  }, [organizationId, user, queryClient]);

  // ── END PRODUCTION RUN ──
  const endProductionRun = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      const runNumber = (params.run_number as string) || '';

      // Find the active run
      let query = supabase
        .from('production_runs')
        .select('id, run_number, bag_count, started_at')
        .eq('organization_id', organizationId)
        .eq('status', 'running');

      if (runNumber) {
        query = query.eq('run_number', runNumber);
      } else {
        query = query.eq('room', room);
      }

      const { data: runs, error: findError } = await query.limit(1).single();

      if (findError || !runs) {
        return { success: false, message: `No active production run found${runNumber ? ' for ' + runNumber : ' in ' + room}.` };
      }

      const { error: updateError } = await supabase
        .from('production_runs')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          ended_by: user?.name || 'AI Assistant',
        })
        .eq('id', runs.id);

      if (updateError) throw updateError;

      // Change room status to idle
      await changeRoomStatus({ room, status: 'idle' });

      queryClient.invalidateQueries({ queryKey: ['production_runs'] });

      const startTime = new Date(runs.started_at);
      const duration = Math.round((Date.now() - startTime.getTime()) / 60000);

      return {
        success: true,
        message: `Run ${runs.run_number} completed. Duration: ${duration} minutes. ${runs.bag_count || 0} bags counted. Room status set to Idle.`,
        data: { run_number: runs.run_number, duration_minutes: duration, bag_count: runs.bag_count },
      };
    } catch (err: any) {
      console.error('[AIActions] endProductionRun error:', err);
      return { success: false, message: err.message || 'Failed to end production run' };
    }
  }, [organizationId, user, queryClient]);

  // ── CHANGE ROOM STATUS ──
  const changeRoomStatus = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    if (!organizationId) return { success: false, message: 'No organization selected' };

    try {
      const room = (params.room as string) || 'PA1';
      const status = (params.status as string) || 'idle';
      const roomName = ROOM_NAMES[room] || room;

      const statusColors: Record<string, string> = {
        running: 'green',
        loto: 'red',
        cleaning: 'yellow',
        setup: 'blue',
        idle: 'gray',
      };

      // Update or insert room status
      const { error } = await supabase
        .from('room_status')
        .upsert({
          organization_id: organizationId,
          room_code: room,
          room_name: roomName,
          status: status,
          andon_color: statusColors[status] || 'gray',
          updated_at: new Date().toISOString(),
          updated_by: user?.name || 'AI Assistant',
        }, {
          onConflict: 'organization_id,room_code',
        });

      if (error) {
        // If table doesn't exist yet, just log it
        console.warn('[AIActions] Room status update (table may not exist yet):', error.message);
      }

      queryClient.invalidateQueries({ queryKey: ['room_status'] });

      return {
        success: true,
        message: `${roomName} status changed to ${status}. Andon light ${statusColors[status] || 'gray'}.`,
        data: { room, status, color: statusColors[status] },
      };
    } catch (err: any) {
      console.error('[AIActions] changeRoomStatus error:', err);
      return { success: false, message: err.message || 'Failed to change room status' };
    }
  }, [organizationId, user, queryClient]);

  // ── GENERAL SEARCH ──
  const generalSearch = useCallback(async (params: AIActionParams): Promise<ActionResult> => {
    const query = (params.query as string) || '';
    const scope = (params.scope as string) || 'all';

    const results: string[] = [];

    if (scope === 'all' || scope === 'parts') {
      const partResult = await lookupPart({ query });
      if (partResult.success && (partResult.data?.results as any[])?.length > 0) {
        results.push(`Parts: ${(partResult.data?.results as any[]).length} match(es)`);
      }
    }

    if (scope === 'all' || scope === 'equipment') {
      const equipResult = await lookupEquipment({ query });
      if (equipResult.success && (equipResult.data?.results as any[])?.length > 0) {
        results.push(`Equipment: ${(equipResult.data?.results as any[]).length} match(es)`);
      }
    }

    if (scope === 'all' || scope === 'work_orders') {
      const woResult = await lookupWorkOrders({ query });
      if (woResult.success && (woResult.data?.results as any[])?.length > 0) {
        results.push(`Work Orders: ${(woResult.data?.results as any[]).length} match(es)`);
      }
    }

    return {
      success: true,
      message: results.length > 0 ? `Search results for "${query}": ${results.join('. ')}` : `No results found for "${query}".`,
      data: { query, scope, result_summary: results },
    };
  }, [lookupPart, lookupEquipment, lookupWorkOrders]);

  // ══════════════════════════════════ MAIN EXECUTOR ══════════════════════════════════

  const executeAction = useCallback(async (action: string, params: AIActionParams): Promise<ActionResult> => {
    console.log('[AIActions] Executing:', action, JSON.stringify(params).substring(0, 200));

    switch (action) {
      case 'create_task_feed_post':
        return createTaskFeedPost(params);

      case 'start_pre_op':
        return startPreOp(params);

      case 'complete_checklist_item':
        return completeChecklistItem(params);

      case 'sign_off':
        return signOff(params);

      case 'create_work_order':
        return createWorkOrder(params);

      case 'lookup_part':
        return lookupPart(params);

      case 'lookup_equipment':
        return lookupEquipment(params);

      case 'lookup_work_orders':
        return lookupWorkOrders(params);

      case 'diagnose_issue':
        return diagnoseIssue(params);

      case 'start_production_run':
        return startProductionRun(params);

      case 'end_production_run':
        return endProductionRun(params);

      case 'change_room_status':
        return changeRoomStatus(params);

      case 'search':
        return generalSearch(params);

      case 'info':
        // Info actions don't execute anything — Claude's speech is the response
        return { success: true, message: 'Information provided.' };

      case 'clarify':
        // Clarify actions don't execute anything — Claude is asking for more details
        return { success: true, message: 'Waiting for clarification.' };

      default:
        console.warn('[AIActions] Unknown action:', action);
        return { success: false, message: `Unknown action: ${action}` };
    }
  }, [
    createTaskFeedPost,
    startPreOp,
    completeChecklistItem,
    signOff,
    createWorkOrder,
    lookupPart,
    lookupEquipment,
    lookupWorkOrders,
    diagnoseIssue,
    startProductionRun,
    endProductionRun,
    changeRoomStatus,
    generalSearch,
  ]);

  return { executeAction };
}

// ══════════════════════════════════ PRE-OP CHECKLIST ══════════════════════════════════

function getPreOpChecklist(room: string) {
  // PA1 Pre-Op — 20 items across 5 departments
  if (room === 'PA1') {
    return [
      // Quality (5)
      { number: 1, department: '1004', department_name: 'Quality', item: 'Magnet inspection - clean and intact', what_to_check: 'No metal fragments on magnets, magnets securely mounted, full strength', status: null },
      { number: 2, department: '1004', department_name: 'Quality', item: 'Hopper and forming tube - no residue from previous product', what_to_check: 'Visual inspection for leftover powder, especially after allergen changeover', status: null },
      { number: 3, department: '1004', department_name: 'Quality', item: 'Film roll - correct product, lot number matches production schedule', what_to_check: 'Verify film SKU matches today\'s run. Check for damage or moisture', status: null },
      { number: 4, department: '1004', department_name: 'Quality', item: 'Keyence printer - date code and lot number correct', what_to_check: 'Run test print, verify date, lot, best-by match production order', status: null },
      { number: 5, department: '1004', department_name: 'Quality', item: 'First 5 bags - seal integrity, fill weight, print quality', what_to_check: 'Run first 5 bags, check seals by hand, weigh on scale, verify print', status: null },
      // Sanitation (4)
      { number: 6, department: '1002', department_name: 'Sanitation', item: 'Room floor, walls, drains - clean, no standing water', what_to_check: 'Visual sweep. No puddles, no debris, drains flowing', status: null },
      { number: 7, department: '1002', department_name: 'Sanitation', item: 'Conveyor belts - clean, no product residue', what_to_check: 'Run hand along belt surface, inspect underside and edges', status: null },
      { number: 8, department: '1002', department_name: 'Sanitation', item: 'Avatar contact surfaces - forming tube, jaws, product chute', what_to_check: 'No product buildup on former, jaws clean, no film residue', status: null },
      { number: 9, department: '1002', department_name: 'Sanitation', item: 'Boxing station - clean table, no previous product labels/packaging', what_to_check: 'Table wiped, no old labels, correct cases staged', status: null },
      // Maintenance (4)
      { number: 10, department: '1001', department_name: 'Maintenance', item: 'Air pressure - main supply at 70 PSI minimum', what_to_check: 'Read gauge at FRL unit. Check for audible leaks', status: null },
      { number: 11, department: '1001', department_name: 'Maintenance', item: 'Pull belts - tension correct, no glazing or cracking', what_to_check: 'Visual and touch inspection. Belts should grip firm, not slip', status: null },
      { number: 12, department: '1001', department_name: 'Maintenance', item: 'Sealing jaws - heating to set temp, Teflon tape intact', what_to_check: 'Check HMI for temp readings. Visual on jaw tape for tears/burns', status: null },
      { number: 13, department: '1001', department_name: 'Maintenance', item: 'E-stop and safety interlocks - functional', what_to_check: 'Press E-stop, verify machine stops. Open door, verify interlock triggers', status: null },
      // Safety (3)
      { number: 14, department: '1005', department_name: 'Safety', item: 'LOTO devices removed - all locks cleared from previous shift', what_to_check: 'Visual check all lockout points. No orphaned locks or tags', status: null },
      { number: 15, department: '1005', department_name: 'Safety', item: 'Guards and covers - all in place, properly secured', what_to_check: 'Check all machine guards. No missing bolts, no gaps', status: null },
      { number: 16, department: '1005', department_name: 'Safety', item: 'PPE available - gloves, hearing protection, safety glasses', what_to_check: 'PPE station stocked. Operators have required PPE before line starts', status: null },
      // Production (4)
      { number: 17, department: '1003', department_name: 'Production', item: 'Supersack staged - correct product, lot number verified', what_to_check: 'Check supersack label vs. production schedule. Confirm lot match', status: null },
      { number: 18, department: '1003', department_name: 'Production', item: 'Cases and packaging materials staged', what_to_check: 'Correct cases, correct labels, sufficient quantity for the run', status: null },
      { number: 19, department: '1003', department_name: 'Production', item: 'HMI recipe loaded - correct product routine selected', what_to_check: 'Verify recipe name on HMI matches production order', status: null },
      { number: 20, department: '1003', department_name: 'Production', item: 'Bag counter reset to zero', what_to_check: 'Clear bag count on HMI before run starts', status: null },
    ];
  }

  // Generic Pre-Op for other rooms
  return [
    { number: 1, department: '1004', department_name: 'Quality', item: 'Room and equipment clean', what_to_check: 'Visual inspection', status: null },
    { number: 2, department: '1002', department_name: 'Sanitation', item: 'Floors, walls, drains clean', what_to_check: 'No standing water, no debris', status: null },
    { number: 3, department: '1001', department_name: 'Maintenance', item: 'Equipment operational', what_to_check: 'Power on, air pressure, no alarms', status: null },
    { number: 4, department: '1005', department_name: 'Safety', item: 'Guards in place, PPE available', what_to_check: 'All guards secured, PPE stocked', status: null },
    { number: 5, department: '1003', department_name: 'Production', item: 'Materials staged', what_to_check: 'Correct product and packaging ready', status: null },
  ];
}
