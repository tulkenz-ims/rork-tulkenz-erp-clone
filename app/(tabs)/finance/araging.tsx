import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Clock } from 'lucide-react-native';

export default function ARAgingScreen() {
  return (
    <FinancePlaceholder
      title="AR Aging"
      description="Track accounts receivable aging and prioritize collection efforts."
      icon={Clock}
      color="#60A5FA"
      category="Accounts Receivable"
      features={[
        { title: 'Aging Buckets', description: 'Current, 30, 60, 90+ day categories' },
        { title: 'Customer Summary', description: 'Outstanding balances by customer' },
        { title: 'Invoice Detail', description: 'Drill down to specific invoices' },
        { title: 'Collection Priority', description: 'Identify high-priority accounts' },
        { title: 'Aging Trends', description: 'Track aging trends over time' },
        { title: 'Export Reports', description: 'Generate aging reports for review' },
      ]}
    />
  );
}
