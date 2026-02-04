import FinancePlaceholder from '@/components/FinancePlaceholder';
import { RotateCcw } from 'lucide-react-native';

export default function CreditMemosScreen() {
  return (
    <FinancePlaceholder
      title="Credit Memos"
      description="Issue credit memos, process refunds, and manage write-offs."
      icon={RotateCcw}
      color="#93C5FD"
      category="Accounts Receivable"
      features={[
        { title: 'Credit Memo Entry', description: 'Create customer credit memos' },
        { title: 'Credit Application', description: 'Apply credits to open invoices' },
        { title: 'Refund Processing', description: 'Issue refund checks or ACH' },
        { title: 'Write-Off Management', description: 'Process bad debt write-offs' },
        { title: 'Approval Workflow', description: 'Route credits for approval' },
        { title: 'Credit History', description: 'Track all credit transactions' },
      ]}
    />
  );
}
