import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Lock } from 'lucide-react-native';

export default function AllocatedScreen() {
  return (
    <InventoryPlaceholder
      title="Allocated Quantity"
      description="View inventory allocated to orders and projects"
      icon={Lock}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Allocation View', description: 'View allocated quantities' },
        { title: 'Order Allocations', description: 'Allocations by order' },
        { title: 'Release Allocations', description: 'Release allocated inventory' },
        { title: 'Allocation Reports', description: 'Allocation analysis' },
      ]}
    />
  );
}
