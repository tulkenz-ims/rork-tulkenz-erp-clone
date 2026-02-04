import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function FinanceLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Finance' }} />
      
      {/* General Ledger */}
      <Stack.Screen name="gl" options={{ title: 'Chart of Accounts' }} />
      <Stack.Screen name="journal" options={{ title: 'Journal Entries' }} />
      <Stack.Screen name="recurring" options={{ title: 'Recurring Journals' }} />
      <Stack.Screen name="intercompany" options={{ title: 'Intercompany' }} />
      <Stack.Screen name="multicompany" options={{ title: 'Multi-Company' }} />
      <Stack.Screen name="multicurrency" options={{ title: 'Multi-Currency' }} />
      <Stack.Screen name="trialbalance" options={{ title: 'Trial Balance' }} />
      <Stack.Screen name="glrecon" options={{ title: 'GL Reconciliation' }} />
      
      {/* Financial Statements */}
      <Stack.Screen name="financials" options={{ title: 'Financial Statements' }} />
      <Stack.Screen name="consolidation" options={{ title: 'Consolidation' }} />
      <Stack.Screen name="mgmtreporting" options={{ title: 'Management Reports' }} />
      <Stack.Screen name="segmentreport" options={{ title: 'Segment Reporting' }} />
      <Stack.Screen name="ratios" options={{ title: 'Financial Ratios' }} />
      
      {/* Accounts Payable */}
      <Stack.Screen name="vendors" options={{ title: 'Vendor Management' }} />
      <Stack.Screen name="ap" options={{ title: 'AP Invoices' }} />
      <Stack.Screen name="apaging" options={{ title: 'AP Aging' }} />
      <Stack.Screen name="payments" options={{ title: 'Payment Processing' }} />
      <Stack.Screen name="positivepay" options={{ title: 'Positive Pay' }} />
      <Stack.Screen name="form1099" options={{ title: '1099 Processing' }} />
      <Stack.Screen name="vendorcredits" options={{ title: 'Vendor Credits' }} />
      <Stack.Screen name="prepaid" options={{ title: 'Prepaid Expenses' }} />
      
      {/* Accounts Receivable */}
      <Stack.Screen name="customers" options={{ title: 'Customer Master' }} />
      <Stack.Screen name="ar" options={{ title: 'AR Invoices' }} />
      <Stack.Screen name="araging" options={{ title: 'AR Aging' }} />
      <Stack.Screen name="collections" options={{ title: 'Collections' }} />
      <Stack.Screen name="custpayments" options={{ title: 'Customer Payments' }} />
      <Stack.Screen name="lockbox" options={{ title: 'Lockbox Processing' }} />
      <Stack.Screen name="creditmemos" options={{ title: 'Credit Memos' }} />
      <Stack.Screen name="custportal" options={{ title: 'Customer Portal' }} />
      
      {/* Cash Management */}
      <Stack.Screen name="bankaccounts" options={{ title: 'Bank Accounts' }} />
      <Stack.Screen name="bankrec" options={{ title: 'Bank Reconciliation' }} />
      <Stack.Screen name="cashposition" options={{ title: 'Cash Position' }} />
      <Stack.Screen name="cashflow" options={{ title: 'Cash Flow Forecast' }} />
      <Stack.Screen name="treasury" options={{ title: 'Treasury' }} />
      <Stack.Screen name="fxmgmt" options={{ title: 'FX Management' }} />
      
      {/* Fixed Assets */}
      <Stack.Screen name="fixedassets" options={{ title: 'Asset Register' }} />
      <Stack.Screen name="depreciation" options={{ title: 'Depreciation' }} />
      <Stack.Screen name="assetdisposal" options={{ title: 'Asset Disposal' }} />
      <Stack.Screen name="leases" options={{ title: 'Lease Accounting' }} />
      <Stack.Screen name="cip" options={{ title: 'Capital Projects' }} />
      <Stack.Screen name="assetinventory" options={{ title: 'Physical Inventory' }} />
      
      {/* Budgeting & Planning */}
      <Stack.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Stack.Screen name="variance" options={{ title: 'Variance Analysis' }} />
      <Stack.Screen name="forecasting" options={{ title: 'Forecasting' }} />
      <Stack.Screen name="capex" options={{ title: 'CapEx Planning' }} />
      <Stack.Screen name="headcountplan" options={{ title: 'Headcount Planning' }} />
      
      {/* Cost Accounting */}
      <Stack.Screen name="costcenters" options={{ title: 'Cost Centers' }} />
      <Stack.Screen name="costabc" options={{ title: 'Activity-Based Costing' }} />
      <Stack.Screen name="productcost" options={{ title: 'Product Costing' }} />
      <Stack.Screen name="jobcost" options={{ title: 'Job Costing' }} />
      <Stack.Screen name="profitability" options={{ title: 'Profitability Analysis' }} />
      
      {/* Payroll */}
      <Stack.Screen name="payroll" options={{ title: 'Payroll Processing' }} />
      <Stack.Screen name="payrollconfig" options={{ title: 'Pay Configuration' }} />
      <Stack.Screen name="deductions" options={{ title: 'Deductions' }} />
      <Stack.Screen name="directdeposit" options={{ title: 'Direct Deposit' }} />
      <Stack.Screen name="payrolltax" options={{ title: 'Payroll Taxes' }} />
      <Stack.Screen name="w2" options={{ title: 'W-2 Processing' }} />
      <Stack.Screen name="certifiedpay" options={{ title: 'Certified Payroll' }} />
      
      {/* Tax Management */}
      <Stack.Screen name="taxes" options={{ title: 'Tax Records' }} />
      <Stack.Screen name="salestax" options={{ title: 'Sales Tax' }} />
      <Stack.Screen name="taxexempt" options={{ title: 'Tax Exemptions' }} />
      <Stack.Screen name="propertytax" options={{ title: 'Property Tax' }} />
      <Stack.Screen name="incometax" options={{ title: 'Income Tax' }} />
      
      {/* Period Close */}
      <Stack.Screen name="periodclose" options={{ title: 'Period Close' }} />
      <Stack.Screen name="closechecklist" options={{ title: 'Close Checklist' }} />
      <Stack.Screen name="periodlock" options={{ title: 'Period Lock' }} />
      <Stack.Screen name="adjusting" options={{ title: 'Adjusting Entries' }} />
      <Stack.Screen name="audittrail" options={{ title: 'Audit Trail' }} />
    </Stack>
  );
}
