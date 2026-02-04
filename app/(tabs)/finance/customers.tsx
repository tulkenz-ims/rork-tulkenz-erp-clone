import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Users } from 'lucide-react-native';

export default function CustomerMasterScreen() {
  return (
    <FinancePlaceholder
      title="Customer Master"
      description="Manage customer records, credit limits, and payment terms."
      icon={Users}
      color="#2563EB"
      category="Accounts Receivable"
      features={[
        { title: 'Customer Records', description: 'Maintain customer contact and billing info' },
        { title: 'Credit Management', description: 'Set and monitor credit limits' },
        { title: 'Payment Terms', description: 'Configure customer-specific terms' },
        { title: 'Credit Applications', description: 'Process new credit requests' },
        { title: 'Customer Categories', description: 'Organize customers by type or region' },
        { title: 'Contact Management', description: 'Track multiple contacts per customer' },
      ]}
    />
  );
}
