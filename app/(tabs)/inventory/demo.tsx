import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Presentation } from 'lucide-react-native';

export default function DemoScreen() {
  return (
    <InventoryPlaceholder
      title="Demo Inventory"
      description="Manage demonstration and display inventory"
      icon={Presentation}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Demo Tracking', description: 'Track demo inventory' },
        { title: 'Demo Assignment', description: 'Assign demo items' },
        { title: 'Demo Returns', description: 'Process demo returns' },
        { title: 'Demo Reports', description: 'Demo inventory reports' },
      ]}
    />
  );
}
