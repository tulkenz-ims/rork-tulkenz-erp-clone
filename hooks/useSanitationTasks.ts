// hooks/useSanitationTasks.ts
// Master Sanitation Schedule — tasks, completions, SSOP library

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type SanitationFrequency =
  | 'pre_op' | 'daily' | 'weekly' | 'biweekly'
  | 'monthly' | 'quarterly' | 'annual' | 'as_needed';

export type SanitationTask = {
  id: string;
  org_id: string;
  task_name: string;
  task_code: string | null;
  room: string;
  area_description: string | null;
  equipment: string | null;
  department_id: number;
  frequency: SanitationFrequency;
  frequency_days: number | null;
  estimated_minutes: number | null;
  ssop_id: string | null;
  chemical_name: string | null;
  chemical_concentration: string | null;
  contact_time_min: number | null;
  method: string | null;
  assigned_to: string | null;
  requires_preop_signoff: boolean;
  requires_atp_test: boolean;
  status: 'active' | 'inactive';
  last_completed_at: string | null;
  next_due_date: string | null;
  task_feed_auto_post: boolean;
  task_feed_post_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  ssop?: SanitationSSOPSummary | null;
};

export type SanitationSSOPSummary = {
  id: string;
  title: string;
  ssop_code: string | null;
  version: string;
  chemical_name: string | null;
  chemical_concentration: string | null;
  contact_time_min: number | null;
  method: string | null;
  ppe_required: string | null;
};

export type SSOPStep = {
  id: string;
  ssop_id: string;
  step_number: number;
  instruction: string;
  caution: string | null;
  photo_url: string | null;
};

export type SanitationSSOPFull = SanitationSSOPSummary & {
  area: string | null;
  equipment: string | null;
  frequency: string;
  rinse_required: boolean;
  approved_by: string | null;
  approved_date: string | null;
  status: 'active' | 'archived' | 'draft';
  notes: string | null;
  pdf_url: string | null;
  steps: SSOPStep[];
};

export type TaskCompletion = {
  id: string;
  org_id: string;
  task_id: string;
  completed_by: string;
  completed_at: string;
  shift: string | null;
  visual_pass: boolean | null;
  preop_signed_by: string | null;
  preop_signed_at: string | null;
  chemical_used: string | null;
  concentration_used: string | null;
  contact_time_actual: number | null;
  method_used: string | null;
  issues_found: string | null;
  corrective_action_triggered: boolean;
  task_feed_post_id: string | null;
  post_status: 'pending' | 'posted' | 'failed';
  result: 'pass' | 'fail' | 'conditional';
  notes: string | null;
  photo_urls: string[];
  created_at: string;
};

export type NewCompletion = {
  task_id: string;
  completed_by: string;
  shift?: string;
  visual_pass?: boolean;
  preop_signed_by?: string;
  chemical_used?: string;
  concentration_used?: string;
  contact_time_actual?: number;
  method_used?: string;
  issues_found?: string;
  result: 'pass' | 'fail' | 'conditional';
  notes?: string;
  photo_urls?: string[];
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
export function isTaskOverdue(task: SanitationTask): boolean {
  if (!task.next_due_date) return false;
  return new Date(task.next_due_date) < new Date(new Date().toDateString());
}

export function isTaskDueToday(task: SanitationTask): boolean {
  if (!task.next_due_date) return false;
  const today = new Date().toDateString();
  return new Date(task.next_due_date).toDateString() === today;
}

export function getTaskStatusColor(task: SanitationTask): string {
  if (isTaskOverdue(task)) return '#ff2d55';
  if (isTaskDueToday(task)) return '#ffb800';
  return '#00ff88';
}

export function groupTasksByRoom(tasks: SanitationTask[]) {
  return tasks.reduce((acc, task) => {
    if (!acc[task.room]) acc[task.room] = [];
    acc[task.room].push(task);
    return acc;
  }, {} as Record<string, SanitationTask[]>);
}

export function groupTasksByFrequency(tasks: SanitationTask[]) {
  return tasks.reduce((acc, task) => {
    if (!acc[task.frequency]) acc[task.frequency] = [];
    acc[task.frequency].push(task);
    return acc;
  }, {} as Record<string, SanitationTask[]>);
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useSanitationTasks() {
  const [tasks, setTasks] = useState<SanitationTask[]>([]);
  const [ssops, setSSOPs] = useState<SanitationSSOPFull[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all active tasks with SSOP summary ──
  const fetchTasks = useCallback(async (roomFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('sanitation_tasks')
        .select(`
          *,
          ssop:sanitation_ssops (
            id, title, ssop_code, version,
            chemical_name, chemical_concentration,
            contact_time_min, method, ppe_required
          )
        `)
        .eq('org_id', ORG_ID)
        .eq('status', 'active')
        .order('next_due_date', { ascending: true });

      if (roomFilter) query = query.eq('room', roomFilter);

      const { data, error: err } = await query;
      if (err) throw err;
      setTasks(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch tasks due today + overdue ──
  const fetchDueTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: err } = await supabase
        .from('sanitation_tasks')
        .select(`*, ssop:sanitation_ssops(id, title, ssop_code, version, chemical_name, chemical_concentration, contact_time_min, method, ppe_required)`)
        .eq('org_id', ORG_ID)
        .eq('status', 'active')
        .lte('next_due_date', today)
        .order('next_due_date', { ascending: true });

      if (err) throw err;
      setTasks(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch full SSOP library ──
  const fetchSSOPs = useCallback(async (statusFilter: 'active' | 'archived' | 'draft' = 'active') => {
    setLoading(true);
    setError(null);
    try {
      const { data: ssopData, error: ssopErr } = await supabase
        .from('sanitation_ssops')
        .select('*')
        .eq('org_id', ORG_ID)
        .eq('status', statusFilter)
        .order('ssop_code', { ascending: true });

      if (ssopErr) throw ssopErr;

      // Fetch steps for each SSOP
      const ids = (ssopData || []).map((s: any) => s.id);
      const { data: stepsData, error: stepsErr } = await supabase
        .from('ssop_steps')
        .select('*')
        .in('ssop_id', ids)
        .order('step_number', { ascending: true });

      if (stepsErr) throw stepsErr;

      const stepsBySSOP = (stepsData || []).reduce((acc: any, step: any) => {
        if (!acc[step.ssop_id]) acc[step.ssop_id] = [];
        acc[step.ssop_id].push(step);
        return acc;
      }, {});

      const full = (ssopData || []).map((s: any) => ({
        ...s,
        steps: stepsBySSOP[s.id] || [],
      }));

      setSSOPs(full);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch completions for a task ──
  const fetchCompletions = useCallback(async (taskId: string, limitDays = 30) => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - limitDays);

      const { data, error: err } = await supabase
        .from('sanitation_task_completions')
        .select('*')
        .eq('org_id', ORG_ID)
        .eq('task_id', taskId)
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: false });

      if (err) throw err;
      setCompletions(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch recent completions across all tasks ──
  const fetchRecentCompletions = useCallback(async (limitDays = 7) => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - limitDays);

      const { data, error: err } = await supabase
        .from('sanitation_task_completions')
        .select('*')
        .eq('org_id', ORG_ID)
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: false });

      if (err) throw err;
      setCompletions(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Complete a task ──
  const completeTask = useCallback(async (completion: NewCompletion): Promise<TaskCompletion | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('sanitation_task_completions')
        .insert([{ ...completion, org_id: ORG_ID }])
        .select()
        .single();

      if (err) throw err;

      // Roll the next_due_date forward
      await supabase.rpc('recalculate_next_due_date', { p_task_id: completion.task_id });

      // Refresh tasks list
      await fetchTasks();

      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchTasks]);

  // ── Create a new sanitation task ──
  const createTask = useCallback(async (task: Partial<SanitationTask>): Promise<SanitationTask | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('sanitation_tasks')
        .insert([{ ...task, org_id: ORG_ID }])
        .select()
        .single();

      if (err) throw err;
      await fetchTasks();
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchTasks]);

  // ── Update a task ──
  const updateTask = useCallback(async (id: string, updates: Partial<SanitationTask>): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('sanitation_tasks')
        .update(updates)
        .eq('id', id)
        .eq('org_id', ORG_ID);

      if (err) throw err;
      await fetchTasks();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchTasks]);

  // ── Create SSOP ──
  const createSSOPWithSteps = useCallback(async (
    ssop: Partial<SanitationSSOPFull>,
    steps: Omit<SSOPStep, 'id' | 'ssop_id'>[]
  ): Promise<string | null> => {
    setError(null);
    try {
      const { data: ssopData, error: ssopErr } = await supabase
        .from('sanitation_ssops')
        .insert([{ ...ssop, org_id: ORG_ID }])
        .select()
        .single();

      if (ssopErr) throw ssopErr;

      if (steps.length > 0) {
        const stepsWithIds = steps.map((s, i) => ({
          ...s,
          ssop_id: ssopData.id,
          org_id: ORG_ID,
          step_number: i + 1,
        }));
        const { error: stepsErr } = await supabase
          .from('ssop_steps')
          .insert(stepsWithIds);
        if (stepsErr) throw stepsErr;
      }

      await fetchSSOPs();
      return ssopData.id;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchSSOPs]);

  // ── Computed stats ──
  const stats = {
    total: tasks.length,
    overdue: tasks.filter(isTaskOverdue).length,
    dueToday: tasks.filter(isTaskDueToday).length,
    upcoming: tasks.filter(t => !isTaskOverdue(t) && !isTaskDueToday(t)).length,
    byRoom: groupTasksByRoom(tasks),
    byFrequency: groupTasksByFrequency(tasks),
  };

  return {
    tasks,
    ssops,
    completions,
    loading,
    error,
    stats,
    fetchTasks,
    fetchDueTasks,
    fetchSSOPs,
    fetchCompletions,
    fetchRecentCompletions,
    completeTask,
    createTask,
    updateTask,
    createSSOPWithSteps,
    isTaskOverdue,
    isTaskDueToday,
    getTaskStatusColor,
    groupTasksByRoom,
    groupTasksByFrequency,
  };
}
