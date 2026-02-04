import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Clock } from 'lucide-react-native';

export default function APAgingScreen() {
  return (
    <FinancePlaceholder
      title="AP Aging"
      description="Track accounts payable aging by vendor and manage payment prioritization."
      icon={Clock}
      color="#F87171"
      category="Accounts Payable"
      features={[
        { title: 'Aging Buckets', description: 'Current, 30, 60, 90+ day aging categories' },
        { title: 'Vendor Summary', description: 'Total outstanding by vendor' },
        { title: 'Invoice Detail', description: 'Drill down to individual invoices' },
        { title: 'Payment Planning', description: 'Prioritize payments based on terms' },
        { title: 'Early Payment Discounts', description: 'Identify discount opportunities' },
        { title: 'Export Reports', description: 'Generate aging reports for review' },
      ]}
    />
  );
}
