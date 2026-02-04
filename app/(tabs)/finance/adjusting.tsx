import FinancePlaceholder from '@/components/FinancePlaceholder';
import { FileInput } from 'lucide-react-native';

export default function AdjustingEntriesScreen() {
  return (
    <FinancePlaceholder
      title="Adjusting Entries"
      description="Create and track period-end adjusting journal entries."
      icon={FileInput}
      color="#4338CA"
      category="Period Close"
      features={[
        { title: 'Adjustment Types', description: 'Accruals, deferrals, estimates' },
        { title: 'Entry Templates', description: 'Reusable adjustment templates' },
        { title: 'Supporting Docs', description: 'Attach documentation' },
        { title: 'Review Workflow', description: 'Manager review and approval' },
        { title: 'Auto-Reverse', description: 'Schedule automatic reversals' },
        { title: 'Adjustment History', description: 'Track all adjustments by period' },
      ]}
    />
  );
}
