import FinancePlaceholder from '@/components/FinancePlaceholder';
import { FileText } from 'lucide-react-native';

export default function JournalEntriesScreen() {
  return (
    <FinancePlaceholder
      title="Journal Entries"
      description="Create, review, and post manual journal entries with full audit trail support."
      icon={FileText}
      color="#8B5CF6"
      category="General Ledger"
      features={[
        { title: 'Manual Entry Creation', description: 'Create debit/credit entries with multiple line items' },
        { title: 'Template Entries', description: 'Save and reuse common journal entry templates' },
        { title: 'Reversing Entries', description: 'Automatic reversal of accrual entries' },
        { title: 'Entry Approval Workflow', description: 'Multi-level approval before posting' },
        { title: 'Posting to GL', description: 'Post approved entries to general ledger' },
        { title: 'Audit Trail', description: 'Complete history of all entry changes' },
      ]}
    />
  );
}
