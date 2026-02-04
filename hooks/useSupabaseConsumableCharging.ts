import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase, Tables, insertRecord, updateRecord } from '@/lib/supabase';
import { INVENTORY_DEPARTMENTS } from '@/constants/inventoryDepartmentCodes';
import {
  ChargeType,
  ChargeTransactionStatus,
  getChargeGLAccounts,
} from '@/mocks/consumableChargingData';

type ChargeTransaction = Tables['charge_transactions'];

export interface ChargeTransactionWithDepts extends ChargeTransaction {
  fromDepartment: number;
  toDepartment: number;
  fromDepartmentName: string;
  toDepartmentName: string;
  chargeType: ChargeType;
  materialNumber: string;
  materialName: string;
  materialSku: string;
  unitCost: number;
  totalCost: number;
  debitGLAccount: string;
  debitGLAccountName: string;
  creditGLAccount: string;
  creditGLAccountName: string;
  transactionNumber: string;
  issuedBy: string;
  receivedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedAt?: string;
  postedBy?: string;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  workOrderId?: string;
  costCenter?: string;
  projectCode?: string;
  journalEntryId?: string;
}

function mapDbToTransaction(db: ChargeTransaction): ChargeTransactionWithDepts {
  return {
    ...db,
    fromDepartment: db.from_department,
    toDepartment: db.to_department,
    fromDepartmentName: db.from_department_name,
    toDepartmentName: db.to_department_name,
    chargeType: db.charge_type as ChargeType,
    materialNumber: db.material_number,
    materialName: db.material_name,
    materialSku: db.material_sku,
    unitCost: db.unit_cost,
    totalCost: db.total_cost,
    debitGLAccount: db.debit_gl_account,
    debitGLAccountName: db.debit_gl_account_name,
    creditGLAccount: db.credit_gl_account,
    creditGLAccountName: db.credit_gl_account_name,
    transactionNumber: db.transaction_number,
    issuedBy: db.issued_by,
    receivedBy: db.received_by ?? undefined,
    approvedBy: db.approved_by ?? undefined,
    approvedAt: db.approved_at ?? undefined,
    postedAt: db.posted_at ?? undefined,
    postedBy: db.posted_by ?? undefined,
    reversedAt: db.reversed_at ?? undefined,
    reversedBy: db.reversed_by ?? undefined,
    reversalReason: db.reversal_reason ?? undefined,
    workOrderId: db.work_order_id ?? undefined,
    costCenter: db.cost_center ?? undefined,
    projectCode: db.project_code ?? undefined,
    journalEntryId: db.journal_entry_id ?? undefined,
  };
}

export function useChargeTransactionsQuery(options?: {
  status?: ChargeTransactionStatus;
  departmentCode?: number;
  enabled?: boolean;
}) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['charge_transactions', organizationId, options?.status, options?.departmentCode],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('charge_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('timestamp', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.departmentCode !== undefined) {
        query = query.or(`from_department.eq.${options.departmentCode},to_department.eq.${options.departmentCode}`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      console.log('[useChargeTransactionsQuery] Fetched:', data?.length || 0, 'transactions');
      return (data || []).map(mapDbToTransaction);
    },
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useChargeTransactionById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['charge_transactions', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      const { data, error } = await supabase
        .from('charge_transactions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw new Error(error.message);
      return data ? mapDbToTransaction(data) : null;
    },
    enabled: !!organizationId && !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateChargeTransaction(options?: {
  onSuccess?: (data: ChargeTransactionWithDepts) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fromDepartment: number;
      toDepartment: number;
      materialId?: string;
      materialNumber: string;
      materialName: string;
      materialSku: string;
      quantity: number;
      unitCost: number;
      chargeType: ChargeType;
      issuedBy: string;
      issuedById?: string;
      notes?: string;
      workOrderId?: string;
      costCenter?: string;
      projectCode?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const fromDept = INVENTORY_DEPARTMENTS[params.fromDepartment];
      const toDept = INVENTORY_DEPARTMENTS[params.toDepartment];

      if (!fromDept || !toDept) {
        throw new Error('Invalid department codes');
      }

      const glAccounts = getChargeGLAccounts(params.fromDepartment, params.toDepartment, params.chargeType);
      if (!glAccounts) {
        throw new Error('Failed to determine GL accounts');
      }

      const now = new Date();
      const txnNumber = `CHG-${now.getFullYear()}-${String(Date.now()).slice(-4)}`;
      const totalCost = params.quantity * params.unitCost;

      const result = await insertRecord('charge_transactions', {
        organization_id: organizationId,
        transaction_number: txnNumber,
        timestamp: now.toISOString(),
        charge_type: params.chargeType,
        from_department: params.fromDepartment,
        from_department_name: fromDept.name,
        to_department: params.toDepartment,
        to_department_name: toDept.name,
        material_id: params.materialId || null,
        material_number: params.materialNumber,
        material_name: params.materialName,
        material_sku: params.materialSku,
        quantity: params.quantity,
        unit_cost: params.unitCost,
        total_cost: totalCost,
        debit_gl_account: glAccounts.debitAccount,
        debit_gl_account_name: glAccounts.debitName,
        credit_gl_account: glAccounts.creditAccount,
        credit_gl_account_name: glAccounts.creditName,
        status: 'pending',
        issued_by: params.issuedBy,
        issued_by_id: params.issuedById || null,
        received_by: null,
        received_by_id: null,
        approved_by: null,
        approved_by_id: null,
        approved_at: null,
        posted_at: null,
        posted_by: null,
        reversed_at: null,
        reversed_by: null,
        reversed_by_id: null,
        reversal_reason: null,
        work_order_id: params.workOrderId || null,
        cost_center: params.costCenter || null,
        project_code: params.projectCode || null,
        notes: params.notes || null,
        journal_entry_id: null,
      });

      if (result.error) throw result.error;
      console.log('[useCreateChargeTransaction] Created:', result.data?.id);
      return mapDbToTransaction(result.data!);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charge_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useCreateChargeTransaction] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useApproveChargeTransaction(options?: {
  onSuccess?: (data: ChargeTransactionWithDepts) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
      approvedBy: string;
      approvedById?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const result = await updateRecord('charge_transactions', params.transactionId, {
        status: 'approved',
        approved_by: params.approvedBy,
        approved_by_id: params.approvedById || null,
        approved_at: new Date().toISOString(),
      }, organizationId);

      if (result.error) throw result.error;
      console.log('[useApproveChargeTransaction] Approved:', params.transactionId);
      return mapDbToTransaction(result.data!);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charge_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useApproveChargeTransaction] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function usePostChargeTransaction(options?: {
  onSuccess?: (data: ChargeTransactionWithDepts) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
      postedBy: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const journalId = `JE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      const result = await updateRecord('charge_transactions', params.transactionId, {
        status: 'posted',
        posted_by: params.postedBy,
        posted_at: new Date().toISOString(),
        journal_entry_id: journalId,
      }, organizationId);

      if (result.error) throw result.error;
      console.log('[usePostChargeTransaction] Posted:', params.transactionId, 'JE:', journalId);
      return mapDbToTransaction(result.data!);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charge_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[usePostChargeTransaction] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useRejectChargeTransaction(options?: {
  onSuccess?: (data: ChargeTransactionWithDepts) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const result = await updateRecord('charge_transactions', params.transactionId, {
        status: 'rejected',
      }, organizationId);

      if (result.error) throw result.error;
      console.log('[useRejectChargeTransaction] Rejected:', params.transactionId);
      return mapDbToTransaction(result.data!);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charge_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useRejectChargeTransaction] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useReverseChargeTransaction(options?: {
  onSuccess?: (data: ChargeTransactionWithDepts) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
      reversedBy: string;
      reversedById?: string;
      reason: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');

      const result = await updateRecord('charge_transactions', params.transactionId, {
        status: 'reversed',
        reversed_by: params.reversedBy,
        reversed_by_id: params.reversedById || null,
        reversed_at: new Date().toISOString(),
        reversal_reason: params.reason,
      }, organizationId);

      if (result.error) throw result.error;
      console.log('[useReverseChargeTransaction] Reversed:', params.transactionId);
      return mapDbToTransaction(result.data!);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charge_transactions'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useReverseChargeTransaction] Error:', error);
      options?.onError?.(error as Error);
    },
  });
}

export function useChargeTransactionStats() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['charge_transactions', 'stats', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { pending: 0, totalPosted: 0, monthlyTotal: 0, postedCount: 0 };
      }

      const { data, error } = await supabase
        .from('charge_transactions')
        .select('status, total_cost, timestamp')
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);

      const transactions = data || [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const pending = transactions.filter(t => t.status === 'pending').length;
      const posted = transactions.filter(t => t.status === 'posted');
      const totalPosted = posted.reduce((sum, t) => sum + (t.total_cost || 0), 0);

      const thisMonth = transactions.filter(t => {
        const txnDate = new Date(t.timestamp);
        return txnDate.getMonth() === currentMonth &&
               txnDate.getFullYear() === currentYear &&
               t.status === 'posted';
      });
      const monthlyTotal = thisMonth.reduce((sum, t) => sum + (t.total_cost || 0), 0);

      return { pending, totalPosted, monthlyTotal, postedCount: posted.length };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });
}
