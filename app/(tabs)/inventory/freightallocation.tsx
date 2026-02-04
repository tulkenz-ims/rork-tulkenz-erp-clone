import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Truck } from 'lucide-react-native';

export default function FreightAllocationScreen() {
  return (
    <InventoryPlaceholder
      title="Freight Allocation"
      description="Allocate freight costs to inventory items"
      icon={Truck}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Freight Setup', description: 'Configure freight allocation' },
        { title: 'Allocation Methods', description: 'Weight, value, quantity based' },
        { title: 'Auto Allocation', description: 'Automatic freight allocation' },
        { title: 'Freight Reports', description: 'Freight cost analysis' },
      ]}
    />
  );
}
