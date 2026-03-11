// constants/sanitationTaskFeedTemplates.ts
// All sanitation Task Feed templates + reverse post helpers
// These post to the task_feed table using the same structure
// as all other TulKenz OPS task feed posts.

import { supabase } from '../lib/supabase';

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

// ─────────────────────────────────────────────
// TASK FEED POST TYPE — sanitation types added
// to existing source values in task_feed table
// ─────────────────────────────────────────────
export type SanitationPostType =
  | 'sanitation_task'       // MSS task due — assigned to sanitation team
  | 'preop_sanitation'      // Pre-op inspection required at shift start
  | 'atp_swab_due'          // EMP schedule — ATP swab due
  | 'sanitation_ca'         // ATP fail → corrective action required
  | 'pathogen_positive'     // Pathogen positive → HOLD
  | 'ssop_published'        // New or updated SSOP published
  | 'sanitation_complete'   // Task completed + pre-op passed
  | 'vector_swab';          // Vector swabbing required after positive

// ─────────────────────────────────────────────
// PRIORITY MAPPING
// ─────────────────────────────────────────────
export const SANITATION_POST_PRIORITY: Record<SanitationPostType, 'low' | 'medium' | 'high' | 'critical'> = {
  sanitation_task: 'medium',
  preop_sanitation: 'high',
  atp_swab_due: 'medium',
  sanitation_ca: 'high',
  pathogen_positive: 'critical',
  ssop_published: 'low',
  sanitation_complete: 'low',
  vector_swab: 'high',
};

// Department routing
// 1001 Maintenance | 1002 Sanitation | 1003 Production | 1004 Quality | 1005 Safety
export const SANITATION_POST_DEPT: Record<SanitationPostType, number> = {
  sanitation_task: 1002,
  preop_sanitation: 1002,
  atp_swab_due: 1002,
  sanitation_ca: 1004,      // Quality owns corrective actions
  pathogen_positive: 1004,
  ssop_published: 1002,
  sanitation_complete: 1002,
  vector_swab: 1004,
};

// ─────────────────────────────────────────────
// POST BUILDERS
// Each function returns the object to insert
// into the task_feed table
// ─────────────────────────────────────────────

// 1. SANITATION TASK DUE
// Triggered when next_due_date reaches today
export function buildSanitationTaskPost(params: {
  taskId: string;
  taskName: string;
  taskCode: string | null;
  room: string;
  frequency: string;
  estimatedMinutes: number | null;
  chemicalName: string | null;
  assignedTo: string | null;
  dueDate: string;
}) {
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `[SANITATION] ${params.taskName}`,
    body: `Sanitation task due in ${params.room}.${params.chemicalName ? ` Chemical: ${params.chemicalName}.` : ''}${params.estimatedMinutes ? ` Est. ${params.estimatedMinutes} min.` : ''}`,
    priority: SANITATION_POST_PRIORITY.sanitation_task,
    department_id: SANITATION_POST_DEPT.sanitation_task,
    assigned_to: params.assignedTo,
    status: 'open',
    metadata: {
      post_type: 'sanitation_task',
      task_id: params.taskId,
      task_code: params.taskCode,
      room: params.room,
      frequency: params.frequency,
      due_date: params.dueDate,
      chemical_name: params.chemicalName,
      estimated_minutes: params.estimatedMinutes,
    },
  };
}

// 2. PRE-OP INSPECTION REQUIRED
// Posted at shift start for each room
export function buildPreOpPost(params: {
  room: string;
  shift: string;
  taskId?: string;
}) {
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `[PRE-OP] Inspection Required — ${params.room}`,
    body: `Pre-operation sanitation inspection required for ${params.room} before production start on ${params.shift} shift. QC sign-off required.`,
    priority: SANITATION_POST_PRIORITY.preop_sanitation,
    department_id: SANITATION_POST_DEPT.preop_sanitation,
    status: 'open',
    metadata: {
      post_type: 'preop_sanitation',
      room: params.room,
      shift: params.shift,
      task_id: params.taskId ?? null,
    },
  };
}

// 3. ATP SWAB DUE
// Triggered from EMP schedule
export function buildATPSwabDuePost(params: {
  scheduleId: string;
  swabPointId: string;
  pointCode: string;
  description: string;
  room: string;
  zoneNumber: number;
  dueDate: string;
  assignedTo?: string;
}) {
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `[EMP] ATP Swab Due — ${params.pointCode}`,
    body: `ATP swab required at ${params.description} (${params.room}, Zone ${params.zoneNumber}). Due: ${params.dueDate}.`,
    priority: SANITATION_POST_PRIORITY.atp_swab_due,
    department_id: SANITATION_POST_DEPT.atp_swab_due,
    assigned_to: params.assignedTo ?? null,
    status: 'open',
    metadata: {
      post_type: 'atp_swab_due',
      schedule_id: params.scheduleId,
      swab_point_id: params.swabPointId,
      point_code: params.pointCode,
      room: params.room,
      zone_number: params.zoneNumber,
      due_date: params.dueDate,
    },
  };
}

// 4. SANITATION CORRECTIVE ACTION (ATP FAIL)
// Auto-triggered when ATP result = 'fail'
export function buildSanitationCAPost(params: {
  caId: string;
  caNumber: string;
  room: string;
  zoneNumber: number;
  pointCode: string;
  rluReading: number;
  passThreshold: number;
  testedBy: string;
  productionHold: boolean;
}) {
  const holdText = params.productionHold ? ' ⚠️ PRODUCTION HOLD IN EFFECT.' : '';
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `[CA] ATP FAIL — ${params.room} Zone ${params.zoneNumber} — ${params.caNumber}`,
    body: `ATP swab FAILED at ${params.pointCode} in ${params.room} (Zone ${params.zoneNumber}). RLU: ${params.rluReading} (threshold: ${params.passThreshold}). Tested by: ${params.testedBy}. Corrective action required.${holdText}`,
    priority: SANITATION_POST_PRIORITY.sanitation_ca,
    department_id: SANITATION_POST_DEPT.sanitation_ca,
    status: 'open',
    metadata: {
      post_type: 'sanitation_ca',
      ca_id: params.caId,
      ca_number: params.caNumber,
      room: params.room,
      zone_number: params.zoneNumber,
      point_code: params.pointCode,
      rlu_reading: params.rluReading,
      pass_threshold: params.passThreshold,
      tested_by: params.testedBy,
      production_hold: params.productionHold,
    },
  };
}

// 5. PATHOGEN POSITIVE — CRITICAL HOLD
// Auto-triggered when microbial result = 'positive'
export function buildPathogenPositivePost(params: {
  caId: string;
  caNumber: string;
  room: string;
  zoneNumber: number;
  organism: string;
  pointCode: string;
  collectedBy: string;
  productionHold: boolean;
  productHold: boolean;
}) {
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `🚨 [PATHOGEN] ${params.organism} POSITIVE — ${params.room} Zone ${params.zoneNumber}`,
    body: `PATHOGEN POSITIVE: ${params.organism} detected at ${params.pointCode} in ${params.room} (Zone ${params.zoneNumber}). Collected by: ${params.collectedBy}. CA: ${params.caNumber}.${params.productionHold ? ' PRODUCTION HALTED.' : ''}${params.productHold ? ' PRODUCT ON HOLD.' : ''} Immediate corrective action and vector swabbing required.`,
    priority: SANITATION_POST_PRIORITY.pathogen_positive,
    department_id: SANITATION_POST_DEPT.pathogen_positive,
    status: 'open',
    metadata: {
      post_type: 'pathogen_positive',
      ca_id: params.caId,
      ca_number: params.caNumber,
      room: params.room,
      zone_number: params.zoneNumber,
      organism: params.organism,
      point_code: params.pointCode,
      collected_by: params.collectedBy,
      production_hold: params.productionHold,
      product_hold: params.productHold,
    },
  };
}

// 6. SSOP PUBLISHED / UPDATED
// Posted when a new or revised SSOP is published
export function buildSSOPPublishedPost(params: {
  ssopId: string;
  ssopCode: string;
  title: string;
  version: string;
  area: string;
  isRevision: boolean;
  approvedBy: string;
}) {
  const action = params.isRevision ? 'UPDATED' : 'NEW';
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `[SSOP ${action}] ${params.ssopCode} — ${params.title}`,
    body: `${params.isRevision ? 'Revised' : 'New'} SSOP published: ${params.title} (${params.ssopCode}) v${params.version} for ${params.area}. Approved by: ${params.approvedBy}. Please review before next execution.`,
    priority: SANITATION_POST_PRIORITY.ssop_published,
    department_id: SANITATION_POST_DEPT.ssop_published,
    status: 'open',
    metadata: {
      post_type: 'ssop_published',
      ssop_id: params.ssopId,
      ssop_code: params.ssopCode,
      version: params.version,
      area: params.area,
      is_revision: params.isRevision,
      approved_by: params.approvedBy,
    },
  };
}

// 7. SANITATION COMPLETE — REVERSE POST
// Posted after task completion + pre-op sign-off
export function buildSanitationCompletePost(params: {
  completionId: string;
  taskId: string;
  taskName: string;
  taskCode: string | null;
  room: string;
  completedBy: string;
  result: 'pass' | 'fail' | 'conditional';
  visualPass: boolean | null;
  preOpSignedBy: string | null;
  atpResult?: 'pass' | 'warning' | 'fail' | null;
  rluReading?: number | null;
  issuesFound?: string | null;
}) {
  const resultEmoji = params.result === 'pass' ? '✅' : params.result === 'conditional' ? '⚠️' : '❌';
  const atpText = params.atpResult ? ` ATP: ${params.atpResult.toUpperCase()}${params.rluReading ? ` (${params.rluReading} RLU)` : ''}.` : '';
  const preOpText = params.preOpSignedBy ? ` Pre-op signed off by ${params.preOpSignedBy}.` : '';
  const issueText = params.issuesFound ? ` Issues: ${params.issuesFound}` : '';

  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `${resultEmoji} [SANITATION COMPLETE] ${params.taskName} — ${params.room}`,
    body: `${params.taskName} completed in ${params.room} by ${params.completedBy}. Result: ${params.result.toUpperCase()}.${atpText}${preOpText}${issueText}`,
    priority: SANITATION_POST_PRIORITY.sanitation_complete,
    department_id: SANITATION_POST_DEPT.sanitation_complete,
    status: 'closed',
    metadata: {
      post_type: 'sanitation_complete',
      completion_id: params.completionId,
      task_id: params.taskId,
      task_code: params.taskCode,
      room: params.room,
      completed_by: params.completedBy,
      result: params.result,
      visual_pass: params.visualPass,
      preop_signed_by: params.preOpSignedBy,
      atp_result: params.atpResult ?? null,
      rlu_reading: params.rluReading ?? null,
      issues_found: params.issuesFound ?? null,
    },
  };
}

// 8. VECTOR SWABBING REQUIRED
// Triggered after CA is created with vector_swabbing_required = true
export function buildVectorSwabPost(params: {
  caId: string;
  caNumber: string;
  room: string;
  zoneNumber: number;
  organism: string | null;
  triggerType: string;
  assignedTo?: string;
}) {
  return {
    org_id: ORG_ID,
    source: 'sanitation_task',
    title: `[VECTOR SWAB] Required — ${params.room} Zone ${params.zoneNumber} — ${params.caNumber}`,
    body: `Vector swabbing required in ${params.room} (Zone ${params.zoneNumber}) following ${params.triggerType.replace('_', ' ')}${params.organism ? ` (${params.organism})` : ''}. Swab in starburst pattern around positive site. CA: ${params.caNumber}.`,
    priority: SANITATION_POST_PRIORITY.vector_swab,
    department_id: SANITATION_POST_DEPT.vector_swab,
    assigned_to: params.assignedTo ?? null,
    status: 'open',
    metadata: {
      post_type: 'vector_swab',
      ca_id: params.caId,
      ca_number: params.caNumber,
      room: params.room,
      zone_number: params.zoneNumber,
      organism: params.organism,
      trigger_type: params.triggerType,
    },
  };
}

// ─────────────────────────────────────────────
// POST TO TASK FEED — single insert function
// Used by all builders above
// Returns the task feed post ID
// ─────────────────────────────────────────────
export async function postToTaskFeed(postData: object): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('task_feed')
      .insert([postData])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (e: any) {
    console.error('[SanitationTaskFeed] Failed to post:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// CONVENIENCE — post + update source record
// with the returned task feed post ID
// ─────────────────────────────────────────────

// After completing a sanitation task — reverse post to task feed
// and update the completion record with the post ID
export async function reversePostSanitationComplete(params: {
  completionId: string;
  taskId: string;
  taskName: string;
  taskCode: string | null;
  room: string;
  completedBy: string;
  result: 'pass' | 'fail' | 'conditional';
  visualPass: boolean | null;
  preOpSignedBy: string | null;
  atpResult?: 'pass' | 'warning' | 'fail' | null;
  rluReading?: number | null;
  issuesFound?: string | null;
}): Promise<string | null> {
  const postData = buildSanitationCompletePost(params);
  const postId = await postToTaskFeed(postData);

  if (postId) {
    await supabase
      .from('sanitation_task_completions')
      .update({ task_feed_post_id: postId, post_status: 'posted' })
      .eq('id', params.completionId);
  }

  return postId;
}

// After logging ATP result — post result to task feed
// If fail → creates CA post instead of complete post
export async function reversePostATPResult(params: {
  atpResultId: string;
  room: string;
  zoneNumber: number;
  pointCode: string;
  rluReading: number;
  passThreshold: number;
  result: 'pass' | 'warning' | 'fail';
  testedBy: string;
  // Only needed if fail:
  caId?: string;
  caNumber?: string;
  productionHold?: boolean;
}): Promise<string | null> {
  let postData: object;

  if (params.result === 'fail' && params.caId && params.caNumber) {
    postData = buildSanitationCAPost({
      caId: params.caId,
      caNumber: params.caNumber,
      room: params.room,
      zoneNumber: params.zoneNumber,
      pointCode: params.pointCode,
      rluReading: params.rluReading,
      passThreshold: params.passThreshold,
      testedBy: params.testedBy,
      productionHold: params.productionHold ?? false,
    });
  } else {
    // Pass or warning — reverse post as completion record
    const emoji = params.result === 'pass' ? '✅' : '⚠️';
    postData = {
      org_id: ORG_ID,
      source: 'sanitation_task',
      title: `${emoji} [ATP ${params.result.toUpperCase()}] ${params.pointCode} — ${params.room}`,
      body: `ATP swab result: ${params.result.toUpperCase()} at ${params.pointCode} in ${params.room} (Zone ${params.zoneNumber}). RLU: ${params.rluReading} (threshold: ${params.passThreshold}). Tested by: ${params.testedBy}.`,
      priority: params.result === 'warning' ? 'medium' : 'low',
      department_id: 1002,
      status: 'closed',
      metadata: {
        post_type: 'sanitation_complete',
        atp_result_id: params.atpResultId,
        room: params.room,
        zone_number: params.zoneNumber,
        point_code: params.pointCode,
        rlu_reading: params.rluReading,
        result: params.result,
        tested_by: params.testedBy,
      },
    };
  }

  const postId = await postToTaskFeed(postData);

  if (postId) {
    await supabase
      .from('atp_swab_results')
      .update({ task_feed_post_id: postId, post_status: 'posted' })
      .eq('id', params.atpResultId);
  }

  return postId;
}

// After pathogen positive confirmed — post critical alert
export async function reversePostPathogenPositive(params: {
  microbialResultId: string;
  caId: string;
  caNumber: string;
  room: string;
  zoneNumber: number;
  organism: string;
  pointCode: string;
  collectedBy: string;
  productionHold: boolean;
  productHold: boolean;
}): Promise<string | null> {
  const postData = buildPathogenPositivePost(params);
  const postId = await postToTaskFeed(postData);

  if (postId) {
    await supabase
      .from('microbial_test_results')
      .update({ task_feed_post_id: postId, post_status: 'posted' })
      .eq('id', params.microbialResultId);
  }

  return postId;
}

// Post MSS task due notice and save post ID back to task
export async function postSanitationTaskDue(params: {
  taskId: string;
  taskName: string;
  taskCode: string | null;
  room: string;
  frequency: string;
  estimatedMinutes: number | null;
  chemicalName: string | null;
  assignedTo: string | null;
  dueDate: string;
}): Promise<string | null> {
  const postData = buildSanitationTaskPost(params);
  const postId = await postToTaskFeed(postData);

  if (postId) {
    await supabase
      .from('sanitation_tasks')
      .update({ task_feed_post_id: postId })
      .eq('id', params.taskId);
  }

  return postId;
}
