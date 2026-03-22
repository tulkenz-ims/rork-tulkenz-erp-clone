// hooks/useAIWatchSystem.ts
// TulKenz OPS — AI Watch System, Notes & Reminders
// Platform Admin / Super Admin only for watch features
// All employees can use notes & reminders

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

// ── TYPES ────────────────────────────────────────────────────────

export interface AIUserNote {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  note_type: 'note' | 'reminder' | 'saved_response';
  title: string | null;
  content: string;
  reminder_at: string | null;
  reminder_sent: boolean;
  source: 'ai_assistant' | 'manual';
  conversation_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AISavedConversation {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  department_code: string | null;
  department_name: string | null;
  conversation_id: string;
  summary: string | null;
  topics: string[];
  actions_taken: string[];
  unresolved: string | null;
  message_count: number;
  saved_by: 'user' | 'system' | 'watch_flag';
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_by: string | null;
  flagged_at: string | null;
  full_transcript: any;
  created_at: string;
}

export interface AIWatchEntry {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  department_code: string | null;
  department_name: string | null;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  flagged_by: string;
  flagged_by_id: string | null;
  is_active: boolean;
  email_alerts: boolean;
  alert_email: string | null;
  notes: string | null;
  conversation_count: number;
  last_activity_at: string | null;
  unflagged_by: string | null;
  unflagged_at: string | null;
  unflag_reason: string | null;
  created_at: string;
}

export interface AIWatchLog {
  id: string;
  organization_id: string;
  watch_id: string;
  employee_id: string;
  employee_name: string;
  conversation_id: string;
  summary: string | null;
  topics: string[];
  actions_taken: string[];
  unresolved: string | null;
  message_count: number;
  full_transcript: any;
  screen_context: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  emailed: boolean;
  emailed_at: string | null;
  emailed_to: string | null;
  created_at: string;
}

export interface AIConsentRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  consent_version: string;
  consented_at: string;
  ip_address: string | null;
  device_info: string | null;
  consent_text: string | null;
}

// ══════════════════════════════════════════════════════════════════
// NOTES & REMINDERS (all employees)
// ══════════════════════════════════════════════════════════════════

export function useMyNotes(employeeId: string) {
  return useQuery({
    queryKey: ['ai_user_notes', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_user_notes')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('employee_id', employeeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AIUserNote[];
    },
    enabled: !!employeeId,
  });
}

export function useMyReminders(employeeId: string) {
  return useQuery({
    queryKey: ['ai_user_notes_reminders', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_user_notes')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('employee_id', employeeId)
        .eq('note_type', 'reminder')
        .eq('reminder_sent', false)
        .is('deleted_at', null)
        .order('reminder_at', { ascending: true });
      if (error) throw error;
      return (data || []) as AIUserNote[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      employee_name: string;
      note_type: 'note' | 'reminder' | 'saved_response';
      title?: string;
      content: string;
      reminder_at?: string;
      source?: 'ai_assistant' | 'manual';
      conversation_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_user_notes')
        .insert({
          organization_id: ORG_ID,
          ...input,
          source: input.source || 'ai_assistant',
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIUserNote;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_user_notes', data.employee_id] });
      qc.invalidateQueries({ queryKey: ['ai_user_notes_reminders', data.employee_id] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('ai_user_notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: ({ employeeId }) => {
      qc.invalidateQueries({ queryKey: ['ai_user_notes', employeeId] });
    },
  });
}

export function useMarkNoteRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from('ai_user_notes')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: ({ employeeId }) => {
      qc.invalidateQueries({ queryKey: ['ai_user_notes', employeeId] });
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// SAVED CONVERSATIONS (all employees — own only)
// ══════════════════════════════════════════════════════════════════

export function useMySavedConversations(employeeId: string) {
  return useQuery({
    queryKey: ['ai_saved_conversations', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_saved_conversations')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AISavedConversation[];
    },
    enabled: !!employeeId,
  });
}

export function useSaveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      employee_name: string;
      department_code?: string;
      department_name?: string;
      summary?: string;
      topics?: string[];
      actions_taken?: string[];
      unresolved?: string;
      message_count?: number;
      full_transcript?: any;
      saved_by?: 'user' | 'system' | 'watch_flag';
    }) => {
      const { data, error } = await supabase
        .from('ai_saved_conversations')
        .insert({
          organization_id: ORG_ID,
          conversation_id: `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          saved_by: 'user',
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AISavedConversation;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_saved_conversations', data.employee_id] });
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// WATCH LIST (platform admin / super admin only)
// ══════════════════════════════════════════════════════════════════

export function useWatchList() {
  return useQuery({
    queryKey: ['ai_watch_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_watch_list')
        .select('*')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AIWatchEntry[];
    },
  });
}

export function useActiveWatchList() {
  return useQuery({
    queryKey: ['ai_watch_list_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_watch_list')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AIWatchEntry[];
    },
  });
}

export function useIsEmployeeWatched(employeeId: string) {
  return useQuery({
    queryKey: ['ai_watch_check', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_watch_list')
        .select('id, is_active, email_alerts, alert_email')
        .eq('organization_id', ORG_ID)
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; is_active: boolean; email_alerts: boolean; alert_email: string | null } | null;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // cache 5 min — checked on every AI call
  });
}

export function useFlagEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      employee_name: string;
      department_code?: string;
      department_name?: string;
      reason: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      flagged_by: string;
      flagged_by_id?: string;
      email_alerts?: boolean;
      alert_email?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_watch_list')
        .insert({
          organization_id: ORG_ID,
          is_active: true,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIWatchEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai_watch_list'] });
      qc.invalidateQueries({ queryKey: ['ai_watch_list_active'] });
    },
  });
}

export function useUnflagEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      employee_id: string;
      unflagged_by: string;
      unflag_reason: string;
    }) => {
      const { error } = await supabase
        .from('ai_watch_list')
        .update({
          is_active: false,
          unflagged_by: input.unflagged_by,
          unflagged_at: new Date().toISOString(),
          unflag_reason: input.unflag_reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_watch_list'] });
      qc.invalidateQueries({ queryKey: ['ai_watch_list_active'] });
      qc.invalidateQueries({ queryKey: ['ai_watch_check', data.employee_id] });
    },
  });
}

export function useUpdateWatchEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      email_alerts?: boolean;
      alert_email?: string;
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    }) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from('ai_watch_list')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai_watch_list'] });
      qc.invalidateQueries({ queryKey: ['ai_watch_list_active'] });
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// WATCH LOGS (platform admin / super admin only)
// ══════════════════════════════════════════════════════════════════

export function useWatchLogs(watchId?: string) {
  return useQuery({
    queryKey: ['ai_watch_logs', watchId],
    queryFn: async () => {
      let q = supabase
        .from('ai_watch_logs')
        .select('*')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false });
      if (watchId) q = q.eq('watch_id', watchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AIWatchLog[];
    },
    enabled: watchId !== undefined ? !!watchId : true,
  });
}

export function useUnreviewedWatchLogs() {
  return useQuery({
    queryKey: ['ai_watch_logs_unreviewed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_watch_logs')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('reviewed', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AIWatchLog[];
    },
  });
}

export function useCreateWatchLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      watch_id: string;
      employee_id: string;
      employee_name: string;
      conversation_id: string;
      summary?: string;
      topics?: string[];
      actions_taken?: string[];
      unresolved?: string;
      message_count?: number;
      full_transcript?: any;
      screen_context?: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_watch_logs')
        .insert({ organization_id: ORG_ID, ...input })
        .select()
        .single();
      if (error) throw error;

      // Increment conversation count on watch entry
      await supabase.rpc('increment', {
        table_name: 'ai_watch_list',
        field_name: 'conversation_count',
        row_id: input.watch_id,
      }).catch(() => {
        // Fallback if rpc not available
        supabase
          .from('ai_watch_list')
          .update({
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.watch_id);
      });

      return data as AIWatchLog;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_watch_logs', data.watch_id] });
      qc.invalidateQueries({ queryKey: ['ai_watch_logs_unreviewed'] });
      qc.invalidateQueries({ queryKey: ['ai_watch_list'] });
    },
  });
}

export function useMarkLogReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      watch_id: string;
      reviewed_by: string;
      review_notes?: string;
    }) => {
      const { error } = await supabase
        .from('ai_watch_logs')
        .update({
          reviewed: true,
          reviewed_by: input.reviewed_by,
          reviewed_at: new Date().toISOString(),
          review_notes: input.review_notes || null,
        })
        .eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_watch_logs', data.watch_id] });
      qc.invalidateQueries({ queryKey: ['ai_watch_logs_unreviewed'] });
    },
  });
}

export function useMarkLogEmailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      watch_id: string;
      emailed_to: string;
    }) => {
      const { error } = await supabase
        .from('ai_watch_logs')
        .update({
          emailed: true,
          emailed_at: new Date().toISOString(),
          emailed_to: input.emailed_to,
        })
        .eq('id', input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_watch_logs', data.watch_id] });
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// CONSENT RECORDS
// ══════════════════════════════════════════════════════════════════

export function useCheckConsent(employeeId: string) {
  return useQuery({
    queryKey: ['ai_consent', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_consent_records')
        .select('id, consent_version, consented_at')
        .eq('organization_id', ORG_ID)
        .eq('employee_id', employeeId)
        .order('consented_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; consent_version: string; consented_at: string } | null;
    },
    enabled: !!employeeId,
  });
}

export function useRecordConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      employee_name: string;
      consent_version?: string;
      ip_address?: string;
      device_info?: string;
      consent_text?: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_consent_records')
        .insert({
          organization_id: ORG_ID,
          consent_version: '1.0',
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIConsentRecord;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai_consent', data.employee_id] });
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// WATCH STATS (for Watch Screen dashboard)
// ══════════════════════════════════════════════════════════════════

export function useWatchStats() {
  return useQuery({
    queryKey: ['ai_watch_stats'],
    queryFn: async () => {
      const [activeRes, unreviewedRes, totalLogsRes, emailAlertsRes] = await Promise.all([
        supabase.from('ai_watch_list').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('is_active', true),
        supabase.from('ai_watch_logs').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('reviewed', false),
        supabase.from('ai_watch_logs').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID),
        supabase.from('ai_watch_list').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('is_active', true).eq('email_alerts', true),
      ]);

      return {
        activeWatched: activeRes.count || 0,
        unreviewedLogs: unreviewedRes.count || 0,
        totalLogs: totalLogsRes.count || 0,
        emailAlerts: emailAlertsRes.count || 0,
      };
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// ALL SAVED CONVERSATIONS (platform admin view — all employees)
// ══════════════════════════════════════════════════════════════════

export function useAllSavedConversations(filters?: {
  employee_id?: string;
  saved_by?: string;
  is_flagged?: boolean;
  date_range?: 'today' | 'this_week' | 'this_month' | 'all';
}) {
  return useQuery({
    queryKey: ['ai_saved_conversations_all', filters],
    queryFn: async () => {
      let q = supabase
        .from('ai_saved_conversations')
        .select('*')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters?.employee_id) q = q.eq('employee_id', filters.employee_id);
      if (filters?.saved_by) q = q.eq('saved_by', filters.saved_by);
      if (filters?.is_flagged !== undefined) q = q.eq('is_flagged', filters.is_flagged);
      if (filters?.date_range === 'today') {
        const t = new Date().toISOString().split('T')[0];
        q = q.gte('created_at', `${t}T00:00:00`);
      } else if (filters?.date_range === 'this_week') {
        q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
      } else if (filters?.date_range === 'this_month') {
        const n = new Date();
        q = q.gte('created_at', new Date(n.getFullYear(), n.getMonth(), 1).toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AISavedConversation[];
    },
  });
}
