import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Calendar } from 'lucide-react-native';

export default function PrepaidExpensesScreen() {
  return (
    <FinancePlaceholder
      title="Prepaid Expenses"
      description="Track and amortize prepaid expenses over their benefit period."
      icon={Calendar}
      color="#FECACA"
      category="Accounts Payable"
      features={[
        { title: 'Prepaid Setup', description: 'Record new prepaid expenses' },
        { title: 'Amortization Schedule', description: 'Define amortization periods' },
        { title: 'Automatic Entries', description: 'Generate monthly amortization entries' },
        { title: 'Balance Tracking', description: 'Monitor remaining prepaid balances' },
        { title: 'Expense Categories', description: 'Organize by expense type' },
        { title: 'Reporting', description: 'Prepaid expense summary reports' },
      ]}
    />
  );
}
