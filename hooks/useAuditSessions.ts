import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
// No external crypto dependency — uses Web Crypto API

// ── Types ──────────────────────────────────────────────────────

export type AuditType = 'sqf' | 'brcgs' | 'fssc' | 'internal' | 'regulatory' | 'customer' | 'other';
export type AuditSessionStatus = 'active' | 'expired' | 'revoked';

export interface AuditSession {
  id: string;
  organization_id: string;
  access_token: string;
  token_hash: string;
  session_name: string;
  audit_type: AuditType;
  certification_body: string | null;
  auditor_name: string | null;
  auditor_email: string | null;
  valid_from: string;
  valid_until: string;
  timezone: string;
  scope_documents: boolean;
  scope_ncrs: boolean;
  scope_capas: boolean;
  scope_training: boolean;
  scope_internal_audits: boolean;
  scope_haccp: boolean;
  scope_supplier_approvals: boolean;
  scope_env_monitoring: boolean;
  scope_change_management: boolean;
  scope_food_safety_culture: boolean;
  scope_work_orders: boolean;
  scope_inventory: boolean;
  scope_security_controls: boolean;
  status: AuditSessionStatus;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  last_accessed_at: string | null;
  access_count: number;
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditAccessLogEntry {
  id: string;
  session_id: string;
  organization_id: string;
  module: string;
  action: string;
  resource_id: string | null;
  resource_type: string | null;
  resource_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  accessed_at: string;
}

export interface CreateAuditSessionInput {
  session_name: string;
  audit_type: AuditType;
  certification_body: string;
  auditor_name: string;
  auditor_email: string;
  valid_from: string;
  valid_until: string;
  scope_documents: boolean;
  scope_ncrs: boolean;
  scope_capas: boolean;
  scope_training: boolean;
  scope_internal_audits: boolean;
  scope_haccp: boolean;
  scope_supplier_approvals: boolean;
  scope_env_monitoring: boolean;
  scope_change_management: boolean;
  scope_food_safety_culture: boolean;
  scope_work_orders: boolean;
  scope_inventory: boolean;
  scope_security_controls: boolean;
  created_by: string;
  created_by_id: string | null;
}

// ── Token helpers ──────────────────────────────────────────────

function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function hashToken(token: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for environments without Web Crypto
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// ── Scope labels (for display) ─────────────────────────────────

export const SCOPE_LABELS: Record<string, string> = {
  scope_documents: 'Controlled Documents',
  scope_ncrs: 'NCRs / Non-Conformances',
  scope_capas: 'CAPAs',
  scope_training: 'Training Records',
  scope_internal_audits: 'Internal Audits',
  scope_haccp: 'HACCP / Food Safety Plans',
  scope_supplier_approvals: 'Supplier Approvals',
  scope_env_monitoring: 'Environmental Monitoring',
  scope_change_management: 'Change Management',
  scope_food_safety_culture: 'Food Safety Culture',
  scope_work_orders: 'Work Orders',
  scope_inventory: 'Inventory',
  scope_security_controls: 'Document Security Controls',
};

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  sqf: 'SQF',
  brcgs: 'BRCGS',
  fssc: 'FSSC 22000',
  internal: 'Internal',
  regulatory: 'Regulatory',
  customer: 'Customer',
  other: 'Other',
};

// ── Hook ───────────────────────────────────────────────────────

export function useAuditSessions() {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  // ── List all sessions ──
  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['audit_sessions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('audit_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AuditSession[];
    },
    enabled: !!organizationId,
  });

  // ── Create session ──
  const createSession = useMutation({
    mutationFn: async (input: CreateAuditSessionInput) => {
      if (!organizationId) throw new Error('No organization context');
      const token = generateSecureToken();
      const hash = await hashToken(token);

      const row = {
        organization_id: organizationId,
        access_token: token,
        token_hash: hash,
        session_name: input.session_name,
        audit_type: input.audit_type,
        certification_body: input.certification_body || null,
        auditor_name: input.auditor_name || null,
        auditor_email: input.auditor_email || null,
        valid_from: input.valid_from || new Date().toISOString(),
        valid_until: input.valid_until,
        scope_documents: input.scope_documents,
        scope_ncrs: input.scope_ncrs,
        scope_capas: input.scope_capas,
        scope_training: input.scope_training,
        scope_internal_audits: input.scope_internal_audits,
        scope_haccp: input.scope_haccp,
        scope_supplier_approvals: input.scope_supplier_approvals,
        scope_env_monitoring: input.scope_env_monitoring,
        scope_change_management: input.scope_change_management,
        scope_food_safety_culture: input.scope_food_safety_culture,
        scope_work_orders: input.scope_work_orders,
        scope_inventory: input.scope_inventory,
        scope_security_controls: input.scope_security_controls,
        created_by: input.created_by,
        created_by_id: input.created_by_id,
        status: 'active',
      };

      const { data, error } = await supabase
        .from('audit_sessions')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return data as AuditSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit_sessions', organizationId] });
    },
  });

  // ── Revoke session ──
  const revokeSession = useMutation({
    mutationFn: async ({ id, revokedBy, reason }: { id: string; revokedBy: string; reason: string }) => {
      const { data, error } = await supabase
        .from('audit_sessions')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: revokedBy,
          revoke_reason: reason || 'Manually revoked',
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AuditSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit_sessions', organizationId] });
    },
  });

  // ── Fetch access log for a session ──
  const fetchAccessLog = useCallback(async (sessionId: string): Promise<AuditAccessLogEntry[]> => {
    const { data, error } = await supabase
      .from('audit_access_log')
      .select('*')
      .eq('session_id', sessionId)
      .order('accessed_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as AuditAccessLogEntry[];
  }, []);

  // ── Build portal URL ──
  const getPortalUrl = useCallback((token: string) => {
    // Uses the Vercel-deployed web app domain
    return `https://rork-tulkenz-erp-clone.vercel.app/auditor-portal/audit?token=${token}`;
  }, []);

  return {
    sessions,
    isLoading,
    refetch,
    createSession,
    revokeSession,
    fetchAccessLog,
    getPortalUrl,
  };
}
