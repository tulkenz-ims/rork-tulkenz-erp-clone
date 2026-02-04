import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Eye } from 'lucide-react-native';

export default function AuditTrailScreen() {
  return (
    <FinancePlaceholder
      title="Audit Trail"
      description="Complete history of all financial transactions and changes."
      icon={Eye}
      color="#3730A3"
      category="Period Close"
      features={[
        { title: 'Transaction History', description: 'View all transaction activity' },
        { title: 'Change Tracking', description: 'Track edits and modifications' },
        { title: 'User Activity', description: 'See who made each change' },
        { title: 'Date/Time Stamps', description: 'Precise timing of all activities' },
        { title: 'Search & Filter', description: 'Find specific transactions' },
        { title: 'Export Reports', description: 'Generate audit reports' },
      ]}
    />
  );
}
