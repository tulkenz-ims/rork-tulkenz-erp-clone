import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

// ── Types ─────────────────────────────────────────────────────

export interface RoomHygieneEntry {
  id: string;
  organizationId: string;
  facilityId?: string;
  roomId: string;
  roomName: string;
  productionLine?: string;
  entryTime: string;
  exitTime?: string;
  durationMinutes?: number;
  enteredById?: string;
  enteredByName: string;
  departmentCode: string;
  departmentName: string;
  role?: string;
  purpose: string;
  purposeDetail?: string;
  actionsPerformed: string;
  equipmentTouched: string[];
  chemicalsUsed: string[];
  toolsBroughtIn: string[];
  handwashOnEntry: boolean;
  ppeWorn: string[];
  hairnet: boolean;
  gloves: boolean;
  smock: boolean;
  bootCovers: boolean;
  contaminationRisk: 'none' | 'low' | 'medium' | 'high';
  contaminationNotes?: string;
  taskFeedPostId?: string;
  workOrderId?: string;
  status: 'active' | 'completed' | 'flagged';
  notes?: string;
  attachments: string[];
  dailyReportId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRoomHygieneReport {
  id: string;
  organizationId: string;
  facilityId?: string;
  roomId: string;
  roomName: string;
  productionLine?: string;
  reportDate: string;
  status: 'open' | 'signed_off';
  totalEntries: number;
  flaggedEntries: number;
  activeEntries: number;
  completedEntries: number;
  departmentCounts: Record<string, number>;
  highestContaminationRisk: string;
  contaminationEntryCount: number;
  signedOffById?: string;
  signedOffByName?: string;
  signedOffAt?: string;
  signatureStamp?: string;
  signoffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mappers ───────────────────────────────────────────────────

const mapEntryFromDb = (row: any): RoomHygieneEntry => ({
  id: row.id,
  organizationId: row.organization_id,
  facilityId: row.facility_id,
  roomId: row.room_id,
  roomName: row.room_name,
  productionLine: row.production_line,
  entryTime: row.entry_time,
  exitTime: row.exit_time,
  durationMinutes: row.duration_minutes,
  enteredById: row.entered_by_id,
  enteredByName: row.entered_by_name,
  departmentCode: row.department_code,
  departmentName: row.department_name,
  role: row.role,
  purpose: row.purpose,
  purposeDetail: row.purpose_detail,
  actionsPerformed: row.actions_performed,
  equipmentTouched: row.equipment_touched || [],
  chemicalsUsed: row.chemicals_used || [],
  toolsBroughtIn: row.tools_brought_in || [],
  handwashOnEntry: row.handwash_on_entry ?? true,
  ppeWorn: row.ppe_worn || [],
  hairnet: row.hairnet ?? true,
  gloves: row.gloves ?? true,
  smock: row.smock ?? true,
  bootCovers: row.boot_covers ?? false,
  contaminationRisk: row.contamination_risk || 'none',
  contaminationNotes: row.contamination_notes,
  taskFeedPostId: row.task_feed_post_id,
  workOrderId: row.work_order_id,
  status: row.status || 'active',
  notes: row.notes,
  attachments: row.attachments || [],
  dailyReportId: row.daily_report_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapReportFromDb = (row: any): DailyRoomHygieneReport => ({
  id: row.id,
  organizationId: row.organization_id,
  facilityId: row.facility_id,
  roomId: row.room_id,
  roomName: row.room_name,
  productionLine: row.production_line,
  reportDate: row.report_date,
  status: row.status || 'open',
  totalEntries: row.total_entries || 0,
  flaggedEntries: row.flagged_entries || 0,
  activeEntries: row.active_entries || 0,
  completedEntries: row.completed_entries || 0,
  departmentCounts: row.department_counts || {},
  highestContaminationRisk: row.highest_contamination_risk || 'none',
  contaminationEntryCount: row.contamination_entry_count || 0,
  signedOffById: row.signed_off_by_id,
  signedOffByName: row.signed_off_by_name,
  signedOffAt: row.signed_off_at,
  signatureStamp: row.signature_stamp,
  signoffNotes: row.signoff_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── Helper: find or create daily report for a room ────────────

async function getOrCreateDailyReport(
  organizationId: string,
  facilityId: string | undefined,
  roomId: string,
  roomName: string,
  productionLine?: string,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  // Try to find existing report for this room today
  const { data: existing, error: fetchErr } = await supabase
    .from('daily_room_hygiene_reports')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('room_id', roomId)
    .eq('report_date', today)
    .maybeSingle();

  if (fetchErr) {
    console.error('[RoomHygiene] Error finding daily report:', fetchErr.message);
  }

  if (existing?.id) {
    return existing.id;
  }

  // Create new daily report
  const { data: newReport, error: createErr } = await supabase
    .from('daily_room_hygiene_reports')
    .insert({
      organization_id: organizationId,
      facility_id: facilityId || null,
      room_id: roomId,
      room_name: roomName,
      production_line: productionLine || null,
      report_date: today,
      status: 'open',
      total_entries: 0,
      flagged_entries: 0,
      active_entries: 0,
      completed_entries: 0,
      department_counts: {},
      highest_contamination_risk: 'none',
      contamination_entry_count: 0,
    })
    .select('id')
    .single();

  if (createErr) {
    console.error('[RoomHygiene] Error creating daily report:', createErr.message);
    // If it failed due to unique constraint (race condition), try fetching again
    const { data: retry } = await supabase
      .from('daily_room_hygiene_reports')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('room_id', roomId)
      .eq('report_date', today)
      .maybeSingle();

    if (retry?.id) return retry.id;
    throw new Error('Failed to create daily room report');
  }

  return newReport.id;
}

// ── Helper: update daily report counters ──────────────────────

async function updateDailyReportCounters(reportId: string) {
  try {
    // Get all entries for this report
    const { data: entries } = await supabase
      .from('room_hygiene_log')
      .select('status, department_code, contamination_risk')
      .eq('daily_report_id', reportId);

    if (!entries) return;

    const total = entries.length;
    const flagged = entries.filter(e => e.status === 'flagged').length;
    const active = entries.filter(e => e.status === 'active').length;
    const completed = entries.filter(e => e.status === 'completed').length;

    // Department counts
    const deptCounts: Record<string, number> = {};
    entries.forEach(e => {
      deptCounts[e.department_code] = (deptCounts[e.department_code] || 0) + 1;
    });

    // Contamination summary
    const riskLevels = ['none', 'low', 'medium', 'high'];
    let highestRisk = 'none';
    let contaminationCount = 0;
    entries.forEach(e => {
      const risk = e.contamination_risk || 'none';
      if (risk !== 'none') contaminationCount++;
      if (riskLevels.indexOf(risk) > riskLevels.indexOf(highestRisk)) {
        highestRisk = risk;
      }
    });

    await supabase
      .from('daily_room_hygiene_reports')
      .update({
        total_entries: total,
        flagged_entries: flagged,
        active_entries: active,
        completed_entries: completed,
        department_counts: deptCounts,
        highest_contamination_risk: highestRisk,
        contamination_entry_count: contaminationCount,
      })
      .eq('id', reportId);
  } catch (err) {
    console.error('[RoomHygiene] Error updating report counters:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// QUERIES
// ══════════════════════════════════════════════════════════════

// ── Query: get entries (optionally filtered) ──────────────────

export function useRoomHygieneLogQuery(options?: {
  roomId?: string;
  date?: string; // YYYY-MM-DD
  departmentCode?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['room_hygiene_log', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('room_hygiene_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('entry_time', { ascending: false });

      if (options?.roomId) {
        query = query.eq('room_id', options.roomId);
      }

      if (options?.date) {
        const startOfDay = `${options.date}T00:00:00.000Z`;
        const endOfDay = `${options.date}T23:59:59.999Z`;
        query = query.gte('entry_time', startOfDay).lte('entry_time', endOfDay);
      }

      if (options?.departmentCode) {
        query = query.eq('department_code', options.departmentCode);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapEntryFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

// ── Query: today's entries for a room ─────────────────────────

export function useTodayRoomLog(roomId: string) {
  const today = new Date().toISOString().split('T')[0];
  return useRoomHygieneLogQuery({ roomId, date: today });
}

// ── Query: daily reports for a date ───────────────────────────

export function useDailyRoomReportsQuery(options?: {
  date?: string; // YYYY-MM-DD
  roomId?: string;
  status?: 'open' | 'signed_off';
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['daily_room_hygiene_reports', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('daily_room_hygiene_reports')
        .select('*')
        .eq('organization_id', organizationId)
        .order('room_name', { ascending: true });

      if (options?.date) {
        query = query.eq('report_date', options.date);
      }

      if (options?.roomId) {
        query = query.eq('room_id', options.roomId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapReportFromDb);
    },
    enabled: options?.enabled !== false && !!organizationId,
  });
}

// ══════════════════════════════════════════════════════════════
// MUTATIONS
// ══════════════════════════════════════════════════════════════

// ── Mutation: create entry ────────────────────────────────────

export interface CreateRoomHygieneInput {
  roomId: string;
  roomName: string;
  productionLine?: string;
  purpose: string;
  purposeDetail?: string;
  actionsPerformed: string;
  equipmentTouched?: string[];
  chemicalsUsed?: string[];
  toolsBroughtIn?: string[];
  handwashOnEntry?: boolean;
  ppeWorn?: string[];
  hairnet?: boolean;
  gloves?: boolean;
  smock?: boolean;
  bootCovers?: boolean;
  contaminationRisk?: 'none' | 'low' | 'medium' | 'high';
  contaminationNotes?: string;
  taskFeedPostId?: string;
  workOrderId?: string;
  notes?: string;
}

export function useCreateRoomHygieneEntry(callbacks?: {
  onSuccess?: (data: RoomHygieneEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { organizationId, facilityId } = useOrganization();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: CreateRoomHygieneInput) => {
      if (!organizationId) throw new Error('No organization selected');

      // Step 1: Find or create today's daily report for this room
      const dailyReportId = await getOrCreateDailyReport(
        organizationId,
        facilityId,
        input.roomId,
        input.roomName,
        input.productionLine,
      );

      // Step 2: Create the log entry linked to the daily report
      const { data, error } = await supabase
        .from('room_hygiene_log')
        .insert({
          organization_id: organizationId,
          facility_id: facilityId,
          room_id: input.roomId,
          room_name: input.roomName,
          production_line: input.productionLine,
          entry_time: new Date().toISOString(),
          entered_by_id: user?.id,
          entered_by_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
          department_code: user?.department || '1004',
          department_name: user?.departmentName || 'Quality',
          role: user?.jobTitle || '',
          purpose: input.purpose,
          purpose_detail: input.purposeDetail,
          actions_performed: input.actionsPerformed,
          equipment_touched: input.equipmentTouched || [],
          chemicals_used: input.chemicalsUsed || [],
          tools_brought_in: input.toolsBroughtIn || [],
          handwash_on_entry: input.handwashOnEntry ?? true,
          ppe_worn: input.ppeWorn || ['hairnet', 'gloves', 'smock'],
          hairnet: input.hairnet ?? true,
          gloves: input.gloves ?? true,
          smock: input.smock ?? true,
          boot_covers: input.bootCovers ?? false,
          contamination_risk: input.contaminationRisk || 'none',
          contamination_notes: input.contaminationNotes,
          task_feed_post_id: input.taskFeedPostId,
          work_order_id: input.workOrderId,
          status: 'active',
          notes: input.notes,
          daily_report_id: dailyReportId,
        })
        .select()
        .single();

      if (error) throw error;

      // Step 3: Update daily report counters
      await updateDailyReportCounters(dailyReportId);

      return mapEntryFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      queryClient.invalidateQueries({ queryKey: ['daily_room_hygiene_reports'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Mutation: complete entry (exit room) ──────────────────────

export function useCompleteRoomHygieneEntry(callbacks?: {
  onSuccess?: (data: RoomHygieneEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { entryId: string; notes?: string }) => {
      const exitTime = new Date().toISOString();

      // Get entry to calculate duration and get daily_report_id
      const { data: entry } = await supabase
        .from('room_hygiene_log')
        .select('entry_time, daily_report_id')
        .eq('id', input.entryId)
        .single();

      let durationMinutes = 0;
      if (entry?.entry_time) {
        durationMinutes = Math.round(
          (new Date(exitTime).getTime() - new Date(entry.entry_time).getTime()) / 60000
        );
      }

      const { data, error } = await supabase
        .from('room_hygiene_log')
        .update({
          exit_time: exitTime,
          duration_minutes: durationMinutes,
          status: 'completed',
          notes: input.notes,
        })
        .eq('id', input.entryId)
        .select()
        .single();

      if (error) throw error;

      // Update daily report counters
      if (entry?.daily_report_id) {
        await updateDailyReportCounters(entry.daily_report_id);
      }

      return mapEntryFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      queryClient.invalidateQueries({ queryKey: ['daily_room_hygiene_reports'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Mutation: flag entry ──────────────────────────────────────

export function useFlagRoomHygieneEntry(callbacks?: {
  onSuccess?: (data: RoomHygieneEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { entryId: string; contaminationRisk: string; notes: string }) => {
      // Get daily_report_id first
      const { data: entry } = await supabase
        .from('room_hygiene_log')
        .select('daily_report_id')
        .eq('id', input.entryId)
        .single();

      const { data, error } = await supabase
        .from('room_hygiene_log')
        .update({
          status: 'flagged',
          contamination_risk: input.contaminationRisk,
          contamination_notes: input.notes,
        })
        .eq('id', input.entryId)
        .select()
        .single();

      if (error) throw error;

      // Update daily report counters
      if (entry?.daily_report_id) {
        await updateDailyReportCounters(entry.daily_report_id);
      }

      return mapEntryFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      queryClient.invalidateQueries({ queryKey: ['daily_room_hygiene_reports'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Mutation: Quality sign-off on daily report ────────────────

export function useSignOffDailyReport(callbacks?: {
  onSuccess?: (data: DailyRoomHygieneReport) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      reportId: string;
      signedOffById: string;
      signedOffByName: string;
      signatureStamp: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('daily_room_hygiene_reports')
        .update({
          status: 'signed_off',
          signed_off_by_id: input.signedOffById,
          signed_off_by_name: input.signedOffByName,
          signed_off_at: new Date().toISOString(),
          signature_stamp: input.signatureStamp,
          signoff_notes: input.notes || null,
        })
        .eq('id', input.reportId)
        .select()
        .single();

      if (error) throw error;
      return mapReportFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily_room_hygiene_reports'] });
      queryClient.invalidateQueries({ queryKey: ['room_hygiene_log'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}
