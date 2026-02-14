import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  MOCK_AP_INVOICES,
  MOCK_AR_INVOICES,
  MOCK_JOURNAL_ENTRIES,
  MOCK_RECURRING_JOURNALS,
  MOCK_CUSTOMERS,
  type APInvoice,
  type ARInvoice,
  type GLAccount,
  type Budget,
  type JournalEntry,
  type RecurringJournal,
  type Customer,
  type InvoiceStatus,
  type AccountType,
} from '@/mocks/financeData';

// ── Supabase → App mappers ──────────────────────────────────
function mapGLAccount(row: any): GLAccount {
  return {
    id: row.id,
    accountNumber: row.account_number,
    name: row.name,
    type: row.type,
    balance: Number(row.balance) || 0,
    parentId: row.parent_id || undefined,
    isActive: row.is_active,
    isHeader: row.is_header || false,
    description: row.description || undefined,
    departmentCode: row.department_code || undefined,
  };
}

function mapBudget(row: any): Budget {
  return {
    id: row.id,
    name: row.name,
    departmentCode: row.department_code,
    departmentName: row.department_name || undefined,
    glAccountPrefix: row.gl_account_prefix || undefined,
    fiscalYear: row.fiscal_year,
    period: row.period || 'monthly',
    amount: Number(row.amount) || 0,
    spent: Number(row.spent) || 0,
    remaining: Number(row.remaining) || 0,
    status: row.status,
  };
}

export interface FinanceStats {
  cashBalance: number;
  totalAPDue: number;
  totalARDue: number;
  apOverdueCount: number;
  arOverdueCount: number;
  budgetUsed: number;
  budgetTotal: number;
  activeVendorsCount: number;
  pendingPayments: number;
}

export interface FinanceQueryOptions {
  enabled?: boolean;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  vendorId?: string;
  customerId?: string;
  departmentCode?: string;
  accountType?: AccountType;
  searchText?: string;
  limit?: number;
}

export function useFinanceStatsQuery(options?: { enabled?: boolean }) {
  const { organizationId } = useOrganization();
  const enabled = options?.enabled;

  return useQuery({
    queryKey: ['finance_stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      console.log('[useFinanceStatsQuery] Calculating finance stats');

      const apPending = MOCK_AP_INVOICES.filter(i => i.status === 'pending' || i.status === 'approved');
      const apOverdue = MOCK_AP_INVOICES.filter(i => i.status === 'overdue');
      const arPending = MOCK_AR_INVOICES.filter(i => i.status === 'pending');
      const totalAPDue = apPending.reduce((sum, i) => sum + i.balanceDue, 0);
      const totalARDue = arPending.reduce((sum, i) => sum + i.balanceDue, 0);

      // Get cash balance from GL
      let cashBalance = 0;
      try {
        const { data: cashRow } = await supabase
          .from('gl_accounts')
          .select('balance')
          .eq('organization_id', organizationId)
          .eq('account_number', '1010')
          .single();
        if (cashRow) cashBalance = Number(cashRow.balance) || 0;
      } catch (err) {
        console.log('[useFinanceStatsQuery] Could not fetch cash balance:', err);
      }

      // Get budget totals from department_budgets
      let budgetUsed = 0;
      let budgetTotal = 0;
      try {
        const { data: budgetRows } = await supabase
          .from('department_budgets')
          .select('amount, spent')
          .eq('organization_id', organizationId)
          .eq('status', 'active');
        if (budgetRows && budgetRows.length > 0) {
          budgetTotal = budgetRows.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
          budgetUsed = budgetRows.reduce((sum, b) => sum + (Number(b.spent) || 0), 0);
        }
      } catch (err) {
        console.log('[useFinanceStatsQuery] Could not fetch budgets:', err);
      }

      const stats: FinanceStats = {
        cashBalance,
        totalAPDue,
        totalARDue,
        apOverdueCount: apOverdue.length,
        arOverdueCount: MOCK_AR_INVOICES.filter(i => i.status === 'overdue').length,
        budgetUsed,
        budgetTotal,
        activeVendorsCount: 0,
        pendingPayments: apPending.length,
      };

      try {
        const { count, error } = await supabase
          .from('vendors')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active');

        if (!error && count !== null) {
          stats.activeVendorsCount = count;
        }
      } catch (err) {
        console.log('[useFinanceStatsQuery] Could not fetch vendor count:', err);
      }

      console.log('[useFinanceStatsQuery] Stats calculated:', stats);
      return stats;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAPInvoicesQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, status, dateFrom, dateTo, vendorId, departmentCode, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['ap_invoices', organizationId, status, dateFrom, dateTo, vendorId, departmentCode, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useAPInvoicesQuery] Fetching AP invoices with filters:', { status, vendorId, departmentCode });

      let results = [...MOCK_AP_INVOICES];

      if (status) {
        results = results.filter(inv => inv.status === status);
      }

      if (vendorId) {
        results = results.filter(inv => inv.vendorId === vendorId);
      }

      if (departmentCode) {
        results = results.filter(inv => inv.departmentCode === departmentCode);
      }

      if (searchText) {
        const search = searchText.toLowerCase();
        results = results.filter(inv =>
          inv.invoiceNumber.toLowerCase().includes(search) ||
          inv.vendorName.toLowerCase().includes(search)
        );
      }

      if (dateFrom) {
        results = results.filter(inv => inv.invoiceDate >= dateFrom);
      }

      if (dateTo) {
        results = results.filter(inv => inv.invoiceDate <= dateTo);
      }

      results.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

      if (limit) {
        results = results.slice(0, limit);
      }

      console.log('[useAPInvoicesQuery] Returning', results.length, 'invoices');
      return results as APInvoice[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAPInvoiceById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['ap_invoices', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      console.log('[useAPInvoiceById] Fetching invoice:', id);
      const invoice = MOCK_AP_INVOICES.find(inv => inv.id === id);
      return invoice || null;
    },
    enabled: !!organizationId && !!id,
  });
}

export function useARInvoicesQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, status, dateFrom, dateTo, customerId, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['ar_invoices', organizationId, status, dateFrom, dateTo, customerId, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useARInvoicesQuery] Fetching AR invoices with filters:', { status, customerId });

      let results = [...MOCK_AR_INVOICES];

      if (status) {
        results = results.filter(inv => inv.status === status);
      }

      if (customerId) {
        results = results.filter(inv => inv.customerId === customerId);
      }

      if (searchText) {
        const search = searchText.toLowerCase();
        results = results.filter(inv =>
          inv.invoiceNumber.toLowerCase().includes(search) ||
          inv.customerName.toLowerCase().includes(search)
        );
      }

      if (dateFrom) {
        results = results.filter(inv => inv.invoiceDate >= dateFrom);
      }

      if (dateTo) {
        results = results.filter(inv => inv.invoiceDate <= dateTo);
      }

      results.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

      if (limit) {
        results = results.slice(0, limit);
      }

      console.log('[useARInvoicesQuery] Returning', results.length, 'invoices');
      return results as ARInvoice[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useARInvoiceById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['ar_invoices', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      console.log('[useARInvoiceById] Fetching invoice:', id);
      const invoice = MOCK_AR_INVOICES.find(inv => inv.id === id);
      return invoice || null;
    },
    enabled: !!organizationId && !!id,
  });
}

export function useGLAccountsQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, accountType, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['gl_accounts', organizationId, accountType, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useGLAccountsQuery] Fetching GL accounts from Supabase:', { accountType });

      let query = supabase
        .from('gl_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('account_number', { ascending: true });

      if (accountType) {
        query = query.eq('type', accountType);
      }

      if (searchText) {
        query = query.or(`account_number.ilike.%${searchText}%,name.ilike.%${searchText}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const accounts = (data || []).map(mapGLAccount);
      console.log('[useGLAccountsQuery] Returning', accounts.length, 'accounts');
      return accounts;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 10,
  });
}

export function useGLAccountById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['gl_accounts', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      console.log('[useGLAccountById] Fetching account:', id);
      const { data, error } = await supabase
        .from('gl_accounts')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) return null;
      return mapGLAccount(data);
    },
    enabled: !!organizationId && !!id,
  });
}

export function useBudgetsQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, status, departmentCode, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['budgets', organizationId, status, departmentCode, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useBudgetsQuery] Fetching budgets from Supabase:', { status, departmentCode });

      let query = supabase
        .from('department_budgets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('department_code', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      if (departmentCode) {
        query = query.eq('department_code', departmentCode);
      }

      if (searchText) {
        query = query.or(`name.ilike.%${searchText}%,department_name.ilike.%${searchText}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const budgets = (data || []).map(mapBudget);
      console.log('[useBudgetsQuery] Returning', budgets.length, 'budgets');
      return budgets;
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBudgetById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['budgets', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      console.log('[useBudgetById] Fetching budget:', id);
      const { data, error } = await supabase
        .from('department_budgets')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) return null;
      return mapBudget(data);
    },
    enabled: !!organizationId && !!id,
  });
}

export function useJournalEntriesQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, status, dateFrom, dateTo, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['journal_entries', organizationId, status, dateFrom, dateTo, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useJournalEntriesQuery] Fetching journal entries with filters:', { status, dateFrom, dateTo });

      let results = [...MOCK_JOURNAL_ENTRIES];

      if (status) {
        results = results.filter(je => je.status === status);
      }

      if (searchText) {
        const search = searchText.toLowerCase();
        results = results.filter(je =>
          je.entryNumber.toLowerCase().includes(search) ||
          je.description.toLowerCase().includes(search)
        );
      }

      if (dateFrom) {
        results = results.filter(je => je.date >= dateFrom);
      }

      if (dateTo) {
        results = results.filter(je => je.date <= dateTo);
      }

      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (limit) {
        results = results.slice(0, limit);
      }

      console.log('[useJournalEntriesQuery] Returning', results.length, 'entries');
      return results as JournalEntry[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecurringJournalsQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, status, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['recurring_journals', organizationId, status, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useRecurringJournalsQuery] Fetching recurring journals with filters:', { status });

      let results = [...MOCK_RECURRING_JOURNALS];

      if (status) {
        results = results.filter(rj => rj.status === status);
      }

      if (searchText) {
        const search = searchText.toLowerCase();
        results = results.filter(rj =>
          rj.templateName.toLowerCase().includes(search) ||
          rj.description.toLowerCase().includes(search)
        );
      }

      results.sort((a, b) => new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime());

      if (limit) {
        results = results.slice(0, limit);
      }

      console.log('[useRecurringJournalsQuery] Returning', results.length, 'recurring journals');
      return results as RecurringJournal[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomersQuery(options?: FinanceQueryOptions) {
  const { organizationId } = useOrganization();
  const { enabled, status, searchText, limit } = options || {};

  return useQuery({
    queryKey: ['customers', organizationId, status, searchText, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      console.log('[useCustomersQuery] Fetching customers with filters:', { status });

      let results = [...MOCK_CUSTOMERS];

      if (status) {
        results = results.filter(c => c.status === status);
      }

      if (searchText) {
        const search = searchText.toLowerCase();
        results = results.filter(c =>
          c.customerCode.toLowerCase().includes(search) ||
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
        );
      }

      results.sort((a, b) => a.name.localeCompare(b.name));

      if (limit) {
        results = results.slice(0, limit);
      }

      console.log('[useCustomersQuery] Returning', results.length, 'customers');
      return results as Customer[];
    },
    enabled: !!organizationId && (enabled !== false),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomerById(id: string | undefined | null) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ['customers', 'byId', id, organizationId],
    queryFn: async () => {
      if (!organizationId || !id) return null;

      console.log('[useCustomerById] Fetching customer:', id);
      const customer = MOCK_CUSTOMERS.find(c => c.id === id);
      return customer || null;
    },
    enabled: !!organizationId && !!id,
  });
}

export function useCreateAPInvoiceMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (invoice: Partial<APInvoice>) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useCreateAPInvoiceMutation] Creating AP invoice:', invoice);
      
      const newInvoice: APInvoice = {
        id: `apinv-${Date.now()}`,
        invoiceNumber: invoice.invoiceNumber || `INV-${Date.now()}`,
        vendorId: invoice.vendorId || '',
        vendorName: invoice.vendorName || '',
        departmentCode: invoice.departmentCode || '',
        departmentName: invoice.departmentName || '',
        invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate || new Date().toISOString().split('T')[0],
        receivedDate: invoice.receivedDate || new Date().toISOString().split('T')[0],
        subtotal: invoice.subtotal || 0,
        taxAmount: invoice.taxAmount || 0,
        shippingAmount: invoice.shippingAmount || 0,
        otherCharges: invoice.otherCharges || 0,
        totalAmount: invoice.totalAmount || 0,
        amountPaid: 0,
        balanceDue: invoice.totalAmount || 0,
        currency: 'USD',
        status: 'pending',
        paymentTerms: invoice.paymentTerms || 'Net 30',
        lineItems: invoice.lineItems || [],
        threeWayMatch: invoice.threeWayMatch || {
          poMatched: false,
          receiptMatched: false,
          invoiceAmount: invoice.subtotal || 0,
          varianceAmount: 0,
          variancePercent: 0,
          matchStatus: 'pending',
        },
        attachments: [],
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
    },
  });
}

export function useUpdateAPInvoiceMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<APInvoice> }) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useUpdateAPInvoiceMutation] Updating AP invoice:', id, updates);
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
    },
  });
}

export function useCreateARInvoiceMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (invoice: Partial<ARInvoice>) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useCreateARInvoiceMutation] Creating AR invoice:', invoice);
      
      const newInvoice: ARInvoice = {
        id: `arinv-${Date.now()}`,
        invoiceNumber: invoice.invoiceNumber || `SI-${Date.now()}`,
        customerId: invoice.customerId || '',
        customerName: invoice.customerName || '',
        invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate || new Date().toISOString().split('T')[0],
        subtotal: invoice.subtotal || 0,
        taxAmount: invoice.taxAmount || 0,
        shippingAmount: invoice.shippingAmount || 0,
        discountAmount: invoice.discountAmount || 0,
        totalAmount: invoice.totalAmount || 0,
        amountPaid: 0,
        balanceDue: invoice.totalAmount || 0,
        currency: 'USD',
        status: 'pending',
        paymentTerms: invoice.paymentTerms || 'Net 30',
        lineItems: invoice.lineItems || [],
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
    },
  });
}

export function useCreateJournalEntryMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (entry: Partial<JournalEntry>) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useCreateJournalEntryMutation] Creating journal entry:', entry);
      
      const newEntry: JournalEntry = {
        id: `je-${Date.now()}`,
        entryNumber: entry.entryNumber || `JE-${Date.now()}`,
        date: entry.date || new Date().toISOString().split('T')[0],
        description: entry.description || '',
        lines: entry.lines || [],
        totalDebit: entry.totalDebit || 0,
        totalCredit: entry.totalCredit || 0,
        status: 'draft',
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
      };

      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}

export function usePostJournalEntryMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[usePostJournalEntryMutation] Posting journal entry:', id);
      return { id, status: 'posted', postedAt: new Date().toISOString(), postedBy: 'Current User' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['gl_accounts'] });
    },
  });
}

export function useUpdateRecurringJournalMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RecurringJournal> }) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useUpdateRecurringJournalMutation] Updating recurring journal:', id, updates);
      return { id, ...updates, updatedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_journals'] });
    },
  });
}

export function useRunRecurringJournalMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (journal: RecurringJournal) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useRunRecurringJournalMutation] Running recurring journal:', journal.id);
      
      const newEntry: JournalEntry = {
        id: `je-${Date.now()}`,
        entryNumber: `JE-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: `${journal.templateName} - Auto-generated`,
        lines: journal.lines.map(line => ({
          id: `jel-${Date.now()}-${line.id}`,
          accountId: line.accountId,
          accountNumber: line.accountNumber,
          accountName: line.accountName,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo,
        })),
        totalDebit: journal.totalDebit,
        totalCredit: journal.totalCredit,
        status: 'posted',
        createdBy: 'System',
        createdAt: new Date().toISOString(),
        postedAt: new Date().toISOString(),
        postedBy: 'System',
      };

      return {
        journalEntry: newEntry,
        updatedRecurring: {
          id: journal.id,
          lastRunDate: new Date().toISOString(),
          runCount: journal.runCount + 1,
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_journals'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}

export function useDeleteRecurringJournalMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useDeleteRecurringJournalMutation] Deleting recurring journal:', id);
      return { id, deleted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_journals'] });
    },
  });
}

export function useDuplicateRecurringJournalMutation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (journal: RecurringJournal) => {
      if (!organizationId) throw new Error('Organization not found');

      console.log('[useDuplicateRecurringJournalMutation] Duplicating recurring journal:', journal.id);
      
      const newJournal: RecurringJournal = {
        ...journal,
        id: `rj-${Date.now()}`,
        templateName: `${journal.templateName} (Copy)`,
        status: 'paused',
        runCount: 0,
        lastRunDate: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newJournal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_journals'] });
    },
  });
}

export {
  type APInvoice,
  type ARInvoice,
  type GLAccount,
  type Budget,
  type JournalEntry,
  type RecurringJournal,
  type Customer,
  type InvoiceStatus,
  type AccountType,
};
