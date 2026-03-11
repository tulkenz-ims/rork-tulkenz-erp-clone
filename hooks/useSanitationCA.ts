// hooks/useSanitationCA.ts
// Sanitation Corrective Actions & Vector Swab Investigation

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type CAStatus = 'open' | 'in_progress' | 'pending_verification' | 'closed';
export type CATrigger = 'atp_fail' | 'pathogen_positive' | 'indicator_elevated' | 'visual_fail' | 'audit_finding' | 'complaint' | 'other';
export type CASeverity = 'critical' | 'high' | 'medium' | 'low';

export type CorrectiveAction = {
  id: string;
  org_id: string;
  ca_number: string;
  trigger_type: CATrigger;
  trigger_source_id: string | null;
  trigger_source_table: string | null;
  room: string;
  zone_number: number | null;
  swab_point_id: string | null;
  location_description: string | null;
  organism_found: string | null;
  rlu_reading: number | null;
  result_description: string;
  severity: CASeverity;
  production_hold: boolean;
  product_hold: boolean;
  immediate_actions: string | null;
  re_cleaned_at: string | null;
  re_sanitized_at: string | null;
  equipment_disassembled: boolean;
  vector_swabbing_required: boolean;
  root_cause: string | null;
  root_cause_category: string | null;
  preventive_action: string | null;
  preventive_action_due: string | null;
  preventive_action_owner: string | null;
  status: CAStatus;
  resolution_summary: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  consecutive_negatives_required: number;
  consecutive_negatives_obtained: number;
  task_feed_post_id: string | null;
  post_status: 'pending' | 'posted' | 'failed';
  assigned_to: string | null;
  assigned_dept: number | null;
  notes: string | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
  vector_swab_points?: VectorSwabPoint[];
};

export type VectorSwabPoint = {
  id: string;
  org_id: string;
  corrective_action_id: string;
  room: string;
  zone_number: number | null;
  location_description: string;
  distance_from_source: string | null;
  direction_from_source: string | null;
  test_type: 'atp' | 'indicator' | 'pathogen';
  organism_target: string | null;
  tested_by: string | null;
  tested_at: string | null;
  rlu_reading: number | null;
  result: 'pass' | 'warning' | 'fail' | 'positive' | 'negative' | 'pending' | null;
  result_notes: string | null;
  atp_result_id: string | null;
  microbial_result_id: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
};

export type NewCorrectiveAction = {
  trigger_type: CATrigger;
  trigger_source_id?: string;
  trigger_source_table?: string;
  room: string;
  zone_number?: number;
  swab_point_id?: string;
  location_description?: string;
  organism_found?: string;
  rlu_reading?: number;
  result_description: string;
  severity?: CASeverity;
  production_hold?: boolean;
  product_hold?: boolean;
  immediate_actions?: string;
  vector_swabbing_required?: boolean;
  assigned_to?: string;
  assigned_dept?: number;
  notes?: string;
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
export const CA_STATUS_COLORS: Record<CAStatus, string> = {
  open: '#ff2d55',
  in_progress: '#ffb800',
  pending_verification: '#7b61ff',
  closed: '#00ff88',
};

export const CA_SEVERITY_COLORS: Record<CASeverity, string> = {
  critical: '#ff2d55',
  high: '#ff6b35',
  medium: '#ffb800',
  low: '#00ff88',
};

export const CA_TRIGGER_LABELS: Record<CATrigger, string> = {
  atp_fail: 'ATP Fail',
  pathogen_positive: 'Pathogen Positive',
  indicator_elevated: 'Indicator Elevated',
  visual_fail: 'Visual Fail',
  audit_finding: 'Audit Finding',
  complaint: 'Complaint',
  other: 'Other',
};

// Zone 1 positive requires 3 consecutive negatives before resuming production
export function getRequiredNegatives(zoneNumber: number): number {
  return zoneNumber === 1 ? 3 : 0;
}

export function getCASummaryLine(ca: CorrectiveAction): string {
  return `${CA_TRIGGER_LABELS[ca.trigger_type]} — ${ca.room} Zone ${ca.zone_number ?? 'N/A'} — ${ca.organism_found ?? 'Unknown organism'}`;
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export function useSanitationCA() {
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [selectedCA, setSelectedCA] = useState<CorrectiveAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all corrective actions ──
  const fetchCorrectiveActions = useCallback(async (statusFilter?: CAStatus) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('sanitation_corrective_actions')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error: err } = await query;
      if (err) throw err;
      setCorrectiveActions(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch single CA with vector swab points ──
  const fetchCADetail = useCallback(async (caId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: ca, error: caErr } = await supabase
        .from('sanitation_corrective_actions')
        .select('*')
        .eq('id', caId)
        .eq('org_id', ORG_ID)
        .single();

      if (caErr) throw caErr;

      const { data: vectors, error: vecErr } = await supabase
        .from('vector_swab_points')
        .select('*')
        .eq('corrective_action_id', caId)
        .order('created_at', { ascending: true });

      if (vecErr) throw vecErr;

      const full = { ...ca, vector_swab_points: vectors || [] };
      setSelectedCA(full);
      return full;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create new corrective action ──
  const createCorrectiveAction = useCallback(async (input: NewCorrectiveAction): Promise<CorrectiveAction | null> => {
    setError(null);
    try {
      // Generate CA number
      const { data: numData, error: numErr } = await supabase
        .rpc('generate_san_ca_number', { p_org_id: ORG_ID });
      if (numErr) throw numErr;

      const consecutiveRequired = getRequiredNegatives(input.zone_number ?? 0);

      const { data, error: err } = await supabase
        .from('sanitation_corrective_actions')
        .insert([{
          ...input,
          org_id: ORG_ID,
          ca_number: numData,
          status: 'open',
          consecutive_negatives_required: consecutiveRequired,
          consecutive_negatives_obtained: 0,
        }])
        .select()
        .single();

      if (err) throw err;

      // Link back to trigger source
      if (input.trigger_source_id && input.trigger_source_table) {
        await supabase.rpc('link_ca_to_trigger', {
          p_ca_id: data.id,
          p_source_table: input.trigger_source_table,
          p_source_id: input.trigger_source_id,
        });
      }

      await fetchCorrectiveActions();
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchCorrectiveActions]);

  // ── Update corrective action ──
  const updateCorrectiveAction = useCallback(async (
    id: string,
    updates: Partial<CorrectiveAction>
  ): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('sanitation_corrective_actions')
        .update(updates)
        .eq('id', id)
        .eq('org_id', ORG_ID);

      if (err) throw err;
      await fetchCorrectiveActions();
      if (selectedCA?.id === id) await fetchCADetail(id);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchCorrectiveActions, fetchCADetail, selectedCA]);

  // ── Close corrective action ──
  const closeCorrectiveAction = useCallback(async (
    id: string,
    resolution: string,
    resolvedBy: string
  ): Promise<boolean> => {
    return updateCorrectiveAction(id, {
      status: 'closed',
      resolution_summary: resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
    });
  }, [updateCorrectiveAction]);

  // ── Add vector swab point to a CA ──
  const addVectorSwabPoint = useCallback(async (
    caId: string,
    vector: Omit<VectorSwabPoint, 'id' | 'org_id' | 'corrective_action_id' | 'created_at'>
  ): Promise<VectorSwabPoint | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('vector_swab_points')
        .insert([{ ...vector, org_id: ORG_ID, corrective_action_id: caId }])
        .select()
        .single();

      if (err) throw err;

      // Mark CA as having vector swabbing in progress
      await supabase
        .from('sanitation_corrective_actions')
        .update({ vector_swabbing_required: true, status: 'in_progress' })
        .eq('id', caId);

      if (selectedCA?.id === caId) await fetchCADetail(caId);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [fetchCADetail, selectedCA]);

  // ── Update vector swab result ──
  const updateVectorSwabResult = useCallback(async (
    vectorId: string,
    caId: string,
    result: 'pass' | 'warning' | 'fail' | 'positive' | 'negative',
    testedBy: string,
    rluReading?: number,
    notes?: string
  ): Promise<boolean> => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('vector_swab_points')
        .update({
          result,
          tested_by: testedBy,
          tested_at: new Date().toISOString(),
          rlu_reading: rluReading ?? null,
          result_notes: notes ?? null,
          status: 'completed',
        })
        .eq('id', vectorId);

      if (err) throw err;

      // If negative result on Zone 1 CA, increment consecutive negatives
      const ca = correctiveActions.find(c => c.id === caId);
      if (ca && ca.zone_number === 1 && (result === 'negative' || result === 'pass')) {
        const newCount = ca.consecutive_negatives_obtained + 1;
        const updates: Partial<CorrectiveAction> = {
          consecutive_negatives_obtained: newCount,
        };
        // If we've hit the required count, move to pending verification
        if (newCount >= ca.consecutive_negatives_required && ca.consecutive_negatives_required > 0) {
          updates.status = 'pending_verification';
        }
        await supabase
          .from('sanitation_corrective_actions')
          .update(updates)
          .eq('id', caId);
      }

      if (selectedCA?.id === caId) await fetchCADetail(caId);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [correctiveActions, fetchCADetail, selectedCA]);

  // ── Computed stats ──
  const stats = {
    total: correctiveActions.length,
    open: correctiveActions.filter(ca => ca.status === 'open').length,
    inProgress: correctiveActions.filter(ca => ca.status === 'in_progress').length,
    pendingVerification: correctiveActions.filter(ca => ca.status === 'pending_verification').length,
    closed: correctiveActions.filter(ca => ca.status === 'closed').length,
    critical: correctiveActions.filter(ca => ca.severity === 'critical' && ca.status !== 'closed').length,
    productionHolds: correctiveActions.filter(ca => ca.production_hold && ca.status !== 'closed').length,
    byTrigger: correctiveActions.reduce((acc, ca) => {
      acc[ca.trigger_type] = (acc[ca.trigger_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    correctiveActions,
    selectedCA,
    loading,
    error,
    stats,
    fetchCorrectiveActions,
    fetchCADetail,
    createCorrectiveAction,
    updateCorrectiveAction,
    closeCorrectiveAction,
    addVectorSwabPoint,
    updateVectorSwabResult,
    CA_STATUS_COLORS,
    CA_SEVERITY_COLORS,
    CA_TRIGGER_LABELS,
    getRequiredNegatives,
    getCASummaryLine,
  };
}
