import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  LOTOProcedure,
  LOTOExecution,
  LOTOStatus,
  LOTOEnergySource,
  LOTOStep,
  LOTOVerificationStep,
  LOTOReleaseStep,
  LOTOAuthorizedEmployee,
  LOTOAttachment,
  LOTOLockRecord,
  LOTOVerificationRecord,
  SafetyPermit,
  PermitStatus,
  PermitType,
  PermitWorker,
  PPERequirement,
  PPEAssignment,
  HazardAssessment,
  HazardStatus,
  HazardSeverity,
  HazardItem,
  HazardAssessmentParticipant,
  generateLOTONumber,
  generatePermitNumber,
  generateHazardAssessmentNumber,
} from '@/types/cmms';

// =============================================================================
// LOTO PROCEDURES HOOKS
// =============================================================================

export function useLOTOProceduresQuery(options?: {
  enabled?: boolean;
  status?: LOTOStatus | LOTOStatus[];
  facilityId?: string;
  equipmentId?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'lotoProcedures', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_loto_procedures')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }

      query = query.order('name', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useLOTOProceduresQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useLOTOProceduresQuery] Fetched:', data?.length || 0, 'LOTO procedures');
      return (data || []).map(mapLOTOProcedureFromDB) as LOTOProcedure[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveLOTOProcedures(facilityId?: string) {
  return useLOTOProceduresQuery({
    status: 'active',
    facilityId,
  });
}

export function useLOTOProcedureById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'lotoProcedures', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_loto_procedures')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useLOTOProcedureById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useLOTOProcedureById] Fetched LOTO procedure:', id);
      return mapLOTOProcedureFromDB(data) as LOTOProcedure;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useLOTOProcedureByEquipment(equipmentId: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'lotoProcedures', 'byEquipment', equipmentId, organizationId],
    queryFn: async () => {
      if (!organizationId || !equipmentId) return [];

      const { data, error } = await supabase
        .from('cmms_loto_procedures')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('equipment_id', equipmentId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        console.error('[useLOTOProcedureByEquipment] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useLOTOProcedureByEquipment] Fetched:', data?.length || 0, 'LOTO procedures');
      return (data || []).map(mapLOTOProcedureFromDB) as LOTOProcedure[];
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLOTOProcedure(options?: {
  onSuccess?: (data: LOTOProcedure) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (procedure: Omit<LOTOProcedure, 'id' | 'procedureNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const procedureNumber = generateLOTONumber();

      const { data, error } = await supabase
        .from('cmms_loto_procedures')
        .insert({
          organization_id: organizationId,
          procedure_number: procedureNumber,
          facility_id: procedure.facilityId,
          facility_name: procedure.facilityName,
          equipment_id: procedure.equipmentId,
          equipment_name: procedure.equipmentName,
          equipment_tag: procedure.equipmentTag,
          name: procedure.name,
          description: procedure.description,
          status: procedure.status || 'draft',
          version: procedure.version || 1,
          effective_date: procedure.effectiveDate,
          review_date: procedure.reviewDate || null,
          energy_sources: procedure.energySources,
          lockout_steps: procedure.lockoutSteps,
          verification_steps: procedure.verificationSteps,
          release_steps: procedure.releaseSteps,
          authorized_employees: procedure.authorizedEmployees,
          affected_employees: procedure.affectedEmployees,
          required_ppe: procedure.requiredPPE,
          special_instructions: procedure.specialInstructions || null,
          attachments: procedure.attachments || [],
          created_by: procedure.createdBy,
          created_by_name: procedure.createdByName,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateLOTOProcedure] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateLOTOProcedure] Created LOTO procedure:', data?.id);
      return mapLOTOProcedureFromDB(data) as LOTOProcedure;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'lotoProcedures'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateLOTOProcedure] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateLOTOProcedure(options?: {
  onSuccess?: (data: LOTOProcedure) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LOTOProcedure> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.version !== undefined) dbUpdates.version = updates.version;
      if (updates.effectiveDate !== undefined) dbUpdates.effective_date = updates.effectiveDate;
      if (updates.reviewDate !== undefined) dbUpdates.review_date = updates.reviewDate;
      if (updates.energySources !== undefined) dbUpdates.energy_sources = updates.energySources;
      if (updates.lockoutSteps !== undefined) dbUpdates.lockout_steps = updates.lockoutSteps;
      if (updates.verificationSteps !== undefined) dbUpdates.verification_steps = updates.verificationSteps;
      if (updates.releaseSteps !== undefined) dbUpdates.release_steps = updates.releaseSteps;
      if (updates.authorizedEmployees !== undefined) dbUpdates.authorized_employees = updates.authorizedEmployees;
      if (updates.affectedEmployees !== undefined) dbUpdates.affected_employees = updates.affectedEmployees;
      if (updates.requiredPPE !== undefined) dbUpdates.required_ppe = updates.requiredPPE;
      if (updates.specialInstructions !== undefined) dbUpdates.special_instructions = updates.specialInstructions;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;

      const { data, error } = await supabase
        .from('cmms_loto_procedures')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateLOTOProcedure] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateLOTOProcedure] Updated LOTO procedure:', id);
      return mapLOTOProcedureFromDB(data) as LOTOProcedure;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'lotoProcedures'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateLOTOProcedure] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveLOTOProcedure(options?: {
  onSuccess?: (data: LOTOProcedure) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateLOTOProcedure(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'active',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

// =============================================================================
// LOTO EXECUTION HOOKS
// =============================================================================

export function useLOTOExecutionsQuery(options?: {
  enabled?: boolean;
  status?: string | string[];
  facilityId?: string;
  equipmentId?: string;
  procedureId?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'lotoExecutions', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_loto_executions')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }

      if (options?.procedureId) {
        query = query.eq('procedure_id', options.procedureId);
      }

      query = query.order('initiated_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useLOTOExecutionsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useLOTOExecutionsQuery] Fetched:', data?.length || 0, 'LOTO executions');
      return (data || []).map(mapLOTOExecutionFromDB) as LOTOExecution[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveLOTOExecutions(facilityId?: string) {
  return useLOTOExecutionsQuery({
    status: ['in_progress', 'locked_out', 'verified'],
    facilityId,
  });
}

export function useCreateLOTOExecution(options?: {
  onSuccess?: (data: LOTOExecution) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (execution: Omit<LOTOExecution, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('cmms_loto_executions')
        .insert({
          organization_id: organizationId,
          procedure_id: execution.procedureId,
          procedure_number: execution.procedureNumber,
          work_order_id: execution.workOrderId || null,
          work_order_number: execution.workOrderNumber || null,
          equipment_id: execution.equipmentId,
          equipment_name: execution.equipmentName,
          facility_id: execution.facilityId,
          status: execution.status || 'in_progress',
          initiated_by: execution.initiatedBy,
          initiated_by_name: execution.initiatedByName,
          initiated_at: execution.initiatedAt,
          locks: execution.locks || [],
          verifications: execution.verifications || [],
          notes: execution.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateLOTOExecution] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateLOTOExecution] Created LOTO execution:', data?.id);
      return mapLOTOExecutionFromDB(data) as LOTOExecution;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'lotoExecutions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateLOTOExecution] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateLOTOExecution(options?: {
  onSuccess?: (data: LOTOExecution) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LOTOExecution> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.locks !== undefined) dbUpdates.locks = updates.locks;
      if (updates.verifications !== undefined) dbUpdates.verifications = updates.verifications;
      if (updates.releasedBy !== undefined) dbUpdates.released_by = updates.releasedBy;
      if (updates.releasedByName !== undefined) dbUpdates.released_by_name = updates.releasedByName;
      if (updates.releasedAt !== undefined) dbUpdates.released_at = updates.releasedAt;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('cmms_loto_executions')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateLOTOExecution] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateLOTOExecution] Updated LOTO execution:', id);
      return mapLOTOExecutionFromDB(data) as LOTOExecution;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'lotoExecutions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateLOTOExecution] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useReleaseLOTO(options?: {
  onSuccess?: (data: LOTOExecution) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateLOTOExecution(options);

  return useMutation({
    mutationFn: async ({ id, releasedBy, releasedByName }: { id: string; releasedBy: string; releasedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'released',
          releasedBy,
          releasedByName,
          releasedAt: new Date().toISOString(),
        },
      });
    },
  });
}

// =============================================================================
// SAFETY PERMITS HOOKS
// =============================================================================

export function useSafetyPermitsQuery(options?: {
  enabled?: boolean;
  status?: PermitStatus | PermitStatus[];
  type?: PermitType | PermitType[];
  facilityId?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'safetyPermits', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_safety_permits')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.type) {
        if (Array.isArray(options.type)) {
          query = query.in('type', options.type);
        } else {
          query = query.eq('type', options.type);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSafetyPermitsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useSafetyPermitsQuery] Fetched:', data?.length || 0, 'safety permits');
      return (data || []).map(mapSafetyPermitFromDB) as SafetyPermit[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActivePermits(facilityId?: string) {
  return useSafetyPermitsQuery({
    status: 'active',
    facilityId,
  });
}

export function useSafetyPermitById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'safetyPermits', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_safety_permits')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useSafetyPermitById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useSafetyPermitById] Fetched safety permit:', id);
      return mapSafetyPermitFromDB(data) as SafetyPermit;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateSafetyPermit(options?: {
  onSuccess?: (data: SafetyPermit) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permit: Omit<SafetyPermit, 'id' | 'permitNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const permitNumber = generatePermitNumber();

      const { data, error } = await supabase
        .from('cmms_safety_permits')
        .insert({
          organization_id: organizationId,
          permit_number: permitNumber,
          facility_id: permit.facilityId,
          facility_name: permit.facilityName,
          type: permit.type,
          type_name: permit.typeName,
          name: permit.name,
          description: permit.description,
          status: permit.status || 'draft',
          work_order_id: permit.workOrderId || null,
          work_order_number: permit.workOrderNumber || null,
          location: permit.location,
          area: permit.area || null,
          work_description: permit.workDescription,
          hazards: permit.hazards,
          control_measures: permit.controlMeasures,
          required_ppe: permit.requiredPPE,
          emergency_procedures: permit.emergencyProcedures || null,
          valid_from: permit.validFrom,
          valid_to: permit.validTo,
          requested_by: permit.requestedBy,
          requested_by_name: permit.requestedByName,
          requested_at: permit.requestedAt,
          issued_to: permit.issuedTo || [],
          witnesses: permit.witnesses || [],
          gas_test_results: permit.gasTestResults || [],
          atmosphere_monitoring: permit.atmosphereMonitoring || [],
          attachments: permit.attachments || [],
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateSafetyPermit] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateSafetyPermit] Created safety permit:', data?.id);
      return mapSafetyPermitFromDB(data) as SafetyPermit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'safetyPermits'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateSafetyPermit] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateSafetyPermit(options?: {
  onSuccess?: (data: SafetyPermit) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SafetyPermit> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.hazards !== undefined) dbUpdates.hazards = updates.hazards;
      if (updates.controlMeasures !== undefined) dbUpdates.control_measures = updates.controlMeasures;
      if (updates.requiredPPE !== undefined) dbUpdates.required_ppe = updates.requiredPPE;
      if (updates.issuedTo !== undefined) dbUpdates.issued_to = updates.issuedTo;
      if (updates.witnesses !== undefined) dbUpdates.witnesses = updates.witnesses;
      if (updates.gasTestResults !== undefined) dbUpdates.gas_test_results = updates.gasTestResults;
      if (updates.atmosphereMonitoring !== undefined) dbUpdates.atmosphere_monitoring = updates.atmosphereMonitoring;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.closedBy !== undefined) dbUpdates.closed_by = updates.closedBy;
      if (updates.closedByName !== undefined) dbUpdates.closed_by_name = updates.closedByName;
      if (updates.closedAt !== undefined) dbUpdates.closed_at = updates.closedAt;
      if (updates.closureNotes !== undefined) dbUpdates.closure_notes = updates.closureNotes;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;

      const { data, error } = await supabase
        .from('cmms_safety_permits')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateSafetyPermit] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateSafetyPermit] Updated safety permit:', id);
      return mapSafetyPermitFromDB(data) as SafetyPermit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'safetyPermits'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateSafetyPermit] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveSafetyPermit(options?: {
  onSuccess?: (data: SafetyPermit) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateSafetyPermit(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'approved',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

export function useActivateSafetyPermit(options?: {
  onSuccess?: (data: SafetyPermit) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateSafetyPermit(options);

  return useMutation({
    mutationFn: async (id: string) => {
      return updateMutation.mutateAsync({
        id,
        updates: { status: 'active' },
      });
    },
  });
}

export function useCloseSafetyPermit(options?: {
  onSuccess?: (data: SafetyPermit) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateSafetyPermit(options);

  return useMutation({
    mutationFn: async ({ id, closedBy, closedByName, closureNotes }: { id: string; closedBy: string; closedByName: string; closureNotes?: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'closed',
          closedBy,
          closedByName,
          closedAt: new Date().toISOString(),
          closureNotes,
        },
      });
    },
  });
}

// =============================================================================
// PPE REQUIREMENTS HOOKS
// =============================================================================

export function usePPERequirementsQuery(options?: {
  enabled?: boolean;
  category?: string | string[];
  facilityId?: string;
  isActive?: boolean;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'ppeRequirements', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_ppe_requirements')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.category) {
        if (Array.isArray(options.category)) {
          query = query.in('category', options.category);
        } else {
          query = query.eq('category', options.category);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      }

      query = query.order('name', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePPERequirementsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePPERequirementsQuery] Fetched:', data?.length || 0, 'PPE requirements');
      return (data || []).map(mapPPERequirementFromDB) as PPERequirement[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActivePPERequirements() {
  return usePPERequirementsQuery({ isActive: true });
}

export function usePPERequirementById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'ppeRequirements', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_ppe_requirements')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[usePPERequirementById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePPERequirementById] Fetched PPE requirement:', id);
      return mapPPERequirementFromDB(data) as PPERequirement;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePPERequirement(options?: {
  onSuccess?: (data: PPERequirement) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ppe: Omit<PPERequirement, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('cmms_ppe_requirements')
        .insert({
          organization_id: organizationId,
          facility_id: ppe.facilityId || null,
          facility_name: ppe.facilityName || null,
          name: ppe.name,
          code: ppe.code,
          category: ppe.category,
          category_name: ppe.categoryName,
          description: ppe.description,
          specifications: ppe.specifications || null,
          standard_reference: ppe.standardReference || null,
          image_url: ppe.imageUrl || null,
          applicable_areas: ppe.applicableAreas,
          applicable_task_types: ppe.applicableTaskTypes,
          applicable_hazards: ppe.applicableHazards,
          inspection_frequency: ppe.inspectionFrequency || null,
          replacement_criteria: ppe.replacementCriteria || null,
          training_required: ppe.trainingRequired,
          training_course_id: ppe.trainingCourseId || null,
          is_active: ppe.isActive !== false,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreatePPERequirement] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreatePPERequirement] Created PPE requirement:', data?.id);
      return mapPPERequirementFromDB(data) as PPERequirement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'ppeRequirements'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePPERequirement] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePPERequirement(options?: {
  onSuccess?: (data: PPERequirement) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PPERequirement> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.code !== undefined) dbUpdates.code = updates.code;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.categoryName !== undefined) dbUpdates.category_name = updates.categoryName;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.specifications !== undefined) dbUpdates.specifications = updates.specifications;
      if (updates.applicableAreas !== undefined) dbUpdates.applicable_areas = updates.applicableAreas;
      if (updates.applicableTaskTypes !== undefined) dbUpdates.applicable_task_types = updates.applicableTaskTypes;
      if (updates.applicableHazards !== undefined) dbUpdates.applicable_hazards = updates.applicableHazards;
      if (updates.inspectionFrequency !== undefined) dbUpdates.inspection_frequency = updates.inspectionFrequency;
      if (updates.replacementCriteria !== undefined) dbUpdates.replacement_criteria = updates.replacementCriteria;
      if (updates.trainingRequired !== undefined) dbUpdates.training_required = updates.trainingRequired;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('cmms_ppe_requirements')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdatePPERequirement] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdatePPERequirement] Updated PPE requirement:', id);
      return mapPPERequirementFromDB(data) as PPERequirement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'ppeRequirements'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePPERequirement] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// PPE ASSIGNMENTS HOOKS
// =============================================================================

export function usePPEAssignmentsQuery(options?: {
  enabled?: boolean;
  employeeId?: string;
  ppeRequirementId?: string;
  status?: string | string[];
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'ppeAssignments', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_ppe_assignments')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }

      if (options?.ppeRequirementId) {
        query = query.eq('ppe_requirement_id', options.ppeRequirementId);
      }

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      query = query.order('issued_date', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePPEAssignmentsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePPEAssignmentsQuery] Fetched:', data?.length || 0, 'PPE assignments');
      return (data || []).map(mapPPEAssignmentFromDB) as PPEAssignment[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePPEAssignmentsByEmployee(employeeId: string | undefined | null) {
  return usePPEAssignmentsQuery({
    employeeId: employeeId || undefined,
    status: 'active',
    enabled: !!employeeId,
  });
}

export function useCreatePPEAssignment(options?: {
  onSuccess?: (data: PPEAssignment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: Omit<PPEAssignment, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('cmms_ppe_assignments')
        .insert({
          organization_id: organizationId,
          ppe_requirement_id: assignment.ppeRequirementId,
          ppe_name: assignment.ppeName,
          ppe_code: assignment.ppeCode,
          employee_id: assignment.employeeId,
          employee_name: assignment.employeeName,
          employee_number: assignment.employeeNumber,
          facility_id: assignment.facilityId,
          serial_number: assignment.serialNumber || null,
          issued_date: assignment.issuedDate,
          issued_by: assignment.issuedBy,
          issued_by_name: assignment.issuedByName,
          expiry_date: assignment.expiryDate || null,
          last_inspection_date: assignment.lastInspectionDate || null,
          next_inspection_date: assignment.nextInspectionDate || null,
          condition: assignment.condition || 'new',
          status: assignment.status || 'active',
          notes: assignment.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreatePPEAssignment] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreatePPEAssignment] Created PPE assignment:', data?.id);
      return mapPPEAssignmentFromDB(data) as PPEAssignment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'ppeAssignments'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreatePPEAssignment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdatePPEAssignment(options?: {
  onSuccess?: (data: PPEAssignment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PPEAssignment> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.lastInspectionDate !== undefined) dbUpdates.last_inspection_date = updates.lastInspectionDate;
      if (updates.nextInspectionDate !== undefined) dbUpdates.next_inspection_date = updates.nextInspectionDate;
      if (updates.returnedDate !== undefined) dbUpdates.returned_date = updates.returnedDate;
      if (updates.returnedTo !== undefined) dbUpdates.returned_to = updates.returnedTo;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('cmms_ppe_assignments')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdatePPEAssignment] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdatePPEAssignment] Updated PPE assignment:', id);
      return mapPPEAssignmentFromDB(data) as PPEAssignment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'ppeAssignments'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdatePPEAssignment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// HAZARD ASSESSMENT HOOKS
// =============================================================================

export function useHazardAssessmentsQuery(options?: {
  enabled?: boolean;
  status?: HazardStatus | HazardStatus[];
  assessmentType?: string | string[];
  facilityId?: string;
  equipmentId?: string;
  riskLevel?: HazardSeverity | HazardSeverity[];
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'hazardAssessments', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_hazard_assessments')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.assessmentType) {
        if (Array.isArray(options.assessmentType)) {
          query = query.in('assessment_type', options.assessmentType);
        } else {
          query = query.eq('assessment_type', options.assessmentType);
        }
      }

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.equipmentId) {
        query = query.eq('equipment_id', options.equipmentId);
      }

      if (options?.riskLevel) {
        if (Array.isArray(options.riskLevel)) {
          query = query.in('overall_risk_level', options.riskLevel);
        } else {
          query = query.eq('overall_risk_level', options.riskLevel);
        }
      }

      query = query.order('assessed_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useHazardAssessmentsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useHazardAssessmentsQuery] Fetched:', data?.length || 0, 'hazard assessments');
      return (data || []).map(mapHazardAssessmentFromDB) as HazardAssessment[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useHighRiskAssessments(facilityId?: string) {
  return useHazardAssessmentsQuery({
    riskLevel: ['high', 'critical'],
    facilityId,
  });
}

export function useHazardAssessmentById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'hazardAssessments', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_hazard_assessments')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useHazardAssessmentById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useHazardAssessmentById] Fetched hazard assessment:', id);
      return mapHazardAssessmentFromDB(data) as HazardAssessment;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateHazardAssessment(options?: {
  onSuccess?: (data: HazardAssessment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: Omit<HazardAssessment, 'id' | 'assessmentNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const assessmentNumber = generateHazardAssessmentNumber();

      const { data, error } = await supabase
        .from('cmms_hazard_assessments')
        .insert({
          organization_id: organizationId,
          assessment_number: assessmentNumber,
          facility_id: assessment.facilityId,
          facility_name: assessment.facilityName,
          name: assessment.name,
          description: assessment.description,
          assessment_type: assessment.assessmentType,
          assessment_type_name: assessment.assessmentTypeName,
          status: assessment.status || 'identified',
          work_order_id: assessment.workOrderId || null,
          work_order_number: assessment.workOrderNumber || null,
          equipment_id: assessment.equipmentId || null,
          equipment_name: assessment.equipmentName || null,
          location: assessment.location,
          area: assessment.area || null,
          task_description: assessment.taskDescription,
          assessed_by: assessment.assessedBy,
          assessed_by_name: assessment.assessedByName,
          assessed_at: assessment.assessedAt,
          hazards: assessment.hazards,
          overall_risk_level: assessment.overallRiskLevel,
          residual_risk_level: assessment.residualRiskLevel || null,
          required_ppe: assessment.requiredPPE,
          required_permits: assessment.requiredPermits,
          required_training: assessment.requiredTraining,
          participants: assessment.participants || [],
          attachments: assessment.attachments || [],
          valid_until: assessment.validUntil || null,
          notes: assessment.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateHazardAssessment] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateHazardAssessment] Created hazard assessment:', data?.id);
      return mapHazardAssessmentFromDB(data) as HazardAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'hazardAssessments'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateHazardAssessment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateHazardAssessment(options?: {
  onSuccess?: (data: HazardAssessment) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HazardAssessment> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.hazards !== undefined) dbUpdates.hazards = updates.hazards;
      if (updates.overallRiskLevel !== undefined) dbUpdates.overall_risk_level = updates.overallRiskLevel;
      if (updates.residualRiskLevel !== undefined) dbUpdates.residual_risk_level = updates.residualRiskLevel;
      if (updates.requiredPPE !== undefined) dbUpdates.required_ppe = updates.requiredPPE;
      if (updates.requiredPermits !== undefined) dbUpdates.required_permits = updates.requiredPermits;
      if (updates.requiredTraining !== undefined) dbUpdates.required_training = updates.requiredTraining;
      if (updates.participants !== undefined) dbUpdates.participants = updates.participants;
      if (updates.reviewedBy !== undefined) dbUpdates.reviewed_by = updates.reviewedBy;
      if (updates.reviewedByName !== undefined) dbUpdates.reviewed_by_name = updates.reviewedByName;
      if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('cmms_hazard_assessments')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateHazardAssessment] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateHazardAssessment] Updated hazard assessment:', id);
      return mapHazardAssessmentFromDB(data) as HazardAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'hazardAssessments'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateHazardAssessment] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveHazardAssessment(options?: {
  onSuccess?: (data: HazardAssessment) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateHazardAssessment(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          status: 'accepted',
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS - DB MAPPING
// =============================================================================

function mapLOTOProcedureFromDB(data: Record<string, unknown>): LOTOProcedure {
  return {
    id: data.id as string,
    procedureNumber: data.procedure_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    equipmentId: data.equipment_id as string,
    equipmentName: data.equipment_name as string,
    equipmentTag: data.equipment_tag as string,
    name: data.name as string,
    description: data.description as string,
    status: data.status as LOTOStatus,
    version: data.version as number,
    effectiveDate: data.effective_date as string,
    reviewDate: data.review_date as string | undefined,
    energySources: (data.energy_sources || []) as LOTOEnergySource[],
    lockoutSteps: (data.lockout_steps || []) as LOTOStep[],
    verificationSteps: (data.verification_steps || []) as LOTOVerificationStep[],
    releaseSteps: (data.release_steps || []) as LOTOReleaseStep[],
    authorizedEmployees: (data.authorized_employees || []) as LOTOAuthorizedEmployee[],
    affectedEmployees: (data.affected_employees || []) as string[],
    requiredPPE: (data.required_ppe || []) as string[],
    specialInstructions: data.special_instructions as string | undefined,
    attachments: (data.attachments || []) as LOTOAttachment[],
    createdBy: data.created_by as string,
    createdByName: data.created_by_name as string,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapLOTOExecutionFromDB(data: Record<string, unknown>): LOTOExecution {
  return {
    id: data.id as string,
    procedureId: data.procedure_id as string,
    procedureNumber: data.procedure_number as string,
    workOrderId: data.work_order_id as string | undefined,
    workOrderNumber: data.work_order_number as string | undefined,
    equipmentId: data.equipment_id as string,
    equipmentName: data.equipment_name as string,
    facilityId: data.facility_id as string,
    status: data.status as 'in_progress' | 'locked_out' | 'verified' | 'released' | 'cancelled',
    initiatedBy: data.initiated_by as string,
    initiatedByName: data.initiated_by_name as string,
    initiatedAt: data.initiated_at as string,
    locks: (data.locks || []) as LOTOLockRecord[],
    verifications: (data.verifications || []) as LOTOVerificationRecord[],
    releasedBy: data.released_by as string | undefined,
    releasedByName: data.released_by_name as string | undefined,
    releasedAt: data.released_at as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapSafetyPermitFromDB(data: Record<string, unknown>): SafetyPermit {
  return {
    id: data.id as string,
    permitNumber: data.permit_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    type: data.type as PermitType,
    typeName: data.type_name as string,
    name: data.name as string,
    description: data.description as string,
    status: data.status as PermitStatus,
    workOrderId: data.work_order_id as string | undefined,
    workOrderNumber: data.work_order_number as string | undefined,
    location: data.location as string,
    area: data.area as string | undefined,
    workDescription: data.work_description as string,
    hazards: (data.hazards || []) as string[],
    controlMeasures: (data.control_measures || []) as string[],
    requiredPPE: (data.required_ppe || []) as string[],
    emergencyProcedures: data.emergency_procedures as string | undefined,
    validFrom: data.valid_from as string,
    validTo: data.valid_to as string,
    requestedBy: data.requested_by as string,
    requestedByName: data.requested_by_name as string,
    requestedAt: data.requested_at as string,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    issuedTo: (data.issued_to || []) as PermitWorker[],
    witnesses: (data.witnesses || []) as SafetyPermit['witnesses'],
    gasTestResults: (data.gas_test_results || []) as SafetyPermit['gasTestResults'],
    atmosphereMonitoring: (data.atmosphere_monitoring || []) as SafetyPermit['atmosphereMonitoring'],
    closedBy: data.closed_by as string | undefined,
    closedByName: data.closed_by_name as string | undefined,
    closedAt: data.closed_at as string | undefined,
    closureNotes: data.closure_notes as string | undefined,
    attachments: (data.attachments || []) as SafetyPermit['attachments'],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapPPERequirementFromDB(data: Record<string, unknown>): PPERequirement {
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string | undefined,
    facilityName: data.facility_name as string | undefined,
    name: data.name as string,
    code: data.code as string,
    category: data.category as PPERequirement['category'],
    categoryName: data.category_name as string,
    description: data.description as string,
    specifications: data.specifications as string | undefined,
    standardReference: data.standard_reference as string | undefined,
    imageUrl: data.image_url as string | undefined,
    applicableAreas: (data.applicable_areas || []) as string[],
    applicableTaskTypes: (data.applicable_task_types || []) as string[],
    applicableHazards: (data.applicable_hazards || []) as string[],
    inspectionFrequency: data.inspection_frequency as string | undefined,
    replacementCriteria: data.replacement_criteria as string | undefined,
    trainingRequired: data.training_required as boolean,
    trainingCourseId: data.training_course_id as string | undefined,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapPPEAssignmentFromDB(data: Record<string, unknown>): PPEAssignment {
  return {
    id: data.id as string,
    ppeRequirementId: data.ppe_requirement_id as string,
    ppeName: data.ppe_name as string,
    ppeCode: data.ppe_code as string,
    employeeId: data.employee_id as string,
    employeeName: data.employee_name as string,
    employeeNumber: data.employee_number as string,
    facilityId: data.facility_id as string,
    serialNumber: data.serial_number as string | undefined,
    issuedDate: data.issued_date as string,
    issuedBy: data.issued_by as string,
    issuedByName: data.issued_by_name as string,
    expiryDate: data.expiry_date as string | undefined,
    lastInspectionDate: data.last_inspection_date as string | undefined,
    nextInspectionDate: data.next_inspection_date as string | undefined,
    condition: data.condition as 'new' | 'good' | 'fair' | 'replace',
    status: data.status as 'active' | 'returned' | 'lost' | 'damaged' | 'expired',
    returnedDate: data.returned_date as string | undefined,
    returnedTo: data.returned_to as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapHazardAssessmentFromDB(data: Record<string, unknown>): HazardAssessment {
  return {
    id: data.id as string,
    assessmentNumber: data.assessment_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    name: data.name as string,
    description: data.description as string,
    assessmentType: data.assessment_type as HazardAssessment['assessmentType'],
    assessmentTypeName: data.assessment_type_name as string,
    status: data.status as HazardStatus,
    workOrderId: data.work_order_id as string | undefined,
    workOrderNumber: data.work_order_number as string | undefined,
    equipmentId: data.equipment_id as string | undefined,
    equipmentName: data.equipment_name as string | undefined,
    location: data.location as string,
    area: data.area as string | undefined,
    taskDescription: data.task_description as string,
    assessedBy: data.assessed_by as string,
    assessedByName: data.assessed_by_name as string,
    assessedAt: data.assessed_at as string,
    reviewedBy: data.reviewed_by as string | undefined,
    reviewedByName: data.reviewed_by_name as string | undefined,
    reviewedAt: data.reviewed_at as string | undefined,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    hazards: (data.hazards || []) as HazardItem[],
    overallRiskLevel: data.overall_risk_level as HazardSeverity,
    residualRiskLevel: data.residual_risk_level as HazardSeverity | undefined,
    requiredPPE: (data.required_ppe || []) as string[],
    requiredPermits: (data.required_permits || []) as PermitType[],
    requiredTraining: (data.required_training || []) as string[],
    participants: (data.participants || []) as HazardAssessmentParticipant[],
    attachments: (data.attachments || []) as HazardAssessment['attachments'],
    validUntil: data.valid_until as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
