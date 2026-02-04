export type ChargeTransactionStatus = 'pending' | 'approved' | 'posted' | 'rejected' | 'reversed';
export type ChargeType = 'consumable_issue' | 'chargeback' | 'interdepartmental';

export interface DepartmentGLAccount {
  departmentCode: number;
  departmentName: string;
  expenseAccount: string;
  expenseAccountName: string;
  inventoryAccount: string;
  inventoryAccountName: string;
  chargebackAccount: string;
  chargebackAccountName: string;
  consumableAccount: string;
  consumableAccountName: string;
}

export const DEPARTMENT_GL_ACCOUNTS: DepartmentGLAccount[] = [
  {
    departmentCode: 1000,
    departmentName: 'Projects / Offices',
    expenseAccount: '5800-100',
    expenseAccountName: 'Projects/Offices Expense',
    inventoryAccount: '1400-1000',
    inventoryAccountName: 'Projects/Offices Inventory',
    chargebackAccount: '4900-1000',
    chargebackAccountName: 'Projects/Offices Chargeback Revenue',
    consumableAccount: '5800-150',
    consumableAccountName: 'Projects/Offices Consumables',
  },
  {
    departmentCode: 1001,
    departmentName: 'Maintenance',
    expenseAccount: '5000-100',
    expenseAccountName: 'Maintenance Expense',
    inventoryAccount: '1400-1001',
    inventoryAccountName: 'Maintenance Inventory',
    chargebackAccount: '4900-1001',
    chargebackAccountName: 'Maintenance Chargeback Revenue',
    consumableAccount: '5000-150',
    consumableAccountName: 'Maintenance Consumables',
  },
  {
    departmentCode: 1002,
    departmentName: 'Sanitation',
    expenseAccount: '5100-100',
    expenseAccountName: 'Sanitation Expense',
    inventoryAccount: '1400-1002',
    inventoryAccountName: 'Sanitation Inventory',
    chargebackAccount: '4900-1002',
    chargebackAccountName: 'Sanitation Chargeback Revenue',
    consumableAccount: '5100-150',
    consumableAccountName: 'Sanitation Consumables',
  },
  {
    departmentCode: 1003,
    departmentName: 'Production',
    expenseAccount: '5200-100',
    expenseAccountName: 'Production Expense',
    inventoryAccount: '1400-1003',
    inventoryAccountName: 'Production Inventory',
    chargebackAccount: '4900-1003',
    chargebackAccountName: 'Production Chargeback Revenue',
    consumableAccount: '5200-150',
    consumableAccountName: 'Production Consumables',
  },
  {
    departmentCode: 1004,
    departmentName: 'Quality',
    expenseAccount: '5300-100',
    expenseAccountName: 'Quality Expense',
    inventoryAccount: '1400-1004',
    inventoryAccountName: 'Quality Inventory',
    chargebackAccount: '4900-1004',
    chargebackAccountName: 'Quality Chargeback Revenue',
    consumableAccount: '5300-150',
    consumableAccountName: 'Quality Consumables',
  },
  {
    departmentCode: 1005,
    departmentName: 'Safety',
    expenseAccount: '5400-100',
    expenseAccountName: 'Safety Expense',
    inventoryAccount: '1400-1005',
    inventoryAccountName: 'Safety Inventory',
    chargebackAccount: '4900-1005',
    chargebackAccountName: 'Safety Chargeback Revenue',
    consumableAccount: '5400-150',
    consumableAccountName: 'Safety Consumables',
  },
  {
    departmentCode: 1006,
    departmentName: 'HR',
    expenseAccount: '5500-100',
    expenseAccountName: 'HR Expense',
    inventoryAccount: '1400-1006',
    inventoryAccountName: 'HR Inventory',
    chargebackAccount: '4900-1006',
    chargebackAccountName: 'HR Chargeback Revenue',
    consumableAccount: '5500-150',
    consumableAccountName: 'HR Consumables',
  },
  {
    departmentCode: 1007,
    departmentName: 'Warehouse',
    expenseAccount: '5700-100',
    expenseAccountName: 'Warehouse Expense',
    inventoryAccount: '1400-1007',
    inventoryAccountName: 'Warehouse Inventory',
    chargebackAccount: '4900-1007',
    chargebackAccountName: 'Warehouse Chargeback Revenue',
    consumableAccount: '5700-150',
    consumableAccountName: 'Warehouse Consumables',
  },
  {
    departmentCode: 1008,
    departmentName: 'IT / Technology',
    expenseAccount: '5850-100',
    expenseAccountName: 'IT Expense',
    inventoryAccount: '1400-1008',
    inventoryAccountName: 'IT Inventory',
    chargebackAccount: '4900-1008',
    chargebackAccountName: 'IT Chargeback Revenue',
    consumableAccount: '5850-150',
    consumableAccountName: 'IT Consumables',
  },
  {
    departmentCode: 1009,
    departmentName: 'Facilities',
    expenseAccount: '5900-100',
    expenseAccountName: 'Facilities Expense',
    inventoryAccount: '1400-1009',
    inventoryAccountName: 'Facilities Inventory',
    chargebackAccount: '4900-1009',
    chargebackAccountName: 'Facilities Chargeback Revenue',
    consumableAccount: '5900-150',
    consumableAccountName: 'Facilities Consumables',
  },
];

export function getChargeGLAccounts(
  fromDepartment: number,
  toDepartment: number,
  chargeType: ChargeType
): { debitAccount: string; debitName: string; creditAccount: string; creditName: string } {
  const fromDept = DEPARTMENT_GL_ACCOUNTS.find(d => d.departmentCode === fromDepartment);
  const toDept = DEPARTMENT_GL_ACCOUNTS.find(d => d.departmentCode === toDepartment);

  if (!fromDept || !toDept) {
    return {
      debitAccount: '6100-0000',
      debitName: 'General Expense',
      creditAccount: '1400-0000',
      creditName: 'General Inventory',
    };
  }

  switch (chargeType) {
    case 'consumable_issue':
      return {
        debitAccount: toDept.consumableAccount,
        debitName: toDept.consumableAccountName,
        creditAccount: fromDept.inventoryAccount,
        creditName: fromDept.inventoryAccountName,
      };
    case 'chargeback':
      return {
        debitAccount: toDept.expenseAccount,
        debitName: toDept.expenseAccountName,
        creditAccount: fromDept.chargebackAccount,
        creditName: fromDept.chargebackAccountName,
      };
    case 'interdepartmental':
      return {
        debitAccount: toDept.expenseAccount,
        debitName: toDept.expenseAccountName,
        creditAccount: fromDept.inventoryAccount,
        creditName: fromDept.inventoryAccountName,
      };
    default:
      return {
        debitAccount: toDept.expenseAccount,
        debitName: toDept.expenseAccountName,
        creditAccount: fromDept.inventoryAccount,
        creditName: fromDept.inventoryAccountName,
      };
  }
}

export function getChargeStatusColor(status: ChargeTransactionStatus): string {
  switch (status) {
    case 'pending':
      return '#F59E0B';
    case 'approved':
      return '#3B82F6';
    case 'posted':
      return '#10B981';
    case 'rejected':
      return '#EF4444';
    case 'reversed':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}

export function getChargeStatusLabel(status: ChargeTransactionStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'posted':
      return 'Posted';
    case 'rejected':
      return 'Rejected';
    case 'reversed':
      return 'Reversed';
    default:
      return status;
  }
}

export function getChargeTypeLabel(type: ChargeType): string {
  switch (type) {
    case 'consumable_issue':
      return 'Consumable Issue';
    case 'chargeback':
      return 'Chargeback';
    case 'interdepartmental':
      return 'Interdepartmental';
    default:
      return type;
  }
}

export function getChargeTypeColor(type: ChargeType): string {
  switch (type) {
    case 'consumable_issue':
      return '#10B981';
    case 'chargeback':
      return '#F59E0B';
    case 'interdepartmental':
      return '#8B5CF6';
    default:
      return '#6B7280';
  }
}
