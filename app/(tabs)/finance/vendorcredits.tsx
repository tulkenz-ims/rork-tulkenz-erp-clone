import FinancePlaceholder from '@/components/FinancePlaceholder';
import { RotateCcw } from 'lucide-react-native';

export default function VendorCreditsScreen() {
  return (
    <FinancePlaceholder
      title="Vendor Credits"
      description="Manage vendor credits, debit memos, and credit applications."
      icon={RotateCcw}
      color="#FCA5A5"
      category="Accounts Payable"
      features={[
        { title: 'Credit Entry', description: 'Record vendor credits and returns' },
        { title: 'Debit Memos', description: 'Issue debit memos for discrepancies' },
        { title: 'Credit Application', description: 'Apply credits to open invoices' },
        { title: 'Credit Balance', description: 'Track outstanding vendor credits' },
        { title: 'Statement Reconciliation', description: 'Match credits to vendor statements' },
        { title: 'Credit History', description: 'View credit transaction history' },
      ]}
    />
  );
}
