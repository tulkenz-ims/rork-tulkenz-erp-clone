export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface APInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description: string;
  createdAt: string;
  paidAt?: string;
  departmentCode?: string;
}

export interface ARInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description: string;
  createdAt: string;
  paidAt?: string;
  departmentCode?: string;
}

export interface GLAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  balance: number;
  parentId?: string;
  isActive: boolean;
  description?: string;
}

export interface Budget {
  id: string;
  name: string;
  departmentCode: string;
  fiscalYear: number;
  amount: number;
  spent: number;
  remaining: number;
  status: 'active' | 'closed' | 'draft';
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  status: 'draft' | 'posted' | 'reversed';
  createdBy: string;
  createdAt: string;
}

export interface RecurringJournal {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextRunDate: string;
  template: Omit<JournalEntry, 'id' | 'entryNumber' | 'date' | 'status' | 'createdAt'>;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  balance: number;
  creditLimit: number;
  isActive: boolean;
}

export const MOCK_AP_INVOICES: APInvoice[] = [
  {
    id: 'ap-1',
    invoiceNumber: 'AP-2024-001',
    vendorId: 'vendor-1',
    vendorName: 'Acme Supplies Co',
    amount: 15000,
    dueDate: '2024-02-15',
    status: 'pending',
    description: 'Monthly supplies',
    createdAt: '2024-01-15T10:00:00Z',
    departmentCode: 'MAINT',
  },
  {
    id: 'ap-2',
    invoiceNumber: 'AP-2024-002',
    vendorId: 'vendor-2',
    vendorName: 'Industrial Parts Inc',
    amount: 8500,
    dueDate: '2024-02-10',
    status: 'overdue',
    description: 'Equipment parts',
    createdAt: '2024-01-10T09:00:00Z',
    departmentCode: 'PROD',
  },
  {
    id: 'ap-3',
    invoiceNumber: 'AP-2024-003',
    vendorId: 'vendor-3',
    vendorName: 'Tech Solutions LLC',
    amount: 25000,
    dueDate: '2024-03-01',
    status: 'approved',
    description: 'Software licenses',
    createdAt: '2024-01-20T14:00:00Z',
    departmentCode: 'IT',
  },
];

export const MOCK_AR_INVOICES: ARInvoice[] = [
  {
    id: 'ar-1',
    invoiceNumber: 'AR-2024-001',
    customerId: 'cust-1',
    customerName: 'Global Manufacturing',
    amount: 45000,
    dueDate: '2024-02-20',
    status: 'pending',
    description: 'Product order #1234',
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'ar-2',
    invoiceNumber: 'AR-2024-002',
    customerId: 'cust-2',
    customerName: 'Regional Distributors',
    amount: 18500,
    dueDate: '2024-02-05',
    status: 'overdue',
    description: 'Service contract Q1',
    createdAt: '2024-01-05T09:00:00Z',
  },
  {
    id: 'ar-3',
    invoiceNumber: 'AR-2024-003',
    customerId: 'cust-3',
    customerName: 'Local Retail Chain',
    amount: 32000,
    dueDate: '2024-02-28',
    status: 'paid',
    description: 'Bulk order',
    createdAt: '2024-01-25T14:00:00Z',
    paidAt: '2024-02-10T11:00:00Z',
  },
];

export const MOCK_GL_ACCOUNTS: GLAccount[] = [
  { id: 'gl-1', accountNumber: '1000', name: 'Cash', type: 'asset', balance: 250000, isActive: true },
  { id: 'gl-2', accountNumber: '1100', name: 'Accounts Receivable', type: 'asset', balance: 95500, isActive: true },
  { id: 'gl-3', accountNumber: '2000', name: 'Accounts Payable', type: 'liability', balance: 48500, isActive: true },
  { id: 'gl-4', accountNumber: '3000', name: 'Retained Earnings', type: 'equity', balance: 500000, isActive: true },
  { id: 'gl-5', accountNumber: '4000', name: 'Sales Revenue', type: 'revenue', balance: 750000, isActive: true },
  { id: 'gl-6', accountNumber: '5000', name: 'Cost of Goods Sold', type: 'expense', balance: 450000, isActive: true },
  { id: 'gl-7', accountNumber: '6000', name: 'Operating Expenses', type: 'expense', balance: 125000, isActive: true },
];

export const MOCK_BUDGETS: Budget[] = [
  { id: 'budget-1', name: 'Maintenance Budget 2024', departmentCode: 'MAINT', fiscalYear: 2024, amount: 500000, spent: 125000, remaining: 375000, status: 'active' },
  { id: 'budget-2', name: 'IT Budget 2024', departmentCode: 'IT', fiscalYear: 2024, amount: 300000, spent: 180000, remaining: 120000, status: 'active' },
  { id: 'budget-3', name: 'Production Budget 2024', departmentCode: 'PROD', fiscalYear: 2024, amount: 1000000, spent: 650000, remaining: 350000, status: 'active' },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je-1',
    entryNumber: 'JE-2024-001',
    date: '2024-01-31',
    description: 'Monthly depreciation',
    debitAccountId: 'gl-6',
    creditAccountId: 'gl-1',
    amount: 5000,
    status: 'posted',
    createdBy: 'Finance Admin',
    createdAt: '2024-01-31T17:00:00Z',
  },
  {
    id: 'je-2',
    entryNumber: 'JE-2024-002',
    date: '2024-02-01',
    description: 'Accrued expenses',
    debitAccountId: 'gl-7',
    creditAccountId: 'gl-3',
    amount: 12000,
    status: 'posted',
    createdBy: 'Finance Admin',
    createdAt: '2024-02-01T09:00:00Z',
  },
];

export const MOCK_RECURRING_JOURNALS: RecurringJournal[] = [
  {
    id: 'rj-1',
    name: 'Monthly Depreciation',
    frequency: 'monthly',
    nextRunDate: '2024-02-28',
    template: {
      description: 'Monthly depreciation entry',
      debitAccountId: 'gl-6',
      creditAccountId: 'gl-1',
      amount: 5000,
      createdBy: 'System',
    },
    isActive: true,
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Global Manufacturing', email: 'ap@globalmfg.com', phone: '555-0100', balance: 45000, creditLimit: 100000, isActive: true },
  { id: 'cust-2', name: 'Regional Distributors', email: 'accounts@regionaldist.com', phone: '555-0101', balance: 18500, creditLimit: 50000, isActive: true },
  { id: 'cust-3', name: 'Local Retail Chain', email: 'finance@localretail.com', phone: '555-0102', balance: 0, creditLimit: 75000, isActive: true },
];
