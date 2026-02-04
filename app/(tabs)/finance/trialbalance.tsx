import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Scale } from 'lucide-react-native';

export default function TrialBalanceScreen() {
  return (
    <FinancePlaceholder
      title="Trial Balance"
      description="View account balances and verify debits equal credits for any period."
      icon={Scale}
      color="#5B21B6"
      category="General Ledger"
      features={[
        { title: 'Period Selection', description: 'Generate trial balance for any accounting period' },
        { title: 'Account Filtering', description: 'Filter by account type, department, or segment' },
        { title: 'Comparative View', description: 'Compare balances across multiple periods' },
        { title: 'Drill-Down', description: 'Click through to underlying transactions' },
        { title: 'Export Options', description: 'Export to Excel, PDF, or CSV formats' },
        { title: 'Adjusting Entries', description: 'View pre and post-adjustment balances' },
      ]}
    />
  );
}
