export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'completed' | 'expired';
export type PayrollStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentCode: string;
  payPeriodStart: string;
  payPeriodEnd: string;
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
  status: PayrollStatus;
}

export const MOCK_PAYROLL_RECORDS: PayrollRecord[] = [
  {
    id: 'pr-001',
    employeeId: 'emp-001',
    employeeName: 'Maria Garcia',
    departmentCode: '1003',
    payPeriodStart: '2024-01-16',
    payPeriodEnd: '2024-01-31',
    regularHours: 80,
    overtimeHours: 8,
    regularRate: 25.00,
    overtimeRate: 37.50,
    grossPay: 2300.00,
    federalTax: 322.00,
    stateTax: 115.00,
    socialSecurity: 142.60,
    medicare: 33.35,
    otherDeductions: 125.00,
    netPay: 1562.05,
    status: 'approved',
  },
  {
    id: 'pr-002',
    employeeId: 'emp-002',
    employeeName: 'James Wilson',
    departmentCode: '1001',
    payPeriodStart: '2024-01-16',
    payPeriodEnd: '2024-01-31',
    regularHours: 80,
    overtimeHours: 12,
    regularRate: 28.00,
    overtimeRate: 42.00,
    grossPay: 2744.00,
    federalTax: 384.16,
    stateTax: 137.20,
    socialSecurity: 170.13,
    medicare: 39.79,
    otherDeductions: 150.00,
    netPay: 1862.72,
    status: 'approved',
  },
  {
    id: 'pr-003',
    employeeId: 'emp-003',
    employeeName: 'Sarah Johnson',
    departmentCode: '1004',
    payPeriodStart: '2024-01-16',
    payPeriodEnd: '2024-01-31',
    regularHours: 80,
    overtimeHours: 0,
    regularRate: 32.00,
    overtimeRate: 48.00,
    grossPay: 2560.00,
    federalTax: 358.40,
    stateTax: 128.00,
    socialSecurity: 158.72,
    medicare: 37.12,
    otherDeductions: 200.00,
    netPay: 1677.76,
    status: 'pending',
  },
  {
    id: 'pr-004',
    employeeId: 'emp-004',
    employeeName: 'Robert Chen',
    departmentCode: '1002',
    payPeriodStart: '2024-01-16',
    payPeriodEnd: '2024-01-31',
    regularHours: 80,
    overtimeHours: 4,
    regularRate: 22.00,
    overtimeRate: 33.00,
    grossPay: 1892.00,
    federalTax: 264.88,
    stateTax: 94.60,
    socialSecurity: 117.30,
    medicare: 27.43,
    otherDeductions: 100.00,
    netPay: 1287.79,
    status: 'approved',
  },
];

export interface TaxRecord {
  id: string;
  taxType: 'federal' | 'state' | 'local' | 'sales' | 'property';
  description: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'filed' | 'overdue';
  period: string;
  jurisdiction: string;
  referenceNumber?: string;
}

export const MOCK_TAX_RECORDS: TaxRecord[] = [
  {
    id: 'tax-001',
    taxType: 'federal',
    description: 'Federal Payroll Tax - Q4 2023',
    taxableAmount: 1562500.00,
    taxRate: 8.0,
    taxAmount: 125000.00,
    dueDate: '2024-01-31',
    paidDate: '2024-01-28',
    status: 'paid',
    period: 'Q4 2023',
    jurisdiction: 'Federal',
    referenceNumber: 'FED-2024-0128',
  },
  {
    id: 'tax-002',
    taxType: 'state',
    description: 'State Unemployment Tax - Q4 2023',
    taxableAmount: 370000.00,
    taxRate: 5.0,
    taxAmount: 18500.00,
    dueDate: '2024-01-31',
    status: 'pending',
    period: 'Q4 2023',
    jurisdiction: 'Illinois',
  },
  {
    id: 'tax-003',
    taxType: 'sales',
    description: 'Sales Tax - January 2024',
    taxableAmount: 125000.00,
    taxRate: 7.0,
    taxAmount: 8750.00,
    dueDate: '2024-02-20',
    status: 'pending',
    period: 'January 2024',
    jurisdiction: 'Illinois',
  },
  {
    id: 'tax-004',
    taxType: 'federal',
    description: 'Federal Income Tax - Q1 2024',
    taxableAmount: 850000.00,
    taxRate: 21.0,
    taxAmount: 178500.00,
    dueDate: '2024-04-15',
    status: 'filed',
    period: 'Q1 2024',
    jurisdiction: 'Federal',
    referenceNumber: 'FED-2024-Q1-EST',
  },
];

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const STATUS_COLORS: Record<RecurringStatus, string> = {
  active: '#10B981',
  paused: '#F59E0B',
  completed: '#6B7280',
  expired: '#EF4444',
};
