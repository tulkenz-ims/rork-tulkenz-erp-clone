import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Phone } from 'lucide-react-native';

export default function CollectionsScreen() {
  return (
    <FinancePlaceholder
      title="Collections"
      description="Manage collection activities, dunning letters, and customer communications."
      icon={Phone}
      color="#1D4ED8"
      category="Accounts Receivable"
      features={[
        { title: 'Collection Worklist', description: 'Prioritized list of accounts to contact' },
        { title: 'Call Tracking', description: 'Log collection calls and outcomes' },
        { title: 'Dunning Letters', description: 'Automated reminder letters' },
        { title: 'Dunning Automation', description: 'Schedule automatic dunning sequences' },
        { title: 'Promise to Pay', description: 'Track customer payment commitments' },
        { title: 'Collection Notes', description: 'Document collection activities' },
      ]}
    />
  );
}
