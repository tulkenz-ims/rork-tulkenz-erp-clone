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
  isHeader?: boolean;
  description?: string;
  departmentCode?: string;
}

export interface Budget {
  id: string;
  name: string;
  departmentCode: string;
  departmentName?: string;
  glAccountPrefix?: string;  // e.g. '61' maps to 6100-6199
  fiscalYear: number;
  period: 'monthly' | 'quarterly' | 'annual';
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
  // ── ASSETS (1000-1999) ──
  { id: 'gl-1000', accountNumber: '1000', name: 'Assets', type: 'asset', balance: 0, isActive: true, isHeader: true },
  { id: 'gl-1010', accountNumber: '1010', name: 'Operating Cash', type: 'asset', balance: 185000, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1020', accountNumber: '1020', name: 'Payroll Account', type: 'asset', balance: 42000, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1100', accountNumber: '1100', name: 'Accounts Receivable', type: 'asset', balance: 95500, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1200', accountNumber: '1200', name: 'Raw Materials Inventory', type: 'asset', balance: 34200, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1210', accountNumber: '1210', name: 'Packaging Inventory', type: 'asset', balance: 12800, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1220', accountNumber: '1220', name: 'Finished Goods Inventory', type: 'asset', balance: 67500, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1300', accountNumber: '1300', name: 'MRO Parts Inventory', type: 'asset', balance: 18600, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1400', accountNumber: '1400', name: 'Prepaid Expenses', type: 'asset', balance: 8400, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1500', accountNumber: '1500', name: 'Equipment & Machinery', type: 'asset', balance: 450000, isActive: true, parentId: 'gl-1000' },
  { id: 'gl-1510', accountNumber: '1510', name: 'Accumulated Depreciation', type: 'asset', balance: -125000, isActive: true, parentId: 'gl-1000' },

  // ── LIABILITIES (2000-2999) ──
  { id: 'gl-2000', accountNumber: '2000', name: 'Liabilities', type: 'liability', balance: 0, isActive: true, isHeader: true },
  { id: 'gl-2010', accountNumber: '2010', name: 'Accounts Payable - Trade', type: 'liability', balance: 38200, isActive: true, parentId: 'gl-2000' },
  { id: 'gl-2020', accountNumber: '2020', name: 'Accounts Payable - MRO', type: 'liability', balance: 6100, isActive: true, parentId: 'gl-2000' },
  { id: 'gl-2100', accountNumber: '2100', name: 'Accrued Payroll', type: 'liability', balance: 28500, isActive: true, parentId: 'gl-2000' },
  { id: 'gl-2200', accountNumber: '2200', name: 'Sales Tax Payable', type: 'liability', balance: 4200, isActive: true, parentId: 'gl-2000' },
  { id: 'gl-2300', accountNumber: '2300', name: 'Equipment Loan', type: 'liability', balance: 120000, isActive: true, parentId: 'gl-2000' },

  // ── EQUITY (3000-3999) ──
  { id: 'gl-3000', accountNumber: '3000', name: 'Equity', type: 'equity', balance: 0, isActive: true, isHeader: true },
  { id: 'gl-3010', accountNumber: '3010', name: 'Owner\'s Equity', type: 'equity', balance: 350000, isActive: true, parentId: 'gl-3000' },
  { id: 'gl-3020', accountNumber: '3020', name: 'Retained Earnings', type: 'equity', balance: 165000, isActive: true, parentId: 'gl-3000' },

  // ── REVENUE (4000-4999) ──
  { id: 'gl-4000', accountNumber: '4000', name: 'Revenue', type: 'revenue', balance: 0, isActive: true, isHeader: true },
  { id: 'gl-4010', accountNumber: '4010', name: 'Product Sales', type: 'revenue', balance: 680000, isActive: true, parentId: 'gl-4000' },
  { id: 'gl-4020', accountNumber: '4020', name: 'Co-Pack Revenue', type: 'revenue', balance: 45000, isActive: true, parentId: 'gl-4000' },
  { id: 'gl-4030', accountNumber: '4030', name: 'Scrap/Salvage Sales', type: 'revenue', balance: 3200, isActive: true, parentId: 'gl-4000' },

  // ── COGS (5000-5499) ──
  { id: 'gl-5000', accountNumber: '5000', name: 'Cost of Goods Sold', type: 'expense', balance: 0, isActive: true, isHeader: true },
  { id: 'gl-5010', accountNumber: '5010', name: 'Raw Materials Used', type: 'expense', balance: 285000, isActive: true, parentId: 'gl-5000' },
  { id: 'gl-5020', accountNumber: '5020', name: 'Packaging Materials', type: 'expense', balance: 42000, isActive: true, parentId: 'gl-5000' },
  { id: 'gl-5030', accountNumber: '5030', name: 'Direct Labor', type: 'expense', balance: 156000, isActive: true, parentId: 'gl-5000' },
  { id: 'gl-5040', accountNumber: '5040', name: 'Manufacturing Overhead', type: 'expense', balance: 38000, isActive: true, parentId: 'gl-5000' },

  // ── OPERATING EXPENSES (6000-6999) ──
  { id: 'gl-6000', accountNumber: '6000', name: 'Operating Expenses', type: 'expense', balance: 0, isActive: true, isHeader: true },

  // Maintenance
  { id: 'gl-6100', accountNumber: '6100', name: 'Maintenance - Parts & Supplies', type: 'expense', balance: 4200, isActive: true, parentId: 'gl-6000', departmentCode: 'MAINT' },
  { id: 'gl-6110', accountNumber: '6110', name: 'Maintenance - Contract Services', type: 'expense', balance: 2800, isActive: true, parentId: 'gl-6000', departmentCode: 'MAINT' },
  { id: 'gl-6120', accountNumber: '6120', name: 'Maintenance - Equipment Repair', type: 'expense', balance: 1600, isActive: true, parentId: 'gl-6000', departmentCode: 'MAINT' },

  // Quality
  { id: 'gl-6200', accountNumber: '6200', name: 'Quality - Lab Supplies', type: 'expense', balance: 1200, isActive: true, parentId: 'gl-6000', departmentCode: 'QA' },
  { id: 'gl-6210', accountNumber: '6210', name: 'Quality - Testing Services', type: 'expense', balance: 900, isActive: true, parentId: 'gl-6000', departmentCode: 'QA' },
  { id: 'gl-6220', accountNumber: '6220', name: 'Quality - Certifications', type: 'expense', balance: 3500, isActive: true, parentId: 'gl-6000', departmentCode: 'QA' },

  // Safety
  { id: 'gl-6300', accountNumber: '6300', name: 'Safety - PPE & Supplies', type: 'expense', balance: 1100, isActive: true, parentId: 'gl-6000', departmentCode: 'SAFETY' },
  { id: 'gl-6310', accountNumber: '6310', name: 'Safety - Training', type: 'expense', balance: 700, isActive: true, parentId: 'gl-6000', departmentCode: 'SAFETY' },

  // Sanitation
  { id: 'gl-6400', accountNumber: '6400', name: 'Sanitation - Chemicals', type: 'expense', balance: 2400, isActive: true, parentId: 'gl-6000', departmentCode: 'SAN' },
  { id: 'gl-6410', accountNumber: '6410', name: 'Sanitation - Supplies', type: 'expense', balance: 1000, isActive: true, parentId: 'gl-6000', departmentCode: 'SAN' },

  // Warehouse
  { id: 'gl-6500', accountNumber: '6500', name: 'Warehouse - Supplies', type: 'expense', balance: 3200, isActive: true, parentId: 'gl-6000', departmentCode: 'WH' },
  { id: 'gl-6510', accountNumber: '6510', name: 'Warehouse - Equipment', type: 'expense', balance: 2400, isActive: true, parentId: 'gl-6000', departmentCode: 'WH' },

  // Shipping
  { id: 'gl-6600', accountNumber: '6600', name: 'Shipping - Freight Out', type: 'expense', balance: 2800, isActive: true, parentId: 'gl-6000', departmentCode: 'SHIP' },
  { id: 'gl-6610', accountNumber: '6610', name: 'Shipping - Supplies', type: 'expense', balance: 400, isActive: true, parentId: 'gl-6000', departmentCode: 'SHIP' },

  // Admin / Overhead
  { id: 'gl-6700', accountNumber: '6700', name: 'Admin - Office Supplies', type: 'expense', balance: 800, isActive: true, parentId: 'gl-6000', departmentCode: 'ADMIN' },
  { id: 'gl-6710', accountNumber: '6710', name: 'Admin - Software & Subscriptions', type: 'expense', balance: 700, isActive: true, parentId: 'gl-6000', departmentCode: 'ADMIN' },

  // R&D
  { id: 'gl-6800', accountNumber: '6800', name: 'R&D - Materials', type: 'expense', balance: 600, isActive: true, parentId: 'gl-6000', departmentCode: 'RND' },
  { id: 'gl-6810', accountNumber: '6810', name: 'R&D - Testing', type: 'expense', balance: 300, isActive: true, parentId: 'gl-6000', departmentCode: 'RND' },

  // Production (non-COGS operating)
  { id: 'gl-6900', accountNumber: '6900', name: 'Production - Supplies', type: 'expense', balance: 4100, isActive: true, parentId: 'gl-6000', departmentCode: 'PROD' },
  { id: 'gl-6910', accountNumber: '6910', name: 'Production - Uniforms', type: 'expense', balance: 1200, isActive: true, parentId: 'gl-6000', departmentCode: 'PROD' },

  // Utilities & Facility
  { id: 'gl-7000', accountNumber: '7000', name: 'Facility Expenses', type: 'expense', balance: 0, isActive: true, isHeader: true },
  { id: 'gl-7010', accountNumber: '7010', name: 'Utilities - Electric', type: 'expense', balance: 18000, isActive: true, parentId: 'gl-7000' },
  { id: 'gl-7020', accountNumber: '7020', name: 'Utilities - Water/Sewer', type: 'expense', balance: 6500, isActive: true, parentId: 'gl-7000' },
  { id: 'gl-7030', accountNumber: '7030', name: 'Utilities - Gas', type: 'expense', balance: 8200, isActive: true, parentId: 'gl-7000' },
  { id: 'gl-7040', accountNumber: '7040', name: 'Waste Removal & Recycling', type: 'expense', balance: 3800, isActive: true, parentId: 'gl-7000' },
  { id: 'gl-7050', accountNumber: '7050', name: 'Pest Control', type: 'expense', balance: 2400, isActive: true, parentId: 'gl-7000' },
  { id: 'gl-7060', accountNumber: '7060', name: 'Rent/Lease', type: 'expense', balance: 36000, isActive: true, parentId: 'gl-7000' },
  { id: 'gl-7070', accountNumber: '7070', name: 'Insurance', type: 'expense', balance: 14000, isActive: true, parentId: 'gl-7000' },
];

export const MOCK_BUDGETS: Budget[] = [
  { id: 'budget-1', name: 'Maintenance', departmentCode: 'MAINT', departmentName: 'Maintenance', glAccountPrefix: '61', fiscalYear: 2026, period: 'monthly', amount: 15000, spent: 8600, remaining: 6400, status: 'active' },
  { id: 'budget-2', name: 'Production', departmentCode: 'PROD', departmentName: 'Production', glAccountPrefix: '69', fiscalYear: 2026, period: 'monthly', amount: 25000, spent: 5300, remaining: 19700, status: 'active' },
  { id: 'budget-3', name: 'Quality', departmentCode: 'QA', departmentName: 'Quality Assurance', glAccountPrefix: '62', fiscalYear: 2026, period: 'monthly', amount: 8000, spent: 5600, remaining: 2400, status: 'active' },
  { id: 'budget-4', name: 'Safety', departmentCode: 'SAFETY', departmentName: 'Safety', glAccountPrefix: '63', fiscalYear: 2026, period: 'monthly', amount: 6000, spent: 1800, remaining: 4200, status: 'active' },
  { id: 'budget-5', name: 'Sanitation', departmentCode: 'SAN', departmentName: 'Sanitation', glAccountPrefix: '64', fiscalYear: 2026, period: 'monthly', amount: 10000, spent: 3400, remaining: 6600, status: 'active' },
  { id: 'budget-6', name: 'Warehouse', departmentCode: 'WH', departmentName: 'Warehouse', glAccountPrefix: '65', fiscalYear: 2026, period: 'monthly', amount: 12000, spent: 5600, remaining: 6400, status: 'active' },
  { id: 'budget-7', name: 'Shipping', departmentCode: 'SHIP', departmentName: 'Shipping & Logistics', glAccountPrefix: '66', fiscalYear: 2026, period: 'monthly', amount: 8000, spent: 3200, remaining: 4800, status: 'active' },
  { id: 'budget-8', name: 'Admin', departmentCode: 'ADMIN', departmentName: 'Administration', glAccountPrefix: '67', fiscalYear: 2026, period: 'monthly', amount: 5000, spent: 1500, remaining: 3500, status: 'active' },
  { id: 'budget-9', name: 'R&D', departmentCode: 'RND', departmentName: 'Research & Development', glAccountPrefix: '68', fiscalYear: 2026, period: 'monthly', amount: 4000, spent: 900, remaining: 3100, status: 'active' },
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
