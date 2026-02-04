import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { TestTube } from 'lucide-react-native';

export default function SampleScreen() {
  return (
    <InventoryPlaceholder
      title="Sample Inventory"
      description="Manage sample and testing inventory"
      icon={TestTube}
      color="#6366F1"
      category="Consignment & Special"
      features={[
        { title: 'Sample Tracking', description: 'Track sample inventory' },
        { title: 'Sample Requests', description: 'Process sample requests' },
        { title: 'Sample Distribution', description: 'Manage sample distribution' },
        { title: 'Sample Reports', description: 'Sample inventory reports' },
      ]}
    />
  );
}
