export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'disputed';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'check' | 'ach' | 'wire' | 'credit_card' | 'cash';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type JournalEntryStatus = 'draft' | 'posted' | 'reversed';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'completed' | 'expired';

export interface APInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  departmentCode: string;
  departmentName: string;
  invoiceDate: string;
  dueDate: string;
  receivedDate: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  otherCharges: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  status: InvoiceStatus;
  paymentTerms: string;
  lineItems: APLineItem[];
  threeWayMatch: ThreeWayMatch;
  notes?: string;
  attachments: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  glAccountId?: string;
}

export interface APLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  poLineNumber?: number;
  receivedQuantity?: number;
  glAccountId: string;
  glAccountName: string;
  taxable: boolean;
}

export interface ThreeWayMatch {
  poMatched: boolean;
  poNumber?: string;
  poAmount?: number;
  receiptMatched: boolean;
  receiptNumber?: string;
  receiptAmount?: number;
  invoiceAmount: number;
  varianceAmount: number;
  variancePercent: number;
  matchStatus: 'matched' | 'variance' | 'pending' | 'exception';
  matchedAt?: string;
  matchedBy?: string;
  notes?: string;
}

export interface APPayment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  invoiceIds: string[];
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  checkNumber?: string;
  bankAccount: string;
  status: PaymentStatus;
  memo?: string;
  createdBy: string;
  createdAt: string;
  processedAt?: string;
  voidedAt?: string;
  voidReason?: string;
}

export interface ARInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  salesOrderId?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  status: InvoiceStatus;
  paymentTerms: string;
  lineItems: ARLineItem[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  paidAt?: string;
}

export interface ARLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
  glAccountId: string;
  glAccountName: string;
  taxable: boolean;
}

export interface ARPayment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceIds: string[];
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  depositAccount: string;
  status: PaymentStatus;
  memo?: string;
  createdBy: string;
  createdAt: string;
}

export type CustomerStatus = 'active' | 'inactive' | 'hold';

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  creditLimit: number;
  currentBalance: number;
  paymentTerms: string;
  status: CustomerStatus;
  createdAt: string;
}

export interface GLAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  parentAccountId?: string;
  description?: string;
  balance: number;
  isActive: boolean;
  isHeader: boolean;
  normalBalance: 'debit' | 'credit';
  departmentCode?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  sourceModule?: string;
  sourceId?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: JournalEntryStatus;
  createdBy: string;
  createdAt: string;
  postedAt?: string;
  postedBy?: string;
  reversedAt?: string;
  reversalEntryId?: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
  departmentCode?: string;
}

export interface RecurringJournal {
  id: string;
  templateName: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  runCount: number;
  maxRuns?: number;
  status: RecurringStatus;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
}

export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed';

export interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  departmentCode?: string;
  departmentName?: string;
  status: BudgetStatus;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  lineItems: BudgetLineItem[];
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface BudgetLineItem {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  monthlyAmounts: number[];
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
}

export type PayrollStatus = 'pending' | 'approved' | 'paid';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  regularHours: number;
  overtimeHours: number;
  regularRate: number;
  overtimeRate: number;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  otherDeductions: number;
  netPay: number;
  departmentCode: string;
  status: PayrollStatus;
  createdAt: string;
}

export type TaxType = 'sales' | 'payroll' | 'property' | 'income';
export type TaxStatus = 'pending' | 'filed' | 'paid' | 'overdue';

export interface TaxRecord {
  id: string;
  taxType: TaxType;
  period: string;
  jurisdiction: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  dueDate: string;
  filedDate?: string;
  paidDate?: string;
  status: TaxStatus;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}
