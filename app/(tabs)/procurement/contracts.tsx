import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { FileSignature } from 'lucide-react-native';

export default function ContractsScreen() {
  return (
    <ProcurementPlaceholder
      title="Vendor Contracts"
      description="Central repository for all vendor contracts and agreements"
      icon={FileSignature}
      color="#3B82F6"
      category="Contract Management"
      features={[
        { title: 'Contract Repository', description: 'Store and organize all contracts' },
        { title: 'Contract Search', description: 'Find contracts by any criteria' },
        { title: 'Terms Tracking', description: 'Track key contract terms and conditions' },
        { title: 'Price Agreements', description: 'Manage contracted pricing' },
        { title: 'Document Management', description: 'Store contract documents securely' },
      ]}
    />
  );
}
