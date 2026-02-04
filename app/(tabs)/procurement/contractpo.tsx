import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function ContractPOScreen() {
  return (
    <ProcurementPlaceholder
      title="Contract Purchase Orders"
      description="Create POs linked to vendor contracts and agreements"
      icon={FileCheck}
      color="#EC4899"
      category="Purchase Orders"
      features={[
        { title: 'Contract Linking', description: 'Link POs to active vendor contracts' },
        { title: 'Pricing Validation', description: 'Validate prices against contract terms' },
        { title: 'Contract Compliance', description: 'Ensure POs comply with contract terms' },
        { title: 'Spend vs Contract', description: 'Track spending against contract values' },
        { title: 'Contract References', description: 'Auto-populate contract details on PO' },
      ]}
    />
  );
}
