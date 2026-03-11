// hooks/useEMPSwabs.ts
// Environmental Monitoring Program — zones, swab points,
// ATP results, microbial results, swab schedule

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type EMPZone = {
  id: string;
  org_id: string;
  zone_number: 1 | 2 | 3 | 4;
  zone_name: string;
  description: string | null;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  positive_action: string | null;
  sampling_frequency: string | null;
  samples_per_period: number | null;
  created_at: string;
};

export type SwabPoint = {
  id: string;
  org_id: string;
  point_code: string;
  description: string;
  room: string;
  zone_id: string;
  zone_number: 1 | 2 | 3 | 4;
  surface_type: string | null;
  equipment: string | null;
  test_atp: boolean;
  test_indicator: boolean;
  test_pathogen: boolean;
  atp_frequency: string;
  indicator_frequency: string;
  pathogen_frequency: string;
  atp_pass_threshold: number;
  atp_warn_threshold: number;
  status: 'active' | 'inactive';
  last_tested_at: string | null;
  last_result: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ATPResult = {
  id: string;
  org_id: string;
  swab_point_id: string | null;
  room: string;
  location_description: string | null;
  zone_number: number | null;
  tested_by: string;
  tested_at: string;
  shift: string | null;
  luminometer_id: string | null;
  rlu_reading: number;
  pass_threshold: number;
  warn_threshold: number;
  result: 'pass' | 'warning' | 'fail';
  test_condition: string | null;
  linked_task_id: string | null;
  linked_completion_id: string | null;
  linked_schedule_id: string | null;
  corrective_action_triggered: boolean;
  corrective_action_id: string | null;
  task_feed_post_id: string | null;
  post_status: 'pending' | 'posted' | 'failed';
  notes: string | null;
  photo_urls: string[];
  created_at: string;
};

export type MicrobialResult = {
  id: string;
  org_id: string;
  sample_id: string;
  swab_point_id: string | null;
  room: string;
  location_description: string | null;
  zone_number: number | null;
  collected_by: string;
  collected_at: string;
  shift: string | null;
  sample_type: string;
  transport_buffer: string | null;
  organism_target: string;
  test_method: string | null;
  lab_name: string | null;
  submitted_at: string | null;
  result_received_at: string | null;
  result_type: 'qualitative' | 'quantitative';
  result_qualitative: 'positive' | 'negative' | 'inconclusive' | null;
  result_quantitative: string | null;
  result_units: string | null;
  status: 'pending' | 'submitted' | 'result_received' | 'confirmed';
  corrective_action_triggered: boolean;
  corrective_action_id: string | null;
  task_feed_post_id: string | null;
  post_status: 'pending' | 'posted' | 'failed';
  linked_schedule_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SwabScheduleEntry = {
  id: string;
  org_id: string;
  swab_point_id: string;
  test_type: 'atp' | 'indicator' | 'pathogen';
  organism_target: string | null;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue' | 'skipped';
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  result_id: string | null;
  task_feed_post_id: string | null;
  post_status: 'pending' | 'posted' | 'failed';
  notes: string | null;
  created_at: string;
  swab_point?: SwabPoint;
};

export type NewATPResult = {
  swab_point_id?: string;
  room: string;
  location_description?: string;
  zone_number?: number;
  tested_by: string;
  shift?: string;
  luminometer_id?: string;
  rlu_reading: number;
  pass_threshold?: number;
  warn_threshold?: number;
  test_condition?: string;
  linked_task_id?: string;
  linked_schedule_id?: string;
  notes?: string;
  photo_urls?: string[];
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
export const ZONE_COLORS: Record<number, string> = {
  1: '#ff2d55',   // red — critical food contact
  2: '#ffb800',   // amber — near food
  3: '#7b61ff',   // purple — non-food contact
  4: '#00e5ff',   // cyan — general facility
};

export const ZONE_LABELS: Record<number, string> = {
  1: 'Zone 1 — Food Contact',
  2: 'Zone 2 — Near Food',
  3: 'Zone 3 — Non-Food Contact',
  4: 'Zone 4 — General Facility',
};

export const RESULT_COLORS: Record<string, string> = {
  pass: '#00ff88',
  warning: '#ffb800',
  fail: '#ff2d55',
  positive: '#ff2d55',
  negative: '#00ff88',
  inconclusive: '#ffb800',
  pending: '#7aa8c8',
};

export function calcATPResult(
  rlu: number,
  passThreshold = 100,
  warnThreshold = 200
): 'pass' | 'warning' | 'fail' {
  if (rlu <= passThreshold) return 'pass';
  if (rlu <= warnThreshold) return 'warning';
  return 'fail';
}

export function groupSwabPointsByRoom(points: SwabPoint[]) {
  return points.reduce((acc, p) => {
    if (!acc[p.room]) acc[p.room] = [];
    acc[p.room].push(p);
    return acc;
  }, {} as Record<string, SwabPoint[]>);
}

export function groupSwabPointsByZone(points: SwabPoint[]) {
  return points.reduce((acc, p) => {
    const key = p.zone_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<number, SwabPoint[]>);
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useEMPSwabs() {
  const [zones, setZones] = useState<EMPZone[]>([]);
  const [swabPoints, setSwabPoints] = useState<SwabPoint[]>([]);
  const [atpResults, setATPResults] = useState<ATPResult[]>([]);
  const [microbialResults, setMicrobialResults] = useState<MicrobialResult[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<SwabScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch zones ──
  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('emp_zones')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('zone_number', { ascending: true });
      if (err) throw err;
      setZones(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch swab points ──
  const fetchSwabPoints = useCallback(async (roomFilter?: string, zoneFilter?: number) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('emp_swab_points')
        .select('*')
        .eq('org_id', ORG_ID)
        .eq('status', 'active')
        .order('point_code', { ascending: true });

      if (roomFilter) query = query.eq('room', roomFilter);
      if (zoneFilter) query = query.eq('zone_number', zoneFilter);

      const { data, error: err } = await query;
      if (err) throw err;
      setSwabPoints(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch ATP results ──
  const fetchATPResults = useCallback(async (limitDays = 30, roomFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - limitDays);

      let query = supabase
        .from('atp_swab_results')
        .select('*')
        .eq('org_id', ORG_ID)
        .gte('tested_at', since.toISOString())
        .order('tested_at', { ascending: false });

      if (roomFilter) query = query.eq('room', roomFilter);

      const { data, error: err } = await query;
      if (err) throw err;
      setATPResults(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch microbial results ──
  const fetchMicrobialResults = useCallback(async (limitDays = 90) => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - limitDays);

      const { data, error: err } = await supabase
        .from('microbial_test_results')
        .select('*')
        .eq('org_id', ORG_ID)
        .gte('collected_at', since.toISOString())
        .order('collected_at', { ascending: false });

      if (err) throw err;
      setMicrobialResults(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch due swab schedule ──
  const fetchDueSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: err } = await supabase
        .from('emp_swab_schedule')
        .select(`*, swab_point:emp_swab_points(*)`)
        .eq('org_id', ORG_ID)
        .lte('due_date', today)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (err) throw err;
      setScheduleEntries(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Log ATP swab result ──
  const logATPResult = useCallback(async (input: NewATPResult): Promise<ATPResult | null> => {
    setError(null);
    try {
      // Get thresholds from swab point if available
      let passThreshold = input.pass_threshold ?? 100;
      let warnThreshold = input.warn_threshold ?? 200;

      if (input.swab_point_id) {
        const { data: point } = await supabase
          .from('emp_swab_points')
          .select('atp_pass_threshold, atp_warn_threshold')
          .eq('id', input.swab_point_id)
          .single();
        if (point) {
          passThreshold = point.atp_pass_threshold;
          warnThreshold = point.atp_warn_threshold;
        }
      }

      const result = calcATPResult(input.rlu_reading, passThreshold, warnThreshold);
      const isFail = result === 'fail';

      const { data, error: err } = await supabase
        .from('atp_swab_results')
        .insert([{
          ...input,
          org_id: ORG_ID,
          pass_threshold: passThreshold,
          warn_threshold: warnThreshold,
          result,
          corrective_action_triggered: isFail,
        }])
        .select()
        .single();

      if (err) throw err;

      // Update swab point last result
      if (input.swab_point_id) {
        await supabase.rpc('update_swab_point_last_result', {
          p_swab_point_id: input.swab_point_id,
          p_result: result,
          p_tested_at: data.tested_at,
        });
      }

      // Mark schedule entry complete if linked
      if (input.linked_schedule_id) {
        await supabase
          .from('emp_swab_schedule')
          .update({ status: 'completed', completed_at: data.tested_at, result_id: data.id })
          .eq('id', input.linked_schedule_id);
      }

      await fetchATPResults();
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchATPResults]);

  // ── Log microbial sample ──
  const logMicrobialSample = useCallback(async (sample: Partial<MicrobialResult>): Promise<MicrobialResult | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('microbial_test_results')
        .insert([{ ...sample, org_id: ORG_ID }])
        .select()
        .single();

      if (err) throw err;
      await fetchMicrobialResults();
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchMicrobialResults]);

  // ── Update microbial result (when lab result comes back) ──
  const updateMicrobialResult = useCallback(async (
    id: string,
    updates: Partial<MicrobialResult>
  ): Promise<boolean> => {
    setError(null);
    try {
      const isPositive = updates.result_qualitative === 'positive';
      const { error: err } = await supabase
        .from('microbial_test_results')
        .update({
          ...updates,
          corrective_action_triggered: isPositive,
          status: updates.status ?? 'result_received',
        })
        .eq('id', id)
        .eq('org_id', ORG_ID);

      if (err) throw err;
      await fetchMicrobialResults();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchMicrobialResults]);

  // ── Computed stats for dashboard ──
  const stats = {
    swabPoints: {
      total: swabPoints.length,
      byZone: groupSwabPointsByZone(swabPoints),
      byRoom: groupSwabPointsByRoom(swabPoints),
    },
    atp: {
      total: atpResults.length,
      pass: atpResults.filter(r => r.result === 'pass').length,
      warning: atpResults.filter(r => r.result === 'warning').length,
      fail: atpResults.filter(r => r.result === 'fail').length,
      passRate: atpResults.length > 0
        ? Math.round((atpResults.filter(r => r.result === 'pass').length / atpResults.length) * 100)
        : 0,
    },
    microbial: {
      total: microbialResults.length,
      pending: microbialResults.filter(r => r.status === 'pending' || r.status === 'submitted').length,
      positive: microbialResults.filter(r => r.result_qualitative === 'positive').length,
      negative: microbialResults.filter(r => r.result_qualitative === 'negative').length,
    },
    schedule: {
      due: scheduleEntries.length,
      overdue: scheduleEntries.filter(e => e.due_date < new Date().toISOString().split('T')[0]).length,
    },
  };

  return {
    zones,
    swabPoints,
    atpResults,
    microbialResults,
    scheduleEntries,
    loading,
    error,
    stats,
    fetchZones,
    fetchSwabPoints,
    fetchATPResults,
    fetchMicrobialResults,
    fetchDueSchedule,
    logATPResult,
    logMicrobialSample,
    updateMicrobialResult,
    calcATPResult,
    groupSwabPointsByRoom,
    groupSwabPointsByZone,
    ZONE_COLORS,
    ZONE_LABELS,
    RESULT_COLORS,
  };
}
