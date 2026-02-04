import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  MaintenanceBudget,
  BudgetAllocation,
  BudgetStatus,
  BudgetPeriod,
  CostCategory,
  LaborCost,
  PartsCost,
  CostReport,
  CostReportParameters,
  CostReportSummary,
  CostReportDetail,
  generateBudgetNumber,
} from '@/types/cmms';

// =============================================================================
// BUDGET TRACKING HOOKS
// =============================================================================

export function useBudgetsQuery(options?: {
  enabled?: boolean;
  status?: BudgetStatus | BudgetStatus[];
  facilityId?: string;
  fiscalYear?: number;
  period?: BudgetPeriod;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'budgets', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_maintenance_budgets')
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

      if (options?.fiscalYear) {
        query = query.eq('fiscal_year', options.fiscalYear);
      }

      if (options?.period) {
        query = query.eq('period', options.period);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useBudgetsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useBudgetsQuery] Fetched:', data?.length || 0, 'budgets');
      return (data || []).map(mapBudgetFromDB) as MaintenanceBudget[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useBudgetById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'budgets', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_maintenance_budgets')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useBudgetById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useBudgetById] Fetched budget:', id);
      return mapBudgetFromDB(data) as MaintenanceBudget;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateBudget(options?: {
  onSuccess?: (data: MaintenanceBudget) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: Omit<MaintenanceBudget, 'id' | 'budgetNumber' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const budgetNumber = generateBudgetNumber();

      const { data, error } = await supabase
        .from('cmms_maintenance_budgets')
        .insert({
          organization_id: organizationId,
          budget_number: budgetNumber,
          facility_id: budget.facilityId,
          facility_name: budget.facilityName,
          department_id: budget.departmentId || null,
          department_name: budget.departmentName || null,
          name: budget.name,
          description: budget.description || null,
          fiscal_year: budget.fiscalYear,
          period: budget.period,
          period_start: budget.periodStart,
          period_end: budget.periodEnd,
          status: budget.status || 'draft',
          allocations: budget.allocations,
          total_budget: budget.totalBudget,
          total_spent: budget.totalSpent || 0,
          total_committed: budget.totalCommitted || 0,
          total_available: budget.totalAvailable || budget.totalBudget,
          percent_used: budget.percentUsed || 0,
          notes: budget.notes || null,
          created_by: budget.createdBy,
          created_by_name: budget.createdByName,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateBudget] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateBudget] Created budget:', data?.id);
      return mapBudgetFromDB(data) as MaintenanceBudget;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'budgets'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateBudget] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateBudget(options?: {
  onSuccess?: (data: MaintenanceBudget) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MaintenanceBudget> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.allocations !== undefined) dbUpdates.allocations = updates.allocations;
      if (updates.totalBudget !== undefined) dbUpdates.total_budget = updates.totalBudget;
      if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;
      if (updates.totalCommitted !== undefined) dbUpdates.total_committed = updates.totalCommitted;
      if (updates.totalAvailable !== undefined) dbUpdates.total_available = updates.totalAvailable;
      if (updates.percentUsed !== undefined) dbUpdates.percent_used = updates.percentUsed;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('cmms_maintenance_budgets')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateBudget] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateBudget] Updated budget:', id);
      return mapBudgetFromDB(data) as MaintenanceBudget;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'budgets'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateBudget] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveBudget(options?: {
  onSuccess?: (data: MaintenanceBudget) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateBudget(options);

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

// =============================================================================
// LABOR COST HOOKS
// =============================================================================

export function useLaborCostsQuery(options?: {
  enabled?: boolean;
  facilityId?: string;
  workOrderId?: string;
  employeeId?: string;
  laborType?: string;
  dateFrom?: string;
  dateTo?: string;
  isApproved?: boolean;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'laborCosts', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_labor_costs')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.workOrderId) {
        query = query.eq('work_order_id', options.workOrderId);
      }

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }

      if (options?.laborType) {
        query = query.eq('labor_type', options.laborType);
      }

      if (options?.dateFrom) {
        query = query.gte('date_worked', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('date_worked', options.dateTo);
      }

      if (options?.isApproved !== undefined) {
        query = query.eq('is_approved', options.isApproved);
      }

      query = query.order('date_worked', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useLaborCostsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useLaborCostsQuery] Fetched:', data?.length || 0, 'labor costs');
      return (data || []).map(mapLaborCostFromDB) as LaborCost[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLaborCostById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'laborCosts', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_labor_costs')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useLaborCostById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useLaborCostById] Fetched labor cost:', id);
      return mapLaborCostFromDB(data) as LaborCost;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateLaborCost(options?: {
  onSuccess?: (data: LaborCost) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (laborCost: Omit<LaborCost, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
      if (!organizationId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('cmms_labor_costs')
        .insert({
          organization_id: organizationId,
          facility_id: laborCost.facilityId,
          work_order_id: laborCost.workOrderId,
          work_order_number: laborCost.workOrderNumber,
          equipment_id: laborCost.equipmentId || null,
          equipment_name: laborCost.equipmentName || null,
          employee_id: laborCost.employeeId,
          employee_name: laborCost.employeeName,
          employee_number: laborCost.employeeNumber,
          labor_type: laborCost.laborType,
          craft_code: laborCost.craftCode || null,
          craft_name: laborCost.craftName || null,
          date_worked: laborCost.dateWorked,
          start_time: laborCost.startTime,
          end_time: laborCost.endTime,
          hours_worked: laborCost.hoursWorked,
          hourly_rate: laborCost.hourlyRate,
          total_cost: laborCost.totalCost,
          cost_center: laborCost.costCenter || null,
          gl_account: laborCost.glAccount || null,
          notes: laborCost.notes || null,
          is_approved: laborCost.isApproved || false,
        })
        .select()
        .single();

      if (error) {
        console.error('[useCreateLaborCost] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCreateLaborCost] Created labor cost:', data?.id);
      return mapLaborCostFromDB(data) as LaborCost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'laborCosts'] });
      queryClient.invalidateQueries({ queryKey: ['cmms', 'budgets'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateLaborCost] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useUpdateLaborCost(options?: {
  onSuccess?: (data: LaborCost) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LaborCost> }) => {
      if (!organizationId) throw new Error('No organization selected');

      const dbUpdates: Record<string, unknown> = {};
      if (updates.hoursWorked !== undefined) dbUpdates.hours_worked = updates.hoursWorked;
      if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
      if (updates.totalCost !== undefined) dbUpdates.total_cost = updates.totalCost;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedByName !== undefined) dbUpdates.approved_by_name = updates.approvedByName;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;

      const { data, error } = await supabase
        .from('cmms_labor_costs')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateLaborCost] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateLaborCost] Updated labor cost:', id);
      return mapLaborCostFromDB(data) as LaborCost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'laborCosts'] });
      queryClient.invalidateQueries({ queryKey: ['cmms', 'budgets'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useUpdateLaborCost] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveLaborCost(options?: {
  onSuccess?: (data: LaborCost) => void;
  onError?: (error: Error) => void;
}) {
  const updateMutation = useUpdateLaborCost(options);

  return useMutation({
    mutationFn: async ({ id, approvedBy, approvedByName }: { id: string; approvedBy: string; approvedByName: string }) => {
      return updateMutation.mutateAsync({
        id,
        updates: {
          isApproved: true,
          approvedBy,
          approvedByName,
          approvedAt: new Date().toISOString(),
        },
      });
    },
  });
}

// =============================================================================
// PARTS COST HOOKS
// =============================================================================

export function usePartsCostsQuery(options?: {
  enabled?: boolean;
  facilityId?: string;
  workOrderId?: string;
  materialId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsCosts', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_parts_costs')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.workOrderId) {
        query = query.eq('work_order_id', options.workOrderId);
      }

      if (options?.materialId) {
        query = query.eq('material_id', options.materialId);
      }

      if (options?.dateFrom) {
        query = query.gte('issued_at', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('issued_at', options.dateTo);
      }

      query = query.order('issued_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePartsCostsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsCostsQuery] Fetched:', data?.length || 0, 'parts costs');
      return (data || []).map(mapPartsCostFromDB) as PartsCost[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePartsCostById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'partsCosts', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_parts_costs')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[usePartsCostById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[usePartsCostById] Fetched parts cost:', id);
      return mapPartsCostFromDB(data) as PartsCost;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

// =============================================================================
// COST REPORTS HOOKS
// =============================================================================

export function useCostReportsQuery(options?: {
  enabled?: boolean;
  facilityId?: string;
  reportType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'costReports', organizationId, options],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cmms_cost_reports')
        .select('*')
        .eq('organization_id', organizationId);

      if (options?.facilityId) {
        query = query.eq('facility_id', options.facilityId);
      }

      if (options?.reportType) {
        query = query.eq('report_type', options.reportType);
      }

      if (options?.dateFrom) {
        query = query.gte('period_start', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('period_end', options.dateTo);
      }

      query = query.order('generated_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useCostReportsQuery] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCostReportsQuery] Fetched:', data?.length || 0, 'cost reports');
      return (data || []).map(mapCostReportFromDB) as CostReport[];
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCostReportById(id: string | undefined | null) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';

  return useQuery({
    queryKey: ['cmms', 'costReports', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('cmms_cost_reports')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[useCostReportById] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useCostReportById] Fetched cost report:', id);
      return mapCostReportFromDB(data) as CostReport;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useGenerateCostReport(options?: {
  onSuccess?: (data: CostReport) => void;
  onError?: (error: Error) => void;
}) {
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      reportType: CostReport['reportType'];
      reportName: string;
      description?: string;
      facilityId?: string;
      facilityName?: string;
      periodStart: string;
      periodEnd: string;
      parameters: CostReportParameters;
      generatedBy: string;
      generatedByName: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const reportNumber = `CR-${Date.now().toString().slice(-8)}`;

      const { data, error } = await supabase
        .from('cmms_cost_reports')
        .insert({
          organization_id: organizationId,
          report_number: reportNumber,
          facility_id: params.facilityId || null,
          facility_name: params.facilityName || null,
          report_type: params.reportType,
          report_name: params.reportName,
          description: params.description || null,
          period_start: params.periodStart,
          period_end: params.periodEnd,
          generated_by: params.generatedBy,
          generated_by_name: params.generatedByName,
          generated_at: new Date().toISOString(),
          parameters: params.parameters,
          summary: {
            totalLaborCost: 0,
            totalPartsCost: 0,
            totalContractorCost: 0,
            totalOtherCost: 0,
            totalCost: 0,
            laborHours: 0,
            workOrderCount: 0,
            avgCostPerWorkOrder: 0,
          },
          details: [],
        })
        .select()
        .single();

      if (error) {
        console.error('[useGenerateCostReport] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useGenerateCostReport] Generated cost report:', data?.id);
      return mapCostReportFromDB(data) as CostReport;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmms', 'costReports'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useGenerateCostReport] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

// =============================================================================
// COST SUMMARY HOOKS
// =============================================================================

export function useCostSummary(options?: {
  facilityId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const laborCostsQuery = useLaborCostsQuery({
    facilityId: options?.facilityId,
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  });

  const partsCostsQuery = usePartsCostsQuery({
    facilityId: options?.facilityId,
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  });

  const laborCosts = laborCostsQuery.data || [];
  const partsCosts = partsCostsQuery.data || [];

  const summary = {
    totalLaborCost: laborCosts.reduce((sum, lc) => sum + lc.totalCost, 0),
    totalLaborHours: laborCosts.reduce((sum, lc) => sum + lc.hoursWorked, 0),
    totalPartsCost: partsCosts.reduce((sum, pc) => sum + pc.totalCost, 0),
    totalPartsQty: partsCosts.reduce((sum, pc) => sum + pc.quantity, 0),
    totalCost: laborCosts.reduce((sum, lc) => sum + lc.totalCost, 0) + 
               partsCosts.reduce((sum, pc) => sum + pc.totalCost, 0),
    laborEntryCount: laborCosts.length,
    partsEntryCount: partsCosts.length,
  };

  return {
    data: summary,
    isLoading: laborCostsQuery.isLoading || partsCostsQuery.isLoading,
    isError: laborCostsQuery.isError || partsCostsQuery.isError,
    error: laborCostsQuery.error || partsCostsQuery.error,
  };
}

// =============================================================================
// HELPER FUNCTIONS - DB MAPPING
// =============================================================================

function mapBudgetFromDB(data: Record<string, unknown>): MaintenanceBudget {
  return {
    id: data.id as string,
    budgetNumber: data.budget_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    facilityName: data.facility_name as string,
    departmentId: data.department_id as string | undefined,
    departmentName: data.department_name as string | undefined,
    name: data.name as string,
    description: data.description as string | undefined,
    fiscalYear: data.fiscal_year as number,
    period: data.period as BudgetPeriod,
    periodStart: data.period_start as string,
    periodEnd: data.period_end as string,
    status: data.status as BudgetStatus,
    allocations: (data.allocations || []) as BudgetAllocation[],
    totalBudget: data.total_budget as number,
    totalSpent: data.total_spent as number,
    totalCommitted: data.total_committed as number,
    totalAvailable: data.total_available as number,
    percentUsed: data.percent_used as number,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    notes: data.notes as string | undefined,
    createdBy: data.created_by as string,
    createdByName: data.created_by_name as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapLaborCostFromDB(data: Record<string, unknown>): LaborCost {
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    workOrderId: data.work_order_id as string,
    workOrderNumber: data.work_order_number as string,
    equipmentId: data.equipment_id as string | undefined,
    equipmentName: data.equipment_name as string | undefined,
    employeeId: data.employee_id as string,
    employeeName: data.employee_name as string,
    employeeNumber: data.employee_number as string,
    laborType: data.labor_type as 'regular' | 'overtime' | 'double_time' | 'contractor',
    craftCode: data.craft_code as string | undefined,
    craftName: data.craft_name as string | undefined,
    dateWorked: data.date_worked as string,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    hoursWorked: data.hours_worked as number,
    hourlyRate: data.hourly_rate as number,
    totalCost: data.total_cost as number,
    costCenter: data.cost_center as string | undefined,
    glAccount: data.gl_account as string | undefined,
    notes: data.notes as string | undefined,
    approvedBy: data.approved_by as string | undefined,
    approvedByName: data.approved_by_name as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    isApproved: data.is_approved as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapPartsCostFromDB(data: Record<string, unknown>): PartsCost {
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string,
    workOrderId: data.work_order_id as string,
    workOrderNumber: data.work_order_number as string,
    equipmentId: data.equipment_id as string | undefined,
    equipmentName: data.equipment_name as string | undefined,
    partsIssueId: data.parts_issue_id as string,
    partsIssueNumber: data.parts_issue_number as string,
    materialId: data.material_id as string,
    materialNumber: data.material_number as string,
    materialName: data.material_name as string,
    materialSku: data.material_sku as string,
    quantity: data.quantity as number,
    unitCost: data.unit_cost as number,
    totalCost: data.total_cost as number,
    costCenter: data.cost_center as string | undefined,
    glAccount: data.gl_account as string | undefined,
    issuedAt: data.issued_at as string,
    issuedBy: data.issued_by as string,
    issuedByName: data.issued_by_name as string,
    createdAt: data.created_at as string,
  };
}

function mapCostReportFromDB(data: Record<string, unknown>): CostReport {
  return {
    id: data.id as string,
    reportNumber: data.report_number as string,
    organizationId: data.organization_id as string,
    facilityId: data.facility_id as string | undefined,
    facilityName: data.facility_name as string | undefined,
    reportType: data.report_type as CostReport['reportType'],
    reportName: data.report_name as string,
    description: data.description as string | undefined,
    periodStart: data.period_start as string,
    periodEnd: data.period_end as string,
    generatedBy: data.generated_by as string,
    generatedByName: data.generated_by_name as string,
    generatedAt: data.generated_at as string,
    parameters: data.parameters as CostReportParameters,
    summary: data.summary as CostReportSummary,
    details: (data.details || []) as CostReportDetail[],
    createdAt: data.created_at as string,
  };
}
